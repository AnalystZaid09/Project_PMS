import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { AppLayout } from "@/layouts/AppLayout";
import { ProtectedRoute } from "@/routes/ProtectedRoute";
import { LoginPage } from "@/features/auth/LoginPage";
import { DashboardPage } from "@/features/dashboard/DashboardPage";
import { UsersPage } from "@/features/admin/users/UsersPage";
import { PermissionsPage } from "@/features/admin/roles/PermissionsPage";
import { BranchesPage } from "@/features/admin/branches/BranchesPage";
import { SettingsPage } from "@/features/admin/settings/SettingsPage";
import { AuditLogsPage } from "@/features/admin/audit/AuditLogsPage";

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Public Route */}
      <Route path="/login" element={<LoginPage />} />

      {/* Authenticated Application Routes */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />

          {/* Admin Routes with Permission Checks */}
          <Route element={<ProtectedRoute requiredPermission="user_master:view" />}>
            <Route path="/admin/users" element={<UsersPage />} />
          </Route>

          <Route element={<ProtectedRoute requiredPermission="user_right:view" />}>
            <Route path="/admin/permissions" element={<PermissionsPage />} />
          </Route>

          <Route element={<ProtectedRoute requiredPermission="branch_master:view" />}>
            <Route path="/admin/branches" element={<BranchesPage />} />
          </Route>

          <Route element={<ProtectedRoute requiredPermission="general_settings:view" />}>
            <Route path="/admin/settings" element={<SettingsPage />} />
          </Route>

          <Route element={<ProtectedRoute requiredPermission="audit_logs:view" />}>
            <Route path="/admin/audit-logs" element={<AuditLogsPage />} />
          </Route>
        </Route>
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

