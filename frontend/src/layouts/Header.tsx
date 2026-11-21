import React, { useState, useEffect } from "react";
import {
  Bell,
  Building,
  ChevronDown,
  LogOut,
  Moon,
  Shield,
  User as UserIcon,
  AlertTriangle,
  Stethoscope,
  Info,
  CheckCircle,
  ExternalLink,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/app/context/AuthContext";
import { apiClient } from "@/lib/api";
import { NotificationItem, NotificationsListResponse } from "@/types";
import { Badge } from "@/components/ui/badge";

export const Header: React.FC<{ isSidebarCollapsed: boolean }> = ({ isSidebarCollapsed }) => {
  const { user, switchBranch, logout } = useAuth();
  const navigate = useNavigate();
  const [isBranchMenuOpen, setIsBranchMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = async () => {
    try {
      const res = await apiClient.get<NotificationsListResponse>("/notifications");
      setNotifications(res.data.items);
      setUnreadCount(res.data.unread_count);
    } catch (err) {
      console.error("Failed to load notifications:", err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleMarkRead = async (id: string, linkUrl?: string) => {
    try {
      await apiClient.post(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
      if (linkUrl) {
        setIsNotificationsOpen(false);
        navigate(linkUrl);
      }
    } catch (err) {
      console.error("Failed to mark notification read:", err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await apiClient.post("/notifications/read-all");
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error("Failed to mark all read:", err);
    }
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white/95 px-6 backdrop-blur transition-all">
      {/* Left side spacer / title */}
      <div className="flex items-center space-x-4">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          {user?.organization_name || "Apex Health PMS"}
        </span>
      </div>

      {/* Right controls */}
      <div className="flex items-center space-x-4">
        {/* Branch Selector Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsBranchMenuOpen(!isBranchMenuOpen)}
            className="flex items-center space-x-2 rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-medium text-white shadow hover:bg-blue-700 transition-colors"
          >
            <Building className="h-4 w-4" />
            <span className="max-w-[200px] truncate">
              {user?.active_branch_name || "Select Branch"}
            </span>
            <ChevronDown className="h-3.5 w-3.5" />
          </button>

          {isBranchMenuOpen && (
            <div className="absolute right-0 mt-2 w-72 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl ring-1 ring-black/5 z-50">
              <div className="px-3 py-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                Switch Operational Branch
              </div>
              <div className="max-h-60 overflow-y-auto py-1 space-y-0.5">
                {user?.allowed_branches.map((b) => {
                  const isCurrent = b.id === user.active_branch_id;
                  return (
                    <button
                      key={b.id}
                      onClick={() => {
                        switchBranch(b.id);
                        setIsBranchMenuOpen(false);
                      }}
                      className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs transition-colors ${
                        isCurrent
                          ? "bg-blue-50 text-blue-700 font-semibold"
                          : "text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      <div>
                        <div className="font-medium">{b.name}</div>
                        <div className="text-[10px] text-slate-400">{b.city}, {b.country}</div>
                      </div>
                      {isCurrent && (
                        <span className="h-2 w-2 rounded-full bg-blue-600"></span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Notifications Bell & Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
            className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100 transition-colors"
            title="Notifications"
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-600 text-[9px] font-bold text-white shadow-sm ring-1 ring-white">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          {isNotificationsOpen && (
            <div className="absolute right-0 mt-2 w-80 rounded-2xl border border-slate-200 bg-white shadow-xl ring-1 ring-black/5 z-50 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Notifications ({unreadCount} new)
                </span>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-[11px] font-medium text-blue-600 hover:text-blue-800"
                  >
                    Mark all read
                  </button>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 text-xs">
                {notifications.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-xs">
                    No notifications
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => handleMarkRead(n.id, n.link_url)}
                      className={`p-3 transition-colors cursor-pointer flex items-start space-x-2.5 ${
                        n.is_read ? "bg-white hover:bg-slate-50 text-slate-600" : "bg-blue-50/50 hover:bg-blue-50 text-slate-900 font-medium"
                      }`}
                    >
                      <div className="mt-0.5 shrink-0">
                        {n.notification_type === "urgent" ? (
                          <AlertTriangle className="w-4 h-4 text-rose-600" />
                        ) : n.notification_type === "clinical" ? (
                          <Stethoscope className="w-4 h-4 text-purple-600" />
                        ) : (
                          <Info className="w-4 h-4 text-blue-600" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold">{n.title}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5 leading-snug line-clamp-2">
                          {n.message}
                        </div>
                        <div className="text-[9px] text-slate-400 mt-1">
                          {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                      {!n.is_read && (
                        <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0 mt-1.5"></span>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Profile Menu */}
        <div className="relative">
          <button
            onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
            className="flex items-center space-x-2.5 rounded-lg p-1.5 hover:bg-slate-100 transition-colors"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-700 font-semibold text-xs border border-blue-200">
              {user?.full_name?.charAt(0) || "U"}
            </div>
            <div className="hidden text-left md:block">
              <div className="text-xs font-semibold text-slate-800 leading-none">
                {user?.full_name}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                {user?.roles?.[0] || "User"}
              </div>
            </div>
            <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
          </button>

          {isProfileMenuOpen && (
            <div className="absolute right-0 mt-2 w-64 rounded-xl border border-slate-200 bg-white p-2 shadow-xl ring-1 ring-black/5 z-50">
              <div className="px-3 py-2 border-b border-slate-100">
                <p className="text-xs font-semibold text-slate-900">{user?.full_name}</p>
                <p className="text-[11px] text-slate-500">{user?.email}</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {user?.roles.map((r) => (
                    <Badge key={r} variant="role">
                      {r}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="py-1">
                <button
                  onClick={() => {
                    setIsProfileMenuOpen(false);
                    logout();
                  }}
                  className="flex w-full items-center space-x-2 rounded-lg px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

