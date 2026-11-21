import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  FileText,
  Upload,
  Send,
  Trash2,
  Printer,
  Save,
  CheckCircle,
  FileCheck,
  AlertCircle,
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  Image as ImageIcon,
  History,
  ArrowLeft,
  X,
  Lock,
  PlusCircle,
  Sparkles,
} from "lucide-react";
import { apiClient } from "@/lib/api";
import { ClinicalReportDetail, ClinicalReportListItem, ReportAttachmentItem } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { Dialog, DialogHeader, DialogFooter } from "@/components/ui/dialog";
import { ReportPrintPreviewModal } from "./ReportPrintPreviewModal";
import { useAuth } from "@/app/context/AuthContext";

// Hierarchical template catalogue matching reference screenshots Pateint_Report_Main.png/Main2/Main3
interface TemplateNode {
  id: string;
  label: string;
  children?: TemplateNode[];
  heading?: string;
  defaultFindings?: string;
  defaultImpression?: string;
}

const TEMPLATE_HIERARCHY: TemplateNode[] = [
  {
    id: "radiograph",
    label: "Radiograph (X-Ray)",
    children: [
      {
        id: "rad-chest",
        label: "Chest Studies",
        children: [
          {
            id: "rad-chest-normal",
            label: "Normal Chest PA View",
            heading: "DIGITAL CHEST RADIOGRAPH - PA VIEW",
            defaultFindings:
              "CLINICAL INDICATION: Routine pre-operative / health checkup.\nTECHNIQUE: Standard erect digital PA view of the chest.\nFINDINGS:\n• Both lung fields appear clear and adequately expanded.\n• No focal consolidation, pneumothorax, or pleural effusion visualized.\n• Cardiothoracic ratio is within normal limits (< 0.5).\n• Aortic knuckle, hilum, and bronchovascular markings are normal.\n• Costophrenic and cardiophrenic angles are sharp and clear.\n• Visualized thoracic skeleton and chest wall soft tissues appear unremarkable.",
            defaultImpression: "Normal digital chest radiograph. No active cardiopulmonary pathology demonstrated.",
          },
          {
            id: "rad-chest-consolidation",
            label: "Lobar Consolidation / Pneumonia",
            heading: "CHEST RADIOGRAPH - PA VIEW",
            defaultFindings:
              "CLINICAL INDICATION: Fever, productive cough, and pleuritic chest pain.\nFINDINGS:\n• Ill-defined homogeneous airspace opacity noted in the right middle lobe with air bronchograms, consistent with lobar consolidation.\n• Left lung parenchyma is clear.\n• No evidence of pleural effusion or pneumothorax.\n• Heart size is within normal physiological limits.",
            defaultImpression: "Right middle lobe consolidation. Findings most consistent with acute lobar pneumonia. Clinical and microbiological correlation advised.",
          },
          {
            id: "rad-chest-effusion",
            label: "Pleural Effusion",
            heading: "CHEST RADIOGRAPH - ERECT PA VIEW",
            defaultFindings:
              "FINDINGS:\n• Blunting of the left costophrenic angle with homogeneous crescentic meniscus opacity indicative of moderate left-sided pleural effusion.\n• Mild compressive atelectasis in the left lower lung base.\n• Right lung field is clear without active infiltration.",
            defaultImpression: "Moderate left-sided pleural effusion with adjacent compressive atelectasis. Diagnostic thoracentesis / ultrasound correlation recommended.",
          },
        ],
      },
      {
        id: "rad-spine",
        label: "Spine & Skeleton",
        children: [
          {
            id: "rad-lumbosacral",
            label: "Lumbosacral Spine AP/Lat",
            heading: "X-RAY LUMBOSACRAL SPINE AP / LATERAL VIEW",
            defaultFindings:
              "CLINICAL INDICATION: Chronic lower back pain with right leg radiculopathy.\nFINDINGS:\n• Preserved lumbar lordosis.\n• Vertebral body heights are maintained.\n• Mild anterior marginal osteophytic spurring noted at L3-L5.\n• Intervertebral disc space narrowing visualized at L4-L5 level.\n• Pedicles, posterior elements, and sacroiliac joints appear intact.\n• No acute destructive bony lesion or spondylolisthesis.",
            defaultImpression: "Degenerative disc disease with mild spondylosis at L3-L5. Correlate with clinical neurology. Lumbar spine MRI advised if symptoms persist.",
          },
        ],
      },
    ],
  },
  {
    id: "sonogram",
    label: "Sonogram (Ultrasound)",
    children: [
      {
        id: "usg-abdomen",
        label: "Whole Abdomen & Pelvis",
        heading: "ULTRASOUND WHOLE ABDOMEN AND PELVIS",
        defaultFindings:
          "FINDINGS:\n• LIVER: Normal in size (13.5 cm), smooth contours, homogenous parenchymal echotexture. No focal lesion.\n• GALLBLADDER: Well distended, thin smooth wall (2 mm). Lumen is clear without calculus or sludge.\n• CBD & PORTAL VEIN: Normal caliber.\n• PANCREAS & SPLEEN: Normal morphology and parenchymal echogenicity. Spleen measures 9.8 cm.\n• KIDNEYS: Both kidneys are normal in size, shape, and cortical thickness. Corticomedullary differentiation preserved. No calculus, hydronephrosis, or mass lesion.\n• URINARY BLADDER: Adequately distended with thin walls. No intravesical calculus.\n• PROSTATE / UTERUS: Normal for age.",
        defaultImpression: "Normal high-resolution ultrasound study of the whole abdomen and pelvis. No sonographic evidence of acute intra-abdominal pathology.",
      },
    ],
  },
  {
    id: "pathology",
    label: "Pathology & Blood Sciences",
    children: [
      {
        id: "path-cbc",
        label: "Complete Blood Count (CBC)",
        heading: "COMPLETE HEMOGRAM & BLOOD INDICES",
        defaultFindings:
          "HEMATOLOGY PROFILE:\n• Hemoglobin (Hb): 14.2 g/dL (Reference: 13.0 - 17.0)\n• Packed Cell Volume (PCV): 42.5 % (Reference: 40.0 - 50.0)\n• Total RBC Count: 4.85 mil/mcL (Reference: 4.50 - 5.50)\n• Total Leucocyte Count (WBC): 6,800 /mcL (Reference: 4,000 - 11,000)\n  - Neutrophils: 64 % (Reference: 40 - 70)\n  - Lymphocytes: 28 % (Reference: 20 - 40)\n  - Monocytes: 05 % (Reference: 02 - 08)\n  - Eosinophils: 03 % (Reference: 01 - 06)\n• Platelet Count: 280,000 /mcL (Reference: 150,000 - 450,000)\n• Erythrocyte Sedimentation Rate (ESR): 10 mm/1st hr (Reference: 0 - 15)\n\nPERIPHERAL SMEAR EXAMINATION:\nRBC: Normocytic, normochromic. Platelets: Adequate and distributed in clumps.",
        defaultImpression: "Complete blood count and peripheral smear examination reveal normal hematological parameters within physiological adult limits.",
      },
      {
        id: "path-lft",
        label: "Liver Function Test (LFT)",
        heading: "COMPREHENSIVE LIVER FUNCTION TEST",
        defaultFindings:
          "BIOCHEMISTRY PARAMETERS:\n• Bilirubin Total: 0.85 mg/dL (Reference: 0.2 - 1.2)\n• Bilirubin Direct: 0.22 mg/dL (Reference: 0.0 - 0.3)\n• SGOT / AST: 28 U/L (Reference: 10 - 40)\n• SGPT / ALT: 32 U/L (Reference: 10 - 45)\n• Alkaline Phosphatase (ALP): 88 U/L (Reference: 30 - 120)\n• Total Protein: 7.2 g/dL (Reference: 6.4 - 8.3)\n• Serum Albumin: 4.4 g/dL (Reference: 3.5 - 5.0)\n• A/G Ratio: 1.57 (Reference: 1.2 - 2.2)",
        defaultImpression: "Normal hepatic biochemical profile. Serum transaminases and excretory parameters are within normal reference ranges.",
      },
    ],
  },
];

