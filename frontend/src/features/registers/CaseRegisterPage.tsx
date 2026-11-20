import React, { useEffect, useState } from "react";
import {
  Calendar,
  Search,
  FileSpreadsheet,
  RefreshCw,
  BookOpen,
} from "lucide-react";
import { apiClient } from "@/lib/api";
import { RegisterSummaryData, FinancialRegisterRow } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/common/PageHeader";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { EmptyState } from "@/components/common/EmptyState";
import { exportToCsv } from "@/lib/exportUtils";

export const CaseRegisterPage: React.FC = () => {
  const [data, setData] = useState<RegisterSummaryData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [search, setSearch] = useState("");

  const fetchCaseRegister = async () => {
    setIsLoading(true);
    try {
      const params: any = {};
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;
      if (search.trim()) params.search = search.trim();

      const res = await apiClient.get<RegisterSummaryData>("/registers/case", { params });
      setData(res.data);
    } catch (err) {
      console.error("Failed to load case register:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCaseRegister();
  }, [startDate, endDate]);

  const handleExport = () => {
    if (!data?.items) return;
    const headers = ["Date", "Receipt No", "Case No", "Patient Name", "Charges (INR)"];
    const rows = data.items.map((row) => [
      row.transaction_date,
      row.receipt_number || "-",
      row.case_number || "-",
      row.patient_name || "-",
      Number(row.amount).toFixed(2),
    ]);
    exportToCsv(`Case_Register_${new Date().toISOString().slice(0, 10)}`, headers, rows);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Case Register"
        description="Chronological record of patient cases, receipts, and clinical charges."
      >
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={handleExport} className="flex items-center gap-1.5">
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            Export to Excel
          </Button>
          <Button variant="outline" size="sm" onClick={fetchCaseRegister} className="flex items-center gap-1.5">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
        </div>
      </PageHeader>

      {/* Filter Toolbar (Matching reference screenshot case_register.png) */}
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
          <div className="relative w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <Input
              placeholder="Search patient, case, receipt..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && fetchCaseRegister()}
              className="pl-8 h-9 text-xs"
            />
          </div>
          <Button size="sm" onClick={fetchCaseRegister} className="h-9 text-xs">
            Filter
          </Button>
          {(startDate || endDate || search) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setStartDate("");
                setEndDate("");
                setSearch("");
              }}
              className="h-9 text-xs text-slate-500"
            >
              Reset
            </Button>
          )}
        </div>
      </div>

      {/* Register Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-16">
            <LoadingSpinner size="lg" message="Loading case register entries..." />
          </div>
        ) : !data || data.items.length === 0 ? (
          <EmptyState
            title="No Case Register Records"
            description="No case transactions found for the specified period."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-700">
                  <th className="py-3 px-4">DATE</th>
                  <th className="py-3 px-4">RECEIPT NO</th>
                  <th className="py-3 px-4">CASE NO</th>
                  <th className="py-3 px-4">PATIENT NAME</th>
                  <th className="py-3 px-4 text-right">CHARGES</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-xs">
                {data.items.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 text-slate-700">{row.transaction_date}</td>
                    <td className="py-3 px-4 text-blue-600 font-medium">{row.receipt_number || "-"}</td>
                    <td className="py-3 px-4 text-slate-900 font-medium">{row.case_number || "-"}</td>
                    <td className="py-3 px-4 font-sans text-slate-900 font-medium">{row.patient_name || "-"}</td>
                    <td className="py-3 px-4 text-right font-medium text-slate-900">
                      ₹{Number(row.amount).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer Summary Banner (Matching reference screenshot case_register.png) */}
        {data && data.items.length > 0 && (
          <div className="bg-slate-50 border-t border-slate-200 p-4 flex flex-col sm:flex-row items-center justify-between text-xs font-semibold text-slate-700">
            <div className="flex items-center space-x-6">
              <span className="bg-white px-3 py-1.5 rounded-lg border border-slate-200">
                COUNT = <span className="font-bold text-slate-900">{data.count}</span>
              </span>
              <span className="bg-white px-3 py-1.5 rounded-lg border border-slate-200">
                SUM = <span className="font-bold text-emerald-700">₹{Number(data.sum_amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
              </span>
            </div>
            <div className="text-slate-400 mt-2 sm:mt-0 font-normal">
              Official Apex Health Diagnostics Case Register
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

