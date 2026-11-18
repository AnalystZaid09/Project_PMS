import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  UserCheck,
  Stethoscope,
  Receipt,
  FileBarChart,
  BookOpen,
  Database,
  ShieldAlert,
  ChevronDown,
  ChevronRight,
  Users,
  Building2,
  Sliders,
  History,
  Menu,
} from "lucide-react";
import { useAuth } from "@/app/context/AuthContext";
import { cn } from "@/lib/utils";

interface NavItem {
  title: string;
  href?: string;
  icon: React.ElementType;
  permission?: string;
  badge?: string;
  children?: {
    title: string;
    href: string;
    permission?: string;
  }[];
}

export const Sidebar: React.FC<{ isCollapsed: boolean; onToggle: () => void }> = ({
  isCollapsed,
  onToggle,
}) => {
  const location = useLocation();
  const { hasPermission } = useAuth();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    Administration: true,
  });

  const toggleGroup = (title: string) => {
    setOpenGroups((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  const navItems: NavItem[] = [
    {
      title: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
    },
    {
      title: "Patients & Cases",
      icon: UserCheck,
      permission: "patient_registration:view",
      children: [
        { title: "Case Register", href: "/cases", permission: "patient_registration:view" },
        { title: "New Case Registration", href: "/cases/new", permission: "patient_registration:add" },
        { title: "Patient Directory", href: "/patients", permission: "patient_registration:view" },
      ],
    },
    {
      title: "Services & Tests",
      icon: Stethoscope,
      permission: "investigation_master:view",
      children: [
        { title: "Investigation Catalogue", href: "/masters/investigations", permission: "investigation_master:view" },
        { title: "Investigation Charges", href: "/masters/investigation-charges", permission: "investigation_master:view" },
        { title: "Report Templates", href: "/masters/report-templates", permission: "template_master:view" },
      ],
    },
    {
      title: "Billing & Finance",
      icon: Receipt,
      permission: "financial_registers:view",
      children: [
        { title: "New Bill", href: "/billing/new", permission: "patient_registration:add" },
        { title: "Payment Ledger", href: "/billing/payments", permission: "financial_registers:view" },
      ],
    },
    {
      title: "Reports & Analytics",
      icon: FileBarChart,
      permission: "charges_report:view",
      children: [
        { title: "Patient Reports", href: "/reports/clinical", permission: "patient_report:view" },
        { title: "Charges Report", href: "/reports/charges", permission: "charges_report:view" },
        { title: "Other Charges Report", href: "/reports/other-charges", permission: "other_charges_report:view" },
      ],
    },
    {
      title: "Registers",
      icon: BookOpen,
      permission: "financial_registers:view",
      children: [
        { title: "Case Register", href: "/cases", permission: "financial_registers:view" },
        { title: "Bank Register", href: "/registers/bank", permission: "financial_registers:view" },
        { title: "Expense Register", href: "/registers/expense", permission: "financial_registers:view" },
        { title: "Petty Cash", href: "/registers/petty-cash", permission: "financial_registers:view" },
      ],
    },
    {
      title: "Master Data",
      icon: Database,
      permission: "branch_master:view",
      children: [
        { title: "Branches", href: "/admin/branches", permission: "branch_master:view" },
        { title: "Departments", href: "/masters/departments", permission: "department_master:view" },
        { title: "Cities / Locations", href: "/masters/cities", permission: "city_master:view" },
        { title: "Patient Categories", href: "/masters/patient-categories", permission: "patient_category_master:view" },
        { title: "Doctor Categories", href: "/masters/doctor-categories", permission: "doctor_category_master:view" },
        { title: "Doctors Master", href: "/masters/doctors", permission: "doctor_master:view" },
        { title: "Doctor Tariff Charts", href: "/masters/doctor-rates", permission: "doctor_master:view" },
        { title: "Other Charge Types", href: "/masters/other-charges", permission: "other_charges_master:view" },
        { title: "Email Templates", href: "/masters/email-templates", permission: "template_master:view" },
      ],
    },
    {
      title: "Administration",
      icon: ShieldAlert,
      children: [
        { title: "Users", href: "/admin/users", permission: "user_master:view" },
        { title: "Roles & Permissions", href: "/admin/permissions", permission: "user_right:view" },
        { title: "General Settings", href: "/admin/settings", permission: "general_settings:view" },
        { title: "User Activity Logs", href: "/admin/audit-logs", permission: "audit_logs:view" },
      ],
    },
  ];

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-40 flex flex-col bg-slate-900 text-slate-300 transition-all duration-300 border-r border-slate-800",
        isCollapsed ? "w-16" : "w-64"
      )}
    >
      {/* Brand Header */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-slate-800">
        {!isCollapsed && (
          <div className="flex items-center space-x-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white font-bold text-lg shadow">
              A
            </div>
            <div>
              <span className="font-semibold text-white tracking-tight">Apex PMS</span>
              <p className="text-[10px] text-slate-400">Healthcare Management</p>
            </div>
          </div>
        )}
        <button
          onClick={onToggle}
          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {/* Navigation List */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {navItems.map((item) => {
          // Check top-level permission
          if (item.permission && !hasPermission(item.permission)) {
            return null;
          }

          if (item.children) {
            // Filter children by permission
            const visibleChildren = item.children.filter(
              (c) => !c.permission || hasPermission(c.permission)
            );
            if (visibleChildren.length === 0) return null;

            const isGroupOpen = openGroups[item.title];
            const hasActiveChild = visibleChildren.some((c) => location.pathname === c.href);

            return (
              <div key={item.title} className="space-y-1">
                <button
                  onClick={() => toggleGroup(item.title)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-slate-800 hover:text-white",
                    hasActiveChild ? "text-blue-400 bg-slate-800/60" : "text-slate-300"
                  )}
                  title={isCollapsed ? item.title : undefined}
                >
                  <div className="flex items-center space-x-3">
                    <item.icon className="h-4 w-4 shrink-0 text-slate-400" />
                    {!isCollapsed && <span>{item.title}</span>}
                  </div>
                  {!isCollapsed && (
                    isGroupOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />
                  )}
                </button>

                {!isCollapsed && isGroupOpen && (
                  <div className="pl-9 space-y-1">
                    {visibleChildren.map((child) => {
                      const isActive = location.pathname === child.href;
                      return (
                        <Link
                          key={child.href}
                          to={child.href}
                          className={cn(
                            "block rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                            isActive
                              ? "bg-blue-600 text-white font-semibold shadow-sm"
                              : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                          )}
                        >
                          {child.title}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.title}
              to={item.href || "#"}
              className={cn(
                "flex items-center space-x-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-slate-800 hover:text-white",
                isActive ? "bg-blue-600 text-white shadow-sm" : "text-slate-300"
              )}
              title={isCollapsed ? item.title : undefined}
            >
              <item.icon className="h-4 w-4 shrink-0 text-slate-400" />
              {!isCollapsed && <span>{item.title}</span>}
            </Link>
          );
        })}
      </div>

      {/* Footer System Status */}
      {!isCollapsed && (
        <div className="p-4 border-t border-slate-800 text-[11px] text-slate-500">
          <div className="flex items-center space-x-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
            <span>API v1.0.0 Online</span>
          </div>
        </div>
      )}
    </aside>
  );
};

