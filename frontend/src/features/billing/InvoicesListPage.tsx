import React, { useEffect, useState } from "react";
import {
  Search,
  Filter,
  RefreshCw,
  Eye,
  CreditCard,
  RotateCcw,
  Printer,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  X,
  Receipt,
  DollarSign,
  ArrowUpRight,
  ArrowDownLeft,
} from "lucide-react";
import { apiClient } from "@/lib/api";
import { InvoiceDetail, BillingSummaryStats } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/common/PageHeader";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { EmptyState } from "@/components/common/EmptyState";
import { Dialog, DialogHeader, DialogFooter } from "@/components/ui/dialog";
import { exportToCsv } from "@/lib/exportUtils";

export const InvoicesListPage: React.FC = () => {
  const [invoices, setInvoices] = useState<InvoiceDetail[]>([]);
  const [stats, setStats] = useState<BillingSummaryStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Modals
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceDetail | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  // Payment Modal
  const [paymentInvoice, setPaymentInvoice] = useState<InvoiceDetail | null>(null);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMode, setPayMode] = useState<string>("cash");
  const [payRef, setPayRef] = useState<string>("");
  const [payNotes, setPayNotes] = useState<string>("");
  const [isSubmittingPay, setIsSubmittingPay] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);

  // Refund Modal
  const [refundInvoice, setRefundInvoice] = useState<InvoiceDetail | null>(null);
  const [refundAmount, setRefundAmount] = useState<number>(0);
  const [refundMode, setRefundMode] = useState<string>("cash");
  const [refundRef, setRefundRef] = useState<string>("");
  const [refundReason, setRefundReason] = useState<string>("");
  const [isSubmittingRefund, setIsSubmittingRefund] = useState(false);
  const [refundError, setRefundError] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      const res = await apiClient.get<BillingSummaryStats>("/invoices/summary/stats");
      setStats(res.data);
    } catch (err) {
      console.error("Failed to load billing stats:", err);
    }
  };

  const fetchInvoices = async () => {
    setIsLoading(true);
    try {
      const params: any = {};
      if (search.trim()) params.search = search.trim();
      if (statusFilter) params.payment_status = statusFilter;
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;

      const res = await apiClient.get<InvoiceDetail[]>("/invoices", { params });
      setInvoices(res.data);
    } catch (err) {
      console.error("Failed to load invoices:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    fetchInvoices();
  }, [search, statusFilter, startDate, endDate]);

  const handleOpenPayment = (inv: InvoiceDetail) => {
    setPaymentInvoice(inv);
    setPayAmount(Number(inv.outstanding_balance));
    setPayMode("cash");
    setPayRef("");
    setPayNotes("");
    setPayError(null);
  };

  const handleOpenRefund = (inv: InvoiceDetail) => {
    setRefundInvoice(inv);
    setRefundAmount(Number(inv.paid_amount));
    setRefundMode("cash");
    setRefundRef("");
    setRefundReason("");
    setRefundError(null);
  };

  const handleViewInvoice = async (invoiceId: string) => {
    try {
      const res = await apiClient.get<InvoiceDetail>(`/invoices/${invoiceId}`);
      setSelectedInvoice(res.data);
      setIsViewModalOpen(true);
    } catch (err) {
      console.error("Failed to fetch invoice details:", err);
    }
  };

  const submitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentInvoice) return;
    if (payAmount <= 0) {
      setPayError("Payment amount must be greater than zero.");
      return;
    }
    if (payAmount > Number(paymentInvoice.outstanding_balance)) {
      setPayError(
        `Amount cannot exceed outstanding balance of ₹${Number(paymentInvoice.outstanding_balance).toFixed(2)}`
      );
      return;
    }

    setIsSubmittingPay(true);
    setPayError(null);
    try {
      const res = await apiClient.post<InvoiceDetail>(
        `/invoices/${paymentInvoice.id}/payments`,
        {
          amount: payAmount,
          payment_mode: payMode,
          reference_number: payRef.trim() || undefined,
          notes: payNotes.trim() || undefined,
        }
      );
      setPaymentInvoice(null);
      fetchStats();
      fetchInvoices();
      // Auto open receipt preview with updated invoice data
      setSelectedInvoice(res.data);
      setIsViewModalOpen(true);
    } catch (err: any) {
      setPayError(err.response?.data?.detail || "Failed to process payment.");
    } finally {
      setIsSubmittingPay(false);
    }
  };

  const submitRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!refundInvoice) return;
    if (refundAmount <= 0) {
      setRefundError("Refund amount must be greater than zero.");
      return;
    }
    if (refundAmount > Number(refundInvoice.paid_amount)) {
      setRefundError(
        `Refund cannot exceed collected amount of ₹${Number(refundInvoice.paid_amount).toFixed(2)}`
      );
      return;
    }
    if (!refundReason.trim()) {
      setRefundError("Please state a clear reason for the refund.");
      return;
    }

    setIsSubmittingRefund(true);
    setRefundError(null);
    try {
      const res = await apiClient.post<InvoiceDetail>(
        `/invoices/${refundInvoice.id}/refund`,
        {
          amount: refundAmount,
          payment_mode: refundMode,
          reference_number: refundRef.trim() || undefined,
          reason: refundReason.trim(),
        }
      );
      setRefundInvoice(null);
      fetchStats();
      fetchInvoices();
      setSelectedInvoice(res.data);
      setIsViewModalOpen(true);
    } catch (err: any) {
      setRefundError(err.response?.data?.detail || "Failed to process refund.");
    } finally {
      setIsSubmittingRefund(false);
    }
  };

  const handleExport = () => {
    const headers = [
      "Invoice Number",
      "Case Number",
      "Patient Name",
      "Patient UHID",
      "Invoice Date",
      "Grand Total (INR)",
      "Paid Amount (INR)",
      "Outstanding Balance (INR)",
      "Status",
    ];
    const rows = invoices.map((inv) => [
      inv.invoice_number,
      inv.case_number,
      inv.patient_name,
      inv.patient_uhid,
      new Date(inv.created_at).toLocaleDateString("en-IN"),
      Number(inv.grand_total).toFixed(2),
      Number(inv.paid_amount).toFixed(2),
      Number(inv.outstanding_balance).toFixed(2),
      inv.payment_status.toUpperCase(),
    ]);
    exportToCsv(`Invoices_Register_${new Date().toISOString().slice(0, 10)}`, headers, rows);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300">Paid</Badge>;
      case "partially_paid":
        return <Badge className="bg-amber-100 text-amber-800 border-amber-300">Partial</Badge>;
      case "unpaid":
        return <Badge className="bg-rose-100 text-rose-800 border-rose-300">Unpaid</Badge>;
      case "refunded":
        return <Badge className="bg-purple-100 text-purple-800 border-purple-300">Refunded</Badge>;
      default:
        return <Badge className="bg-slate-100 text-slate-800 border-slate-300">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Billing & Invoices"
        description="Manage patient billing, record collections, print official receipts and issue refunds."
      >
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={handleExport} className="flex items-center gap-1.5">
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            Export CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              fetchStats();
              fetchInvoices();
            }}
            className="flex items-center gap-1.5"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
        </div>
      </PageHeader>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Invoices</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{stats?.total_invoices ?? 0}</p>
            <p className="text-xs text-slate-500 mt-1">
              {stats?.paid_count ?? 0} paid • {stats?.partial_count ?? 0} partial • {stats?.unpaid_count ?? 0} unpaid
            </p>
          </div>
          <div className="w-12 h-12 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <Receipt className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Billed</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">
              ₹{Number(stats?.total_billed ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-emerald-600 font-medium mt-1">Gross diagnostic tariff</p>
          </div>
          <div className="w-12 h-12 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Collected</p>
            <p className="text-2xl font-bold text-emerald-700 mt-1">
              ₹{Number(stats?.total_collected ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-slate-500 mt-1">Cleared collections</p>
          </div>
          <div className="w-12 h-12 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <ArrowDownLeft className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Outstanding Balance</p>
            <p className="text-2xl font-bold text-rose-700 mt-1">
              ₹{Number(stats?.total_due ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-rose-600 font-medium mt-1">Pending patient dues</p>
          </div>
          <div className="w-12 h-12 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
            <ArrowUpRight className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="flex-1 flex flex-col sm:flex-row gap-3 w-full">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <Input
              placeholder="Search by invoice #, case #, patient name, UHID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-10"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-10 px-3 py-2 text-sm rounded-md border border-slate-300 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Statuses</option>
              <option value="paid">Paid</option>
              <option value="partially_paid">Partially Paid</option>
              <option value="unpaid">Unpaid</option>
              <option value="refunded">Refunded</option>
            </select>

            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="h-10 w-36 text-xs"
              placeholder="From Date"
            />
            <span className="text-slate-400 text-xs">to</span>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="h-10 w-36 text-xs"
              placeholder="To Date"
            />

            {(search || statusFilter || startDate || endDate) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearch("");
                  setStatusFilter("");
                  setStartDate("");
                  setEndDate("");
                }}
                className="h-10 text-xs text-slate-600 hover:text-slate-900"
              >
                Clear
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-16">
            <LoadingSpinner size="lg" message="Loading invoices & financial records..." />
          </div>
        ) : invoices.length === 0 ? (
          <EmptyState
            title="No Invoices Found"
            description="No billing records match your search criteria or date filter."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold uppercase tracking-wider text-slate-600">
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-4">Case #</th>
                  <th className="py-3 px-4">Patient</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4 text-right">Grand Total</th>
                  <th className="py-3 px-4 text-right">Paid</th>
                  <th className="py-3 px-4 text-right">Balance</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoices.map((inv) => {
                  const balance = Number(inv.outstanding_balance);
                  const paid = Number(inv.paid_amount);
                  return (
                    <tr key={inv.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-mono font-medium text-blue-600">{inv.invoice_number}</td>
                      <td className="py-3 px-4 font-mono text-slate-700">{inv.case_number}</td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-900">{inv.patient_name}</div>
                        <div className="text-xs text-slate-500 font-mono">UHID: {inv.patient_uhid}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                        {new Date(inv.created_at).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-slate-900">
                        ₹{Number(inv.grand_total).toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-emerald-700">
                        ₹{paid.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-rose-700">
                        ₹{balance.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-center">{getStatusBadge(inv.payment_status)}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center space-x-1">
                          <button
                            title="View Invoice & Receipts"
                            onClick={() => handleViewInvoice(inv.id)}
                            className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {balance > 0 && (
                            <button
                              title="Collect Payment"
                              onClick={() => handleOpenPayment(inv)}
                              className="px-2 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-md transition-colors flex items-center gap-1"
                            >
                              <CreditCard className="w-3.5 h-3.5" />
                              Pay
                            </button>
                          )}
                          {paid > 0 && inv.payment_status !== "refunded" && (
                            <button
                              title="Issue Refund"
                              onClick={() => handleOpenRefund(inv)}
                              className="px-2 py-1 text-xs font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-md transition-colors flex items-center gap-1"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              Refund
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal 1: Payment Collection Modal */}
      {paymentInvoice && (
        <Dialog open={Boolean(paymentInvoice)} onOpenChange={() => setPaymentInvoice(null)}>
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden">
            <DialogHeader>
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">Collect Payment</h3>
                    <p className="text-xs text-slate-500">Invoice: {paymentInvoice.invoice_number}</p>
                  </div>
                </div>
                <button
                  onClick={() => setPaymentInvoice(null)}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </DialogHeader>

            <form onSubmit={submitPayment} className="p-5 space-y-4">
              {payError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{payError}</span>
                </div>
              )}

              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Patient:</span>
                  <span className="font-medium text-slate-900">{paymentInvoice.patient_name}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Grand Total:</span>
                  <span className="font-medium text-slate-900">₹{Number(paymentInvoice.grand_total).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Paid So Far:</span>
                  <span className="font-medium text-emerald-600">₹{Number(paymentInvoice.paid_amount).toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-semibold text-slate-900 pt-1 border-t border-slate-200">
                  <span>Outstanding Balance:</span>
                  <span className="text-rose-600">₹{Number(paymentInvoice.outstanding_balance).toFixed(2)}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Payment Amount (₹)*</label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={Number(paymentInvoice.outstanding_balance)}
                  required
                  value={payAmount}
                  onChange={(e) => setPayAmount(parseFloat(e.target.value) || 0)}
                  className="font-mono text-base font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Payment Mode*</label>
                <select
                  value={payMode}
                  onChange={(e) => setPayMode(e.target.value)}
                  className="w-full h-10 px-3 text-sm rounded-md border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="cash">Cash</option>
                  <option value="card">Credit / Debit Card</option>
                  <option value="upi">UPI / QR Code</option>
                  <option value="cheque">Cheque</option>
                  <option value="bank_transfer">Bank Transfer (NEFT / RTGS / IMPS)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Reference / Cheque / UTR # {payMode !== "cash" && <span className="text-rose-500">*</span>}
                </label>
                <Input
                  placeholder={payMode === "cheque" ? "Cheque Number" : "Transaction ID / Reference"}
                  value={payRef}
                  onChange={(e) => setPayRef(e.target.value)}
                  required={payMode !== "cash"}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Notes / Remarks</label>
                <Input
                  placeholder="Optional collection note"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                />
              </div>

              <DialogFooter>
                <div className="flex justify-end space-x-2 pt-3 border-t border-slate-200 w-full">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setPaymentInvoice(null)}
                    disabled={isSubmittingPay}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmittingPay}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    {isSubmittingPay ? "Processing..." : `Collect ₹${payAmount.toFixed(2)}`}
                  </Button>
                </div>
              </DialogFooter>
            </form>
          </div>
        </Dialog>
      )}

      {/* Modal 2: Refund Modal */}
      {refundInvoice && (
        <Dialog open={Boolean(refundInvoice)} onOpenChange={() => setRefundInvoice(null)}>
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden">
            <DialogHeader>
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center">
                    <RotateCcw className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">Issue Patient Refund</h3>
                    <p className="text-xs text-slate-500">Invoice: {refundInvoice.invoice_number}</p>
                  </div>
                </div>
                <button
                  onClick={() => setRefundInvoice(null)}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </DialogHeader>

            <form onSubmit={submitRefund} className="p-5 space-y-4">
              {refundError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{refundError}</span>
                </div>
              )}

              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Patient:</span>
                  <span className="font-medium text-slate-900">{refundInvoice.patient_name}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Collected So Far:</span>
                  <span className="font-medium text-emerald-600">₹{Number(refundInvoice.paid_amount).toFixed(2)}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Refund Amount (₹)*</label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={Number(refundInvoice.paid_amount)}
                  required
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(parseFloat(e.target.value) || 0)}
                  className="font-mono text-base font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Refund Mode*</label>
                <select
                  value={refundMode}
                  onChange={(e) => setRefundMode(e.target.value)}
                  className="w-full h-10 px-3 text-sm rounded-md border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="cash">Cash</option>
                  <option value="bank_transfer">Bank Transfer / UPI</option>
                  <option value="cheque">Cheque</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Reference / Cheque #</label>
                <Input
                  placeholder="Optional reference"
                  value={refundRef}
                  onChange={(e) => setRefundRef(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Reason for Refund*</label>
                <textarea
                  rows={2}
                  required
                  placeholder="e.g. Test cancelled by patient, overpayment adjustment"
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-md border border-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <DialogFooter>
                <div className="flex justify-end space-x-2 pt-3 border-t border-slate-200 w-full">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setRefundInvoice(null)}
                    disabled={isSubmittingRefund}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmittingRefund}
                    className="bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    {isSubmittingRefund ? "Processing..." : `Refund ₹${refundAmount.toFixed(2)}`}
                  </Button>
                </div>
              </DialogFooter>
            </form>
          </div>
        </Dialog>
      )}

      {/* Modal 3: View & Print Invoice / Receipt Preview */}
      {selectedInvoice && (
        <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center space-x-2">
                <Receipt className="w-5 h-5 text-blue-600" />
                <h3 className="font-semibold text-slate-900">Tax Invoice & Payment Receipt</h3>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 text-xs"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print Receipt
                </Button>
                <button
                  onClick={() => setIsViewModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Content */}
            <div className="p-6 overflow-y-auto space-y-6 text-slate-800 print:p-0">
              {/* Organization Header */}
              <div className="border-b border-slate-200 pb-4 flex justify-between items-start">
                <div>
                  <h1 className="text-xl font-bold tracking-tight text-blue-700">Apex Health Diagnostics</h1>
                  <p className="text-xs text-slate-500">Comprehensive Clinical & Imaging Diagnostics</p>
                  <p className="text-xs text-slate-500">Branch: {selectedInvoice.branch_name || "Main Branch"}</p>
                  <p className="text-xs text-slate-500">Tax / GST Reg: 27AABCA1234F1Z5</p>
                </div>
                <div className="text-right">
                  <div className="inline-block px-3 py-1 rounded bg-blue-50 text-blue-800 font-mono text-xs font-bold border border-blue-200">
                    {selectedInvoice.invoice_number}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Date: {new Date(selectedInvoice.created_at).toLocaleDateString("en-IN", { dateStyle: "long" })}
                  </p>
                  <p className="text-xs text-slate-500">Case No: {selectedInvoice.case_number}</p>
                </div>
              </div>

              {/* Patient Details */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-200 text-xs">
                <div>
                  <p className="text-slate-500">Patient Name:</p>
                  <p className="font-bold text-slate-900 text-sm">{selectedInvoice.patient_name}</p>
                  <p className="text-slate-500 mt-1">UHID: <span className="font-mono text-slate-800">{selectedInvoice.patient_uhid}</span></p>
                </div>
                <div>
                  <p className="text-slate-500">Contact Phone:</p>
                  <p className="font-medium text-slate-900">{selectedInvoice.patient_phone || "-"}</p>
                  <p className="text-slate-500 mt-1">Category: <span className="font-medium text-slate-800">{selectedInvoice.patient_category_name || "General"}</span></p>
                </div>
              </div>

              {/* Investigation / Charges Itemized Table */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Itemized Services & Tariffs</h4>
                <table className="w-full text-left text-xs border border-slate-200">
                  <thead className="bg-slate-100 text-slate-600 border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-3">Service / Investigation</th>
                      <th className="py-2 px-3">Code</th>
                      <th className="py-2 px-3 text-center">Qty</th>
                      <th className="py-2 px-3 text-right">Price</th>
                      <th className="py-2 px-3 text-right">Disc</th>
                      <th className="py-2 px-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedInvoice.items?.map((item, idx) => (
                      <tr key={idx}>
                        <td className="py-2 px-3 font-medium text-slate-800">{item.name}</td>
                        <td className="py-2 px-3 font-mono text-slate-500">{item.code || "-"}</td>
                        <td className="py-2 px-3 text-center">{item.quantity}</td>
                        <td className="py-2 px-3 text-right">₹{Number(item.unit_price).toFixed(2)}</td>
                        <td className="py-2 px-3 text-right text-slate-500">₹{Number(item.discount_amount).toFixed(2)}</td>
                        <td className="py-2 px-3 text-right font-medium text-slate-900">₹{Number(item.final_price).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals Summary */}
              <div className="flex justify-end">
                <div className="w-64 space-y-1.5 text-xs bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal:</span>
                    <span>₹{Number(selectedInvoice.subtotal).toFixed(2)}</span>
                  </div>
                  {Number(selectedInvoice.discount_total) > 0 && (
                    <div className="flex justify-between text-emerald-600">
                      <span>Discount:</span>
                      <span>-₹{Number(selectedInvoice.discount_total).toFixed(2)}</span>
                    </div>
                  )}
                  {Number(selectedInvoice.tax_total) > 0 && (
                    <div className="flex justify-between text-slate-600">
                      <span>Tax (GST):</span>
                      <span>₹{Number(selectedInvoice.tax_total).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-slate-900 text-sm pt-1 border-t border-slate-200">
                    <span>Grand Total:</span>
                    <span>₹{Number(selectedInvoice.grand_total).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-emerald-700">
                    <span>Amount Paid:</span>
                    <span>₹{Number(selectedInvoice.paid_amount).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-rose-700 border-t border-slate-200 pt-1">
                    <span>Balance Due:</span>
                    <span>₹{Number(selectedInvoice.outstanding_balance).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Payment Receipts History */}
              {selectedInvoice.payments && selectedInvoice.payments.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Receipts & Payment History</h4>
                  <table className="w-full text-left text-xs border border-slate-200">
                    <thead className="bg-slate-100 text-slate-600 border-b border-slate-200">
                      <tr>
                        <th className="py-2 px-3">Receipt No</th>
                        <th className="py-2 px-3">Date</th>
                        <th className="py-2 px-3">Mode</th>
                        <th className="py-2 px-3">Reference / Notes</th>
                        <th className="py-2 px-3 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedInvoice.payments.map((p) => (
                        <tr key={p.id}>
                          <td className="py-2 px-3 font-mono font-medium text-blue-600">{p.receipt_number}</td>
                          <td className="py-2 px-3">{new Date(p.created_at).toLocaleDateString("en-IN")}</td>
                          <td className="py-2 px-3 capitalize">{p.payment_mode.replace("_", " ")}</td>
                          <td className="py-2 px-3 text-slate-500">{p.reference_number || p.notes || "-"}</td>
                          <td
                            className={`py-2 px-3 text-right font-medium ${
                              p.is_refund ? "text-rose-600" : "text-emerald-700"
                            }`}
                          >
                            {p.is_refund ? "-" : ""}₹{Number(p.amount).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Footer Notice */}
              <div className="text-center text-[11px] text-slate-400 pt-4 border-t border-slate-100">
                This is a computer-generated tax invoice and payment acknowledgment from Apex Health Diagnostics.
              </div>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
};

