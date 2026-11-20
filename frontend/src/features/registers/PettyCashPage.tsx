import React, { useEffect, useState } from "react";
import {
  FileSpreadsheet,
  Plus,
  RefreshCw,
  Search,
  Wallet,
  X,
  AlertCircle,
} from "lucide-react";
import { apiClient } from "@/lib/api";
import { RegisterSummaryData, FinancialRegisterRow } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/common/PageHeader";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { EmptyState } from "@/components/common/EmptyState";
import { Dialog, DialogHeader, DialogFooter } from "@/components/ui/dialog";
import { exportToCsv } from "@/lib/exportUtils";

export const PettyCashPage: React.FC = () => {
  const [data, setData] = useState<RegisterSummaryData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [search, setSearch] = useState("");
  const [directionFilter, setDirectionFilter] = useState("");

  // Add Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [formDate, setFormDate] = useState(new Date().toISOString().slice(0, 10));
  const [formParticulars, setFormParticulars] = useState("");
  const [formAmount, setFormAmount] = useState<number>(0);
  const [formDirection, setFormDirection] = useState<"credit" | "debit">("debit");
  const [formRemark, setFormRemark] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchPettyCash = async () => {
    setIsLoading(true);
    try {
      const params: any = {};
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;
      if (search.trim()) params.search = search.trim();
      if (directionFilter) params.direction = directionFilter;

      const res = await apiClient.get<RegisterSummaryData>("/registers/petty-cash", { params });
      setData(res.data);
    } catch (err) {
      console.error("Failed to load petty cash register:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPettyCash();
  }, [startDate, endDate, directionFilter]);

  const handleCreateEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formAmount <= 0) {
      setFormError("Amount must be greater than zero.");
      return;
    }
    if (!formParticulars.trim()) {
      setFormError("Particulars description is required.");
      return;
    }

    setIsSubmitting(true);
    setFormError(null);
    try {
      await apiClient.post("/registers/petty-cash", {
        transaction_date: formDate,
        particulars: formParticulars.trim(),
        amount: formAmount,
        direction: formDirection,
        debit_or_credit: formDirection.toUpperCase(),
        remark: formRemark.trim() || undefined,
      });
      setIsAddModalOpen(false);
      // Reset form
      setFormParticulars("");
      setFormAmount(0);
      setFormRemark("");
      fetchPettyCash();
    } catch (err: any) {
      setFormError(err.response?.data?.detail || "Failed to create petty cash entry.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExport = () => {
    if (!data?.items) return;
    const headers = [
      "Serial No.",
      "Date",
      "Particulars",
      "Amount (INR)",
      "Debit / Credit",
      "Remark",
    ];
    const rows = data.items.map((row, idx) => [
      row.serial_no || idx + 1,
      row.transaction_date,
      row.particulars || "-",
      Number(row.amount).toFixed(2),
      row.debit_or_credit || row.direction.toUpperCase(),
      row.remark || "-",
    ]);
    exportToCsv(`Petty_Cash_${new Date().toISOString().slice(0, 10)}`, headers, rows);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Petty Cash Register"
        description="Daily petty cash float, small clinic incidentals, office tea/stationery, and local conveyance."
      >
        <div className="flex items-center space-x-2">
          <Button
            size="sm"
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Plus className="w-4 h-4" />
            Add Petty Cash
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport} className="flex items-center gap-1.5">
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            Export to Excel
          </Button>
          <Button variant="outline" size="sm" onClick={fetchPettyCash} className="flex items-center gap-1.5">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
        </div>
      </PageHeader>

      {/* Filter Toolbar (Matching reference screenshot petty_cash.png) */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-600">Date From:</span>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="h-9 w-36 text-xs"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-600">To:</span>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="h-9 w-36 text-xs"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <select
              value={directionFilter}
              onChange={(e) => setDirectionFilter(e.target.value)}
              className="h-9 px-2 text-xs rounded-md border border-slate-300 bg-white"
            >
              <option value="">All Types</option>
              <option value="credit">Credit (Float Replenishment)</option>
              <option value="debit">Debit (Cash Expense)</option>
            </select>
          </div>
          <div className="relative w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <Input
              placeholder="Search particulars..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && fetchPettyCash()}
              className="pl-8 h-9 text-xs"
            />
          </div>
          <Button size="sm" onClick={fetchPettyCash} className="h-9 text-xs">
            Filter
          </Button>
        </div>
      </div>

      {/* Table (Matching exact columns of petty_cash.png) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-16">
            <LoadingSpinner size="lg" message="Loading petty cash vouchers..." />
          </div>
        ) : !data || data.items.length === 0 ? (
          <EmptyState
            title="No Petty Cash Records"
            description="No petty cash records found for the given criteria."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200 font-bold uppercase tracking-wider text-slate-700">
                  <th className="py-3 px-3">SERIAL NO.</th>
                  <th className="py-3 px-3">DATE</th>
                  <th className="py-3 px-3">PARTICULARS</th>
                  <th className="py-3 px-3 text-right">AMOUNT</th>
                  <th className="py-3 px-3 text-center">DEBITORCREDIT</th>
                  <th className="py-3 px-3">REMARK</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.items.map((row, idx) => (
                  <tr key={row.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-2.5 px-3 font-mono text-slate-500">{row.serial_no || idx + 1}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-700 whitespace-nowrap">{row.transaction_date}</td>
                    <td className="py-2.5 px-3 font-medium text-slate-900">{row.particulars}</td>
                    <td className="py-2.5 px-3 text-right font-medium text-slate-900 font-mono">
                      ₹{Number(row.amount).toFixed(2)}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                          row.direction === "credit"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-rose-100 text-rose-800"
                        }`}
                      >
                        {row.debit_or_credit || row.direction.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-500 max-w-xs truncate">{row.remark || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer Summary Banner (Matching reference screenshot petty_cash.png) */}
        {data && data.items.length > 0 && (
          <div className="bg-slate-50 border-t border-slate-200 p-4 flex flex-col sm:flex-row items-center justify-between text-xs font-semibold text-slate-700">
            <div className="flex flex-wrap items-center gap-4">
              <span className="bg-white px-3 py-1.5 rounded-lg border border-slate-200">
                COUNT = <span className="font-bold text-slate-900">{data.count}</span>
              </span>
              <span className="bg-white px-3 py-1.5 rounded-lg border border-slate-200">
                CREDIT (FLOAT) = <span className="font-bold text-emerald-700">₹{Number(data.credit_total).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
              </span>
              <span className="bg-white px-3 py-1.5 rounded-lg border border-slate-200">
                DEBIT (DISBURSED) = <span className="font-bold text-rose-700">₹{Number(data.debit_total).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
              </span>
              <span className="bg-white px-3 py-1.5 rounded-lg border border-slate-200">
                NET BALANCE = <span className="font-bold text-blue-700">₹{Number(data.credit_total - data.debit_total).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
              </span>
            </div>
            <div className="text-slate-400 mt-2 sm:mt-0 font-normal">
              Apex Health Diagnostics Petty Cash
            </div>
          </div>
        )}
      </div>

      {/* Add Petty Cash Modal */}
      {isAddModalOpen && (
        <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden">
            <DialogHeader>
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                    <Wallet className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">Add Petty Cash Entry</h3>
                    <p className="text-xs text-slate-500">Record a petty cash float or small expense</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </DialogHeader>

            <form onSubmit={handleCreateEntry} className="p-5 space-y-3.5 text-xs">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block font-medium text-slate-700 mb-1">Date*</label>
                <Input
                  type="date"
                  required
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Particulars*</label>
                <Input
                  required
                  placeholder="e.g. Courier charges / Emergency cleaning kit / Tea coffee"
                  value={formParticulars}
                  onChange={(e) => setFormParticulars(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Amount (₹)*</label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={formAmount}
                    onChange={(e) => setFormAmount(parseFloat(e.target.value) || 0)}
                    className="h-9 text-xs font-mono font-semibold"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Flow Type*</label>
                  <select
                    value={formDirection}
                    onChange={(e) => setFormDirection(e.target.value as any)}
                    className="w-full h-9 px-2 text-xs rounded-md border border-slate-300 bg-white"
                  >
                    <option value="debit">Debit (Expense Outflow)</option>
                    <option value="credit">Credit (Float Inflow)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Remark</label>
                <Input
                  placeholder="e.g. Authorized by Reception Head"
                  value={formRemark}
                  onChange={(e) => setFormRemark(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <DialogFooter>
                <div className="flex justify-end space-x-2 pt-3 border-t border-slate-200 w-full">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsAddModalOpen(false)}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {isSubmitting ? "Saving..." : "Save Entry"}
                  </Button>
                </div>
              </DialogFooter>
            </form>
          </div>
        </Dialog>
      )}
    </div>
  );
};

