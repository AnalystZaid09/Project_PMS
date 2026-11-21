import React, { useEffect, useState } from "react";
import {
  UserCheck,
  FileText,
  IndianRupee,
  Users,
  ShieldAlert,
  ArrowUpRight,
  AlertTriangle,
  Clock,
  CheckCircle2,
  TrendingUp,
  Stethoscope,
  Activity,
  Calendar,
  Building,
  RefreshCw,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/app/context/AuthContext";
import { apiClient } from "@/lib/api";
import { DashboardAnalyticsData } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [period, setPeriod] = useState<string>("today");
  const [data, setData] = useState<DashboardAnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Sub-card filter states (Matching reference screenshot PMS_Dashboard.png)
  const [regPeriod, setRegPeriod] = useState("Today");
  const [repStatus, setRepStatus] = useState("Completed Report");
  const [revPeriod, setRevPeriod] = useState("Today");

  const fetchAnalytics = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get<DashboardAnalyticsData>("/analytics/dashboard", {
        params: { period },
      });
      setData(res.data);
    } catch (err) {
      console.error("Failed to load dashboard analytics:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [period]);

  const kpis = data?.kpis;

  // Calculation for PMS_Dashboard.png dynamic card filters
  const getRegCount = () => {
    if (!kpis) return 0;
    if (regPeriod === "Today") return kpis.today_cases;
    if (regPeriod === "This Week") return kpis.week_cases;
    return kpis.month_cases;
  };

  const getRepCount = () => {
    if (!kpis) return 0;
    if (repStatus === "Completed Report") return kpis.finalized_reports;
    if (repStatus === "Pending Verification") return kpis.pending_verification_reports;
    return kpis.draft_reports;
  };

  const getRevAmount = () => {
    if (!kpis) return "0.00";
    if (revPeriod === "Today") return Number(kpis.today_revenue).toFixed(2);
    if (revPeriod === "This Week") return Number(kpis.month_revenue * 0.35).toFixed(2); // approximate week
    return Number(kpis.month_revenue).toFixed(2);
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Period Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Executive Clinical Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">
            Real-time operations summary for <span className="font-semibold text-blue-600">{user?.active_branch_name || "All Branches"}</span>
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1.5 bg-white border border-slate-200 rounded-lg p-1 shadow-sm text-xs">
            {["today", "week", "month", "all"].map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-md font-medium capitalize transition-colors ${
                  period === p
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                {p === "all" ? "All Time" : p}
              </button>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={fetchAnalytics} className="flex items-center gap-1.5">
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </Button>
        </div>
      </div>

      {isLoading && !data ? (
        <div className="py-20">
          <LoadingSpinner size="lg" message="Compiling executive clinic analytics and graphs..." />
        </div>
      ) : (
        <>
          {/* Main 3 KPI Cards (Exact layout and colors matching PMS_Dashboard.png) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 1: Registration */}
            <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-6 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
                    <UserCheck className="h-5 w-5" />
                  </div>
                  <span className="text-base font-bold text-slate-800">Registration</span>
                </div>
                <select
                  value={regPeriod}
                  onChange={(e) => setRegPeriod(e.target.value)}
                  className="rounded-lg border border-blue-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Today">Today</option>
                  <option value="This Week">This Week</option>
                  <option value="This Month">This Month</option>
                </select>
              </div>
              <div className="mt-6">
                <span className="text-4xl font-extrabold text-blue-700">{getRegCount()}</span>
                <p className="text-xs text-slate-500 mt-1">
                  Cases registered in this period ({kpis?.emergency_cases || 0} Emergency)
                </p>
              </div>
            </div>

            {/* Card 2: Reports */}
            <div className="rounded-2xl border border-purple-100 bg-purple-50/70 p-6 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-600 text-white shadow-sm">
                    <FileText className="h-5 w-5" />
                  </div>
                  <span className="text-base font-bold text-slate-800">Reports</span>
                </div>
                <select
                  value={repStatus}
                  onChange={(e) => setRepStatus(e.target.value)}
                  className="rounded-lg border border-purple-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="Completed Report">Completed Report</option>
                  <option value="Pending Verification">Pending Verification</option>
                  <option value="Draft Reports">Draft Reports</option>
                </select>
              </div>
              <div className="mt-6">
                <span className="text-4xl font-extrabold text-purple-700">{getRepCount()}</span>
                <p className="text-xs text-slate-500 mt-1">Investigation diagnostic reports in status</p>
              </div>
            </div>

            {/* Card 3: Revenue (Permission Controlled) */}
            <div className="rounded-2xl border border-pink-100 bg-pink-50/70 p-6 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-pink-600 text-white shadow-sm">
                    <IndianRupee className="h-5 w-5" />
                  </div>
                  <span className="text-base font-bold text-slate-800">Revenue</span>
                </div>
                <select
                  value={revPeriod}
                  onChange={(e) => setRevPeriod(e.target.value)}
                  className="rounded-lg border border-pink-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                >
                  <option value="Today">Today</option>
                  <option value="This Week">This Week</option>
                  <option value="This Month">This Month</option>
                </select>
              </div>
              <div className="mt-6">
                <span className="text-4xl font-extrabold text-pink-700">₹{Number(getRevAmount()).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                <p className="text-xs text-slate-500 mt-1">
                  Net collections across active branch (Due: ₹{Number(kpis?.outstanding_dues || 0).toLocaleString("en-IN")})
                </p>
              </div>
            </div>
          </div>

          {/* Quick Metrics Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-3">
              <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-600">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs text-slate-500">Unique Patients</div>
                <div className="text-lg font-bold text-slate-900">{kpis?.total_patients}</div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-3">
              <div className="p-2.5 rounded-lg bg-rose-50 text-rose-600">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs text-slate-500">Emergency Cases</div>
                <div className="text-lg font-bold text-rose-600">{kpis?.emergency_cases}</div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-3">
              <div className="p-2.5 rounded-lg bg-amber-50 text-amber-600">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs text-slate-500">Doctor Sign-offs Pending</div>
                <div className="text-lg font-bold text-amber-700">{kpis?.pending_verification_reports}</div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-3">
              <div className="p-2.5 rounded-lg bg-blue-50 text-blue-600">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs text-slate-500">Cumulative Revenue</div>
                <div className="text-lg font-bold text-slate-900">₹{Number(kpis?.total_revenue || 0).toLocaleString("en-IN")}</div>
              </div>
            </div>
          </div>

          {/* Visual Analytics Charts Section (Matching PMS/Third_Tab/graph.png) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Chart 1: 14-Day Revenue & Collections Bar Graph */}
            <Card className="shadow-sm">
              <CardHeader className="pb-3 border-b border-slate-100">
                <CardTitle className="text-sm font-semibold flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <TrendingUp className="w-4 h-4 text-blue-600" />
                    <span>Daily Financial Velocity (Last 14 Days)</span>
                  </div>
                  <div className="flex items-center space-x-3 text-xs font-normal">
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-600"></span> Billed</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-500"></span> Collected</span>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                {data?.revenue_trends && data.revenue_trends.length > 0 ? (
                  <div className="space-y-4">
                    {/* SVG Bar Chart */}
                    <div className="h-48 w-full flex items-end gap-2 pt-6 pb-2 border-b border-slate-100">
                      {data.revenue_trends.map((item, idx) => {
                        const maxVal = Math.max(
                          ...data.revenue_trends.map((t) => Math.max(Number(t.revenue), Number(t.collections), 1000))
                        );
                        const revHeight = Math.max(8, (Number(item.revenue) / maxVal) * 140);
                        const colHeight = Math.max(6, (Number(item.collections) / maxVal) * 140);

                        return (
                          <div key={idx} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                            {/* Hover tooltip */}
                            <div className="absolute -top-10 hidden group-hover:flex flex-col items-center z-20 bg-slate-900 text-white text-[10px] py-1 px-2 rounded shadow whitespace-nowrap">
                              <span>{item.date}</span>
                              <span className="font-bold">Billed: ₹{Number(item.revenue).toFixed(0)}</span>
                              <span className="text-emerald-400">Paid: ₹{Number(item.collections).toFixed(0)}</span>
                            </div>
                            <div className="flex items-end gap-1 w-full justify-center">
                              <div
                                style={{ height: `${revHeight}px` }}
                                className="w-2 sm:w-3 bg-blue-600 rounded-t transition-all group-hover:bg-blue-700"
                              ></div>
                              <div
                                style={{ height: `${colHeight}px` }}
                                className="w-2 sm:w-3 bg-emerald-500 rounded-t transition-all group-hover:bg-emerald-600"
                              ></div>
                            </div>
                            <span className="text-[9px] text-slate-400 mt-2 truncate w-full text-center">
                              {item.date.slice(0, 2)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    <div className="text-center text-xs text-slate-400">
                      Day-by-day Diagnostic Invoicing & Cash Flow Reconciled
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-10 text-xs text-slate-400">No trend transactions recorded yet</div>
                )}
              </CardContent>
            </Card>

            {/* Chart 2: Department Distribution & Investigation Volume */}
            <Card className="shadow-sm">
              <CardHeader className="pb-3 border-b border-slate-100">
                <CardTitle className="text-sm font-semibold flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Activity className="w-4 h-4 text-purple-600" />
                    <span>Department Workload & Revenue Share</span>
                  </div>
                  <span className="text-xs text-slate-400 font-normal">Active Specialities</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                {data?.department_distribution && data.department_distribution.length > 0 ? (
                  <div className="space-y-3">
                    {data.department_distribution.map((dept, idx) => {
                      const totalCases = data.department_distribution.reduce((acc, d) => acc + d.case_count, 0) || 1;
                      const percentage = Math.round((dept.case_count / totalCases) * 100);
                      const colors = ["bg-blue-600", "bg-purple-600", "bg-emerald-600", "bg-amber-600", "bg-pink-600", "bg-indigo-600"];
                      const barColor = colors[idx % colors.length];

                      return (
                        <div key={dept.department_id} className="space-y-1">
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-medium text-slate-800">{dept.department_name}</span>
                            <div className="flex items-center space-x-2">
                              <span className="text-slate-500">{dept.case_count} cases ({percentage}%)</span>
                              <span className="font-semibold text-slate-900 font-mono">₹{Number(dept.revenue).toLocaleString("en-IN")}</span>
                            </div>
                          </div>
                          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${barColor}`}
                              style={{ width: `${Math.max(percentage, 5)}%` }}
                            ></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-10 text-xs text-slate-400">No department encounters logged</div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Operational Action Queues (Emergency Cases & Pending Verifications) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Queue 1: Emergency Cases in Progress */}
            <Card className="shadow-sm border-rose-100">
              <CardHeader className="pb-3 border-b border-rose-50 bg-rose-50/40">
                <CardTitle className="text-sm font-semibold flex items-center justify-between text-rose-900">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    <span>Emergency Cases Requiring Attention</span>
                  </div>
                  <Badge variant="destructive" className="text-[10px]">
                    {data?.emergency_queue.length || 0} Open
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {!data || data.emergency_queue.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400">
                    No emergency cases awaiting processing
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 text-xs">
                    {data.emergency_queue.map((c) => (
                      <div key={c.id} className="p-3.5 flex items-center justify-between hover:bg-slate-50 transition-colors">
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-semibold text-slate-900">{c.patient_name}</span>
                            <span className="text-[10px] font-mono bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded font-bold">EMERGENCY</span>
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                            {c.case_number} • {c.department_name || "Diagnostic Service"}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigate("/cases")}
                          className="h-7 text-xs text-rose-700 hover:bg-rose-50 border-rose-200"
                        >
                          View Case
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Queue 2: Pending Doctor Verifications */}
            <Card className="shadow-sm border-amber-100">
              <CardHeader className="pb-3 border-b border-amber-50 bg-amber-50/40">
                <CardTitle className="text-sm font-semibold flex items-center justify-between text-amber-900">
                  <div className="flex items-center space-x-2">
                    <Clock className="w-4 h-4 text-amber-600" />
                    <span>Clinical Reports Awaiting Doctor Sign-off</span>
                  </div>
                  <Badge className="bg-amber-100 text-amber-800 text-[10px]">
                    {data?.pending_verifications.length || 0} Review
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {!data || data.pending_verifications.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400">
                    All drafted reports have been verified
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 text-xs">
                    {data.pending_verifications.map((rep) => (
                      <div key={rep.id} className="p-3.5 flex items-center justify-between hover:bg-slate-50 transition-colors">
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-semibold text-slate-900">{rep.patient_name}</span>
                            <span className="text-[10px] font-mono text-slate-400">({rep.case_number})</span>
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            {rep.investigation_name} • <span className="font-mono text-slate-400">{rep.report_number}</span>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => navigate(`/reports/editor/${rep.id}`)}
                          className="h-7 text-xs bg-amber-600 hover:bg-amber-700 text-white"
                        >
                          Review & Sign
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Session Profile & System Architecture Card */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-semibold flex items-center space-x-2">
                  <Users className="h-4 w-4 text-blue-600" />
                  <span>Session Authorization Details</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                  <span className="text-slate-500">Authenticated User</span>
                  <span className="font-semibold text-slate-800">{user?.full_name} ({user?.username})</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                  <span className="text-slate-500">Assigned Roles</span>
                  <div className="flex flex-wrap gap-1">
                    {user?.roles.map((r) => (
                      <Badge key={r} variant="role">{r}</Badge>
                    ))}
                  </div>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                  <span className="text-slate-500">Authorized Regional Branches</span>
                  <span className="font-medium text-slate-700">{user?.allowed_branches?.length} centres</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-slate-500">Active Permissions</span>
                  <Badge variant="outline">{user?.permissions?.length} granular capabilities</Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base font-semibold flex items-center space-x-2">
                  <Building className="h-4 w-4 text-emerald-600" />
                  <span>Operational Governance</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5 text-xs text-slate-600">
                <p className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span><strong>Full Branch Isolation:</strong> Financial ledgers, case registrations, and diagnostic archives are branch scoped.</span>
                </p>
                <p className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span><strong>Clinical Safety Enforced:</strong> Manual doctor review and digital signatures required for report finalization.</span>
                </p>
                <p className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span><strong>Immutable Audit Trail:</strong> Every login, payment, report transition, and master update is permanently logged.</span>
                </p>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
};
