import React, { useEffect, useState } from "react";
import { Search, Plus, FileSpreadsheet, Edit2, Trash2, FileText } from "lucide-react";
import { apiClient } from "@/lib/api";
import { ReportTemplateItem, DepartmentItem } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogHeader, DialogFooter } from "@/components/ui/dialog";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/common/PageHeader";

export const ReportTemplatesPage: React.FC = () => {
  const [templates, setTemplates] = useState<ReportTemplateItem[]>([]);
  const [departments, setDepartments] = useState<DepartmentItem[]>([]);

  const [search, setSearch] = useState("");
  const [selectedDeptId, setSelectedDeptId] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTmpl, setEditingTmpl] = useState<ReportTemplateItem | null>(null);

  // Form State
  const [name, setName] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [schemaJson, setSchemaJson] = useState('{\n  "sections": ["technique", "findings", "impression"]\n}');
  const [defaultText, setDefaultText] = useState("");
  const [isActive, setIsActive] = useState(true);

  const [modalError, setModalError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const fetchDependencies = async () => {
    try {
      const deptsRes = await apiClient.get<DepartmentItem[]>("/departments", { params: { active_only: true } });
      setDepartments(deptsRes.data);
    } catch (err) {
      console.error("Failed to load departments:", err);
    }
  };

  const fetchTemplates = async () => {
    try {
      const params: any = {};
      if (search) params.search = search;
      if (selectedDeptId) params.department_id = selectedDeptId;

      const res = await apiClient.get<ReportTemplateItem[]>("/report-templates", { params });
      setTemplates(res.data);
    } catch (err) {
      console.error("Failed to load report templates:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDependencies();
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [search, selectedDeptId]);

  const handleOpenAdd = () => {
    setEditingTmpl(null);
    setName("");
    setDepartmentId(departments[0]?.id || "");
    setSchemaJson('{\n  "sections": ["technique", "findings", "impression"]\n}');
    setDefaultText("CLINICAL INDICATION:\nTECHNIQUE:\nFINDINGS:\nIMPRESSION:");
    setIsActive(true);
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (tmpl: ReportTemplateItem) => {
    setEditingTmpl(tmpl);
    setName(tmpl.name);
    setDepartmentId(tmpl.department_id || "");
    setSchemaJson(tmpl.schema_json || '{\n  "sections": ["technique", "findings", "impression"]\n}');
    setDefaultText(tmpl.default_text || "");
    setIsActive(tmpl.is_active);
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleToggleStatus = async (tmpl: ReportTemplateItem) => {
    try {
      const res = await apiClient.patch(`/report-templates/${tmpl.id}/toggle-status`);
      setTemplates((prev) =>
        prev.map((t) => (t.id === tmpl.id ? { ...t, is_active: res.data.is_active } : t))
      );
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to update template status.");
    }
  };

  const handleDelete = async (tmpl: ReportTemplateItem) => {
    if (!window.confirm(`Are you sure you want to delete template "${tmpl.name}"?`)) return;
    try {
      await apiClient.delete(`/report-templates/${tmpl.id}`);
      setTemplates((prev) => prev.filter((t) => t.id !== tmpl.id));
    } catch (err: any) {
      alert(err.response?.data?.detail || "Cannot delete template. Deactivate instead.");
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    setIsSaving(true);

    try {
      const payload = {
        name,
        department_id: departmentId || null,
        schema_json: schemaJson,
        default_text: defaultText,
        is_active: isActive,
      };

      if (editingTmpl) {
        const res = await apiClient.put(`/report-templates/${editingTmpl.id}`, payload);
        setTemplates((prev) => prev.map((t) => (t.id === editingTmpl.id ? res.data : t)));
      } else {
        const res = await apiClient.post("/report-templates", payload);
        setTemplates((prev) => [res.data, ...prev]);
      }
      setIsModalOpen(false);
    } catch (err: any) {
      setModalError(err.response?.data?.detail || "Failed to save report template.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportExcel = () => {
    const csvContent =
      "data:text/csv;charset=utf-8," +
      ["Serial No,Template Name,Department,Status"]
        .concat(
          templates.map(
            (t, idx) =>
              `"${idx + 1}","${t.name}","${t.department_name || ""}","${
                t.is_active ? "Active" : "Inactive"
              }"`
          )
        )
        .join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `apex_report_templates_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const displayedTemplates = templates.slice(0, pageSize);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Report Template Master"
        description="Manage structured clinical reporting formats, standard normal findings, and department layouts"
        action={
          <div className="flex items-center space-x-3">
            <Button variant="outline" onClick={handleExportExcel}>
              <FileSpreadsheet className="h-4 w-4 mr-2 text-emerald-600" />
              Export to Excel
            </Button>
            <Button onClick={handleOpenAdd}>
              <Plus className="h-4 w-4 mr-2" />
              Add Report Template
            </Button>
          </div>
        }
      />

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="SEARCH REPORT TEMPLATES..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 uppercase text-xs"
            />
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold text-slate-500 uppercase">Department:</span>
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
          <span>Showing {displayedTemplates.length} of {templates.length} results</span>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-20 flex justify-center">
            <LoadingSpinner />
          </div>
        ) : templates.length === 0 ? (
          <EmptyState
            title="No report templates found"
            description="Create clinical reporting templates for Pathology, Radiology, or Sonography."
            action={
              <Button onClick={handleOpenAdd} size="sm">
                <Plus className="h-4 w-4 mr-1" /> Add Template
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-semibold text-slate-500 tracking-wider uppercase">
                  <th className="py-3.5 px-4 w-16">Serial No.</th>
                  <th className="py-3.5 px-6">Template Name</th>
                  <th className="py-3.5 px-5">Department</th>
                  <th className="py-3.5 px-6">Default Text Snippet</th>
                  <th className="py-3.5 px-4 w-28">Status</th>
                  <th className="py-3.5 px-4 text-right w-24">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayedTemplates.map((tmpl, index) => (
                  <tr key={tmpl.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3.5 px-4 text-slate-500 font-mono text-xs">{index + 1}</td>
                    <td className="py-3.5 px-6 font-semibold text-slate-800">
                      {tmpl.name}
                    </td>
                    <td className="py-3.5 px-5 text-xs font-medium text-blue-600">
                      {tmpl.department_name || "General"}
                    </td>
                    <td className="py-3.5 px-6 text-xs text-slate-500 truncate max-w-sm font-mono">
                      {tmpl.default_text || "—"}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={tmpl.is_active}
                          onCheckedChange={() => handleToggleStatus(tmpl)}
                        />
                        <span className={`text-xs font-medium ${tmpl.is_active ? "text-emerald-600" : "text-slate-400"}`}>
                          {tmpl.is_active ? "Active" : "Inactive"}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end space-x-1">
                        <button
                          onClick={() => handleOpenEdit(tmpl)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="Edit Template"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(tmpl)}
                          className="p-1.5 text-rose-500 hover:bg-rose-50 rounded transition-colors"
                          title="Delete Template"
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
            title={editingTmpl ? "Edit Report Template" : "Add Report Template"}
            description="Define standard findings and structured formatting sections for medical reports."
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
                Template Name *
              </label>
              <Input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Standard Digital Chest X-Ray Report"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Department
              </label>
              <select
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                className="w-full rounded-md border border-slate-200 p-2 text-sm bg-white"
              >
                <option value="">General (All Departments)</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Default Report Content / Macro Text *
              </label>
              <textarea
                required
                value={defaultText}
                onChange={(e) => setDefaultText(e.target.value)}
                rows={6}
                className="w-full rounded-md border border-slate-200 p-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Schema JSON (Sections & Metadata)
              </label>
              <textarea
                value={schemaJson}
                onChange={(e) => setSchemaJson(e.target.value)}
                rows={3}
                className="w-full rounded-md border border-slate-200 p-2.5 text-xs font-mono bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center space-x-2 pt-1">
              <Switch checked={isActive} onCheckedChange={setIsActive} />
              <label className="text-xs font-medium text-slate-700">Active Template</label>
            </div>

            <DialogFooter className="mt-6 pt-4 border-t border-slate-100 flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? "Saving..." : editingTmpl ? "Save Changes" : "Create Template"}
              </Button>
            </DialogFooter>
          </form>
        </div>
      </Dialog>
    </div>
  );
};
