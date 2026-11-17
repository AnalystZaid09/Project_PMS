import React, { useEffect, useState } from "react";
import { Search, Plus, FileSpreadsheet, Edit2, Trash2, Clock } from "lucide-react";
import { apiClient } from "@/lib/api";
import {
  InvestigationItem,
  InvestigationCategoryItem,
  DepartmentItem,
  ReportTemplateItem,
} from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogHeader, DialogFooter } from "@/components/ui/dialog";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/common/PageHeader";

export const InvestigationsPage: React.FC = () => {
  const [investigations, setInvestigations] = useState<InvestigationItem[]>([]);
  const [categories, setCategories] = useState<InvestigationCategoryItem[]>([]);
  const [departments, setDepartments] = useState<DepartmentItem[]>([]);
  const [templates, setTemplates] = useState<ReportTemplateItem[]>([]);

  const [search, setSearch] = useState("");
  const [selectedDeptId, setSelectedDeptId] = useState("");
  const [selectedCatId, setSelectedCatId] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingInv, setEditingInv] = useState<InvestigationItem | null>(null);

  // Form State
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [defaultPrice, setDefaultPrice] = useState<number>(0);
  const [emergencyPrice, setEmergencyPrice] = useState<number>(0);
  const [turnaroundHours, setTurnaroundHours] = useState<number>(24);
  const [templateId, setTemplateId] = useState("");
  const [isActive, setIsActive] = useState(true);

  const [modalError, setModalError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const fetchDependencies = async () => {
    try {
      const [catsRes, deptsRes, tmplsRes] = await Promise.all([
        apiClient.get<InvestigationCategoryItem[]>("/investigation-categories", { params: { active_only: true } }),
        apiClient.get<DepartmentItem[]>("/departments", { params: { active_only: true } }),
        apiClient.get<ReportTemplateItem[]>("/report-templates", { params: { active_only: true } }),
      ]);
      setCategories(catsRes.data);
      setDepartments(deptsRes.data);
      setTemplates(tmplsRes.data);
    } catch (err) {
      console.error("Failed to load investigation dependencies:", err);
    }
  };

  const fetchInvestigations = async () => {
    try {
      const params: any = {};
      if (search) params.search = search;
      if (selectedDeptId) params.department_id = selectedDeptId;
      if (selectedCatId) params.category_id = selectedCatId;

      const res = await apiClient.get<InvestigationItem[]>("/investigations", { params });
      setInvestigations(res.data);
    } catch (err) {
      console.error("Failed to load investigations:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDependencies();
  }, []);

  useEffect(() => {
    fetchInvestigations();
  }, [search, selectedDeptId, selectedCatId]);

  const handleOpenAdd = () => {
    setEditingInv(null);
    setCode("");
    setName("");
    setDescription("");
    setCategoryId(categories[0]?.id || "");
    setDepartmentId(departments[0]?.id || "");
    setDefaultPrice(0);
    setEmergencyPrice(0);
    setTurnaroundHours(24);
    setTemplateId("");
    setIsActive(true);
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (inv: InvestigationItem) => {
    setEditingInv(inv);
    setCode(inv.code);
    setName(inv.name);
    setDescription(inv.description || "");
    setCategoryId(inv.category_id || "");
    setDepartmentId(inv.department_id || "");
    setDefaultPrice(Number(inv.default_price));
    setEmergencyPrice(Number(inv.emergency_price));
    setTurnaroundHours(inv.turnaround_hours);
    setTemplateId(inv.template_id || "");
    setIsActive(inv.is_active);
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleToggleStatus = async (inv: InvestigationItem) => {
    try {
      const res = await apiClient.patch(`/investigations/${inv.id}/toggle-status`);
      setInvestigations((prev) =>
        prev.map((i) => (i.id === inv.id ? { ...i, is_active: res.data.is_active } : i))
      );
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to update test status.");
    }
  };

  const handleDelete = async (inv: InvestigationItem) => {
    if (!window.confirm(`Are you sure you want to delete investigation "${inv.name}"?`)) return;
    try {
      await apiClient.delete(`/investigations/${inv.id}`);
      setInvestigations((prev) => prev.filter((i) => i.id !== inv.id));
    } catch (err: any) {
      alert(err.response?.data?.detail || "Cannot delete investigation. Deactivate instead.");
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    setIsSaving(true);

    try {
      const payload = {
        code,
        name,
        description,
        category_id: categoryId || null,
        department_id: departmentId || null,
        default_price: Number(defaultPrice),
        emergency_price: Number(emergencyPrice),
        turnaround_hours: Number(turnaroundHours),
        template_id: templateId || null,
        is_active: isActive,
      };

      if (editingInv) {
        const res = await apiClient.put(`/investigations/${editingInv.id}`, payload);
        setInvestigations((prev) => prev.map((i) => (i.id === editingInv.id ? res.data : i)));
      } else {
        const res = await apiClient.post("/investigations", payload);
        setInvestigations((prev) => [res.data, ...prev]);
      }
      setIsModalOpen(false);
    } catch (err: any) {
      setModalError(err.response?.data?.detail || "Failed to save investigation.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportExcel = () => {
    const csvContent =
      "data:text/csv;charset=utf-8," +
      ["Serial No,Test Code,Investigation Name,Department,Category,Regular Price,Emergency Price,TAT (Hours),Status"]
        .concat(
          investigations.map(
            (i, idx) =>
              `"${idx + 1}","${i.code}","${i.name}","${i.department_name || ""}","${i.category_name || ""}","₹${
                i.default_price
              }","₹${i.emergency_price}","${i.turnaround_hours}","${i.is_active ? "Active" : "Inactive"}"`
          )
        )
        .join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `apex_investigations_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const displayedInvs = investigations.slice(0, pageSize);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Investigation Master"
        description="Manage laboratory tests, diagnostic radiology services, turnaround targets, and default tariff rates"
        action={
          <div className="flex items-center space-x-3">
            <Button variant="outline" onClick={handleExportExcel}>
              <FileSpreadsheet className="h-4 w-4 mr-2 text-emerald-600" />
              Export to Excel
            </Button>
            <Button onClick={handleOpenAdd}>
              <Plus className="h-4 w-4 mr-2" />
              Add Investigation
            </Button>
          </div>
        }
      />

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="SEARCH TEST NAME / CODE..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 uppercase text-xs"
            />
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold text-slate-500 uppercase">Dept:</span>
            <select
              value={selectedDeptId}
              onChange={(e) => setSelectedDeptId(e.target.value)}
              className="border border-slate-200 rounded-md px-2.5 py-1.5 text-xs bg-white text-slate-700 font-medium"
            >
              <option value="">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center space-x-2 text-sm text-slate-500">
          <span>Show</span>
          <select
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            className="border border-slate-200 rounded-md px-2 py-1 text-sm bg-white"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>
          <span>Showing {displayedInvs.length} of {investigations.length} results</span>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-20 flex justify-center">
            <LoadingSpinner />
          </div>
        ) : investigations.length === 0 ? (
          <EmptyState
            title="No investigations found"
            description="Add diagnostic tests or imaging investigations to the catalogue."
            action={
              <Button onClick={handleOpenAdd} size="sm">
                <Plus className="h-4 w-4 mr-1" /> Add Investigation
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-semibold text-slate-500 tracking-wider uppercase">
                  <th className="py-3.5 px-4 w-16">Serial No.</th>
                  <th className="py-3.5 px-4 w-24">Code</th>
                  <th className="py-3.5 px-6">Investigation Name</th>
                  <th className="py-3.5 px-4">Department</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Regular Price</th>
                  <th className="py-3.5 px-4">Emergency Price</th>
                  <th className="py-3.5 px-3">TAT</th>
                  <th className="py-3.5 px-4 w-28">Status</th>
                  <th className="py-3.5 px-4 text-right w-24">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayedInvs.map((inv, index) => (
                  <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3.5 px-4 text-slate-500 font-mono text-xs">{index + 1}</td>
                    <td className="py-3.5 px-4 font-mono font-semibold text-blue-600">
                      {inv.code}
                    </td>
                    <td className="py-3.5 px-6">
                      <div className="font-medium text-slate-900 uppercase tracking-wide">
                        {inv.name}
                      </div>
                      {inv.template_name && (
                        <div className="text-[11px] text-slate-400">
                          Template: {inv.template_name}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-xs font-medium text-slate-700">
                      {inv.department_name || "—"}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-500">
                      {inv.category_name || "—"}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-medium text-slate-800">
                      ₹{Number(inv.default_price).toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-medium text-slate-800">
                      ₹{Number(inv.emergency_price).toFixed(2)}
                    </td>
                    <td className="py-3.5 px-3">
                      <span className="inline-flex items-center text-xs text-slate-600">
                        <Clock className="h-3 w-3 mr-1 text-slate-400" />
                        {inv.turnaround_hours}h
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={inv.is_active}
                          onCheckedChange={() => handleToggleStatus(inv)}
                        />
                        <span className={`text-xs font-medium ${inv.is_active ? "text-emerald-600" : "text-slate-400"}`}>
                          {inv.is_active ? "Active" : "Inactive"}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end space-x-1">
                        <button
                          onClick={() => handleOpenEdit(inv)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="Edit Investigation"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(inv)}
                          className="p-1.5 text-rose-500 hover:bg-rose-50 rounded transition-colors"
                          title="Delete Investigation"
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

      {/* Add / Edit Dialog */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <div className="p-6 max-h-[90vh] overflow-y-auto">
          <DialogHeader
            title={editingInv ? "Edit Investigation" : "Add Investigation Master"}
            description="Enter clinical test specifications, default pricing, and turnaround expectations."
            onClose={() => setIsModalOpen(false)}
          />
          {modalError && (
            <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
              {modalError}
            </div>
          )}
          <form onSubmit={handleSave} className="space-y-4 mt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Investigation Code *
                </label>
                <Input
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="e.g. CBC-01, XRAY-01"
                  className="uppercase font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Investigation Name *
                </label>
                <Input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Complete Blood Count with ESR"
                  className="uppercase"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Department *
                </label>
                <select
                  required
                  value={departmentId}
                  onChange={(e) => setDepartmentId(e.target.value)}
                  className="w-full rounded-md border border-slate-200 p-2 text-sm bg-white"
                >
                  <option value="">Select Department...</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.code})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Category
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full rounded-md border border-slate-200 p-2 text-sm bg-white"
                >
                  <option value="">Select Category...</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Regular Price (₹) *
                </label>
                <Input
                  type="number"
                  min={0}
                  step={1}
                  required
                  value={defaultPrice}
                  onChange={(e) => setDefaultPrice(Number(e.target.value))}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Emergency Price (₹)
                </label>
                <Input
                  type="number"
                  min={0}
                  step={1}
                  value={emergencyPrice}
                  onChange={(e) => setEmergencyPrice(Number(e.target.value))}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Turnaround Hours (TAT)
                </label>
                <Input
                  type="number"
                  min={1}
                  value={turnaroundHours}
                  onChange={(e) => setTurnaroundHours(Number(e.target.value))}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Clinical Report Template
              </label>
              <select
                value={templateId}
                onChange={(e) => setTemplateId(e.target.value)}
                className="w-full rounded-md border border-slate-200 p-2 text-sm bg-white"
              >
                <option value="">No Default Template</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.department_name || "General"})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Description / Test Preparation Notes
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Fasting instructions, collection criteria, sample tube..."
                rows={2}
                className="w-full rounded-md border border-slate-200 p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center space-x-2 pt-1">
              <Switch checked={isActive} onCheckedChange={setIsActive} />
              <label className="text-xs font-medium text-slate-700">Active Investigation</label>
            </div>

            <DialogFooter className="mt-6 pt-4 border-t border-slate-100 flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? "Saving..." : editingInv ? "Save Changes" : "Create Investigation"}
              </Button>
            </DialogFooter>
          </form>
        </div>
      </Dialog>
    </div>
  );
};
