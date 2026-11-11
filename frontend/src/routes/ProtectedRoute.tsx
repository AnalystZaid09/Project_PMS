import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { ShieldX } from "lucide-react";
import { useAuth } from "@/app/context/AuthContext";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { Button } from "@/components/ui/button";

interface ProtectedRouteProps {
  requiredPermission?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ requiredPermission }) => {
  const { user, isLoading, hasPermission } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <LoadingSpinner message="Verifying session authorization..." />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requiredPermission && !hasPermission(requiredPermission)) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl border border-red-200 bg-red-50/50 max-w-lg mx-auto my-12">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600 mb-4">
          <ShieldX className="h-6 w-6" />
        </div>
        <h3 className="text-lg font-bold text-red-900">403 — Access Denied</h3>
        <p className="text-xs text-red-700 mt-2 mb-6">
          Your assigned role does not grant permission <code className="font-mono bg-red-100 px-1 py-0.5 rounded">{requiredPermission}</code> to access this clinical module.
        </p>
        <Button variant="outline" onClick={() => window.history.back()} className="border-red-200 text-red-700 hover:bg-red-100">
          Return to Previous Screen
        </Button>
      </div>
    );
  }

  return <Outlet />;
};
