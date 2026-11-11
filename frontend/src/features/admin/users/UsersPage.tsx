import React, { useEffect, useState } from "react";
import { Search, Plus, Filter, Edit2, Trash2, CheckCircle2, XCircle } from "lucide-react";
import { apiClient } from "@/lib/api";
import { UserDetail, RoleDetail, BranchInfo } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogHeader, DialogFooter } from "@/components/ui/dialog";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/common/PageHeader";

export const UsersPage: React.FC = () => {
  const [users, setUsers] = useState<UserDetail[]>([]);
  const [roles, setRoles] = useState<RoleDetail[]>([]);
  const [branches, setBranches] = useState<BranchInfo[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("Admin@123");
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);
  const [selectedBranchIds, setSelectedBranchIds] = useState<string[]>([]);
  const [modalError, setModalError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const fetchUsers = async () => {
    try {
      const res = await apiClient.get<UserDetail[]>("/users", {
        params: search ? { search } : {},
      });
      setUsers(res.data);
    } catch (err) {
      console.error("Failed to fetch users:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMasterData = async () => {
    try {
      const [rRes, bRes] = await Promise.all([
        apiClient.get<RoleDetail[]>("/roles"),
        apiClient.get<BranchInfo[]>("/branches"),
      ]);
      setRoles(rRes.data);
      setBranches(bRes.data);
    } catch (err) {
      console.error("Failed to load roles/branches:", err);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchMasterData();
  }, [search]);

  const handleToggleStatus = async (user: UserDetail) => {
    try {
      const res = await apiClient.patch(`/users/${user.id}/toggle-status`);
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, is_active: res.data.is_active } : u))
      );
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to update user status.");
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    setIsSaving(true);

    try {
      await apiClient.post("/users", {
        full_name: fullName,
        username,
        email,
        password,
        role_ids: selectedRoleIds,
        branch_ids: selectedBranchIds,
        default_branch_id: selectedBranchIds[0] || null,
      });

      setIsModalOpen(false);
      // Reset form
      setFullName("");
      setUsername("");
      setEmail("");
      setSelectedRoleIds([]);
      setSelectedBranchIds([]);
      fetchUsers();
    } catch (err: any) {
      setModalError(err.response?.data?.detail || "Failed to create user.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users"
        description="Manage system user credentials, branch assignments, and assigned roles"
        action={
          <Button onClick={() => setIsModalOpen(true)} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="h-4 w-4 mr-2" />
            New User
          </Button>
        }
      />

      {/* Filter and Search Bar matching Users.png */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="SEARCH"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-slate-50 uppercase text-xs tracking-wider"
          />
        </div>
        <div className="flex items-center space-x-3 text-xs text-slate-500">
          <span>Show 10</span>
          <span>Showing <strong>{users.length}</strong> results</span>
        </div>
      </div>

      {/* Users Table matching Users.png */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {isLoading ? (
          <LoadingSpinner message="Loading user directory..." />
        ) : users.length === 0 ? (
          <EmptyState
            title="No Users Found"
            description="No users matched your search criteria."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  <th className="py-3 px-4">SERIAL NO.</th>
                  <th className="py-3 px-4">USERS</th>
                  <th className="py-3 px-4">ROLE</th>
                  <th className="py-3 px-4">EMAIL VERIFIED</th>
                  <th className="py-3 px-4">STATUS</th>
                  <th className="py-3 px-4 text-right">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u, idx) => (
                  <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 text-slate-500 font-medium">{idx + 1}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white font-semibold text-xs shadow-sm">
                          {u.full_name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900 uppercase">{u.full_name}</div>
                          <div className="text-[11px] text-slate-500 lowercase">{u.username}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1.5">
                        {u.roles.map((r) => (
                          <Badge key={r.id} variant="role">
                            {r.name}
                          </Badge>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <Switch
                        checked={u.is_email_verified}
                        onCheckedChange={() => {}}
                        disabled={true}
                      />
                    </td>
                    <td className="py-3 px-4">
                      <Switch
                        checked={u.is_active}
                        onCheckedChange={() => handleToggleStatus(u)}
                      />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          className="rounded-lg p-1.5 text-blue-600 hover:bg-blue-50 transition-colors"
                          title="Edit user"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleToggleStatus(u)}
                          className="rounded-lg p-1.5 text-red-600 hover:bg-red-50 transition-colors"
                          title={u.is_active ? "Deactivate" : "Activate"}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create User Dialog */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogHeader
          title="Create New System User"
          description="Register a new staff account with branch access and roles"
          onClose={() => setIsModalOpen(false)}
        />
        {modalError && (
          <div className="my-2 rounded-lg bg-red-50 p-3 text-xs text-red-700 border border-red-200">
            {modalError}
          </div>
        )}
        <form onSubmit={handleCreateUser} className="space-y-4 mt-2">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name *</label>
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. John Doe"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Username *</label>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. jdoe"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email *</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jdoe@nexushealth.org"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Initial Password *</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Assign Roles *</label>
            <div className="grid grid-cols-2 gap-2 border border-slate-200 p-2.5 rounded-lg max-h-36 overflow-y-auto">
              {roles.map((r) => (
                <label key={r.id} className="flex items-center space-x-2 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedRoleIds.includes(r.id)}
                    onChange={(e) => {
                      if (e.target.checked) setSelectedRoleIds([...selectedRoleIds, r.id]);
                      else setSelectedRoleIds(selectedRoleIds.filter((id) => id !== r.id));
                    }}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>{r.name}</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Branch Access *</label>
            <div className="grid grid-cols-1 gap-1.5 border border-slate-200 p-2.5 rounded-lg max-h-36 overflow-y-auto">
              {branches.map((b) => (
                <label key={b.id} className="flex items-center space-x-2 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedBranchIds.includes(b.id)}
                    onChange={(e) => {
                      if (e.target.checked) setSelectedBranchIds([...selectedBranchIds, b.id]);
                      else setSelectedBranchIds(selectedBranchIds.filter((id) => id !== b.id));
                    }}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>{b.name} ({b.city})</span>
                </label>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Creating..." : "Save User"}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>
    </div>
  );
};
