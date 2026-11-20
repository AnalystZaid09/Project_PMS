import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Plus,
  FileSpreadsheet,
  RefreshCw,
  Eye,
  User,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Printer,
  Calendar,
  Filter,
  X,
  Stethoscope,
  Trash2,
} from "lucide-react";
import { apiClient } from "@/lib/api";
import { CaseListItem, CaseStats, CaseDetail } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/common/PageHeader";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { EmptyState } from "@/components/common/EmptyState";
import { Dialog, DialogHeader, DialogFooter } from "@/components/ui/dialog";

export const CasesListPage: React.FC = () => {
  const navigate = useNavigate();

  const [cases, setCases] = useState<CaseListItem[]>([]);
  const [stats, setStats] = useState<CaseStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");

  // Modals
  const [selectedCaseDetail, setSelectedCaseDetail] = useState<CaseDetail | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const [caseToCancel, setCaseToCancel] = useState<CaseListItem | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  // Load stats
  const fetchStats = async () => {
    try {
      const res = await apiClient.get<CaseStats>("/cases/stats/summary");
      setStats(res.data);
    } catch (err) {
      console.error("Failed to load case stats:", err);
    }
  };

  // Load cases
  const fetchCases = async () => {
    setIsLoading(true);
    try {
      const params: any = {};
      if (search.trim()) params.search = search.trim();
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;
      if (statusFilter) params.status = statusFilter;
      if (priorityFilter) params.priority = priorityFilter;

      const res = await apiClient.get<CaseListItem[]>("/cases", { params });
      setCases(res.data);
    } catch (err) {
      console.error("Failed to load cases:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    fetchCases();
  }, [search, startDate, endDate, statusFilter, priorityFilter]);

  // Open detail preview modal
  const handleOpenDetail = async (caseId: string) => {
    try {
      const res = await apiClient.get<CaseDetail>(`/cases/${caseId}`);
      setSelectedCaseDetail(res.data);
      setIsDetailModalOpen(true);
    } catch (err) {
      console.error("Failed to load case detail:", err);
    }
  };

  // Cancel Case
  const handleConfirmCancel = async () => {
    if (!caseToCancel) return;
    setIsCancelling(true);
    setCancelError(null);

    try {
      await apiClient.delete(`/cases/${caseToCancel.id}`, {
        params: { reason: cancelReason.trim() || undefined },
      });
      setCaseToCancel(null);
      setCancelReason("");
      fetchCases();
      fetchStats();
    } catch (err: any) {
      setCancelError(err.response?.data?.detail || "Failed to cancel case.");
    } finally {
      setIsCancelling(false);
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    if (cases.length === 0) return;
    const headers = [
      "Case No",
      "Exam Date",
      "Patient Name",
      "UHID",
      "Priority",
      "Status",
      "Referring Doctor",
      "Investigations",
      "Net Amount",
    ];

    const rows = cases.map((c) => [
      c.case_number,
      new Date(c.exam_date).toLocaleDateString(),
      `"${c.patient_name}"`,
      c.patient_uhid,
      c.priority,
      c.status,
      `"${c.referring_doctor_name || "Self"}"`,
      `"${c.investigations_summary}"`,
      c.net_amount,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Apex_Cases_Export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Patient Cases & Examination Register"
        description="Daily patient reception, investigation tracking, and clinical case workflows."
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              disabled={cases.length === 0}
              className="flex items-center gap-1.5"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              Export
            </Button>
            <Button
              size="sm"
              onClick={() => navigate("/cases/new")}
              className="flex items-center gap-1.5 bg-primary hover:bg-primary/90 text-white"
            >
              <Plus className="w-4 h-4" />
              New Case Registration
            </Button>
          </div>
        }
      />

      {/* Quick Summary Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="bg-white p-3.5 rounded-lg border border-gray-200 shadow-sm">
            <span className="text-xs text-gray-500 block">Total Cases Today</span>
            <span className="text-xl font-bold text-gray-900 mt-0.5 block">{stats.today_cases}</span>
          </div>
          <div className="bg-white p-3.5 rounded-lg border border-red-200 shadow-sm">
            <span className="text-xs text-red-600 font-medium block">Emergency / Stat</span>
            <span className="text-xl font-bold text-red-700 mt-0.5 block">{stats.emergency_cases}</span>
          </div>
          <div className="bg-white p-3.5 rounded-lg border border-amber-200 shadow-sm">
            <span className="text-xs text-amber-700 font-medium block">Pending Reports</span>
            <span className="text-xl font-bold text-amber-800 mt-0.5 block">{stats.pending_reports}</span>
          </div>
          <div className="bg-white p-3.5 rounded-lg border border-emerald-200 shadow-sm">
            <span className="text-xs text-emerald-700 font-medium block">Completed</span>
            <span className="text-xl font-bold text-emerald-800 mt-0.5 block">{stats.completed_cases}</span>
          </div>
          <div className="bg-white p-3.5 rounded-lg border border-gray-200 shadow-sm">
            <span className="text-xs text-gray-500 block">Today's Revenue</span>
            <span className="text-xl font-bold text-primary mt-0.5 block">
              Rs. {stats.today_revenue.toFixed(2)}
            </span>
          </div>
        </div>
      )}

      {/* Filters Bar (Corresponds to Patient_Record.png top controls) */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {/* Search */}
          <div className="relative md:col-span-2">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search case #, patient name, UHID, mobile..."
              className="pl-9 text-xs"
            />
          </div>

          {/* Date Range */}
          <div>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              placeholder="Start Date"
              className="text-xs"
            />
          </div>

          <div>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              placeholder="End Date"
              className="text-xs"
            />
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full text-xs border border-gray-300 rounded-md p-2 bg-white focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">All Statuses</option>
              <option value="registered">Registered</option>
              <option value="in_progress">In Progress</option>
              <option value="report_pending">Report Pending</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        {(startDate || endDate || statusFilter || priorityFilter || search) && (
          <div className="flex items-center gap-2 pt-1 text-xs text-gray-500">
            <span>Active filters:</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearch("");
                setStartDate("");
                setEndDate("");
                setStatusFilter("");
                setPriorityFilter("");
              }}
              className="h-6 text-xs text-primary p-1 flex items-center gap-1"
            >
              <X className="w-3 h-3" />
              Clear all
            </Button>
          </div>
        )}
      </div>

      {/* Main Cases Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 flex justify-center">
            <LoadingSpinner />
          </div>
        ) : cases.length === 0 ? (
          <div className="p-12">
            <EmptyState
              title="No Patient Cases Found"
              description="No clinical cases match your active search or date filters. Register a new patient case to begin."
              action={
                <Button onClick={() => navigate("/cases/new")}>
                  <Plus className="w-4 h-4 mr-1.5" />
                  New Case Registration
                </Button>
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="p-3">Case No</th>
                  <th className="p-3">Exam Date</th>
                  <th className="p-3">Patient Details</th>
                  <th className="p-3">Referring Doctor</th>
                  <th className="p-3">Investigations</th>
                  <th className="p-3 text-right">Net Amount</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {cases.map((c) => {
                  const statusColors: Record<string, string> = {
                    registered: "bg-blue-50 text-blue-700 border-blue-200",
                    in_progress: "bg-amber-50 text-amber-700 border-amber-200",
                    report_pending: "bg-purple-50 text-purple-700 border-purple-200",
                    completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
                    cancelled: "bg-gray-100 text-gray-500 border-gray-300",
                  };

                  const priorityColors: Record<string, string> = {
                    normal: "bg-gray-100 text-gray-700",
                    urgent: "bg-amber-100 text-amber-800",
                    emergency: "bg-red-100 text-red-800 font-semibold",
                  };

                  return (
                    <tr key={c.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="p-3">
                        <span className="font-mono font-bold text-gray-900 block">{c.case_number}</span>
                        <span
                          className={`inline-block mt-0.5 px-1.5 py-0.2 text-[10px] uppercase rounded ${
                            priorityColors[c.priority] || "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {c.priority}
                        </span>
                      </td>

                      <td className="p-3 text-gray-600 whitespace-nowrap">
                        <div>{new Date(c.exam_date).toLocaleDateString()}</div>
                        <div className="text-[11px] text-gray-400">
                          {new Date(c.exam_date).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </td>

                      <td className="p-3">
                        <div
                          className="font-semibold text-gray-900 hover:text-primary cursor-pointer"
                          onClick={() => navigate(`/patients/${c.patient_id}`)}
                        >
                          {c.patient_name}
                        </div>
                        <div className="text-[11px] text-gray-500 font-mono">
                          UHID: {c.patient_uhid}
                        </div>
                      </td>

                      <td className="p-3 text-gray-700">
                        {c.referring_doctor_name || (
                          <span className="text-gray-400 italic">Self / Walk-in</span>
                        )}
                      </td>

                      <td className="p-3 max-w-xs">
                        <div className="font-medium text-gray-800 line-clamp-1">
                          {c.investigations_summary}
                        </div>
                        <span className="text-[11px] text-gray-400">
                          {c.items_count} test{c.items_count > 1 ? "s" : ""}
                        </span>
                      </td>

                      <td className="p-3 text-right font-bold text-gray-900 whitespace-nowrap">
                        Rs. {Number(c.net_amount).toFixed(2)}
                      </td>

                      <td className="p-3 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 text-[11px] font-semibold border rounded-full capitalize ${
                            statusColors[c.status] || "bg-gray-100 text-gray-700 border-gray-200"
                          }`}
                        >
                          {c.status.replace("_", " ")}
                        </span>
                      </td>

                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            title="View Case Breakdown"
                            onClick={() => handleOpenDetail(c.id)}
                          >
                            <Eye className="w-3.5 h-3.5 text-gray-600" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            title="Patient Profile"
                            onClick={() => navigate(`/patients/${c.patient_id}`)}
                          >
                            <User className="w-3.5 h-3.5 text-blue-600" />
                          </Button>

                          {c.status !== "cancelled" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-red-500 hover:text-red-700"
                              title="Cancel Case"
                              onClick={() => {
                                setCaseToCancel(c);
                                setCancelReason("");
                                setCancelError(null);
                              }}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Case Detail Modal Preview */}
      {selectedCaseDetail && (
        <Dialog open={isDetailModalOpen} onOpenChange={() => setIsDetailModalOpen(false)}>
          <DialogHeader
            title={`Case ${selectedCaseDetail.case_number}`}
            onClose={() => setIsDetailModalOpen(false)}
          />
          <div className="p-6 space-y-5 text-xs max-h-[80vh] overflow-y-auto">
            {/* Header Demographic Bar */}
            <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-lg grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <span className="text-gray-500 block">Patient Name:</span>
                <span className="font-bold text-gray-900">{selectedCaseDetail.patient_name}</span>
              </div>
              <div>
                <span className="text-gray-500 block">UHID:</span>
                <span className="font-mono text-primary font-medium">
                  {selectedCaseDetail.patient_uhid}
                </span>
              </div>
              <div>
                <span className="text-gray-500 block">Gender / Age:</span>
                <span className="capitalize text-gray-800">
                  {selectedCaseDetail.patient_gender}
                  {selectedCaseDetail.patient_age ? ` / ${selectedCaseDetail.patient_age} yrs` : ""}
                </span>
              </div>
              <div>
                <span className="text-gray-500 block">Contact Phone:</span>
                <span className="text-gray-800">{selectedCaseDetail.patient_phone}</span>
              </div>
            </div>

            {/* Clinical & Doctor Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-3 border border-gray-200 rounded-lg space-y-2">
                <span className="font-semibold text-gray-800 block uppercase tracking-wider text-[11px]">
                  Clinical Information
                </span>
                <div>
                  <span className="text-gray-500 block">Symptoms:</span>
                  <span className="text-gray-800 font-medium">
                    {selectedCaseDetail.symptoms || "No symptoms recorded"}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 block">Prescribing Notes:</span>
                  <span className="text-gray-800">
                    {selectedCaseDetail.clinical_notes || "None"}
                  </span>
                </div>
              </div>

              <div className="p-3 border border-gray-200 rounded-lg space-y-2">
                <span className="font-semibold text-gray-800 block uppercase tracking-wider text-[11px]">
                  Assigned Doctors
                </span>
                <div>
                  <span className="text-gray-500">Referring Doctor: </span>
                  <span className="font-medium text-gray-800">
                    {selectedCaseDetail.referring_doctor_name || "Self / Walk-in"}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Reporting Doctor: </span>
                  <span className="font-medium text-gray-800">
                    {selectedCaseDetail.reporting_doctor_name || "Diagnostic Department"}
                  </span>
                </div>
              </div>
            </div>

            {/* Investigations Table */}
            <div>
              <span className="font-semibold text-gray-800 block uppercase tracking-wider text-[11px] mb-2">
                Investigations & Tariffs
              </span>
              <table className="w-full text-xs text-left border border-gray-200 rounded-lg overflow-hidden">
                <thead className="bg-gray-50 text-gray-500 border-b border-gray-200">
                  <tr>
                    <th className="p-2">Test Name</th>
                    <th className="p-2 text-center">Qty</th>
                    <th className="p-2 text-right">Unit Price</th>
                    <th className="p-2 text-right">Discount</th>
                    <th className="p-2 text-right">Final Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {selectedCaseDetail.items.map((it) => (
                    <tr key={it.id}>
                      <td className="p-2 font-medium text-gray-800">
                        {it.investigation_name}
                        <span className="text-gray-400 font-mono ml-1">[{it.investigation_code}]</span>
                      </td>
                      <td className="p-2 text-center">{it.quantity}</td>
                      <td className="p-2 text-right">Rs. {Number(it.price).toFixed(2)}</td>
                      <td className="p-2 text-right text-emerald-600">
                        {Number(it.discount_amount) > 0 ? `- Rs. ${Number(it.discount_amount).toFixed(2)}` : "-"}
                      </td>
                      <td className="p-2 text-right font-bold text-gray-900">
                        Rs. {Number(it.final_price).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Other Charges if any */}
            {selectedCaseDetail.other_charges.length > 0 && (
              <div>
                <span className="font-semibold text-gray-800 block uppercase tracking-wider text-[11px] mb-2">
                  Ancillary Charges
                </span>
                <table className="w-full text-xs text-left border border-gray-200 rounded-lg overflow-hidden">
                  <tbody className="divide-y divide-gray-100">
                    {selectedCaseDetail.other_charges.map((oc) => (
                      <tr key={oc.id}>
                        <td className="p-2 text-gray-800">{oc.charge_name}</td>
                        <td className="p-2 text-right font-semibold text-gray-900">
                          Rs. {Number(oc.amount).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Total Financial Summary */}
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg flex justify-between items-center text-xs">
              <div>
                <span className="text-gray-500">Gross Subtotal: </span>
                <span className="font-semibold text-gray-800 mr-4">
                  Rs. {Number(selectedCaseDetail.total_charges).toFixed(2)}
                </span>
                <span className="text-gray-500">Total Discount: </span>
                <span className="font-semibold text-emerald-600">
                  Rs. {Number(selectedCaseDetail.discount_total).toFixed(2)}
                </span>
              </div>
              <div className="text-sm font-bold text-gray-900">
                Net Payable:{" "}
                <span className="text-primary text-base">
                  Rs. {Number(selectedCaseDetail.net_amount).toFixed(2)}
                </span>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => window.print()}>
                <Printer className="w-3.5 h-3.5 mr-1.5" />
                Print Slip
              </Button>
              <Button size="sm" onClick={() => setIsDetailModalOpen(false)}>
                Close Preview
              </Button>
            </DialogFooter>
          </div>
        </Dialog>
      )}

      {/* Cancel Confirmation Dialog */}
      {caseToCancel && (
        <Dialog open={true} onOpenChange={() => setCaseToCancel(null)}>
          <DialogHeader
            title={`Cancel Case ${caseToCancel.case_number}`}
            onClose={() => setCaseToCancel(null)}
          />
          <div className="p-6 space-y-4 text-xs">
            {cancelError && (
              <div className="p-3 text-red-700 bg-red-50 border border-red-200 rounded">
                {cancelError}
              </div>
            )}

            <p className="text-gray-600">
              Are you sure you want to cancel this case for{" "}
              <span className="font-semibold text-gray-900">{caseToCancel.patient_name}</span>? This
              will release the investigation queue and mark the case as cancelled.
            </p>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Reason for Cancellation (Optional)
              </label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="e.g. Patient requested refund / test postponed..."
                className="w-full text-xs border border-gray-300 rounded p-2"
                rows={2}
              />
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCaseToCancel(null)}
                disabled={isCancelling}
              >
                Keep Case
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={handleConfirmCancel}
                disabled={isCancelling}
              >
                {isCancelling ? "Cancelling..." : "Confirm Cancellation"}
              </Button>
            </DialogFooter>
          </div>
        </Dialog>
      )}
    </div>
  );
};

