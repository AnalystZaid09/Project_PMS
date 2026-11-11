import React, { useState } from "react";
import {
  Bell,
  Building,
  ChevronDown,
  LogOut,
  Moon,
  Shield,
  User as UserIcon,
} from "lucide-react";
import { useAuth } from "@/app/context/AuthContext";
import { Badge } from "@/components/ui/badge";

export const Header: React.FC<{ isSidebarCollapsed: boolean }> = ({ isSidebarCollapsed }) => {
  const { user, switchBranch, logout } = useAuth();
  const [isBranchMenuOpen, setIsBranchMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

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

        {/* Notifications Bell */}
        <button
          className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100 transition-colors"
          title="Notifications"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-blue-600"></span>
        </button>

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

