import React, { useEffect, useState } from "react";
import {
  FileSpreadsheet,
  Printer,
  RefreshCw,
  Search,
  Filter,
} from "lucide-react";
import { apiClient } from "@/lib/api";
import { OtherChargesReportRow, OtherChargeTypeItem } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/common/PageHeader";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { EmptyState } from "@/components/common/EmptyState";
import { exportToCsv } from "@/lib/exportUtils";

export const OtherChargesReportPage: React.FC = () => {
  const [rows, setRows] = useState<OtherChargesReportRow[]>([]);
  const [chargeTypes, setChargeTypes] = useState<OtherChargeTypeItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters (Matching Other_Charges_Report.png)
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");

  // Load other charge types for filter
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const res = await apiClient.get<OtherChargeTypeItem[]>("/masters/other-charges");
        setChargeTypes(res.data);
      } catch (err) {
        console.error("Failed to load other charge categories:", err);
      }
    };
    loadCategories();
  }, []);

  const fetchOtherCharges = async () => {
    setIsLoading(true);
    try {
      const params: any = {};
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;
      if (selectedCategory) params.category = selectedCategory;

      const res = await apiClient.get<OtherChargesReportRow[]>("/reports/other-charges", { params });
      setRows(res.data);
    } catch (err) {
      console.error("Failed to load other charges report:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOtherCharges();
  }, [startDate, endDate, selectedCategory]);

  const totalAmount = rows.reduce((sum, r) => sum + Number(r.amount), 0);

  const handleExport = () => {
    const headers = [
      "Sr No",
      "Case No",
      "Date",
      "Patient Name",
      "UHID",
      "Charge Category",
      "Charge Name",
      "Amount (INR)",
    ];
    const dataRows = rows.map((r, idx) => [
      idx + 1,
      r.case_number,
      r.date,
      r.patient_name,
      r.patient_uhid,
      r.charge_category,
      r.charge_name,
      Number(r.amount).toFixed(2),
    ]);
    exportToCsv(`Other_Charges_Report_${new Date().toISOString().slice(0, 10)}`, headers, dataRows);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Other Charges Report"
        description="Audit supplementary, emergency, consumable, and administrative fee collections."
      >
        <div className="flex items-center space-x-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => window.print()}
            className="flex items-center gap-1.5"
          >
            <Printer className="w-4 h-4" />
            Print Report
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport} className="flex items-center gap-1.5">
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            Export to Excel
          </Button>
          <Button variant="outline" size="sm" onClick={fetchOtherCharges} className="flex items-center gap-1.5">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
        </div>
      </PageHeader>

      {/* Filter Toolbar (Matching reference screenshot Other_Charges_Report.png) */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="flex flex-wrap items-center gap-3 w-full">
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
            <span className="text-xs font-semibold text-slate-600">Category:</span>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="h-9 px-2 text-xs rounded-md border border-slate-300 bg-white"
            >
              <option value="">All Categories</option>
              {chargeTypes.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <Button size="sm" onClick={fetchOtherCharges} className="h-9 text-xs">
            Search
          </Button>

          {(startDate || endDate || selectedCategory) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setStartDate("");
                setEndDate("");
                setSelectedCategory("");
              }}
              className="h-9 text-xs text-slate-500"
            >
              Reset
            </Button>
          )}
        </div>
      </div>

      {/* Table (Matching exact columns of Other_Charges_Report.png) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-16">
            <LoadingSpinner size="lg" message="Compiling other charges report..." />
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            title="No Other Charges Found"
            description="No ancillary charges match the chosen filter parameters."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200 font-bold uppercase tracking-wider text-slate-700">
                  <th className="py-3 px-3">SR.</th>
                  <th className="py-3 px-3">CASE NO.</th>
                  <th className="py-3 px-3">DATE</th>
                  <th className="py-3 px-3">PATIENT NAME</th>
                  <th className="py-3 px-3">UHID</th>
                  <th className="py-3 px-3">CHARGE CATEGORY</th>
                  <th className="py-3 px-3">CHARGE NAME</th>
                  <th className="py-3 px-3 text-right">AMOUNT</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((r, idx) => (
                  <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-2.5 px-3 font-mono text-slate-400">{idx + 1}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-900 font-medium">{r.case_number}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-600 whitespace-nowrap">{r.date}</td>
                    <td className="py-2.5 px-3 font-medium text-slate-900">{r.patient_name}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-500">{r.patient_uhid}</td>
                    <td className="py-2.5 px-3">
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                        {r.charge_category}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-medium text-slate-800">{r.charge_name}</td>
                    <td className="py-2.5 px-3 text-right font-medium text-slate-900 font-mono">
                      ₹{Number(r.amount).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer Summary Banner (Matching reference screenshot Other_Charges_Report.png) */}
        {rows.length > 0 && (
          <div className="bg-slate-50 border-t border-slate-200 p-4 flex flex-col sm:flex-row items-center justify-between text-xs font-semibold text-slate-700">
            <div className="flex items-center space-x-6">
              <span className="bg-white px-3 py-1.5 rounded-lg border border-slate-200">
                Total Records = <span className="font-bold text-slate-900">{rows.length}</span>
              </span>
              <span className="bg-white px-3 py-1.5 rounded-lg border border-slate-200">
                Total Revenue = <span className="font-bold text-emerald-700">₹{totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
              </span>
            </div>
            <div className="text-slate-400 mt-2 sm:mt-0 font-normal">
              Apex Health Diagnostics Ancillary Financial Audit
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

