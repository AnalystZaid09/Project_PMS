import React, { useEffect, useState } from "react";
import { Search, Plus, FileSpreadsheet, Trash2 } from "lucide-react";
import { apiClient } from "@/lib/api";
import { InvestigationBranchPriceItem, InvestigationItem, BranchInfo } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogHeader, DialogFooter } from "@/components/ui/dialog";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/common/PageHeader";

export const InvestigationChargesPage: React.FC = () => {
  const [charges, setCharges] = useState<InvestigationBranchPriceItem[]>([]);
  const [investigations, setInvestigations] = useState<InvestigationItem[]>([]);
  const [branches, setBranches] = useState<BranchInfo[]>([]);

  const [selectedBranchId, setSelectedBranchId] = useState("");
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [formBranchId, setFormBranchId] = useState("");
  const [formInvestigationId, setFormInvestigationId] = useState("");
  const [price, setPrice] = useState<number>(0);
  const [emergencyPrice, setEmergencyPrice] = useState<number>(0);

  const [modalError, setModalError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const fetchDependencies = async () => {
    try {
      const [invsRes, branchesRes] = await Promise.all([
        apiClient.get<InvestigationItem[]>("/investigations", { params: { active_only: true } }),
        apiClient.get<BranchInfo[]>("/branches", { params: { active_only: true } }),
      ]);
      setInvestigations(invsRes.data);
      setBranches(branchesRes.data);
    } catch (err) {
      console.error("Failed to load dependencies:", err);
    }
  };

  const fetchCharges = async () => {
    try {
      const params: any = {};
      if (selectedBranchId) params.branch_id = selectedBranchId;

      const res = await apiClient.get<InvestigationBranchPriceItem[]>("/investigation-charges", { params });
      setCharges(res.data);
    } catch (err) {
      console.error("Failed to load branch charges:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDependencies();
  }, []);

  useEffect(() => {
    fetchCharges();
  }, [selectedBranchId]);

  const handleOpenAdd = () => {
    setFormBranchId(selectedBranchId || branches[0]?.id || "");
    const firstInv = investigations[0];
    setFormInvestigationId(firstInv?.id || "");
    setPrice(firstInv ? Number(firstInv.default_price) : 0);
    setEmergencyPrice(firstInv ? Number(firstInv.emergency_price) : 0);
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleSelectInvestigation = (invId: string) => {
    setFormInvestigationId(invId);
    const inv = investigations.find((i) => i.id === invId);
    if (inv) {
      setPrice(Number(inv.default_price));
      setEmergencyPrice(Number(inv.emergency_price));
    }
  };

  const handleDeleteCharge = async (chargeId: string) => {
    if (!window.confirm("Are you sure you want to remove this branch price override?")) return;
    try {
      await apiClient.delete(`/investigation-charges/${chargeId}`);
      setCharges((prev) => prev.filter((c) => c.id !== chargeId));
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to remove charge override.");
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    setIsSaving(true);

    try {
      const payload = {
        branch_id: formBranchId,
        investigation_id: formInvestigationId,
        price: Number(price),
        emergency_price: Number(emergencyPrice),
      };

      const res = await apiClient.post("/investigation-charges", payload);
      setCharges((prev) => {
        const filtered = prev.filter(
          (c) => !(c.branch_id === formBranchId && c.investigation_id === formInvestigationId)
        );
        return [res.data, ...filtered];
      });
      setIsModalOpen(false);
    } catch (err: any) {
      setModalError(err.response?.data?.detail || "Failed to save branch charge.");
    } finally {
      setIsSaving(false);
    }
  };

  const filteredCharges = charges.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.investigation_name?.toLowerCase().includes(q) ||
      c.investigation_code?.toLowerCase().includes(q) ||
      c.branch_name?.toLowerCase().includes(q)
    );
  });

  const displayedCharges = filteredCharges.slice(0, pageSize);

  const handleExportExcel = () => {
    const csvContent =
      "data:text/csv;charset=utf-8," +
      ["Serial No,Regular Charges,Emergency Charges,Branch Name,Investigation Masters,Investigation Code"]
        .concat(
          filteredCharges.map(
            (c, idx) =>
              `"${idx + 1}","₹${c.price}","₹${c.emergency_price}","${c.branch_name || ""}","${
                c.investigation_name || ""
              }","${c.investigation_code || ""}"`
          )
        )
        .join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `apex_investigation_charges_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Investigation Charges"
        description="Configure branch-specific price overrides and emergency charges for tests"
        action={
          <div className="flex items-center space-x-3">
            <Button variant="outline" onClick={handleExportExcel}>
              <FileSpreadsheet className="h-4 w-4 mr-2 text-emerald-600" />
              Export to Excel
            </Button>
            <Button onClick={handleOpenAdd}>
              <Plus className="h-4 w-4 mr-2" />
              Add Investigation Charges
            </Button>
          </div>
        }
      />

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="SEARCH CHARGES..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 uppercase text-xs"
            />
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold text-slate-500 uppercase">Branch:</span>
            <select
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              className="border border-slate-200 rounded-md px-2.5 py-1.5 text-xs bg-white text-slate-700 font-medium max-w-xs"
            >
              <option value="">All Branches</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
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
          <span>Showing {displayedCharges.length} of {filteredCharges.length} results</span>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-20 flex justify-center">
            <LoadingSpinner />
          </div>
        ) : filteredCharges.length === 0 ? (
          <EmptyState
            title="No branch-specific charges found"
            description="Branch overrides allow setting localized pricing for diagnostic tests."
            action={
              <Button onClick={handleOpenAdd} size="sm">
                <Plus className="h-4 w-4 mr-1" /> Add Charge Override
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-semibold text-slate-500 tracking-wider uppercase">
                  <th className="py-3.5 px-4 w-16">Serial No.</th>
                  <th className="py-3.5 px-5">Regular Charges</th>
                  <th className="py-3.5 px-5">Emergency Charges</th>
                  <th className="py-3.5 px-5">Branch Facility</th>
                  <th className="py-3.5 px-6">Investigation Masters</th>
                  <th className="py-3.5 px-4">Charges Code</th>
                  <th className="py-3.5 px-4 text-right w-20">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayedCharges.map((charge, index) => (
                  <tr key={charge.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3.5 px-4 text-slate-500 font-mono text-xs">{index + 1}</td>
                    <td className="py-3.5 px-5 font-mono font-bold text-slate-900">
                      ₹{Number(charge.price).toFixed(2)}
                    </td>
                    <td className="py-3.5 px-5 font-mono font-bold text-amber-600">
                      ₹{Number(charge.emergency_price).toFixed(2)}
                    </td>
                    <td className="py-3.5 px-5 text-xs font-medium text-slate-700">
                      {charge.branch_name}
                    </td>
                    <td className="py-3.5 px-6 font-medium text-slate-800 uppercase">
                      {charge.investigation_name}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs text-blue-600 font-semibold">
                      {charge.investigation_code}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleDeleteCharge(charge.id)}
                        className="p-1.5 text-rose-500 hover:bg-rose-50 rounded transition-colors"
                        title="Delete Charge Override"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Override Dialog */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <div className="p-6">
          <DialogHeader
            title="Add Investigation Charges Override"
            description="Set branch-specific regular and emergency charges for this test."
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
                Branch Facility *
              </label>
              <select
                required
                value={formBranchId}
                onChange={(e) => setFormBranchId(e.target.value)}
                className="w-full rounded-md border border-slate-200 p-2 text-sm bg-white font-medium"
              >
                <option value="">Select Branch...</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.city})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Investigation / Service *
              </label>
              <select
                required
                value={formInvestigationId}
                onChange={(e) => handleSelectInvestigation(e.target.value)}
                className="w-full rounded-md border border-slate-200 p-2 text-sm bg-white font-medium"
              >
                <option value="">Select Investigation...</option>
                {investigations.map((i) => (
                  <option key={i.id} value={i.id}>
                    [{i.code}] {i.name} (Base: ₹{i.default_price})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Branch Regular Charges (₹) *
                </label>
                <Input
                  type="number"
                  min={0}
                  step={1}
                  required
                  value={price}
                  onChange={(e) => setPrice(Number(e.target.value))}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Branch Emergency Charges (₹)
                </label>
                <Input
                  type="number"
                  min={0}
                  step={1}
                  value={emergencyPrice}
                  onChange={(e) => setEmergencyPrice(Number(e.target.value))}
                />
              </div>
            </div>

            <DialogFooter className="mt-6 pt-4 border-t border-slate-100 flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? "Saving..." : "Save Branch Charges"}
              </Button>
            </DialogFooter>
          </form>
        </div>
      </Dialog>
    </div>
  );
};