export const PatientReportEditorPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();

  const [report, setReport] = useState<ClinicalReportDetail | null>(null);
  const [caseReports, setCaseReports] = useState<ClinicalReportListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form State
  const [reportName, setReportName] = useState("");
  const [reportHeading, setReportHeading] = useState("");
  const [findingsText, setFindingsText] = useState("");
  const [impression, setImpression] = useState("");
  const [recommendation, setRecommendation] = useState("");
  const [patientEmail, setPatientEmail] = useState("");

  // Modals
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isAmendModalOpen, setIsAmendModalOpen] = useState(false);
  const [amendmentReason, setAmendmentReason] = useState("");
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  // Tree expanded state
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({
    radiograph: true,
    "rad-chest": true,
    pathology: true,
  });

  const toggleNode = (nodeId: string) => {
    setExpandedNodes((prev) => ({ ...prev, [nodeId]: !prev[nodeId] }));
  };

  const fetchReport = async (reportId: string) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await apiClient.get<ClinicalReportDetail>(`/clinical-reports/${reportId}`);
      const data = res.data;
      setReport(data);
      setReportName(data.report_name || "");
      setReportHeading(data.report_heading || "");
      setFindingsText(data.findings_text || "");
      setImpression(data.impression || "");
      setRecommendation(data.recommendation || "");
      setPatientEmail(data.patient_email || "");

      // Fetch all reports for this case
      if (data.case_id) {
        const caseRes = await apiClient.get<ClinicalReportListItem[]>(`/clinical-reports/by-case/${data.case_id}`);
        setCaseReports(caseRes.data);
      }
    } catch (err: any) {
      setErrorMessage(err.response?.data?.detail || "Failed to load clinical report.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchReport(id);
    }
  }, [id]);

  const handleApplyTemplate = (node: TemplateNode) => {
    if (node.heading) {
      setReportHeading(node.heading);
      setReportName(node.label);
    }
    if (node.defaultFindings) {
      setFindingsText(node.defaultFindings);
    }
    if (node.defaultImpression) {
      setImpression(node.defaultImpression);
    }
    setStatusMessage(`Loaded "${node.label}" template findings.`);
    setTimeout(() => setStatusMessage(null), 3000);
  };

  const handleSaveDraft = async () => {
    if (!report) return;
    setIsSaving(true);
    setStatusMessage(null);
    setErrorMessage(null);
    try {
      const res = await apiClient.put<ClinicalReportDetail>(`/clinical-reports/${report.id}`, {
        report_name: reportName.trim() || undefined,
        report_heading: reportHeading.trim() || undefined,
        findings_text: findingsText,
        impression: impression,
        recommendation: recommendation,
        patient_email: patientEmail.trim() || undefined,
      });
      setReport(res.data);
      setStatusMessage("Draft report saved successfully.");
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.detail || "Failed to save draft.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!report) return;
    setIsSaving(true);
    try {
      await handleSaveDraft();
      const res = await apiClient.post<ClinicalReportDetail>(`/clinical-reports/${report.id}/submit`, {});
      setReport(res.data);
      setStatusMessage("Report successfully submitted for doctor verification.");
    } catch (err: any) {
      setErrorMessage(err.response?.data?.detail || "Failed to submit report.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDoctorVerify = async () => {
    if (!report) return;
    setIsSaving(true);
    try {
      const res = await apiClient.post<ClinicalReportDetail>(`/clinical-reports/${report.id}/verify`, {
        verification_remarks: "Clinical findings verified and approved by reporting specialist.",
      });
      setReport(res.data);
      setStatusMessage("Report verified by doctor.");
    } catch (err: any) {
      setErrorMessage(err.response?.data?.detail || "Verification failed.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleFinalizeSignOff = async () => {
    if (!report) return;
    setIsSaving(true);
    try {
      const res = await apiClient.post<ClinicalReportDetail>(`/clinical-reports/${report.id}/finalize`, {
        digital_signature: true,
        final_notes: "Electronically signed and verified.",
      });
      setReport(res.data);
      setStatusMessage("Report finalized, locked, and digitally signed!");
    } catch (err: any) {
      setErrorMessage(err.response?.data?.detail || "Finalization failed.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAmendSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!report || !amendmentReason.trim()) return;
    setIsSaving(true);
    try {
      const res = await apiClient.post<ClinicalReportDetail>(`/clinical-reports/${report.id}/amend`, {
        amendment_reason: amendmentReason.trim(),
        findings_text: findingsText,
        impression: impression,
        recommendation: recommendation,
      });
      setReport(res.data);
      setIsAmendModalOpen(false);
      setAmendmentReason("");
      setStatusMessage(`Amended to Version ${res.data.current_version}.0 successfully.`);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.detail || "Amendment failed.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !report) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const base64Data = evt.target?.result as string;
      try {
        const res = await apiClient.post<ReportAttachmentItem>(`/clinical-reports/${report.id}/attachments`, {
          file_name: file.name,
          file_type: file.type || "image/png",
          file_size: file.size,
          file_data: base64Data,
          caption: `${file.name.replace(/\.[^/.]+$/, "")} Scan Attachment`,
        });
        setReport((prev) =>
          prev ? { ...prev, attachments: [...prev.attachments, res.data] } : prev
        );
        setStatusMessage("Imaging attachment uploaded successfully.");
      } catch (err: any) {
        setErrorMessage(err.response?.data?.detail || "Failed to upload image.");
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDeleteAttachment = async (attId: string) => {
    if (!report) return;
    try {
      await apiClient.delete(`/clinical-reports/${report.id}/attachments/${attId}`);
      setReport((prev) =>
        prev
          ? {
              ...prev,
              attachments: prev.attachments.filter((a) => a.id !== attId),
            }
          : prev
      );
      setStatusMessage("Attachment removed.");
    } catch (err: any) {
      setErrorMessage("Failed to remove attachment.");
    }
  };

  const handleSendEmail = async () => {
    if (!report) return;
    if (!patientEmail.trim()) {
      setErrorMessage("Please enter an email address for report dispatch.");
      return;
    }
    setIsSendingEmail(true);
    try {
      await apiClient.post(
        `/clinical-reports/${report.id}/send-email`,
        null,
        { params: { email: patientEmail.trim() } }
      );
      setStatusMessage(`Report dispatched to ${patientEmail}`);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.detail || "Failed to dispatch email.");
    } finally {
      setIsSendingEmail(false);
    }
  };

  if (isLoading) {
    return (
      <div className="py-24">
        <LoadingSpinner size="lg" message="Loading clinical report editor..." />
      </div>
    );
  }

  if (!report) {
    return (
      <div className="p-8 text-center bg-white rounded-xl border border-slate-200">
        <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-2" />
        <h3 className="font-semibold text-slate-800">Clinical Report Not Found</h3>
        <p className="text-xs text-slate-500 mt-1">The requested report record could not be loaded.</p>
        <Button size="sm" onClick={() => navigate("/reports/clinical")} className="mt-4">
          Back to Worklist
        </Button>
      </div>
    );
  }

  const isFinalized = report.status === "finalized";

  return (
    <div className="space-y-4 pb-12">
      {/* Top Breadcrumb & Status Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center space-x-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/reports/clinical")}
            className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="w-4 h-4" />
            Clinical Worklist
          </Button>
          <div className="h-4 w-px bg-slate-300" />
          <div className="flex items-center space-x-2">
            <span className="font-mono font-bold text-slate-900 text-sm">{report.report_number}</span>
            <Badge
              className={`text-xs capitalize ${
                report.status === "finalized"
                  ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                  : report.status === "verified"
                  ? "bg-blue-100 text-blue-800 border-blue-300"
                  : report.status === "submitted"
                  ? "bg-amber-100 text-amber-800 border-amber-300"
                  : report.status === "amended"
                  ? "bg-purple-100 text-purple-800 border-purple-300"
                  : "bg-slate-100 text-slate-800 border-slate-300"
              }`}
            >
              {report.status}
            </Badge>
            <span className="text-xs font-mono text-slate-500">v{report.current_version}.0</span>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center space-x-2">
          {!isFinalized && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleSaveDraft}
              disabled={isSaving}
              className="flex items-center gap-1.5 text-xs"
            >
              <Save className="w-3.5 h-3.5 text-slate-600" />
              {isSaving ? "Saving..." : "Save Draft"}
            </Button>
          )}

          {!isFinalized && report.status === "draft" && (
            <Button
              size="sm"
              onClick={handleSubmitReview}
              disabled={isSaving}
              className="flex items-center gap-1.5 text-xs bg-amber-600 hover:bg-amber-700 text-white"
            >
              <FileCheck className="w-3.5 h-3.5" />
              Submit Review
            </Button>
          )}

          {!isFinalized && report.status === "submitted" && (
            <Button
              size="sm"
              onClick={handleDoctorVerify}
              disabled={isSaving}
              className="flex items-center gap-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              Doctor Verify
            </Button>
          )}

          {!isFinalized && (report.status === "verified" || report.status === "submitted") && (
            <Button
              size="sm"
              onClick={handleFinalizeSignOff}
              disabled={isSaving}
              className="flex items-center gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <Lock className="w-3.5 h-3.5" />
              Finalize & Sign Off
            </Button>
          )}

          {isFinalized && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsAmendModalOpen(true)}
              className="flex items-center gap-1.5 text-xs border-purple-300 text-purple-700 hover:bg-purple-50"
            >
              <PlusCircle className="w-3.5 h-3.5 text-purple-600" />
              Amend Report
            </Button>
          )}

          <Button
            size="sm"
            onClick={() => setIsPrintModalOpen(true)}
            className="flex items-center gap-1.5 text-xs bg-slate-900 hover:bg-slate-800 text-white"
          >
            <Printer className="w-3.5 h-3.5" />
            Print Report
          </Button>
        </div>
      </div>

      {/* Status Banners */}
      {statusMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs px-4 py-2.5 rounded-lg flex items-center justify-between">
          <span>{statusMessage}</span>
          <button onClick={() => setStatusMessage(null)} className="text-emerald-600 font-bold ml-2">
            ×
          </button>
        </div>
      )}
      {errorMessage && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs px-4 py-2.5 rounded-lg flex items-center justify-between">
          <span>{errorMessage}</span>
          <button onClick={() => setErrorMessage(null)} className="text-rose-600 font-bold ml-2">
            ×
          </button>
        </div>
      )}

      {/* TOP SECTION: Patient Details Banner (Matching Patient_Report.png) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 tracking-tight">Patient Details</h2>
          <div className="text-xs text-slate-700 mt-2 flex flex-wrap items-center gap-x-6 gap-y-2 bg-slate-50 p-3.5 rounded-lg border border-slate-200">
            <div>
              <span className="font-semibold text-slate-500">Patient UHID: </span>
              <span className="font-mono font-bold text-blue-700">{report.patient_uhid}</span>
            </div>
            <div>
              <span className="font-semibold text-slate-500">Name: </span>
              <span className="font-bold text-slate-900 uppercase">{report.patient_name}</span>
            </div>
            <div>
              <span className="font-semibold text-slate-500">Age: </span>
              <span className="font-medium text-slate-800">{report.patient_age || "-"} Yrs</span>
            </div>
            <div>
              <span className="font-semibold text-slate-500">Gender: </span>
              <span className="font-medium text-slate-800 uppercase">{report.patient_gender}</span>
            </div>
            <div>
              <span className="font-semibold text-slate-500">City: </span>
              <span className="font-medium text-slate-800">{report.patient_city || "-"}</span>
            </div>
            <div>
              <span className="font-semibold text-slate-500">Telephone: </span>
              <span className="font-mono text-slate-800">{report.patient_phone || "-"}</span>
            </div>
            <div>
              <span className="font-semibold text-slate-500">Symptoms: </span>
              <span className="italic text-slate-700">{report.patient_symptoms || "None stated"}</span>
            </div>
          </div>
        </div>

        {/* Email & Image Attachment Actions (Matching Patient_Report.png) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {/* Email dispatch */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 block">Email Address:</label>
            <div className="flex space-x-2">
              <Input
                type="email"
                placeholder="Enter patient or referring doctor email..."
                value={patientEmail}
                onChange={(e) => setPatientEmail(e.target.value)}
                className="h-9 text-xs"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={handleSendEmail}
                disabled={isSendingEmail}
                className="flex items-center gap-1.5 text-xs shrink-0 bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200"
              >
                <Send className="w-3.5 h-3.5" />
                {isSendingEmail ? "Sending..." : "Send Email"}
              </Button>
            </div>
            <p className="text-[11px] text-slate-400">All reports saved and images uploaded will be sent.</p>
          </div>

          {/* Attachments upload */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 block">Diagnostic Image Attachments:</label>
            <div className="flex items-center space-x-2">
              <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 shadow-sm">
                <Upload className="w-3.5 h-3.5 text-slate-500" />
                Choose Scan File
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={isFinalized}
                />
              </label>
              <span className="text-[11px] text-slate-400">Supported: PNG, JPEG, DICOM snapshot</span>
            </div>
          </div>
        </div>

        {/* Uploaded Scan Thumbnails (Matching Patient_Report.png) */}
        {report.attachments && report.attachments.length > 0 && (
          <div className="pt-2">
            <span className="text-xs font-semibold text-slate-600 block mb-2">Attached Scans & Imaging Plates:</span>
            <div className="flex flex-wrap gap-3">
              {report.attachments.map((att) => (
                <div
                  key={att.id}
                  className="relative group w-36 bg-slate-50 border border-slate-200 rounded-lg p-2 shadow-sm text-xs"
                >
                  {!isFinalized && (
                    <button
                      onClick={() => handleDeleteAttachment(att.id)}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-rose-500 hover:bg-rose-600 text-white rounded-full flex items-center justify-center shadow"
                      title="Remove image"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                  <div className="h-20 bg-slate-900 rounded flex items-center justify-center overflow-hidden mb-1.5">
                    {att.file_data?.startsWith("data:image") ? (
                      <img src={att.file_data} alt={att.file_name} className="max-h-full object-contain" />
                    ) : (
                      <ImageIcon className="w-8 h-8 text-slate-400" />
                    )}
                  </div>
                  <p className="font-semibold text-slate-800 text-[11px] truncate">{att.file_name}</p>
                  <p className="text-[10px] text-slate-400">
                    {new Date(att.created_at).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Case Tests Table (Matching lower table in Patient_Report.png) */}
        {caseReports.length > 0 && (
          <div className="pt-2 border-t border-slate-200">
            <span className="text-xs font-semibold text-slate-700 block mb-2">
              Case Investigations & Assigned Reports ({caseReports.length}):
            </span>
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3">Select</th>
                    <th className="py-2.5 px-3">Report No</th>
                    <th className="py-2.5 px-3">Case No</th>
                    <th className="py-2.5 px-3">Investigation</th>
                    <th className="py-2.5 px-3">Report Name</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {caseReports.map((cr) => {
                    const isCurrent = cr.id === report.id;
                    return (
                      <tr key={cr.id} className={isCurrent ? "bg-blue-50/70" : "hover:bg-slate-50"}>
                        <td className="py-2 px-3">
                          <Button
                            size="sm"
                            variant={isCurrent ? "default" : "outline"}
                            onClick={() => {
                              if (!isCurrent) navigate(`/reports/editor/${cr.id}`);
                            }}
                            className="h-7 text-[11px] px-2.5"
                          >
                            {isCurrent ? "Current" : "Switch"}
                          </Button>
                        </td>
                        <td className="py-2 px-3 font-mono font-bold text-blue-600">{cr.report_number}</td>
                        <td className="py-2 px-3 font-mono text-slate-700">{cr.case_number}</td>
                        <td className="py-2 px-3 font-medium text-slate-900">{cr.investigation_name}</td>
                        <td className="py-2 px-3 text-slate-600">{cr.report_name || "-"}</td>
                        <td className="py-2 px-3 text-center">
                          <Badge className="text-[10px] uppercase font-bold">{cr.status}</Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* MAIN SPLIT SECTION: Left Tree Hierarchy + Right Report Content (Matching Pateint_Report_Main.png) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* LEFT PANE: Hierarchical Template Tree (4 cols) */}
        <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
            <div className="flex items-center space-x-1.5">
              <FolderOpen className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Templates & Findings Library
              </span>
            </div>
            <span className="text-[10px] text-slate-400">Click to populate</span>
          </div>

          <div className="space-y-1 text-xs max-h-[580px] overflow-y-auto pr-1">
            {TEMPLATE_HIERARCHY.map((category) => {
              const isCatExpanded = Boolean(expandedNodes[category.id]);
              return (
                <div key={category.id} className="space-y-1">
                  <button
                    onClick={() => toggleNode(category.id)}
                    className="w-full flex items-center space-x-1.5 font-bold text-slate-900 hover:text-blue-700 py-1 px-1.5 rounded hover:bg-slate-50 transition-colors"
                  >
                    {isCatExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                    <span>{category.label}</span>
                  </button>

                  {isCatExpanded && category.children && (
                    <div className="pl-4 space-y-1 border-l-2 border-slate-100 ml-2">
                      {category.children.map((subcat) => {
                        const isSubExpanded = Boolean(expandedNodes[subcat.id]);
                        return (
                          <div key={subcat.id} className="space-y-0.5">
                            <button
                              onClick={() => toggleNode(subcat.id)}
                              className="w-full flex items-center space-x-1.5 font-semibold text-slate-700 hover:text-blue-600 py-1 px-1 rounded hover:bg-slate-50 transition-colors"
                            >
                              {isSubExpanded ? (
                                <ChevronDown className="w-3 h-3 text-slate-400" />
                              ) : (
                                <ChevronRight className="w-3 h-3 text-slate-400" />
                              )}
                              <span>{subcat.label}</span>
                            </button>

                            {isSubExpanded && subcat.children && (
                              <div className="pl-3.5 space-y-0.5 border-l border-slate-200 ml-2">
                                {subcat.children.map((leaf) => (
                                  <button
                                    key={leaf.id}
                                    onClick={() => handleApplyTemplate(leaf)}
                                    disabled={isFinalized}
                                    className="w-full text-left py-1 px-2 rounded text-[11px] text-slate-600 hover:text-blue-700 hover:bg-blue-50 transition-colors flex items-center justify-between group"
                                  >
                                    <span className="truncate">{leaf.label}</span>
                                    <Sparkles className="w-3 h-3 text-blue-500 opacity-0 group-hover:opacity-100" />
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Quick Version History Snapshot */}
          {report.versions && report.versions.length > 1 && (
            <div className="border-t border-slate-200 pt-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-2 flex items-center gap-1.5">
                <History className="w-3.5 h-3.5 text-purple-600" />
                Version Audit Log
              </span>
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {report.versions.map((v) => (
                  <div key={v.id} className="p-2 bg-slate-50 border border-slate-200 rounded text-[11px] space-y-0.5">
                    <div className="flex justify-between font-semibold text-slate-900">
                      <span>Version {v.version_number}.0</span>
                      <span className="text-[10px] text-slate-500">
                        {new Date(v.created_at).toLocaleDateString("en-IN")}
                      </span>
                    </div>
                    {v.amendment_reason && (
                      <p className="text-purple-700 italic text-[10px]">Reason: {v.amendment_reason}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT PANE: Rich Report Content Editor (8 cols) */}
        <div className="lg:col-span-8 bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
          {/* Heading Fields (Matching Pateint_Report_Main.png) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                Report Name:
              </label>
              <Input
                value={reportName}
                onChange={(e) => setReportName(e.target.value)}
                placeholder="e.g. O.A. with L3-L5 compression"
                disabled={isFinalized}
                className="text-xs"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                Report Heading:
              </label>
              <Input
                value={reportHeading}
                onChange={(e) => setReportHeading(e.target.value)}
                placeholder="e.g. X-RAY LUMBOSACRAL SPINE AP / LAT VIEW"
                disabled={isFinalized}
                className="text-xs font-semibold uppercase"
              />
            </div>
          </div>

          {/* Formatting Toolbar */}
          <div className="flex flex-wrap items-center gap-1 bg-slate-100 p-1.5 rounded-lg border border-slate-200 text-xs">
            <span className="text-[11px] font-bold text-slate-500 px-2 uppercase tracking-wider">Editor Toolbar</span>
            <div className="h-4 w-px bg-slate-300 mx-1" />
            <button
              type="button"
              onClick={() => {
                setFindingsText((prev) => `${prev}\n• `);
              }}
              disabled={isFinalized}
              className="px-2 py-1 rounded hover:bg-white text-slate-700 font-semibold"
            >
              • Bullet
            </button>
            <button
              type="button"
              onClick={() => {
                setFindingsText((prev) => `${prev}\n1. `);
              }}
              disabled={isFinalized}
              className="px-2 py-1 rounded hover:bg-white text-slate-700 font-semibold"
            >
              1. Number
            </button>
            <button
              type="button"
              onClick={() => {
                setFindingsText(
                  (prev) =>
                    `${prev}\nCLINICAL INDICATION:\nTECHNIQUE:\nFINDINGS:\nIMPRESSION:\n`
                );
              }}
              disabled={isFinalized}
              className="px-2 py-1 rounded hover:bg-white text-blue-700 font-semibold"
            >
              + Standard Sections
            </button>
            <button
              type="button"
              onClick={() => {
                setFindingsText("");
                setImpression("");
                setRecommendation("");
              }}
              disabled={isFinalized}
              className="px-2 py-1 rounded hover:bg-rose-50 text-rose-600 ml-auto"
            >
              Clear Text
            </button>
          </div>

          {/* Clinical Findings Textarea */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
              Clinical Findings & Detailed Observations:*
            </label>
            <textarea
              rows={12}
              value={findingsText}
              onChange={(e) => setFindingsText(e.target.value)}
              disabled={isFinalized}
              placeholder="Enter patient test observations, measurement tables, organ morphologies..."
              className="w-full p-3 font-mono text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 leading-relaxed bg-white"
            />
          </div>

          {/* Impression / Summary Conclusion */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
              Impression / Diagnostic Summary:
            </label>
            <textarea
              rows={3}
              value={impression}
              onChange={(e) => setImpression(e.target.value)}
              disabled={isFinalized}
              placeholder="Summary clinical impression, pathological conclusion, or radiological opinion..."
              className="w-full p-2.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-900 bg-slate-50/50"
            />
          </div>

          {/* Recommendations */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
              Recommendations & Advice:
            </label>
            <textarea
              rows={2}
              value={recommendation}
              onChange={(e) => setRecommendation(e.target.value)}
              disabled={isFinalized}
              placeholder="Recommended clinical correlation, medication review, or further follow-up study..."
              className="w-full p-2.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 italic bg-white"
            />
          </div>
        </div>
      </div>

      {/* Print Preview Modal */}
      <ReportPrintPreviewModal
        report={report}
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
      />

      {/* Amendment Reason Modal Dialog */}
      {isAmendModalOpen && (
        <Dialog open={isAmendModalOpen} onOpenChange={setIsAmendModalOpen}>
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden">
            <DialogHeader>
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center">
                    <PlusCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">Amend Clinical Report</h3>
                    <p className="text-xs text-slate-500">Report: {report.report_number}</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsAmendModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </DialogHeader>

            <form onSubmit={handleAmendSubmit} className="p-5 space-y-4 text-xs">
              <p className="text-slate-600">
                Amending this finalized report will increment the version counter to{" "}
                <span className="font-bold text-slate-900">Version {report.current_version + 1}.0</span> and require
                new doctor re-verification.
              </p>

              <div>
                <label className="block font-semibold text-slate-800 mb-1">
                  Medical Reason for Amendment:*
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g. Additional clinical history provided by referring physician / Prior study comparison added"
                  value={amendmentReason}
                  onChange={(e) => setAmendmentReason(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <DialogFooter>
                <div className="flex justify-end space-x-2 pt-3 border-t border-slate-200 w-full">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsAmendModalOpen(false)}
                    disabled={isSaving}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSaving || !amendmentReason.trim()}
                    className="bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    {isSaving ? "Creating Addendum..." : "Create Addendum"}
                  </Button>
                </div>
              </DialogFooter>
            </form>
          </div>
        </Dialog>
      )}
    </div>
  );
};
