import React, { useEffect, useState } from "react";
import { Send, X, Mail, FileText, CheckCircle2 } from "lucide-react";
import { apiClient } from "@/lib/api";
import { EmailTemplateItem } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";

interface SendEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultRecipientEmail?: string;
  defaultRecipientName?: string;
  caseId?: string;
  caseNumber?: string;
  reportId?: string;
  reportNumber?: string;
  patientName?: string;
  onSuccess?: () => void;
}

export const SendEmailModal: React.FC<SendEmailModalProps> = ({
  isOpen,
  onClose,
  defaultRecipientEmail = "",
  defaultRecipientName = "",
  caseId,
  caseNumber,
  reportId,
  reportNumber,
  patientName,
  onSuccess,
}) => {
  const [templates, setTemplates] = useState<EmailTemplateItem[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [recipientEmail, setRecipientEmail] = useState(defaultRecipientEmail);
  const [recipientName, setRecipientName] = useState(defaultRecipientName);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setRecipientEmail(defaultRecipientEmail);
      setRecipientName(defaultRecipientName);
      setIsSuccess(false);
      setErrorMsg("");

      // Load active email templates
      apiClient.get<EmailTemplateItem[]>("/masters/email-templates")
        .then((res) => {
          setTemplates(res.data.filter((t) => t.is_active));
        })
        .catch((err) => console.error("Failed to load email templates:", err));
    }
  }, [isOpen, defaultRecipientEmail, defaultRecipientName]);

  const handleTemplateChange = (tmplId: string) => {
    setSelectedTemplateId(tmplId);
    if (!tmplId) return;

    const tmpl = templates.find((t) => t.id === tmplId);
    if (tmpl) {
      // Dynamic variable replacement
      let renderedSub = tmpl.subject
        .replace(/{{case_number}}/g, caseNumber || "N/A")
        .replace(/{{patient_name}}/g, patientName || recipientName || "Valued Patient");

      let renderedBody = tmpl.body
        .replace(/{{case_number}}/g, caseNumber || "N/A")
        .replace(/{{patient_name}}/g, patientName || recipientName || "Valued Patient")
        .replace(/{{report_number}}/g, reportNumber || "N/A");

      setSubject(renderedSub);
      setBody(renderedBody);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientEmail || !subject || !body) {
      setErrorMsg("Please fill in recipient email, subject, and message body.");
      return;
    }

    setIsSending(true);
    setErrorMsg("");

    try {
      await apiClient.post("/emails/send", {
        recipient_email: recipientEmail,
        recipient_name: recipientName || undefined,
        template_id: selectedTemplateId || undefined,
        subject,
        body,
        case_id: caseId || undefined,
        report_id: reportId || undefined,
      });

      setIsSuccess(true);
      setTimeout(() => {
        if (onSuccess) onSuccess();
        onClose();
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || "Failed to dispatch email. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center space-x-2">
            <Mail className="w-5 h-5 text-blue-600" />
            <h2 className="text-base font-bold text-slate-900">Direct Email Dispatcher</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        {isSuccess ? (
          <div className="p-8 text-center space-y-3">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Email Dispatched Successfully</h3>
            <p className="text-xs text-slate-500">
              Your message was transmitted and logged in the system communication records.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSend} className="p-6 space-y-4 text-xs">
            {errorMsg && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 font-medium">
                {errorMsg}
              </div>
            )}

            {/* Template Selector (Matching PMS/Third_Tab/send_email.png) */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Select Email Template:</label>
              <select
                value={selectedTemplateId}
                onChange={(e) => handleTemplateChange(e.target.value)}
                className="w-full h-9 px-3 rounded-lg border border-slate-300 bg-white"
              >
                <option value="">Custom Message (No Template)</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Recipient Name:</label>
                <Input
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  placeholder="e.g. Rajesh Mehta"
                  className="h-9 text-xs"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Recipient Email:*</label>
                <Input
                  type="email"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  placeholder="patient@example.com"
                  required
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Email Subject:*</label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Diagnostic Report Verified Notification"
                required
                className="h-9 text-xs font-medium"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Message Body:*</label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={5}
                required
                placeholder="Dear Patient, your clinical report has been verified..."
                className="w-full p-3 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 font-sans"
              />
            </div>

            {/* Context Notice */}
            {(caseNumber || reportNumber) && (
              <div className="p-2.5 rounded-lg bg-blue-50/70 border border-blue-100 flex items-center space-x-2 text-[11px] text-blue-700">
                <FileText className="w-3.5 h-3.5 shrink-0" />
                <span>
                  Linked context: {caseNumber ? `Case #${caseNumber} ` : ""}{reportNumber ? `• Report #${reportNumber}` : ""}
                </span>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
              <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSending}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={isSending} className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5">
                {isSending ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Send Email</span>
                  </>
                )}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
