import React, { useEffect, useState } from "react";
import { Search, Plus, FileSpreadsheet, Edit2, Trash2, Tag } from "lucide-react";
import { apiClient } from "@/lib/api";
import { OtherChargeTypeItem } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogHeader, DialogFooter } from "@/components/ui/dialog";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/common/PageHeader";

export const OtherChargesPage: React.FC = () => {
  const [charges, setCharges] = useState<OtherChargeTypeItem[]>([]);
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCharge, setEditingCharge] = useState<OtherChargeTypeItem | null>(null);

  // Form State
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [defaultAmount, setDefaultAmount] = useState<number>(0);
  const [isTaxable, setIsTaxable] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [modalError, setModalError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const fetchCharges = async () => {
    try {
      const res = await apiClient.get<OtherChargeTypeItem[]>("/other-charges", {
        params: search ? { search } : {},
      });
      setCharges(res.data);
    } catch (err) {
      console.error("Failed to load other charge types:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCharges();
  }, [search]);

  const handleOpenAdd = () => {
    setEditingCharge(null);
    setName("");
    setCode("");
    setDefaultAmount(0);
    setIsTaxable(false);
    setIsActive(true);
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (charge: OtherChargeTypeItem) => {
    setEditingCharge(charge);
    setName(charge.name);
    setCode(charge.code);
    setDefaultAmount(Number(charge.default_amount));
    setIsTaxable(charge.is_taxable);
    setIsActive(charge.is_active);
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleToggleStatus = async (charge: OtherChargeTypeItem) => {
    try {
      const res = await apiClient.patch(`/other-charges/${charge.id}/toggle-status`);
      setCharges((prev) =>
        prev.map((c) => (c.id === charge.id ? { ...c, is_active: res.data.is_active } : c))
      );
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to update charge status.");
    }
  };

  const handleDelete = async (charge: OtherChargeTypeItem) => {
    if (!window.confirm(`Are you sure you want to delete charge "${charge.name}"?`)) return;
    try {
      await apiClient.delete(`/other-charges/${charge.id}`);
      setCharges((prev) => prev.filter((c) => c.id !== charge.id));
    } catch (err: any) {
      alert(err.response?.data?.detail || "Cannot delete charge.");
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    setIsSaving(true);

    try {
      const payload = {
        name,
        code,
        default_amount: Number(defaultAmount),
        is_taxable: isTaxable,
        is_active: isActive,
      };

      if (editingCharge) {
        const res = await apiClient.put(`/other-charges/${editingCharge.id}`, payload);
        setCharges((prev) => prev.map((c) => (c.id === editingCharge.id ? res.data : c)));
      } else {
        const res = await apiClient.post("/other-charges", payload);
        setCharges((prev) => [res.data, ...prev]);
      }
      setIsModalOpen(false);
    } catch (err: any) {
      setModalError(err.response?.data?.detail || "Failed to save other charge.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportExcel = () => {
    const csvContent =
      "data:text/csv;charset=utf-8," +
      ["Serial No,Code,Charge Name,Default Amount,Taxable,Status"]
        .concat(
          charges.map(
            (c, idx) =>
              `"${idx + 1}","${c.code}","${c.name}","₹${c.default_amount}","${
                c.is_taxable ? "Yes" : "No"
              }","${c.is_active ? "Active" : "Inactive"}"`
          )
        )
        .join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `apex_other_charges_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const displayedCharges = charges.slice(0, pageSize);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Other Charge Types"
        description="Manage administrative, nursing, sampling, emergency triage, and consumable fee types"
        action={
          <div className="flex items-center space-x-3">
            <Button variant="outline" onClick={handleExportExcel}>
              <FileSpreadsheet className="h-4 w-4 mr-2 text-emerald-600" />
              Export to Excel
            </Button>
            <Button onClick={handleOpenAdd}>
              <Plus className="h-4 w-4 mr-2" />
              Add Other Charge
            </Button>
          </div>
        }
      />

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="SEARCH OTHER CHARGES..."
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
          <span>Showing {displayedCharges.length} of {charges.length} results</span>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-20 flex justify-center">
            <LoadingSpinner />
          </div>
        ) : charges.length === 0 ? (
          <EmptyState
            title="No other charges found"
            description="Add auxiliary charge types such as Registration, Nursing, or PPE."
            action={
              <Button onClick={handleOpenAdd} size="sm">
                <Plus className="h-4 w-4 mr-1" /> Add Charge Type
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-semibold text-slate-500 tracking-wider uppercase">
                  <th className="py-3.5 px-4 w-16">Serial No.</th>
                  <th className="py-3.5 px-4 w-28">Code</th>
                  <th className="py-3.5 px-6">Charge Name</th>
                  <th className="py-3.5 px-4">Default Amount</th>
                  <th className="py-3.5 px-4">Taxable</th>
                  <th className="py-3.5 px-4 w-28">Status</th>
                  <th className="py-3.5 px-4 text-right w-24">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayedCharges.map((charge, index) => (
                  <tr key={charge.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3.5 px-4 text-slate-500 font-mono text-xs">{index + 1}</td>
                    <td className="py-3.5 px-4 font-mono font-semibold text-blue-600">{charge.code}</td>
                    <td className="py-3.5 px-6 font-medium text-slate-800 uppercase tracking-wide">
                      {charge.name}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                      ₹{Number(charge.default_amount).toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold ${
                          charge.is_taxable
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {charge.is_taxable ? "Yes (Taxable)" : "No"}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={charge.is_active}
                          onCheckedChange={() => handleToggleStatus(charge)}
                        />
                        <span className={`text-xs font-medium ${charge.is_active ? "text-emerald-600" : "text-slate-400"}`}>
                          {charge.is_active ? "Active" : "Inactive"}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end space-x-1">
                        <button
                          onClick={() => handleOpenEdit(charge)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="Edit Charge"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(charge)}
                          className="p-1.5 text-rose-500 hover:bg-rose-50 rounded transition-colors"
                          title="Delete Charge"
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
            title={editingCharge ? "Edit Other Charge Type" : "Add Other Charge Type"}
            description="Configure supplementary diagnostic or administrative charge items."
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
                Charge Name *
              </label>
              <Input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. REGISTRATION & CARD, EMERGENCY TRIAGE"
                className="uppercase"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Charge Code *
              </label>
              <Input
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="e.g. REG-FEE, EMG-FEE"
                className="uppercase font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Default Amount (₹) *
              </label>
              <Input
                type="number"
                min={0}
                step={1}
                required
                value={defaultAmount}
                onChange={(e) => setDefaultAmount(Number(e.target.value))}
              />
            </div>
            <div className="flex items-center space-x-2 pt-1">
              <Switch checked={isTaxable} onCheckedChange={setIsTaxable} />
              <label className="text-xs font-medium text-slate-700">Subject to GST / Sales Tax</label>
            </div>
            <div className="flex items-center space-x-2 pt-1">
              <Switch checked={isActive} onCheckedChange={setIsActive} />
              <label className="text-xs font-medium text-slate-700">Active Charge</label>
            </div>
            <DialogFooter className="mt-6 pt-4 border-t border-slate-100 flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? "Saving..." : editingCharge ? "Save Changes" : "Create Charge"}
              </Button>
            </DialogFooter>
          </form>
        </div>
      </Dialog>
    </div>
  );
};
