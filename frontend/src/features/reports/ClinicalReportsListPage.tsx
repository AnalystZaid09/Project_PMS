import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  RefreshCw,
  FileText,
  FileCheck,
  Eye,
  Printer,
  Edit,
  Clock,
  CheckCircle2,
  Lock,
  PlusCircle,
  FileSpreadsheet,
  Film,
} from "lucide-react";
import { apiClient } from "@/lib/api";
import { ClinicalReportListItem, ClinicalReportsStats, DepartmentItem } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/common/PageHeader";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { EmptyState } from "@/components/common/EmptyState";
import { exportToCsv } from "@/lib/exportUtils";
import { ReportPrintPreviewModal } from "./ReportPrintPreviewModal";

export const ClinicalReportsListPage: React.FC = () => {
  const navigate = useNavigate();

  const [reports, setReports] = useState<ClinicalReportListItem[]>([]);
  const [stats, setStats] = useState<ClinicalReportsStats | null>(null);
  const [departments, setDepartments] = useState<DepartmentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Preview Modal
  const [selectedReportDetail, setSelectedReportDetail] = useState<any | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const fetchStats = async () => {
    try {
      const res = await apiClient.get<ClinicalReportsStats>("/clinical-reports/summary/stats");
      setStats(res.data);
    } catch (err) {
      console.error("Failed to load report stats:", err);
    }
  };

  const fetchDepartments = async () => {
    try {
      const res = await apiClient.get<DepartmentItem[]>("/masters/departments");
      setDepartments(res.data);
    } catch (err) {
      console.error("Failed to load departments:", err);
    }
  };

  const fetchReports = async () => {
    setIsLoading(true);
    try {
      const params: any = {};
      if (search.trim()) params.search = search.trim();
      if (statusFilter && statusFilter !== "all") params.status = statusFilter;
      if (departmentFilter) params.department_id = departmentFilter;
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;

      const res = await apiClient.get<ClinicalReportListItem[]>("/clinical-reports", { params });
      setReports(res.data);
    } catch (err) {
      console.error("Failed to load clinical reports:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchDepartments();
  }, []);

  useEffect(() => {
    fetchReports();
  }, [search, statusFilter, departmentFilter, startDate, endDate]);

  const handleOpenPrintPreview = async (reportId: string) => {
    try {
      const res = await apiClient.get(`/clinical-reports/${reportId}`);
      setSelectedReportDetail(res.data);
      setIsPreviewOpen(true);
    } catch (err) {
      console.error("Failed to load report for preview:", err);
    }
  };

  const handleExport = () => {
    const headers = [
      "Report Number",
      "Case Number",
      "Patient Name",
      "Patient UHID",
      "Investigation Code",
      "Investigation Name",
      "Department",
      "Reporting Doctor",
      "Status",
      "Version",
      "Date",
    ];
    const rows = reports.map((r) => [
      r.report_number,
      r.case_number,
      r.patient_name,
      r.patient_uhid,
      r.investigation_code,
      r.investigation_name,
      r.department_name || "-",
      r.reporting_doctor_name || "-",
      r.status.toUpperCase(),
      `v${r.current_version}.0`,
      new Date(r.created_at).toLocaleDateString("en-IN"),
    ]);
    exportToCsv(`Clinical_Reports_Worklist_${new Date().toISOString().slice(0, 10)}`, headers, rows);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "finalized":
        return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300">Finalized</Badge>;
      case "verified":
        return <Badge className="bg-blue-100 text-blue-800 border-blue-300">Verified</Badge>;
      case "submitted":
        return <Badge className="bg-amber-100 text-amber-800 border-amber-300">Submitted</Badge>;
      case "amended":
        return <Badge className="bg-purple-100 text-purple-800 border-purple-300">Amended</Badge>;
      default:
        return <Badge className="bg-slate-100 text-slate-800 border-slate-300">Draft</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clinical Reports & Verification"
        description="Review clinical investigation findings, enter diagnostic impressions, verify, and digitally lock medical reports."
      >
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={handleExport} className="flex items-center gap-1.5">
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            Export CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              fetchStats();
              fetchReports();
            }}
            className="flex items-center gap-1.5"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
        </div>
      </PageHeader>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div
          onClick={() => setStatusFilter("all")}
          className={`cursor-pointer p-4 rounded-xl border transition-all ${
            statusFilter === "all" ? "bg-blue-50/60 border-blue-400 ring-2 ring-blue-500" : "bg-white border-slate-200 hover:border-slate-300"
          }`}
        >
          <p className="text-[11px] font-semibold text-slate-500 uppercase">Total Reports</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{stats?.total_reports ?? 0}</p>
        </div>

        <div
          onClick={() => setStatusFilter("draft")}
          className={`cursor-pointer p-4 rounded-xl border transition-all ${
            statusFilter === "draft" ? "bg-slate-100 border-slate-400 ring-2 ring-slate-400" : "bg-white border-slate-200 hover:border-slate-300"
          }`}
        >
          <p className="text-[11px] font-semibold text-slate-500 uppercase">Drafts</p>
          <p className="text-2xl font-bold text-slate-700 mt-1">{stats?.draft_count ?? 0}</p>
        </div>

        <div
          onClick={() => setStatusFilter("submitted")}
          className={`cursor-pointer p-4 rounded-xl border transition-all ${
            statusFilter === "submitted" ? "bg-amber-50 border-amber-400 ring-2 ring-amber-500" : "bg-white border-slate-200 hover:border-slate-300"
          }`}
        >
          <p className="text-[11px] font-semibold text-amber-700 uppercase">Submitted</p>
          <p className="text-2xl font-bold text-amber-800 mt-1">{stats?.submitted_count ?? 0}</p>
        </div>

        <div
          onClick={() => setStatusFilter("verified")}
          className={`cursor-pointer p-4 rounded-xl border transition-all ${
            statusFilter === "verified" ? "bg-blue-50 border-blue-400 ring-2 ring-blue-500" : "bg-white border-slate-200 hover:border-slate-300"
          }`}
        >
          <p className="text-[11px] font-semibold text-blue-700 uppercase">Verified</p>
          <p className="text-2xl font-bold text-blue-800 mt-1">{stats?.verified_count ?? 0}</p>
        </div>

        <div
          onClick={() => setStatusFilter("finalized")}
          className={`cursor-pointer p-4 rounded-xl border transition-all ${
            statusFilter === "finalized" ? "bg-emerald-50 border-emerald-400 ring-2 ring-emerald-500" : "bg-white border-slate-200 hover:border-slate-300"
          }`}
        >
          <p className="text-[11px] font-semibold text-emerald-700 uppercase">Finalized</p>
          <p className="text-2xl font-bold text-emerald-800 mt-1">{stats?.finalized_count ?? 0}</p>
        </div>

        <div
          onClick={() => setStatusFilter("amended")}
          className={`cursor-pointer p-4 rounded-xl border transition-all ${
            statusFilter === "amended" ? "bg-purple-50 border-purple-400 ring-2 ring-purple-500" : "bg-white border-slate-200 hover:border-slate-300"
          }`}
        >
          <p className="text-[11px] font-semibold text-purple-700 uppercase">Amended</p>
          <p className="text-2xl font-bold text-purple-800 mt-1">{stats?.amended_count ?? 0}</p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="flex flex-wrap items-center gap-3 w-full">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
            <Input
              placeholder="Search by report #, case #, patient name, UHID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-9 text-xs"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 px-2 text-xs rounded-md border border-slate-300 bg-white"
          >
            <option value="all">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="submitted">Submitted</option>
            <option value="verified">Verified</option>
            <option value="finalized">Finalized</option>
            <option value="amended">Amended</option>
          </select>

          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="h-9 px-2 text-xs rounded-md border border-slate-300 bg-white"
          >
            <option value="">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>

          <Input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="h-9 w-32 text-xs"
          />
          <span className="text-slate-400 text-xs">to</span>
          <Input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="h-9 w-32 text-xs"
          />

          {(search || statusFilter !== "all" || departmentFilter || startDate || endDate) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearch("");
                setStatusFilter("all");
                setDepartmentFilter("");
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

      {/* Reports Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-16">
            <LoadingSpinner size="lg" message="Loading clinical reports worklist..." />
          </div>
        ) : reports.length === 0 ? (
          <EmptyState
            title="No Clinical Reports Found"
            description="No medical reports match the selected filters."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200 font-bold uppercase tracking-wider text-slate-700">
                  <th className="py-3 px-3">Report #</th>
                  <th className="py-3 px-3">Case #</th>
                  <th className="py-3 px-3">Patient</th>
                  <th className="py-3 px-3">Investigation</th>
                  <th className="py-3 px-3">Department</th>
                  <th className="py-3 px-3">Doctor</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-3 text-center">Version</th>
                  <th className="py-3 px-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reports.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-2.5 px-3 font-mono font-bold text-blue-600">{r.report_number}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-800">{r.case_number}</td>
                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-slate-900">{r.patient_name}</div>
                      <div className="text-[11px] font-mono text-slate-400">
                        {r.patient_uhid} • {r.patient_age ? `${r.patient_age}Y` : ""} {r.patient_gender}
                      </div>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-medium text-slate-900 flex items-center gap-1.5">
                        <span>{r.investigation_name}</span>
                        {(r.investigation_name.toLowerCase().includes("x-ray") ||
                          r.investigation_name.toLowerCase().includes("radiograph") ||
                          (r.department_name && r.department_name.toLowerCase().includes("radiology"))) && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-cyan-50 text-cyan-700 border border-cyan-200">
                            <Film className="w-2.5 h-2.5" /> X-Ray
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">{r.investigation_code}</div>
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">{r.department_name || "-"}</td>
                    <td className="py-2.5 px-3 text-slate-700">{r.reporting_doctor_name || "-"}</td>
                    <td className="py-2.5 px-3 text-center">{getStatusBadge(r.status)}</td>
                    <td className="py-2.5 px-3 text-center font-mono text-slate-500">v{r.current_version}.0</td>
                    <td className="py-2.5 px-3 text-center">
                      <div className="flex items-center justify-center space-x-1.5">
                        <button
                          title="Open Clinical Report Editor"
                          onClick={() => navigate(`/reports/editor/${r.id}`)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          title="View / Print Branded Report"
                          onClick={() => handleOpenPrintPreview(r.id)}
                          className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
                        >
                          <Printer className="w-4 h-4" />
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

      {/* Print Preview Modal */}
      <ReportPrintPreviewModal
        report={selectedReportDetail}
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
      />
    </div>
  );
};
