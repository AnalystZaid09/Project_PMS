import React, { useEffect, useState } from "react";
import {
  History,
  Shield,
  Filter,
  Search,
  FileSpreadsheet,
  RefreshCw,
  Eye,
  Calendar,
  UserCheck,
  Stethoscope,
  Receipt,
  Database,
  X,
} from "lucide-react";
import { apiClient } from "@/lib/api";
import { AuditLogItem, AuditLogStats, UserItem } from "@/types";
import { formatDateTime } from "@/lib/utils";
import { exportToCsv } from "@/lib/exportUtils";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/common/PageHeader";

export const AuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [stats, setStats] = useState<AuditLogStats | null>(null);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters (Matching nineth_tab_user_activity.png)
  const [actionFilter, setActionFilter] = useState("");
  const [entityFilter, setEntityFilter] = useState("");
  const [userFilter, setUserFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [search, setSearch] = useState("");

  const [inspectingLog, setInspectingLog] = useState<AuditLogItem | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const params: any = { limit: 150 };
      if (actionFilter) params.action = actionFilter;
      if (entityFilter) params.entity_type = entityFilter;
      if (userFilter) params.user_id = userFilter;
      if (startDate) params.date_from = startDate;
      if (endDate) params.date_to = endDate;
      if (search) params.search = search;

      const [logsRes, statsRes, usersRes] = await Promise.all([
        apiClient.get<AuditLogItem[]>("/audit-logs", { params }),
        apiClient.get<AuditLogStats>("/audit-logs/stats"),
        apiClient.get<UserItem[]>("/users"),
      ]);

      setLogs(logsRes.data);
      setStats(statsRes.data);
      setUsers(usersRes.data);
    } catch (err) {
      console.error("Failed to load audit logs:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [actionFilter, entityFilter, userFilter, startDate, endDate]);

  const handleExport = () => {
    if (!logs.length) return;
    const headers = ["Timestamp", "Operator", "Action", "Entity Type", "Entity ID", "IP Address", "Changes / Details"];
    const rows = logs.map((l) => [
      new Date(l.created_at).toLocaleString("en-IN"),
      l.user_name || "System",
      l.action,
      l.entity_type,
      l.entity_id || "-",
      l.ip_address || "127.0.0.1",
      l.changes_json || "-",
    ]);
    exportToCsv(`Audit_Trail_${new Date().toISOString().slice(0, 10)}`, headers, rows);
  };

  const getActionBadgeVariant = (action: string) => {
    if (action.includes("FAILED") || action.includes("DELETE") || action.includes("CANCEL")) return "destructive";
    if (action.includes("LOGIN") || action.includes("FINALIZED") || action.includes("VERIFIED")) return "success";
    if (action.includes("PAYMENT") || action.includes("COLLECT")) return "default";
    return "outline";
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="User Activity & Compliance Audit Trail"
        description="Immutable regulatory audit log corresponding to nineth_tab_user_activity.png tracking user authentication, report lifecycles, and financial operations."
      >
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={handleExport} className="flex items-center gap-1.5">
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Export CSV</span>
          </Button>
          <Button variant="outline" size="sm" onClick={loadData} className="flex items-center gap-1.5">
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </Button>
        </div>
      </PageHeader>

      {/* Domain Stats Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
            <History className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] text-slate-400 font-semibold uppercase">Total Events</div>
            <div className="text-base font-bold text-slate-900">{stats?.total_logs || logs.length}</div>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
            <UserCheck className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] text-slate-400 font-semibold uppercase">User Logins</div>
            <div className="text-base font-bold text-slate-900">{stats?.login_events || 0}</div>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-purple-50 text-purple-600">
            <Stethoscope className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] text-slate-400 font-semibold uppercase">Clinical Events</div>
            <div className="text-base font-bold text-purple-700">{stats?.clinical_events || 0}</div>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-pink-50 text-pink-600">
            <Receipt className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] text-slate-400 font-semibold uppercase">Financial Logs</div>
            <div className="text-base font-bold text-pink-700">{stats?.financial_events || 0}</div>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
            <Database className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] text-slate-400 font-semibold uppercase">Master Changes</div>
            <div className="text-base font-bold text-amber-700">{stats?.master_events || 0}</div>
          </div>
        </div>
      </div>

      {/* Advanced Filter Card (Matching nineth_tab_user_activity.png) */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3 text-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
          <div>
            <label className="block font-semibold text-slate-600 mb-1">Operator User:</label>
            <select
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
              className="w-full h-8 px-2 rounded-lg border border-slate-300 bg-white text-xs"
            >
              <option value="">All Operators</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.full_name} ({u.username})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-600 mb-1">Action Category:</label>
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="w-full h-8 px-2 rounded-lg border border-slate-300 bg-white text-xs"
            >
              <option value="">All Actions</option>
              <option value="LOGIN_SUCCESS">LOGIN_SUCCESS</option>
              <option value="LOGIN_FAILED">LOGIN_FAILED</option>
              <option value="CASE_REGISTERED">CASE_REGISTERED</option>
              <option value="REPORT_DRAFTED">REPORT_DRAFTED</option>
              <option value="REPORT_SUBMITTED">REPORT_SUBMITTED</option>
              <option value="REPORT_VERIFIED">REPORT_VERIFIED</option>
              <option value="REPORT_FINALIZED">REPORT_FINALIZED</option>
              <option value="REPORT_AMENDED">REPORT_AMENDED</option>
              <option value="PAYMENT_COLLECTED">PAYMENT_COLLECTED</option>
              <option value="EMAIL_SENT">EMAIL_SENT</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-600 mb-1">Target Entity:</label>
            <select
              value={entityFilter}
              onChange={(e) => setEntityFilter(e.target.value)}
              className="w-full h-8 px-2 rounded-lg border border-slate-300 bg-white text-xs"
            >
              <option value="">All Entities</option>
              <option value="Patient">Patient</option>
              <option value="Case">Case</option>
              <option value="ClinicalReport">ClinicalReport</option>
              <option value="Invoice">Invoice</option>
              <option value="Payment">Payment</option>
              <option value="EmailLog">EmailLog</option>
              <option value="User">User</option>
              <option value="Branch">Branch</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-600 mb-1">Date From:</label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="h-8 text-xs"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-600 mb-1">Date To:</label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="h-8 text-xs"
            />
          </div>
        </div>

        <div className="flex items-center space-x-2 pt-1 border-t border-slate-100">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && loadData()}
              placeholder="Search keyword in changes, entity ID, or IP..."
              className="pl-8 h-8 text-xs w-full"
            />
          </div>
          <Button size="sm" onClick={loadData} className="h-8 bg-slate-900 text-white text-xs">
            Filter
          </Button>
          {(actionFilter || entityFilter || userFilter || startDate || endDate || search) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setActionFilter("");
                setEntityFilter("");
                setUserFilter("");
                setStartDate("");
                setEndDate("");
                setSearch("");
              }}
              className="h-8 text-xs text-slate-500"
            >
              Reset
            </Button>
          )}
        </div>
      </div>

      {/* Table matching nineth_tab_user_activity.png */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {isLoading ? (
          <div className="py-16">
            <LoadingSpinner size="lg" message="Loading audit trail events..." />
          </div>
        ) : logs.length === 0 ? (
          <EmptyState
            title="No Activity Events Recorded"
            description="No matching audit logs recorded for the selected filter parameters."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-100 text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                  <th className="py-3 px-3">TIMESTAMP</th>
                  <th className="py-3 px-3">OPERATOR</th>
                  <th className="py-3 px-3">ACTION</th>
                  <th className="py-3 px-3">ENTITY</th>
                  <th className="py-3 px-3">IP ADDRESS</th>
                  <th className="py-3 px-3">CHANGES / SUMMARY</th>
                  <th className="py-3 px-3 text-right">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-3 text-slate-600 text-[11px] whitespace-nowrap">
                      {formatDateTime(log.created_at)}
                    </td>
                    <td className="py-2.5 px-3 font-sans font-semibold text-slate-900 whitespace-nowrap">
                      {log.user_name}
                    </td>
                    <td className="py-2.5 px-3 font-sans whitespace-nowrap">
                      <Badge variant={getActionBadgeVariant(log.action)}>
                        {log.action}
                      </Badge>
                    </td>
                    <td className="py-2.5 px-3 text-slate-700 font-sans uppercase text-[11px] whitespace-nowrap">
                      {log.entity_type} {log.entity_id ? `(#${log.entity_id.slice(0, 8)})` : ""}
                    </td>
                    <td className="py-2.5 px-3 text-slate-500 text-[11px] whitespace-nowrap">
                      {log.ip_address || "127.0.0.1"}
                    </td>
                    <td className="py-2.5 px-3 text-slate-500 font-sans text-[11px] max-w-xs truncate">
                      {log.changes_json || "-"}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {log.changes_json && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setInspectingLog(log)}
                          className="h-6 px-2 text-[11px] text-blue-600 hover:text-blue-800"
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          Inspect
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Snapshot / Changes JSON Modal */}
      {inspectingLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center space-x-2">
                <Shield className="w-4 h-4 text-blue-600" />
                <h3 className="font-bold text-slate-900 text-sm">Audit Snapshot & Field Mutation</h3>
              </div>
              <Button size="sm" variant="ghost" onClick={() => setInspectingLog(null)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="p-6 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 pb-3 border-b border-slate-100">
                <div>
                  <span className="text-slate-400 block">Operator:</span>
                  <span className="font-semibold text-slate-800">{inspectingLog.user_name}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Action:</span>
                  <span className="font-bold text-blue-700">{inspectingLog.action}</span>
                </div>
              </div>
              <div>
                <span className="text-slate-400 block mb-1">State Mutation Payload (JSON):</span>
                <pre className="bg-slate-900 text-emerald-400 p-4 rounded-xl text-[11px] font-mono overflow-x-auto max-h-72">
                  {(() => {
                    try {
                      return JSON.stringify(JSON.parse(inspectingLog.changes_json || "{}"), null, 2);
                    } catch {
                      return inspectingLog.changes_json;
                    }
                  })()}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
