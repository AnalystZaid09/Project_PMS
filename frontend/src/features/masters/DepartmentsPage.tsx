import React, { useEffect, useState } from "react";
import { Search, Plus, FileSpreadsheet, Edit2, Trash2, CheckCircle2, XCircle } from "lucide-react";
import { apiClient } from "@/lib/api";
import { DepartmentItem } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogHeader, DialogFooter } from "@/components/ui/dialog";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/common/PageHeader";

export const DepartmentsPage: React.FC = () => {
  const [departments, setDepartments] = useState<DepartmentItem[]>([]);
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<DepartmentItem | null>(null);

  // Form State
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [modalError, setModalError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const fetchDepartments = async () => {
    try {
      const res = await apiClient.get<DepartmentItem[]>("/departments", {
        params: search ? { search } : {},
      });
      setDepartments(res.data);
    } catch (err) {
      console.error("Failed to load departments:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, [search]);

  const handleOpenAdd = () => {
    setEditingDept(null);
    setName("");
    setCode("");
    setDescription("");
    setIsActive(true);
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (dept: DepartmentItem) => {
    setEditingDept(dept);
    setName(dept.name);
    setCode(dept.code);
    setDescription(dept.description || "");
    setIsActive(dept.is_active);
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleToggleStatus = async (dept: DepartmentItem) => {
    try {
      const res = await apiClient.patch(`/departments/${dept.id}/toggle-status`);
      setDepartments((prev) =>
        prev.map((d) => (d.id === dept.id ? { ...d, is_active: res.data.is_active } : d))
      );
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to update department status.");
    }
  };

  const handleDelete = async (dept: DepartmentItem) => {
    if (!window.confirm(`Are you sure you want to delete department "${dept.name}"?`)) return;
    try {
      await apiClient.delete(`/departments/${dept.id}`);
      setDepartments((prev) => prev.filter((d) => d.id !== dept.id));
    } catch (err: any) {
      alert(err.response?.data?.detail || "Cannot delete department. Deactivate instead.");
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    setIsSaving(true);

    try {
      if (editingDept) {
        const res = await apiClient.put(`/departments/${editingDept.id}`, {
          name,
          code,
          description,
          is_active: isActive,
        });
        setDepartments((prev) => prev.map((d) => (d.id === editingDept.id ? res.data : d)));
      } else {
        const res = await apiClient.post("/departments", {
          name,
          code,
          description,
          is_active: isActive,
        });
        setDepartments((prev) => [res.data, ...prev]);
      }
      setIsModalOpen(false);
    } catch (err: any) {
      setModalError(err.response?.data?.detail || "Failed to save department.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportExcel = () => {
    const csvContent =
      "data:text/csv;charset=utf-8," +
      ["Serial No,Code,Department Name,Description,Status"]
        .concat(
          departments.map(
            (d, idx) =>
              `"${idx + 1}","${d.code}","${d.name}","${d.description || ""}","${
                d.is_active ? "Active" : "Inactive"
              }"`
          )
        )
        .join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `apex_departments_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const displayedDepts = departments.slice(0, pageSize);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Department Master"
        description="Configure diagnostic departments, laboratory units, and imaging divisions"
        action={
          <div className="flex items-center space-x-3">
            <Button variant="outline" onClick={handleExportExcel}>
              <FileSpreadsheet className="h-4 w-4 mr-2 text-emerald-600" />
              Export to Excel
            </Button>
            <Button onClick={handleOpenAdd}>
              <Plus className="h-4 w-4 mr-2" />
              Add Department
            </Button>
          </div>
        }
      />

      {/* Search and Filters Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="SEARCH DEPARTMENTS..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 uppercase text-xs"
          />
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
          <span>Showing {displayedDepts.length} of {departments.length} results</span>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-20 flex justify-center">
            <LoadingSpinner />
          </div>
        ) : departments.length === 0 ? (
          <EmptyState
            title="No departments found"
            description={search ? "No records match your search criteria." : "Get started by adding your first department."}
            action={
              <Button onClick={handleOpenAdd} size="sm">
                <Plus className="h-4 w-4 mr-1" /> Add Department
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-semibold text-slate-500 tracking-wider uppercase">
                  <th className="py-3.5 px-4 w-20">Serial No.</th>
                  <th className="py-3.5 px-4 w-28">Code</th>
                  <th className="py-3.5 px-6">Department Name</th>
                  <th className="py-3.5 px-6">Description</th>
                  <th className="py-3.5 px-4 w-32">Status</th>
                  <th className="py-3.5 px-4 text-right w-28">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayedDepts.map((dept, index) => (
                  <tr key={dept.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3.5 px-4 text-slate-500 font-mono text-xs">{index + 1}</td>
                    <td className="py-3.5 px-4 font-semibold text-blue-600">{dept.code}</td>
                    <td className="py-3.5 px-6 font-medium text-slate-800 uppercase tracking-wide">
                      {dept.name}
                    </td>
                    <td className="py-3.5 px-6 text-slate-500 text-xs truncate max-w-xs">
                      {dept.description || "—"}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={dept.is_active}
                          onCheckedChange={() => handleToggleStatus(dept)}
                        />
                        <span className={`text-xs font-medium ${dept.is_active ? "text-emerald-600" : "text-slate-400"}`}>
                          {dept.is_active ? "Active" : "Inactive"}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end space-x-1">
                        <button
                          onClick={() => handleOpenEdit(dept)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="Edit Department"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(dept)}
                          className="p-1.5 text-rose-500 hover:bg-rose-50 rounded transition-colors"
                          title="Delete Department"
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
        <div className="p-6">
          <DialogHeader
            title={editingDept ? "Edit Department" : "Add Department"}
            description="Enter the department details to register or update in system."
            onClose={() => setIsModalOpen(false)}
          />
          {modalError && (
            <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
              {modalError}
            </div>
          )}
          <form onSubmit={handleSave} className="space-y-4 mt-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Department Name *
              </label>
              <Input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. PATHOLOGY, RADIOLOGY"
                className="uppercase"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Department Code *
              </label>
              <Input
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="e.g. PATH, RAD, USG"
                className="uppercase font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Description / Clinical Notes
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Department scope and facilities..."
                rows={3}
                className="w-full rounded-md border border-slate-200 p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-center space-x-2 pt-1">
              <Switch checked={isActive} onCheckedChange={setIsActive} />
              <label className="text-xs font-medium text-slate-700">Active Department</label>
            </div>
            <DialogFooter className="mt-6 pt-4 border-t border-slate-100 flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? "Saving..." : editingDept ? "Save Changes" : "Create Department"}
              </Button>
            </DialogFooter>
          </form>
        </div>
      </Dialog>
    </div>
  );
};
