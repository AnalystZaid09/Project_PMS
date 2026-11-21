import React from "react";
import { Printer, X, ShieldCheck, CheckCircle2 } from "lucide-react";
import { ClinicalReportDetail } from "@/types";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";

interface ReportPrintPreviewModalProps {
  report: ClinicalReportDetail | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ReportPrintPreviewModal: React.FC<ReportPrintPreviewModalProps> = ({
  report,
  isOpen,
  onClose,
}) => {
  if (!report) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose} className="max-w-4xl p-0 overflow-hidden bg-slate-100">
      {/* Non-printable modal action bar */}
      <div className="bg-slate-900 text-white px-6 py-3 flex items-center justify-between print:hidden">
        <div className="flex items-center space-x-2">
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
          <span className="font-semibold text-sm">Official Diagnostic Report Preview</span>
          <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono">
            {report.report_number}
          </span>
        </div>
        <div className="flex items-center space-x-3">
          <Button
            size="sm"
            onClick={() => window.print()}
            className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 text-xs"
          >
            <Printer className="w-4 h-4" />
            Print Report
          </Button>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Printable Report Document (A4 format layout) */}
      <div className="bg-white p-8 sm:p-12 shadow-inner max-h-[85vh] overflow-y-auto text-slate-900 font-sans print:p-0 print:shadow-none print:max-h-none">
        {/* Clinic / Lab Letterhead */}
        <div className="border-b-2 border-slate-900 pb-5 mb-6 flex justify-between items-start">
          <div className="space-y-1">
            <h1 className="text-2xl font-black tracking-tight text-blue-900 uppercase">
              Apex Health Diagnostics
            </h1>
            <p className="text-xs font-semibold tracking-wider text-slate-600 uppercase">
              Center for Clinical Pathology, Molecular Diagnostics & Diagnostic Imaging
            </p>
            <p className="text-xs text-slate-500">
              Branch: <span className="font-medium text-slate-800">{report.branch_name || "Main Regional Centre"}</span>
              {report.branch_address ? ` • ${report.branch_address}` : ""}
            </p>
            <p className="text-[11px] text-slate-500">
              Accreditation: NABL ISO 15189:2022 Certified • AERB Radiation Safety Compliant
            </p>
          </div>

          <div className="text-right space-y-1">
            <div className="inline-block bg-slate-900 text-white font-mono font-bold text-xs px-2.5 py-1 rounded">
              REPORT: {report.report_number}
            </div>
            <p className="text-xs text-slate-500 font-mono">CASE: {report.case_number}</p>
            <p className="text-xs text-slate-500">
              Date: {new Date(report.created_at).toLocaleDateString("en-IN", { dateStyle: "long" })}
            </p>
            <div className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">
              {report.status === "finalized" ? "Verified & Authenticated" : `Status: ${report.status}`}
            </div>
          </div>
        </div>

        {/* Patient Demographics Box */}
        <div className="border border-slate-300 rounded-lg p-4 bg-slate-50/50 mb-6 text-xs grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <span className="text-slate-500 uppercase tracking-wider block text-[10px]">Patient Name</span>
            <span className="font-bold text-slate-900 text-sm">{report.patient_name}</span>
          </div>
          <div>
            <span className="text-slate-500 uppercase tracking-wider block text-[10px]">Patient UHID</span>
            <span className="font-mono font-bold text-slate-800">{report.patient_uhid}</span>
          </div>
          <div>
            <span className="text-slate-500 uppercase tracking-wider block text-[10px]">Age / Gender</span>
            <span className="font-semibold text-slate-800">
              {report.patient_age ? `${report.patient_age} Yrs` : "Adult"} / {report.patient_gender.toUpperCase()}
            </span>
          </div>
          <div>
            <span className="text-slate-500 uppercase tracking-wider block text-[10px]">Contact Mobile</span>
            <span className="font-mono text-slate-800">{report.patient_phone || "-"}</span>
          </div>

          <div className="border-t border-slate-200 pt-2 sm:col-span-2">
            <span className="text-slate-500 uppercase tracking-wider block text-[10px]">Referring Doctor / Faculty</span>
            <span className="font-semibold text-slate-800">{report.referring_doctor_name || "Self / Walk-in"}</span>
          </div>
          <div className="border-t border-slate-200 pt-2 sm:col-span-2">
            <span className="text-slate-500 uppercase tracking-wider block text-[10px]">Reporting Doctor / Specialty</span>
            <span className="font-semibold text-slate-800">{report.reporting_doctor_name || "Department Consultant"}</span>
          </div>
        </div>

        {/* Investigation Title Bar */}
        <div className="bg-blue-50 border-l-4 border-blue-600 px-4 py-2.5 mb-6 flex justify-between items-center">
          <div>
            <h2 className="text-sm font-bold text-blue-950 uppercase tracking-wide">
              {report.report_heading || `${report.investigation_name.toUpperCase()} REPORT`}
            </h2>
            <p className="text-xs text-slate-600">
              Department: {report.department_name || "Diagnostic Services"} • Study: {report.report_name || report.investigation_name}
            </p>
          </div>
          <div className="text-right text-xs font-mono text-slate-500">
            Version {report.current_version}.0
          </div>
        </div>

        {/* Report Clinical Findings */}
        <div className="space-y-6 text-xs text-slate-800 leading-relaxed mb-8">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1 mb-2">
              Clinical Observations & Findings
            </h3>
            <div className="whitespace-pre-line font-mono text-slate-800 bg-white p-2 rounded">
              {report.findings_text || "No formal narrative findings recorded."}
            </div>
          </div>

          {report.impression && (
            <div className="border-2 border-slate-200 rounded-lg p-3.5 bg-slate-50">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-1">
                Impression / Conclusion
              </h3>
              <p className="font-semibold text-slate-900 leading-normal">{report.impression}</p>
            </div>
          )}

          {report.recommendation && (
            <div className="border border-blue-100 rounded-lg p-3 bg-blue-50/40">
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-blue-900 mb-0.5">
                Clinical Recommendations / Advice
              </h3>
              <p className="text-slate-700 italic">{report.recommendation}</p>
            </div>
          )}
        </div>

        {/* Scans / Attached Images Thumbnail Grid */}
        {report.attachments && report.attachments.length > 0 && (
          <div className="mb-8 border-t border-slate-200 pt-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-3">
              Diagnostic Imaging Plates & Attachments ({report.attachments.length})
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {report.attachments.map((att) => (
                <div key={att.id} className="border border-slate-200 rounded-lg overflow-hidden bg-slate-50 p-2">
                  <div className="h-36 bg-slate-900 rounded flex items-center justify-center overflow-hidden">
                    {att.file_data?.startsWith("data:image") ? (
                      <img src={att.file_data} alt={att.file_name} className="max-h-full object-contain" />
                    ) : (
                      <span className="text-slate-400 font-mono text-xs">Imaging Plate</span>
                    )}
                  </div>
                  <p className="text-[11px] font-medium text-slate-800 mt-1 truncate">{att.file_name}</p>
                  {att.caption && <p className="text-[10px] text-slate-500 truncate">{att.caption}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Doctor Verification Sign-Off Block */}
        <div className="border-t-2 border-slate-300 pt-6 mt-8 flex justify-between items-end text-xs">
          <div>
            <p className="text-[10px] text-slate-400 uppercase tracking-wider">Authentication</p>
            <p className="text-slate-600 mt-1">
              Verified on:{" "}
              {report.finalized_at
                ? new Date(report.finalized_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })
                : "Draft / Pending"}
            </p>
            <p className="text-[10px] text-slate-400">Electronic verification ID: {report.id}</p>
          </div>

          <div className="text-right space-y-1">
            {report.digital_signature && (
              <div className="inline-flex items-center space-x-1.5 px-3 py-1 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-md text-[11px] font-semibold mb-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Digitally Signed & Validated</span>
              </div>
            )}
            <p className="font-bold text-slate-900 text-sm">
              {report.finalized_by_name || report.reporting_doctor_name || "Consultant Pathologist / Radiologist"}
            </p>
            <p className="text-slate-500">Authorized Medical Signatory</p>
            <p className="text-[10px] text-slate-400">Apex Health Diagnostics Clinical Panel</p>
          </div>
        </div>

        {/* Mandatory Safety Notice */}
        <div className="border-t border-slate-100 pt-4 mt-6 text-center text-[10px] text-slate-400">
          This report is interpreted and signed off by qualified medical practitioners. AI automated diagnosis is disabled per clinical governance rules.
        </div>
      </div>
    </Dialog>
  );
};
