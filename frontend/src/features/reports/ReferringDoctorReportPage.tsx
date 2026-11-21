import React, { useEffect, useState } from "react";
import {
  FileSpreadsheet,
  Printer,
  RefreshCw,
  Search,
  Send,
  UserCheck,
} from "lucide-react";
import { apiClient } from "@/lib/api";
import {
  ReferringDoctorReportData,
  ReferringDoctorReportRow,
  DoctorItem,
  DepartmentItem,
  DoctorCategoryItem,
} from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/common/PageHeader";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { EmptyState } from "@/components/common/EmptyState";
import { exportToCsv } from "@/lib/exportUtils";

export const ReferringDoctorReportPage: React.FC = () => {
  const [data, setData] = useState<ReferringDoctorReportData | null>(null);
  const [doctors, setDoctors] = useState<DoctorItem[]>([]);
  const [categories, setCategories] = useState<DoctorCategoryItem[]>([]);
  const [departments, setDepartments] = useState<DepartmentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Tabs (Matching refering_doctor_report.png)
  const [activeTab, setActiveTab] = useState<"referring" | "all">("referring");

  // Filters (Matching refering_doctor_report.png)
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedDoctor, setSelectedDoctor] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [includeCommission, setIncludeCommission] = useState(true);

  useEffect(() => {
    const loadMasters = async () => {
      try {
        const [docsRes, catsRes, deptsRes] = await Promise.all([
          apiClient.get<DoctorItem[]>("/masters/doctors"),
          apiClient.get<DoctorCategoryItem[]>("/masters/doctor-categories"),
          apiClient.get<DepartmentItem[]>("/masters/departments"),
        ]);
        setDoctors(docsRes.data);
        setCategories(catsRes.data);
        setDepartments(deptsRes.data);
      } catch (err) {
        console.error("Failed to load doctor report masters:", err);
      }
    };
    loadMasters();
  }, []);

  const fetchReport = async () => {
    setIsLoading(true);
    try {
      const params: any = {};
      if (startDate) params.date_from = startDate;
      if (endDate) params.date_to = endDate;
      if (selectedDoctor && activeTab === "referring") params.doctor_id = selectedDoctor;
      if (selectedCategory) params.category_id = selectedCategory;
      if (selectedDepartment) params.department_id = selectedDepartment;

      const res = await apiClient.get<ReferringDoctorReportData>("/reports/referring-doctor", { params });
      setData(res.data);
    } catch (err) {
      console.error("Failed to load referring doctor report:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [startDate, endDate, selectedDoctor, selectedCategory, selectedDepartment, activeTab]);

  const handleExport = () => {
    if (!data?.items) return;
    const headers = [
      "Sr No",
      "Case No",
      "Date",
      "Patient Name",
      "UHID",
      "Referring Doctor",
      "Category",
      "Department",
      "Investigation Code",
      "Investigation Name",
      "Charge (INR)",
      "Commission Rate",
      "Commission Type",
      "Commission Amount (INR)",
    ];
    const rows = data.items.map((r, idx) => [
      idx + 1,
      r.case_number,
      new Date(r.date).toLocaleDateString("en-IN"),
      r.patient_name,
      r.patient_uhid,
      r.doctor_name,
      r.doctor_category || "-",
      r.department_name || "-",
      r.investigation_code,
      r.investigation_name,
      Number(r.charge_amount).toFixed(2),
      r.commission_rate,
      r.commission_type,
      Number(r.commission_amount).toFixed(2),
    ]);
    exportToCsv(`Referring_Doctor_Report_${new Date().toISOString().slice(0, 10)}`, headers, rows);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Referring Doctor Report"
        description="Audit patient referral volume, department tariffs, and calculate professional referral commissions."
      >
        <div className="flex items-center space-x-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => window.print()}
            className="flex items-center gap-1.5"
          >
            <Printer className="w-4 h-4" />
            Print
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport} className="flex items-center gap-1.5">
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            Export to Excel
          </Button>
          <Button variant="outline" size="sm" onClick={fetchReport} className="flex items-center gap-1.5">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
        </div>
      </PageHeader>

      {/* Main Filter Card (Exact layout matching refering_doctor_report.png) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-5">
        {/* Sub-tabs */}
        <div className="flex space-x-6 border-b border-slate-200 pb-2 text-xs font-bold uppercase tracking-wider">
          <button
            onClick={() => {
              setActiveTab("referring");
              setSelectedDoctor("");
            }}
            className={`pb-2 border-b-2 transition-colors ${
              activeTab === "referring"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            Referring Doctor
          </button>
          <button
            onClick={() => {
              setActiveTab("all");
              setSelectedDoctor("");
            }}
            className={`pb-2 border-b-2 transition-colors ${
              activeTab === "all"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            All Doctor's
          </button>
        </div>

        {/* 2-Column Input Grid (Matching refering_doctor_report.png) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Date From:*</label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="h-9 text-xs"
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Date To:*</label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="h-9 text-xs"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Category:*</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full h-9 px-3 text-xs rounded-md border border-slate-300 bg-white"
            >
              <option value="">Select Category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Referring Doctor:*</label>
            <select
              value={selectedDoctor}
              onChange={(e) => setSelectedDoctor(e.target.value)}
              disabled={activeTab === "all"}
              className="w-full h-9 px-3 text-xs rounded-md border border-slate-300 bg-white disabled:bg-slate-50"
            >
              <option value="">{activeTab === "all" ? "All Referring Doctors" : "Select Doctor"}</option>
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>
                  Dr. {d.full_name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center space-x-4 pt-1">
            <label className="flex items-center space-x-1.5 cursor-pointer text-slate-700">
              <input
                type="checkbox"
                checked={includeCommission}
                onChange={(e) => setIncludeCommission(e.target.checked)}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="font-medium">Commission Calculated</span>
            </label>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Department:*</label>
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="w-full h-9 px-3 text-xs rounded-md border border-slate-300 bg-white"
            >
              <option value="">Select Department</option>
              {departments.map((dep) => (
                <option key={dep.id} value={dep.id}>
                  {dep.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Action Button Row */}
        <div className="flex items-center space-x-2 pt-2 border-t border-slate-100">
          <Button size="sm" onClick={fetchReport} className="bg-blue-600 hover:bg-blue-700 text-white text-xs">
            Filter Results
          </Button>
          {(startDate || endDate || selectedCategory || selectedDoctor || selectedDepartment) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setStartDate("");
                setEndDate("");
                setSelectedCategory("");
                setSelectedDoctor("");
                setSelectedDepartment("");
              }}
              className="text-xs text-slate-500"
            >
              Reset
            </Button>
          )}
        </div>
      </div>

      {/* Results Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-16">
            <LoadingSpinner size="lg" message="Compiling referring doctor commission report..." />
          </div>
        ) : !data || data.items.length === 0 ? (
          <EmptyState
            title="No Referral Records Found"
            description="No case referrals match the specified doctor and date range criteria."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200 font-bold uppercase tracking-wider text-slate-700">
                  <th className="py-3 px-3">SR.</th>
                  <th className="py-3 px-3">DATE</th>
                  <th className="py-3 px-3">CASE NO.</th>
                  <th className="py-3 px-3">PATIENT</th>
                  <th className="py-3 px-3">REFERRING DOCTOR</th>
                  <th className="py-3 px-3">DEPARTMENT</th>
                  <th className="py-3 px-3">INVESTIGATION</th>
                  <th className="py-3 px-3 text-right">CHARGE</th>
                  <th className="py-3 px-3 text-center">RATE</th>
                  <th className="py-3 px-3 text-right">COMMISSION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.items.map((r, idx) => (
                  <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-2.5 px-3 font-mono text-slate-400">{idx + 1}</td>
                    <td className="py-2.5 px-3 whitespace-nowrap text-slate-600">
                      {new Date(r.date).toLocaleDateString("en-IN")}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-medium text-slate-900">{r.case_number}</td>
                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-slate-900">{r.patient_name}</div>
                      <div className="text-[11px] font-mono text-slate-400">{r.patient_uhid}</div>
                    </td>
                    <td className="py-2.5 px-3 text-slate-800 font-medium">{r.doctor_name}</td>
                    <td className="py-2.5 px-3 text-slate-600">{r.department_name || "-"}</td>
                    <td className="py-2.5 px-3">
                      <div className="text-slate-900 font-medium">{r.investigation_name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{r.investigation_code}</div>
                    </td>
                    <td className="py-2.5 px-3 text-right font-medium text-slate-800 font-mono">
                      ₹{Number(r.charge_amount).toFixed(2)}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono text-slate-600">
                      {r.commission_type === "percentage" ? `${r.commission_rate}%` : `Fixed ₹${r.commission_rate}`}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-emerald-700 font-mono">
                      ₹{Number(r.commission_amount).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer Summary Banner (Matching reference screenshot refering_doctor_report.png) */}
        {data && data.items.length > 0 && (
          <div className="bg-slate-50 border-t border-slate-200 p-4 flex flex-col sm:flex-row items-center justify-between text-xs font-semibold text-slate-700">
            <div className="flex flex-wrap items-center gap-6">
              <span className="bg-white px-3 py-1.5 rounded-lg border border-slate-200">
                TOTAL CASES = <span className="font-bold text-slate-900">{data.total_cases}</span>
              </span>
              <span className="bg-white px-3 py-1.5 rounded-lg border border-slate-200">
                TOTAL BILLED = <span className="font-bold text-slate-900">₹{Number(data.total_charges).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
              </span>
              <span className="bg-white px-3 py-1.5 rounded-lg border border-slate-200">
                TOTAL COMMISSION = <span className="font-bold text-emerald-700">₹{Number(data.total_commission).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
              </span>
            </div>
            <div className="text-slate-400 mt-2 sm:mt-0 font-normal">
              Apex Health Diagnostics Professional Referral Audit
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
