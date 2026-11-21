import React, { useEffect, useState } from "react";
import {
  Mail,
  Send,
  Search,
  Filter,
  RefreshCw,
  Calendar,
  CheckCircle2,
  AlertCircle,
  FileText,
  Eye,
} from "lucide-react";
import { apiClient } from "@/lib/api";
import { EmailLogItem } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/common/PageHeader";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { EmptyState } from "@/components/common/EmptyState";
import { SendEmailModal } from "./SendEmailModal";

export const EmailLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<EmailLogItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [viewingLog, setViewingLog] = useState<EmailLogItem | null>(null);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const params: any = {};
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      if (startDate) params.date_from = startDate;
      if (endDate) params.date_to = endDate;

      const res = await apiClient.get<EmailLogItem[]>("/emails/logs", { params });
      setLogs(res.data);
    } catch (err) {
      console.error("Failed to load email logs:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [statusFilter, startDate, endDate]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Email Communications & Logs"
        description="Audit outbound patient notifications, test report dispatches, and doctor referral correspondence corresponding to PMS/Third_Tab/send_email.png."
      >
        <div className="flex items-center space-x-2">
          <Button
            size="sm"
            onClick={() => setIsComposeOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Compose New Email</span>
          </Button>
          <Button variant="outline" size="sm" onClick={fetchLogs} className="flex items-center gap-1.5">
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </Button>
        </div>
      </PageHeader>

      {/* Filter Card */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center gap-3 text-xs">
        <div className="relative flex-1 w-full">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchLogs()}
            placeholder="Search by recipient email, name or subject..."
            className="pl-9 h-9 text-xs w-full"
          />
        </div>
        <div className="flex items-center space-x-2 w-full md:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 px-3 rounded-lg border border-slate-300 bg-white text-xs"
          >
            <option value="">All Statuses</option>
            <option value="sent">Sent</option>
            <option value="delivered">Delivered</option>
            <option value="failed">Failed</option>
          </select>
          <Input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="h-9 text-xs w-36"
            title="Start date"
          />
          <Input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="h-9 text-xs w-36"
            title="End date"
          />
          <Button size="sm" onClick={fetchLogs} className="bg-slate-800 text-white h-9">
            Filter
          </Button>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-16">
            <LoadingSpinner size="lg" message="Loading outbound email transmission records..." />
          </div>
        ) : logs.length === 0 ? (
          <EmptyState
            title="No Outbound Emails Found"
            description="No emails match your search and filter criteria."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200 font-bold uppercase tracking-wider text-slate-700">
                  <th className="py-3 px-3">SR.</th>
                  <th className="py-3 px-3">DATE & TIME</th>
                  <th className="py-3 px-3">RECIPIENT</th>
                  <th className="py-3 px-3">SUBJECT</th>
                  <th className="py-3 px-3">DISPATCHED BY</th>
                  <th className="py-3 px-3">CONTEXT</th>
                  <th className="py-3 px-3 text-center">STATUS</th>
                  <th className="py-3 px-3 text-right">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((l, idx) => (
                  <tr key={l.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-2.5 px-3 font-mono text-slate-400">{idx + 1}</td>
                    <td className="py-2.5 px-3 whitespace-nowrap text-slate-600">
                      {new Date(l.created_at).toLocaleString("en-IN")}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-slate-900">{l.recipient_email}</div>
                      {l.recipient_name && (
                        <div className="text-[11px] text-slate-500">{l.recipient_name}</div>
                      )}
                    </td>
                    <td className="py-2.5 px-3 max-w-xs truncate font-medium text-slate-800">
                      {l.subject}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">
                      {l.sender_name || "System Automated"}
                    </td>
                    <td className="py-2.5 px-3">
                      {l.case_number ? (
                        <span className="font-mono bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded text-[10px]">
                          Case #{l.case_number}
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        l.status === "delivered"
                          ? "bg-emerald-100 text-emerald-800"
                          : l.status === "sent"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-rose-100 text-rose-800"
                      }`}>
                        {l.status === "delivered" ? (
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        ) : (
                          <Mail className="w-3 h-3 text-blue-600" />
                        )}
                        {l.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setViewingLog(l)}
                        className="h-7 text-xs text-blue-600 hover:text-blue-800"
                      >
                        <Eye className="w-3.5 h-3.5 mr-1" />
                        View
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Compose Email Modal */}
      <SendEmailModal
        isOpen={isComposeOpen}
        onClose={() => setIsComposeOpen(false)}
        onSuccess={fetchLogs}
      />

      {/* View Email Content Dialog */}
      {viewingLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-900 text-sm">Dispatched Email Record</h3>
              <Button size="sm" variant="ghost" onClick={() => setViewingLog(null)}>
                Close
              </Button>
            </div>
            <div className="p-6 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 pb-3 border-b border-slate-100">
                <div>
                  <span className="text-slate-400 block">Recipient:</span>
                  <span className="font-semibold text-slate-800">{viewingLog.recipient_email}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Date & Time:</span>
                  <span className="font-semibold text-slate-800">
                    {new Date(viewingLog.created_at).toLocaleString("en-IN")}
                  </span>
                </div>
              </div>
              <div>
                <span className="text-slate-400 block">Subject:</span>
                <span className="font-bold text-slate-900">{viewingLog.subject}</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-1">Message Body:</span>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 whitespace-pre-wrap font-sans text-slate-700 leading-relaxed max-h-60 overflow-y-auto">
                  {viewingLog.body}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
