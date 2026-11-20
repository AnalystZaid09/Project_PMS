import React, { useEffect, useState } from "react";
import {
  Calendar,
  FileSpreadsheet,
  RefreshCw,
  TrendingUp,
} from "lucide-react";
import { apiClient } from "@/lib/api";
import { DateWiseRegisterData } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/common/PageHeader";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { EmptyState } from "@/components/common/EmptyState";
import { exportToCsv } from "@/lib/exportUtils";

export const DateWiseRegisterPage: React.FC = () => {
  const [data, setData] = useState<DateWiseRegisterData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const fetchDateWise = async () => {
    setIsLoading(true);
    try {
      const params: any = {};
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;

      const res = await apiClient.get<DateWiseRegisterData>("/registers/date-wise", { params });
      setData(res.data);
    } catch (err) {
      console.error("Failed to load date-wise register:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDateWise();
  }, [startDate, endDate]);

  const handleExport = () => {
    if (!data?.items) return;
    const headers = ["Date", "Daily Total (INR)", "Cases Count", "Start Receipt No", "Receipt No End"];
    const rows = data.items.map((row) => [
      row.date,
      Number(row.daily_total).toFixed(2),
      row.case_count,
      row.start_at || "-",
      row.receipt_no_end || "-",
    ]);
    exportToCsv(`Date_Wise_Register_${new Date().toISOString().slice(0, 10)}`, headers, rows);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Date Wise Register"
        description="Daily collection aggregation, audit reconciliation, and sequential receipt tracking."
      >
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={handleExport} className="flex items-center gap-1.5">
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            Export to Excel
          </Button>
          <Button variant="outline" size="sm" onClick={fetchDateWise} className="flex items-center gap-1.5">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
        </div>
      </PageHeader>

      {/* Filter Toolbar (Matching reference screenshot date_wise_register.png) */}
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
          <Button size="sm" onClick={fetchDateWise} className="h-9 text-xs">
            Filter
          </Button>
          {(startDate || endDate) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setStartDate("");
                setEndDate("");
              }}
              className="h-9 text-xs text-slate-500"
            >
              Reset
            </Button>
          )}
        </div>
      </div>

      {/* Table (Matching exact columns of date_wise_register.png) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-16">
            <LoadingSpinner size="lg" message="Aggregating date-wise collections..." />
          </div>
        ) : !data || data.items.length === 0 ? (
          <EmptyState
            title="No Date-Wise Records Found"
            description="No collections recorded for the specified date range."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200 font-bold uppercase tracking-wider text-slate-700">
                  <th className="py-3 px-4">DATE</th>
                  <th className="py-3 px-4 text-right">DAILYTOTAL</th>
                  <th className="py-3 px-4 text-center">CASES COUNT</th>
                  <th className="py-3 px-4">START AT</th>
                  <th className="py-3 px-4">RECEIPTNOEND</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {data.items.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-semibold text-slate-800">{row.date}</td>
                    <td className="py-3 px-4 text-right font-bold text-emerald-700 text-sm">
                      ₹{Number(row.daily_total).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-center text-slate-700 font-sans font-medium">
                      {row.case_count}
                    </td>
                    <td className="py-3 px-4 text-blue-600 font-medium">{row.start_at || "-"}</td>
                    <td className="py-3 px-4 text-blue-600 font-medium">{row.receipt_no_end || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer Summary Banner (Matching reference screenshot date_wise_register.png) */}
        {data && data.items.length > 0 && (
          <div className="bg-slate-50 border-t border-slate-200 p-4 flex flex-col sm:flex-row items-center justify-between text-xs font-semibold text-slate-700">
            <div className="flex items-center space-x-6">
              <span className="bg-white px-3 py-1.5 rounded-lg border border-slate-200">
                TOTAL DAYS = <span className="font-bold text-slate-900">{data.count}</span>
              </span>
              <span className="bg-white px-3 py-1.5 rounded-lg border border-slate-200">
                TOTAL REVENUE = <span className="font-bold text-emerald-700">₹{Number(data.sum_total).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
              </span>
            </div>
            <div className="text-slate-400 mt-2 sm:mt-0 font-normal">
              Apex Health Diagnostics Daily Reconciliation Register
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

