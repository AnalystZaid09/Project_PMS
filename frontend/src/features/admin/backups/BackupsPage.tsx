import React, { useEffect, useState } from "react";
import {
  Database,
  Download,
  RotateCcw,
  Trash2,
  Plus,
  RefreshCw,
  ShieldCheck,
  AlertTriangle,
  HardDrive,
  FileArchive,
  CheckCircle2,
  Clock,
  X,
  Lock,
} from "lucide-react";
import { apiClient } from "@/lib/api";
import { BackupItem } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/common/PageHeader";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { EmptyState } from "@/components/common/EmptyState";

export const BackupsPage: React.FC = () => {
  const [backups, setBackups] = useState<BackupItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Create modal state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [backupType, setBackupType] = useState<"database_dump" | "full_system_archive">("database_dump");
  const [notes, setNotes] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  // Restore confirmation modal
  const [restoringBackup, setRestoringBackup] = useState<BackupItem | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreFeedback, setRestoreFeedback] = useState<string | null>(null);

  // Delete confirmation
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchBackups = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get<BackupItem[]>("/backups");
      setBackups(res.data);
    } catch (err) {
      console.error("Failed to load backups:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBackups();
  }, []);

  const handleCreateBackup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      await apiClient.post("/backups", {
        backup_type: backupType,
        notes: notes || undefined,
      });
      setIsCreateOpen(false);
      setNotes("");
      fetchBackups();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to generate backup.");
    } finally {
      setIsCreating(false);
    }
  };

  const handleDownload = (backup: BackupItem) => {
    const downloadUrl = `/api/v1/backups/${backup.id}/download`;
    window.open(downloadUrl, "_blank");
  };

  const handleConfirmRestore = async () => {
    if (!restoringBackup) return;
    setIsRestoring(true);
    try {
      const res = await apiClient.post(`/backups/${restoringBackup.id}/restore`);
      setRestoreFeedback(res.data.message || "Backup successfully restored.");
      setTimeout(() => {
        setRestoringBackup(null);
        setRestoreFeedback(null);
        fetchBackups();
      }, 2000);
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to restore backup.");
      setIsRestoring(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to permanently delete this backup snapshot?")) return;
    setDeletingId(id);
    try {
      await apiClient.delete(`/backups/${id}`);
      setBackups((prev) => prev.filter((b) => b.id !== id));
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to delete backup.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Database & System Backups"
        description="Disaster recovery and automated snapshot management corresponding to eight_tab_create_backups.png."
      >
        <div className="flex items-center space-x-2">
          <Button
            size="sm"
            onClick={() => setIsCreateOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Snapshot Now</span>
          </Button>
          <Button variant="outline" size="sm" onClick={fetchBackups} className="flex items-center gap-1.5">
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </Button>
        </div>
      </PageHeader>

      {/* Automated Retention & Schedule Policy Card */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-2xl p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <h3 className="text-sm font-bold tracking-tight">Automated Snapshot & Retention Policy</h3>
          </div>
          <p className="text-xs text-slate-300 max-w-2xl">
            Nightly encrypted snapshots are stored in isolated private storage (<span className="font-mono text-emerald-300">storage/backups/</span>).
            The retention engine preserves the 10 most recent snapshots before automatic rotation.
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs shrink-0">
          <div className="bg-white/10 px-3 py-2 rounded-xl border border-white/10 text-center">
            <div className="text-[10px] uppercase text-slate-400">Schedule</div>
            <div className="font-bold text-white">Daily 00:00 UTC</div>
          </div>
          <div className="bg-white/10 px-3 py-2 rounded-xl border border-white/10 text-center">
            <div className="text-[10px] uppercase text-slate-400">Retention</div>
            <div className="font-bold text-emerald-400">Last 10 Snapshots</div>
          </div>
        </div>
      </div>

      {/* Backups Table (Matching eight_tab_create_backups.png) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-16">
            <LoadingSpinner size="lg" message="Reading recorded backup snapshots..." />
          </div>
        ) : backups.length === 0 ? (
          <EmptyState
            title="No Backup Snapshots Found"
            description="No system backups have been generated yet. Click 'Create Snapshot Now' to capture an initial baseline."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200 font-bold uppercase tracking-wider text-slate-700">
                  <th className="py-3 px-3">SR.</th>
                  <th className="py-3 px-3">BACKUP SNAPSHOT</th>
                  <th className="py-3 px-3">TYPE</th>
                  <th className="py-3 px-3">FILE SIZE</th>
                  <th className="py-3 px-3">SHA-256 INTEGRITY CHECKSUM</th>
                  <th className="py-3 px-3">CREATED AT</th>
                  <th className="py-3 px-3">CREATED BY</th>
                  <th className="py-3 px-3 text-center">STATUS</th>
                  <th className="py-3 px-3 text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {backups.map((b, idx) => (
                  <tr key={b.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-2.5 px-3 font-mono text-slate-400">{idx + 1}</td>
                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-slate-900 font-mono text-[11px]">{b.filename}</div>
                      {b.notes && <div className="text-[10px] text-slate-400 italic">{b.notes}</div>}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                        b.backup_type === "full_system_archive"
                          ? "bg-purple-100 text-purple-800"
                          : "bg-blue-100 text-blue-800"
                      }`}>
                        {b.backup_type === "full_system_archive" ? (
                          <FileArchive className="w-3 h-3 text-purple-600" />
                        ) : (
                          <HardDrive className="w-3 h-3 text-blue-600" />
                        )}
                        {b.backup_type === "full_system_archive" ? "FULL ARCHIVE" : "DATABASE DUMP"}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono font-medium text-slate-800">
                      {b.file_size_human}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[10px] text-slate-500 max-w-xs truncate" title={b.checksum_sha256}>
                      {b.checksum_sha256 ? `${b.checksum_sha256.slice(0, 16)}...` : "-"}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap text-slate-600">
                      {new Date(b.created_at).toLocaleString("en-IN")}
                    </td>
                    <td className="py-2.5 px-3 text-slate-700">
                      {b.created_by_name || "System Scheduled"}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        COMPLETED
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDownload(b)}
                          className="h-7 text-xs flex items-center gap-1"
                          title="Download snapshot file"
                        >
                          <Download className="w-3 h-3" />
                          <span>Download</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setRestoringBackup(b)}
                          className="h-7 text-xs text-amber-700 hover:bg-amber-50 border-amber-200 flex items-center gap-1"
                          title="Restore database to this point"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Restore</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(b.id)}
                          disabled={deletingId === b.id}
                          className="h-7 px-2 text-rose-600 hover:text-rose-800 hover:bg-rose-50"
                          title="Delete snapshot"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Backup Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center space-x-2">
                <Database className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-slate-900 text-sm">Generate Backup Snapshot</h3>
              </div>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateBackup} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">Backup Snapshot Type:*</label>
                <div className="space-y-2">
                  <label className={`flex items-start space-x-3 p-3 rounded-xl border cursor-pointer transition-all ${
                    backupType === "database_dump"
                      ? "border-blue-600 bg-blue-50/50"
                      : "border-slate-200 hover:bg-slate-50"
                  }`}>
                    <input
                      type="radio"
                      name="backupType"
                      checked={backupType === "database_dump"}
                      onChange={() => setBackupType("database_dump")}
                      className="mt-0.5 text-blue-600"
                    />
                    <div>
                      <div className="font-bold text-slate-900">Database Dump (Fast)</div>
                      <div className="text-[11px] text-slate-500">
                        Exports relational tables, users, branches, clinical cases, reports, and ledgers.
                      </div>
                    </div>
                  </label>

                  <label className={`flex items-start space-x-3 p-3 rounded-xl border cursor-pointer transition-all ${
                    backupType === "full_system_archive"
                      ? "border-blue-600 bg-blue-50/50"
                      : "border-slate-200 hover:bg-slate-50"
                  }`}>
                    <input
                      type="radio"
                      name="backupType"
                      checked={backupType === "full_system_archive"}
                      onChange={() => setBackupType("full_system_archive")}
                      className="mt-0.5 text-blue-600"
                    />
                    <div>
                      <div className="font-bold text-slate-900">Full System Archive (Complete)</div>
                      <div className="text-[11px] text-slate-500">
                        Archives relational database plus diagnostic scan uploads and report attachments into a compressed ZIP.
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Backup Label / Notes:</label>
                <Input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Pre-maintenance release snapshot"
                  className="h-9 text-xs"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsCreateOpen(false)} disabled={isCreating}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={isCreating} className="bg-blue-600 hover:bg-blue-700 text-white">
                  {isCreating ? <LoadingSpinner size="sm" /> : "Start Snapshot"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Restore Confirmation Dialog (Disaster Recovery Safeguard) */}
      {restoringBackup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-rose-200 w-full max-w-md overflow-hidden flex flex-col">
            <div className="p-6 space-y-4 text-xs">
              <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="text-center space-y-1">
                <h3 className="text-base font-bold text-slate-900">Restore System Snapshot?</h3>
                <p className="text-slate-500 text-xs">
                  Restoring will overwrite current operational data with the state preserved in snapshot:
                </p>
                <div className="p-2.5 rounded-lg bg-slate-100 font-mono text-[11px] text-slate-800 font-bold mt-2">
                  {restoringBackup.filename} ({new Date(restoringBackup.created_at).toLocaleString("en-IN")})
                </div>
              </div>

              {restoreFeedback ? (
                <div className="p-3 rounded-lg bg-emerald-50 text-emerald-800 font-bold text-center">
                  {restoreFeedback}
                </div>
              ) : (
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-[11px]">
                  <strong>Security Notice:</strong> An immutable audit event will be logged recording this restoration.
                </div>
              )}

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setRestoringBackup(null)}
                  disabled={isRestoring}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleConfirmRestore}
                  disabled={isRestoring}
                  className="bg-rose-600 hover:bg-rose-700 text-white"
                >
                  {isRestoring ? <LoadingSpinner size="sm" /> : "Confirm & Restore Data"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
