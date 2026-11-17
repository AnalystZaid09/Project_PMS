import React, { useEffect, useState } from "react";
import { Search, Plus, FileSpreadsheet, Edit2, Trash2, Mail } from "lucide-react";
import { apiClient } from "@/lib/api";
import { EmailTemplateItem } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogHeader, DialogFooter } from "@/components/ui/dialog";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/common/PageHeader";

export const EmailTemplatesPage: React.FC = () => {
  const [templates, setTemplates] = useState<EmailTemplateItem[]>([]);
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTmpl, setEditingTmpl] = useState<EmailTemplateItem | null>(null);

  // Form State
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [modalError, setModalError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const fetchTemplates = async () => {
    try {
      const res = await apiClient.get<EmailTemplateItem[]>("/email-templates", {
        params: search ? { search } : {},
      });
      setTemplates(res.data);
    } catch (err) {
      console.error("Failed to load email templates:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, [search]);

  const handleOpenAdd = () => {
    setEditingTmpl(null);
    setName("");
    setSubject("");
    setBody("Dear {{patient_name}},\n\n...\n\nWarm regards,\nApex Health Diagnostics");
    setIsActive(true);
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (tmpl: EmailTemplateItem) => {
    setEditingTmpl(tmpl);
    setName(tmpl.name);
    setSubject(tmpl.subject);
    setBody(tmpl.body);
    setIsActive(tmpl.is_active);
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleToggleStatus = async (tmpl: EmailTemplateItem) => {
    try {
      const res = await apiClient.patch(`/email-templates/${tmpl.id}/toggle-status`);
      setTemplates((prev) =>
        prev.map((t) => (t.id === tmpl.id ? { ...t, is_active: res.data.is_active } : t))
      );
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to update template status.");
    }
  };

  const handleDelete = async (tmpl: EmailTemplateItem) => {
    if (!window.confirm(`Are you sure you want to delete template "${tmpl.name}"?`)) return;
    try {
      await apiClient.delete(`/email-templates/${tmpl.id}`);
      setTemplates((prev) => prev.filter((t) => t.id !== tmpl.id));
    } catch (err: any) {
      alert(err.response?.data?.detail || "Cannot delete template.");
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    setIsSaving(true);

    try {
      const payload = {
        name,
        subject,
        body,
        is_active: isActive,
      };

      if (editingTmpl) {
        const res = await apiClient.put(`/email-templates/${editingTmpl.id}`, payload);
        setTemplates((prev) => prev.map((t) => (t.id === editingTmpl.id ? res.data : t)));
      } else {
        const res = await apiClient.post("/email-templates", payload);
        setTemplates((prev) => [res.data, ...prev]);
      }
      setIsModalOpen(false);
    } catch (err: any) {
      setModalError(err.response?.data?.detail || "Failed to save template.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleInsertToken = (token: string) => {
    setBody((prev) => prev + " " + token);
  };

  const displayedTemplates = templates.slice(0, pageSize);

  const handleExportExcel = () => {
    const csvContent =
      "data:text/csv;charset=utf-8," +
      ["Serial No,Template Name,Subject,Status"]
        .concat(
          templates.map(
            (t, idx) =>
              `"${idx + 1}","${t.name}","${t.subject}","${t.is_active ? "Active" : "Inactive"}"`
          )
        )
        .join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `apex_email_templates_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Email Template Master"
        description="Manage automated email notification templates with dynamic patient and clinical tokens"
        action={
          <div className="flex items-center space-x-3">
            <Button variant="outline" onClick={handleExportExcel}>
              <FileSpreadsheet className="h-4 w-4 mr-2 text-emerald-600" />
              Export to Excel
            </Button>
            <Button onClick={handleOpenAdd}>
              <Plus className="h-4 w-4 mr-2" />
              Add Template
            </Button>
          </div>
        }
      />

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="SEARCH EMAIL TEMPLATES..."
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
            title="No email templates found"
            description="Create notifications for registration, report readiness, or reminders."
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
                  <th className="py-3.5 px-6">Name</th>
                  <th className="py-3.5 px-6">Subject</th>
                  <th className="py-3.5 px-6">Body Preview</th>
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
                    <td className="py-3.5 px-6 text-xs text-blue-600 font-medium">
                      {tmpl.subject}
                    </td>
                    <td className="py-3.5 px-6 text-xs text-slate-500 truncate max-w-sm">
                      {tmpl.body}
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
            title={editingTmpl ? "Edit Email Template" : "Add Email Template"}
            description="Use template placeholders like {{patient_name}}, {{patient_uhid}}, {{case_number}}."
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
                placeholder="e.g. Patient Registration Welcome, Report Ready"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Email Subject Line *
              </label>
              <Input
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Your Apex Diagnostic Report is Ready (Case #{{case_number}})"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700 uppercase">
                  Template Body (Plain text / Markdown) *
                </label>
                <div className="flex items-center space-x-1">
                  <span className="text-[11px] text-slate-400">Insert:</span>
                  {[
                    "{{patient_name}}",
                    "{{patient_uhid}}",
                    "{{case_number}}",
                    "{{branch_name}}",
                  ].map((token) => (
                    <button
                      key={token}
                      type="button"
                      onClick={() => handleInsertToken(token)}
                      className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px] font-mono hover:bg-blue-100"
                    >
                      {token}
                    </button>
                  ))}
                </div>
              </div>
              <textarea
                required
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={6}
                className="w-full rounded-md border border-slate-200 p-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
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
