import React, { useEffect, useState } from "react";
import { Save, Shield, Check, AlertCircle } from "lucide-react";
import { apiClient } from "@/lib/api";
import { RoleDetail, Permission, UserDetail } from "@/types";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { PageHeader } from "@/components/common/PageHeader";

const MODULE_SECTIONS: { category: string; modules: { label: string; key: string; allowedActions: string[] }[] }[] = [
  {
    category: "FORM'S",
    modules: [
      { label: "PATIENT REGISTRATION", key: "patient_registration", allowedActions: ["add", "update", "view", "export"] },
      { label: "PATIENT REPORT", key: "patient_report", allowedActions: ["add", "update", "delete", "view", "verify", "finalize"] },
      { label: "DELETE CASE", key: "delete_case", allowedActions: ["view", "delete"] },
      { label: "VIEW PATIENT HISTORY", key: "view_patient_history", allowedActions: ["view"] },
      { label: "OTHER CHARGES REPORT", key: "other_charges_report", allowedActions: ["view", "print", "export"] },
      { label: "CHARGES REPORT", key: "charges_report", allowedActions: ["view", "print", "export"] },
    ],
  },
  {
    category: "MASTER'S",
    modules: [
      { label: "USER MASTER", key: "user_master", allowedActions: ["add", "update", "delete", "view"] },
      { label: "USER RIGHT", key: "user_right", allowedActions: ["add", "update", "delete", "view"] },
      { label: "BRANCH MASTER", key: "branch_master", allowedActions: ["add", "update", "delete", "view"] },
      { label: "DEPARTMENT MASTER", key: "department_master", allowedActions: ["add", "update", "view"] },
      { label: "DOCTOR MASTER", key: "doctor_master", allowedActions: ["add", "update", "view"] },
      { label: "INVESTIGATION MASTER", key: "investigation_master", allowedActions: ["add", "update", "view"] },
      { label: "FINANCIAL REGISTERS", key: "financial_registers", allowedActions: ["add", "view", "export"] },
      { label: "GENERAL SETTINGS", key: "general_settings", allowedActions: ["update", "view"] },
      { label: "AUDIT LOGS", key: "audit_logs", allowedActions: ["view"] },
    ],
  },
];

const ACTIONS = ["add", "update", "delete", "view", "print", "export"];

export const PermissionsPage: React.FC = () => {
  const [roles, setRoles] = useState<RoleDetail[]>([]);
  const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string>("");
  const [selectedPermissionIds, setSelectedPermissionIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const [rRes, pRes] = await Promise.all([
          apiClient.get<RoleDetail[]>("/roles"),
          apiClient.get<Permission[]>("/permissions"),
        ]);
        setRoles(rRes.data);
        setAllPermissions(pRes.data);
        if (rRes.data.length > 0) {
          const firstRole = rRes.data[0];
          setSelectedRoleId(firstRole.id);
          setSelectedPermissionIds(new Set(firstRole.permissions.map((p) => p.id)));
        }
      } catch (err) {
        console.error("Failed to load permissions matrix:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  const handleRoleChange = (roleId: string) => {
    setSelectedRoleId(roleId);
    setSaveSuccess(false);
    const role = roles.find((r) => r.id === roleId);
    if (role) {
      setSelectedPermissionIds(new Set(role.permissions.map((p) => p.id)));
    }
  };

  const findPermissionId = (moduleKey: string, action: string): string | undefined => {
    const code = `${moduleKey}:${action}`;
    const match = allPermissions.find((p) => p.code === code);
    return match?.id;
  };

  const togglePermission = (permId: string) => {
    setSaveSuccess(false);
    const next = new Set(selectedPermissionIds);
    if (next.has(permId)) next.delete(permId);
    else next.add(permId);
    setSelectedPermissionIds(next);
  };

  const handleSave = async () => {
    if (!selectedRoleId) return;
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      const res = await apiClient.put(`/roles/${selectedRoleId}/permissions`, {
        role_id: selectedRoleId,
        permission_ids: Array.from(selectedPermissionIds),
      });

      // Update local roles state
      setRoles((prev) =>
        prev.map((r) => (r.id === selectedRoleId ? { ...r, permissions: res.data.permissions } : r))
      );
      setSaveSuccess(true);
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to save permissions.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <LoadingSpinner message="Loading RBAC permissions matrix..." />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Role Permissions Matrix"
        description="Configure granular module capabilities matching clinical governance rules"
        action={
          <Button onClick={handleSave} disabled={isSaving} className="bg-blue-600 hover:bg-blue-700">
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? "Saving..." : "Save Matrix Changes"}
          </Button>
        }
      />

      {saveSuccess && (
        <div className="flex items-center space-x-2 rounded-lg bg-emerald-50 p-3.5 text-xs text-emerald-800 border border-emerald-200">
          <Check className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>Permissions matrix updated and enforced successfully.</span>
        </div>
      )}

      {/* Role Selector Controls matching Permission.png */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
            Login Type: *
          </label>
          <select
            value={selectedRoleId}
            onChange={(e) => handleRoleChange(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold uppercase text-slate-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
            Selected Role Description:
          </label>
          <div className="text-xs text-slate-500 pt-2 font-medium">
            {roles.find((r) => r.id === selectedRoleId)?.description || "Role configuration"}
          </div>
        </div>
      </div>

      {/* Permission Matrix Table matching Permission.png */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                <th className="py-3 px-6 w-1/3">PERMISSION</th>
                {ACTIONS.map((act) => (
                  <th key={act} className="py-3 px-4 text-center">
                    {act.toUpperCase()}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MODULE_SECTIONS.map((section) => (
                <React.Fragment key={section.category}>
                  {/* Category Header */}
                  <tr className="bg-slate-100/70 border-y border-slate-200">
                    <td colSpan={7} className="py-2 px-6 font-extrabold text-[11px] text-slate-700 uppercase tracking-wider">
                      {section.category}
                    </td>
                  </tr>

                  {/* Module Rows */}
                  {section.modules.map((mod) => (
                    <tr key={mod.key} className="border-b border-slate-100 hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-6 font-semibold text-slate-800 uppercase tracking-wide">
                        {mod.label}
                      </td>
                      {ACTIONS.map((act) => {
                        const permId = findPermissionId(mod.key, act);
                        const isAllowed = mod.allowedActions.includes(act);

                        if (!isAllowed || !permId) {
                          return <td key={act} className="py-3 px-4 text-center"></td>;
                        }

                        const isChecked = selectedPermissionIds.has(permId);

                        return (
                          <td key={act} className="py-3 px-4 text-center">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => togglePermission(permId)}
                              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
