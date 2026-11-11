import React, { useEffect, useState } from "react";
import { Search, Plus, FileSpreadsheet, Edit2, Trash2 } from "lucide-react";
import { apiClient } from "@/lib/api";
import { BranchInfo } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogHeader, DialogFooter } from "@/components/ui/dialog";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/common/PageHeader";

export const BranchesPage: React.FC = () => {
  const [branches, setBranches] = useState<BranchInfo[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [branchCode, setBranchCode] = useState("");
  const [name, setName] = useState("");
  const [country, setCountry] = useState("India");
  const [state, setState] = useState("Gujarat");
  const [city, setCity] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [modalError, setModalError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const fetchBranches = async () => {
    try {
      const res = await apiClient.get<BranchInfo[]>("/branches", {
        params: search ? { search } : {},
      });
      setBranches(res.data);
    } catch (err) {
      console.error("Failed to load branches:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBranches();
  }, [search]);

  const handleToggleStatus = async (branch: BranchInfo) => {
    try {
      const res = await apiClient.patch(`/branches/${branch.id}/toggle-status`);
      setBranches((prev) =>
        prev.map((b) => (b.id === branch.id ? { ...b, is_active: res.data.is_active } : b))
      );
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to toggle branch status.");
    }
  };

  const handleCreateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    setIsSaving(true);

    try {
      await apiClient.post("/branches", {
        branch_code: branchCode,
        name,
        country,
        state,
        city,
        phone,
        email,
      });

      setIsModalOpen(false);
      setBranchCode("");
      setName("");
      setCity("");
      setPhone("");
      setEmail("");
      fetchBranches();
    } catch (err: any) {
      setModalError(err.response?.data?.detail || "Failed to create branch.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportExcel = () => {
    const csvContent =
      "data:text/csv;charset=utf-8," +
      ["Branch Code,Name,Country,State,City,Phone,Status"]
        .concat(
          branches.map(
            (b) =>
              `"${b.branch_code}","${b.name}","${b.country}","${b.state}","${b.city}","${b.phone || ""}","${
                b.is_active ? "Active" : "Inactive"
              }"`
          )
        )
        .join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `branches_export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Branches"
        description="Physical centres, clinics, and diagnostic branches"
        action={
          <div className="flex items-center space-x-3">
            <Button onClick={() => setIsModalOpen(true)} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-1.5" />
              Add Branch
            </Button>
            <Button onClick={handleExportExcel} variant="outline" className="border-blue-600 text-blue-600 hover:bg-blue-50">
              <FileSpreadsheet className="h-4 w-4 mr-1.5" />
              Export to Excel
            </Button>
          </div>
        }
      />

      {/* Search Bar matching Branch.png */}
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
          <span>Showing <strong>{branches.length}</strong> results</span>
        </div>
      </div>

      {/* Branches Table matching Branch.png */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {isLoading ? (
          <LoadingSpinner message="Loading branch centres..." />
        ) : branches.length === 0 ? (
          <EmptyState
            title="No Branches Found"
            description="No branches currently match your search criteria."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  <th className="py-3 px-4">SERIAL NO.</th>
                  <th className="py-3 px-4">BRANCH ID</th>
                  <th className="py-3 px-4">BRANCH NAME</th>
                  <th className="py-3 px-4">COUNTRY NAME</th>
                  <th className="py-3 px-4">STATE NAME</th>
                  <th className="py-3 px-4">CITY NAME</th>
                  <th className="py-3 px-4">STATUS</th>
                  <th className="py-3 px-4 text-right">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {branches.map((b, idx) => (
                  <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 text-slate-500 font-medium">{idx + 1}</td>
                    <td className="py-3 px-4 text-blue-600 font-bold">{b.branch_code}</td>
                    <td className="py-3 px-4 font-semibold text-slate-900 uppercase">{b.name}</td>
                    <td className="py-3 px-4 uppercase text-slate-700">{b.country}</td>
                    <td className="py-3 px-4 uppercase text-slate-700">{b.state}</td>
                    <td className="py-3 px-4 uppercase text-slate-700">{b.city}</td>
                    <td className="py-3 px-4">
                      <Switch
                        checked={b.is_active}
                        onCheckedChange={() => handleToggleStatus(b)}
                      />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          className="rounded-lg p-1.5 text-blue-600 hover:bg-blue-50 transition-colors"
                          title="Edit branch"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleToggleStatus(b)}
                          className="rounded-lg p-1.5 text-red-600 hover:bg-red-50 transition-colors"
                          title={b.is_active ? "Deactivate" : "Activate"}
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

      {/* Add Branch Dialog */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogHeader
          title="Add New Branch Centre"
          description="Register a new operational clinical branch or diagnostic laboratory"
          onClose={() => setIsModalOpen(false)}
        />
        {modalError && (
          <div className="my-2 rounded-lg bg-red-50 p-3 text-xs text-red-700 border border-red-200">
            {modalError}
          </div>
        )}
        <form onSubmit={handleCreateBranch} className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Branch Code / ID *</label>
              <Input
                value={branchCode}
                onChange={(e) => setBranchCode(e.target.value)}
                placeholder="e.g. 15"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Branch Name *</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Nairobi Diagnostic Centre"
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Country *</label>
              <Input
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">State *</label>
              <Input
                value={state}
                onChange={(e) => setState(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">City *</label>
              <Input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Telephone</label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 265 000000"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="branch@nexushealth.org"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Saving..." : "Save Branch"}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>
    </div>
  );
};
