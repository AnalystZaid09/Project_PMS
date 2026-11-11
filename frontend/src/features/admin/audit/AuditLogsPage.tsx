import React, { useEffect, useState } from "react";
import { History, Shield, Filter, Search } from "lucide-react";
import { apiClient } from "@/lib/api";
import { AuditLogItem } from "@/types";
import { formatDateTime } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/common/PageHeader";

export const AuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [actionFilter, setActionFilter] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const fetchLogs = async () => {
    try {
      const res = await apiClient.get<AuditLogItem[]>("/audit-logs", {
        params: actionFilter ? { action: actionFilter } : {},
      });
      setLogs(res.data);
    } catch (err) {
      console.error("Failed to load audit logs:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [actionFilter]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="User Activity & Audit Trail"
        description="Immutable compliance logs tracking user logins, modifications, and permissions"
      />

      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="FILTER BY ACTION..."
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="pl-9 bg-slate-50 uppercase text-xs tracking-wider"
          />
        </div>
        <div className="text-xs text-slate-500">
          Showing <strong>{logs.length}</strong> recorded audit events
        </div>
      </div>

      {/* Table matching nineth_tab_user_activity.png */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {isLoading ? (
          <LoadingSpinner message="Loading audit trail..." />
        ) : logs.length === 0 ? (
          <EmptyState
            title="No Activity Logged"
            description="No matching audit logs recorded in this period."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  <th className="py-3 px-4">TIMESTAMP</th>
                  <th className="py-3 px-4">OPERATOR</th>
                  <th className="py-3 px-4">ACTION</th>
                  <th className="py-3 px-4">ENTITY</th>
                  <th className="py-3 px-4">IP ADDRESS</th>
                  <th className="py-3 px-4">DETAILS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 text-slate-600 text-[11px]">
                      {formatDateTime(log.created_at)}
                    </td>
                    <td className="py-3 px-4 font-sans font-semibold text-slate-900">
                      {log.user_name}
                    </td>
                    <td className="py-3 px-4 font-sans">
                      <Badge
                        variant={
                          log.action.includes("FAILED")
                            ? "destructive"
                            : log.action.includes("LOGIN")
                            ? "success"
                            : "default"
                        }
                      >
                        {log.action}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-slate-700 font-sans uppercase text-[11px]">
                      {log.entity_type} {log.entity_id ? `(#${log.entity_id.slice(0, 8)})` : ""}
                    </td>
                    <td className="py-3 px-4 text-slate-500 text-[11px]">
                      {log.ip_address || "127.0.0.1"}
                    </td>
                    <td className="py-3 px-4 text-slate-500 font-sans text-[11px] max-w-xs truncate">
                      {log.changes_json || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

