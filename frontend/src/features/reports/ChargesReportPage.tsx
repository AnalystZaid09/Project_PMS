import React, { useEffect, useState } from "react";
import {
  FileSpreadsheet,
  Printer,
  RefreshCw,
  Search,
  Filter,
} from "lucide-react";
import { apiClient } from "@/lib/api";
import { ChargesReportRow, DepartmentItem, DoctorItem } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/common/PageHeader";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { EmptyState } from "@/components/common/EmptyState";
import { exportToCsv } from "@/lib/exportUtils";

export const ChargesReportPage: React.FC = () => {
  const [rows, setRows] = useState<ChargesReportRow[]>([]);
  const [departments, setDepartments] = useState<DepartmentItem[]>([]);
  const [doctors, setDoctors] = useState<DoctorItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters (Matching Charges_Report.png)
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedDept, setSelectedDept] = useState("");
  const [selectedFaculty, setSelectedFaculty] = useState("");
  const [isMisc, setIsMisc] = useState(false);

  // Load masters for filters
  useEffect(() => {
    const loadMasters = async () => {
      try {
        const [depRes, docRes] = await Promise.all([
          apiClient.get<DepartmentItem[]>("/masters/departments"),
          apiClient.get<DoctorItem[]>("/masters/doctors"),
        ]);
        setDepartments(depRes.data);
        setDoctors(docRes.data);
      } catch (err) {
        console.error("Failed to load departments or doctors:", err);
      }
    };
    loadMasters();
  }, []);

  const fetchChargesReport = async () => {
    setIsLoading(true);
    try {
      const params: any = {};
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;
      if (selectedDept) params.department_id = selectedDept;
      if (selectedFaculty) params.faculty_id = selectedFaculty;
      if (isMisc) params.is_misc = true;

      const res = await apiClient.get<ChargesReportRow[]>("/reports/charges", { params });
      setRows(res.data);
    } catch (err) {
      console.error("Failed to load charges report:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchChargesReport();
  }, [startDate, endDate, selectedDept, selectedFaculty, isMisc]);

  const totalAmount = rows.reduce((sum, r) => sum + Number(r.amount), 0);

  const handleExport = () => {
    const headers = [
      "Sr No",
      "Case No",
      "Date",
      "Patient Name",
      "UHID",
      "Department",
      "Faculty / Doctor",
      "Investigation Code",
      "Investigation Name",
      "Amount (INR)",
    ];
    const dataRows = rows.map((r, idx) => [
      idx + 1,
      r.case_number,
      r.date,
      r.patient_name,
      r.patient_uhid,
      r.department_name || "-",
      r.doctor_name || r.faculty_name || "-",
      r.investigation_code,
      r.investigation_name,
      Number(r.amount).toFixed(2),
    ]);
    exportToCsv(`Charges_Report_${new Date().toISOString().slice(0, 10)}`, headers, dataRows);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Charges Report"
        description="Comprehensive audit of diagnostic investigation revenues partitioned by faculty and department."
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
          <Button variant="outline" size="sm" onClick={fetchChargesReport} className="flex items-center gap-1.5">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
        </div>
      </PageHeader>

      {/* Filter Toolbar (Matching reference screenshot Charges_Report.png) */}
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
            <span className="text-xs font-semibold text-slate-600">Department:</span>
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="h-9 px-2 text-xs rounded-md border border-slate-300 bg-white"
            >
              <option value="">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-600">Faculty / Doctor:</span>
            <select
              value={selectedFaculty}
              onChange={(e) => setSelectedFaculty(e.target.value)}
              className="h-9 px-2 text-xs rounded-md border border-slate-300 bg-white"
            >
              <option value="">All Doctors</option>
              {doctors.map((doc) => (
                <option key={doc.id} value={doc.id}>
                  {doc.full_name}
                </option>
              ))}
            </select>
          </div>

          <label className="flex items-center space-x-1.5 text-xs font-medium text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={isMisc}
              onChange={(e) => setIsMisc(e.target.checked)}
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
            />
            <span>Misc Category Only</span>
          </label>

          <Button size="sm" onClick={fetchChargesReport} className="h-9 text-xs">
            Search
          </Button>

          {(startDate || endDate || selectedDept || selectedFaculty || isMisc) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setStartDate("");
                setEndDate("");
                setSelectedDept("");
                setSelectedFaculty("");
                setIsMisc(false);
              }}
              className="h-9 text-xs text-slate-500"
            >
              Reset
            </Button>
          )}
        </div>
      </div>

      {/* Table (Matching exact columns of Charges_Report.png) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-16">
            <LoadingSpinner size="lg" message="Compiling charges report..." />
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            title="No Charges Found"
            description="No investigation charges match the selected filter criteria."
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
                  <th className="py-3 px-3">DEPARTMENT</th>
                  <th className="py-3 px-3">FACULTY / DOCTOR</th>
                  <th className="py-3 px-3">INVESTIGATION</th>
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
                    <td className="py-2.5 px-3 text-slate-600">{r.department_name || "-"}</td>
                    <td className="py-2.5 px-3 text-slate-700 font-medium">{r.doctor_name || r.faculty_name || "-"}</td>
                    <td className="py-2.5 px-3">
                      <div className="font-medium text-slate-900">{r.investigation_name}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{r.investigation_code}</div>
                    </td>
                    <td className="py-2.5 px-3 text-right font-medium text-slate-900 font-mono">
                      ₹{Number(r.amount).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer Summary Banner (Matching reference screenshot Charges_Report.png) */}
        {rows.length > 0 && (
          <div className="bg-slate-50 border-t border-slate-200 p-4 flex flex-col sm:flex-row items-center justify-between text-xs font-semibold text-slate-700">
            <div className="flex items-center space-x-6">
              <span className="bg-white px-3 py-1.5 rounded-lg border border-slate-200">
                Total Investigations = <span className="font-bold text-slate-900">{rows.length}</span>
              </span>
              <span className="bg-white px-3 py-1.5 rounded-lg border border-slate-200">
                Total Revenue = <span className="font-bold text-emerald-700">₹{totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
              </span>
            </div>
            <div className="text-slate-400 mt-2 sm:mt-0 font-normal">
              Apex Health Diagnostics Financial Billing Audit
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
