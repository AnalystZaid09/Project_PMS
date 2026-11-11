import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Lock, User, AlertCircle, ShieldCheck } from "lucide-react";
import { useAuth } from "@/app/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("Admin@123");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await login(username, password);
      navigate("/dashboard");
    } catch (err: any) {
      setError(
        err.response?.data?.detail || "Invalid login credentials. Please verify and try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickLogin = (uname: string) => {
    setUsername(uname);
    setPassword("Admin@123");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl border border-slate-200">
        {/* Brand header */}
        <div className="text-center mb-8">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-500/20 mb-4">
            <ShieldCheck className="h-8 w-8" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Apex Health PMS</h2>
          <p className="text-sm text-slate-500 mt-1">Sign in to your clinical management portal</p>
        </div>

        {error && (
          <div className="mb-6 flex items-center space-x-2 rounded-lg bg-red-50 p-3.5 text-xs text-red-700 border border-red-200">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Username or Email
            </label>
            <div className="relative">
              <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="pl-9"
                placeholder="Enter your username"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-9"
                placeholder="Enter password"
                required
              />
            </div>
          </div>

          <Button type="submit" className="w-full h-10 mt-2 font-medium" disabled={isLoading}>
            {isLoading ? "Signing in..." : "Sign In"}
          </Button>
        </form>

        {/* Synthetic Test Accounts Quick-Fill */}
        <div className="mt-8 pt-6 border-t border-slate-200">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 text-center">
            Development Quick Sign-In
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              onClick={() => handleQuickLogin("admin")}
              className="rounded-lg border border-slate-200 p-2 text-left hover:bg-slate-50 transition-colors"
            >
              <div className="font-semibold text-slate-800">Admin</div>
              <div className="text-[10px] text-slate-500">Sarah Jenkins (Full Admin)</div>
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin("receptionist")}
              className="rounded-lg border border-slate-200 p-2 text-left hover:bg-slate-50 transition-colors"
            >
              <div className="font-semibold text-slate-800">Receptionist</div>
              <div className="text-[10px] text-slate-500">Emily Watson (Front Desk)</div>
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin("drmarcus")}
              className="rounded-lg border border-slate-200 p-2 text-left hover:bg-slate-50 transition-colors"
            >
              <div className="font-semibold text-slate-800">Reporting Doctor</div>
              <div className="text-[10px] text-slate-500">Dr. Marcus Vance (Reviewer)</div>
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin("accountant")}
              className="rounded-lg border border-slate-200 p-2 text-left hover:bg-slate-50 transition-colors"
            >
              <div className="font-semibold text-slate-800">Accountant</div>
              <div className="text-[10px] text-slate-500">David Miller (Finance)</div>
            </button>
          </div>
          <p className="text-[11px] text-slate-400 text-center mt-3">
            Password for all test accounts: <span className="font-mono text-slate-600 font-medium">Admin@123</span>
          </p>
        </div>
      </div>
    </div>
  );
};
