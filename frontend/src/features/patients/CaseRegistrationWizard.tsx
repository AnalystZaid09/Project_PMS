import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  User,
  Stethoscope,
  FlaskConical,
  Receipt,
  FileText,
  Plus,
  Trash2,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Search,
  AlertCircle,
  Clock,
  Printer,
  ChevronRight,
} from "lucide-react";
import { apiClient } from "@/lib/api";
import {
  DoctorItem,
  CityItem,
  DoctorCategoryItem,
  DepartmentItem,
  InvestigationItem,
  PatientCategoryItem,
  OtherChargeTypeItem,
  PatientItem,
  CaseDetail,
} from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/common/PageHeader";
import { PatientRegistrationModal } from "./PatientRegistrationModal";

interface SelectedInvestigationRow {
  investigation: InvestigationItem;
  quantity: number;
  overridePrice?: number;
}

interface AddedOtherChargeRow {
  chargeTypeId: string;
  name: string;
  amount: number;
}

export const CaseRegistrationWizard: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedPatientId = searchParams.get("patient_id");

  // Stepper state: 1 to 5
  const [step, setStep] = useState(1);

  // Master Data States
  const [cities, setCities] = useState<CityItem[]>([]);
  const [doctorCategories, setDoctorCategories] = useState<DoctorCategoryItem[]>([]);
  const [doctors, setDoctors] = useState<DoctorItem[]>([]);
  const [departments, setDepartments] = useState<DepartmentItem[]>([]);
  const [allInvestigations, setAllInvestigations] = useState<InvestigationItem[]>([]);
  const [patientCategories, setPatientCategories] = useState<PatientCategoryItem[]>([]);
  const [chargeTypes, setChargeTypes] = useState<OtherChargeTypeItem[]>([]);

  // Step 1: Patient & Referring Doctor
  const [patientMode, setPatientMode] = useState<"search" | "new">(preselectedPatientId ? "search" : "search");
  const [patientSearch, setPatientSearch] = useState("");
  const [patientResults, setPatientResults] = useState<PatientItem[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<PatientItem | null>(null);
  const [isNewPatientModalOpen, setIsNewPatientModalOpen] = useState(false);

  // Referring Doctor Filters
  const [selectedCityId, setSelectedCityId] = useState("");
  const [selectedDocCategoryId, setSelectedDocCategoryId] = useState("");
  const [referringDoctorId, setReferringDoctorId] = useState("");

  // Step 2: Investigation & Pricing
  const [caseCategory, setCaseCategory] = useState<"regular" | "emergency">("regular");
  const [selectedPatientCategoryId, setSelectedPatientCategoryId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [investigationSearch, setInvestigationSearch] = useState("");
  const [selectedInvestigations, setSelectedInvestigations] = useState<SelectedInvestigationRow[]>([]);

  // Step 3: Reporting Doctors
  const [reportingDoctorId, setReportingDoctorId] = useState("");
  const [radiologistId, setRadiologistId] = useState("");
  const [pathologistId, setPathologistId] = useState("");
  const [physicianId, setPhysicianId] = useState("");
  const [otherDoctorId, setOtherDoctorId] = useState("");

  // Step 4: Other Charges
  const [addedOtherCharges, setAddedOtherCharges] = useState<AddedOtherChargeRow[]>([]);
  const [selectedChargeTypeId, setSelectedChargeTypeId] = useState("");
  const [customChargeName, setCustomChargeName] = useState("");
  const [chargeAmount, setChargeAmount] = useState<number | "">("");

  // Step 5: Symptoms & Notes
  const [priority, setPriority] = useState<"normal" | "urgent" | "emergency">("normal");
  const [symptoms, setSymptoms] = useState("");
  const [clinicalNotes, setClinicalNotes] = useState("");

  // Submission & Success
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [createdCase, setCreatedCase] = useState<CaseDetail | null>(null);

  // 1. Initial Load of Masters
  useEffect(() => {
    Promise.all([
      apiClient.get<CityItem[]>("/cities?active_only=true"),
      apiClient.get<DoctorCategoryItem[]>("/doctor-categories?active_only=true"),
      apiClient.get<DoctorItem[]>("/doctors?active_only=true"),
      apiClient.get<DepartmentItem[]>("/departments?active_only=true"),
      apiClient.get<InvestigationItem[]>("/investigations?active_only=true"),
      apiClient.get<PatientCategoryItem[]>("/patient-categories?active_only=true"),
      apiClient.get<OtherChargeTypeItem[]>("/other-charges?active_only=true"),
    ])
      .then(([cRes, dcRes, dRes, deptRes, invRes, pcRes, ocRes]) => {
        setCities(cRes.data);
        setDoctorCategories(dcRes.data);
        setDoctors(dRes.data);
        setDepartments(deptRes.data);
        setAllInvestigations(invRes.data);
        setPatientCategories(pcRes.data);
        setChargeTypes(ocRes.data);
      })
      .catch(console.error);

    // If preselected patient id
    if (preselectedPatientId) {
      apiClient
        .get<PatientItem>(`/patients/${preselectedPatientId}`)
        .then((res) => {
          setSelectedPatient(res.data);
          if (res.data.category_id) {
            setSelectedPatientCategoryId(res.data.category_id);
          }
        })
        .catch(console.error);
    }
  }, [preselectedPatientId]);

  // Live Patient Search
  useEffect(() => {
    if (patientSearch.trim().length >= 2) {
      apiClient
        .get<PatientItem[]>("/patients", { params: { search: patientSearch.trim(), limit: 5 } })
        .then((res) => setPatientResults(res.data))
        .catch(console.error);
    } else {
      setPatientResults([]);
    }
  }, [patientSearch]);

  // Filtered Doctors for Referring selection
  const filteredDoctors = doctors.filter((doc) => {
    if (selectedDocCategoryId && doc.category_id !== selectedDocCategoryId) return false;
    return true;
  });

  // Radiologists & Pathologists filtered
  const radiologistOptions = doctors.filter(
    (d) => d.doctor_type === "reporting" || d.doctor_type === "both"
  );

  // Financial Calculations
  const activeDiscountPct = React.useMemo(() => {
    if (!selectedPatientCategoryId) return 0;
    const cat = patientCategories.find((c) => c.id === selectedPatientCategoryId);
    return cat?.discount_percentage || 0;
  }, [selectedPatientCategoryId, patientCategories]);

  const subtotalInvestigations = selectedInvestigations.reduce((acc, row) => {
    const unitPrice =
      row.overridePrice !== undefined
        ? row.overridePrice
        : caseCategory === "emergency" && row.investigation.emergency_price > 0
        ? row.investigation.emergency_price
        : row.investigation.default_price;
    return acc + unitPrice * row.quantity;
  }, 0);

  const discountAmount = Math.round(subtotalInvestigations * (activeDiscountPct / 100) * 100) / 100;
  const otherChargesTotal = addedOtherCharges.reduce((acc, c) => acc + c.amount, 0);
  const netTotal = Math.max(0, subtotalInvestigations - discountAmount + otherChargesTotal);

  // Step 2: Handle Add Investigation
  const handleAddInvestigation = (inv: InvestigationItem) => {
    if (selectedInvestigations.some((si) => si.investigation.id === inv.id)) {
      return; // already added
    }
    setSelectedInvestigations((prev) => [...prev, { investigation: inv, quantity: 1 }]);
  };

  const handleRemoveInvestigation = (invId: string) => {
    setSelectedInvestigations((prev) => prev.filter((si) => si.investigation.id !== invId));
  };

  // Step 4: Handle Add Other Charge
  const handleAddOtherCharge = () => {
    if (!selectedChargeTypeId && !customChargeName) return;
    if (chargeAmount === "" || Number(chargeAmount) <= 0) return;

    let chargeName = customChargeName;
    if (selectedChargeTypeId) {
      const ct = chargeTypes.find((t) => t.id === selectedChargeTypeId);
      if (ct) chargeName = ct.name;
    }

    setAddedOtherCharges((prev) => [
      ...prev,
      {
        chargeTypeId: selectedChargeTypeId || (chargeTypes[0]?.id ?? ""),
        name: chargeName || "Miscellaneous Charge",
        amount: Number(chargeAmount),
      },
    ]);

    setSelectedChargeTypeId("");
    setCustomChargeName("");
    setChargeAmount("");
  };

  const handleRemoveOtherCharge = (idx: number) => {
    setAddedOtherCharges((prev) => prev.filter((_, i) => i !== idx));
  };

  // Submit Wizard
  const handleFinalSubmit = async () => {
    if (!selectedPatient) {
      setSubmitError("Please select or register a patient in Step 1.");
      setStep(1);
      return;
    }

    if (selectedInvestigations.length === 0) {
      setSubmitError("Please select at least one investigation in Step 2.");
      setStep(2);
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const payload = {
        patient_id: selectedPatient.id,
        referring_doctor_id: referringDoctorId || null,
        department_id: departmentId || null,
        case_category: caseCategory,
        patient_category_id: selectedPatientCategoryId || null,
        investigations: selectedInvestigations.map((si) => ({
          investigation_id: si.investigation.id,
          quantity: si.quantity,
          override_price: si.overridePrice,
        })),
        reporting_doctor_id: reportingDoctorId || null,
        radiologist_id: radiologistId || null,
        pathologist_id: pathologistId || null,
        physician_id: physicianId || null,
        other_doctor_id: otherDoctorId || null,
        other_charges: addedOtherCharges.map((oc) => ({
          charge_type_id: oc.chargeTypeId,
          charge_name: oc.name,
          amount: oc.amount,
        })),
        priority,
        symptoms: symptoms.trim() || null,
        clinical_notes: clinicalNotes.trim() || null,
      };

      const res = await apiClient.post<CaseDetail>("/cases", payload);
      setCreatedCase(res.data);
    } catch (err: any) {
      setSubmitError(err.response?.data?.detail || "Failed to register case. Please check all fields.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Stepper Header definitions
  const steps = [
    { num: 1, title: "Referring Doctor", icon: User },
    { num: 2, title: "Investigations", icon: FlaskConical },
    { num: 3, title: "Reporting Doctor", icon: Stethoscope },
    { num: 4, title: "Other Charges", icon: Receipt },
    { num: 5, title: "Symptoms & Review", icon: FileText },
  ];

  // If case successfully created
  if (createdCase) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4">
        <div className="bg-white rounded-xl shadow-sm border border-emerald-200 p-8 text-center space-y-6">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div>
            <span className="inline-block px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-semibold rounded-full uppercase tracking-wider mb-2">
              Registration Successful
            </span>
            <h2 className="text-2xl font-bold text-gray-900">
              Case {createdCase.case_number} Created
            </h2>
            <p className="text-gray-500 text-sm mt-1">
              Patient: <span className="font-semibold text-gray-800">{createdCase.patient_name}</span>{" "}
              (UHID: <span className="font-mono text-primary">{createdCase.patient_uhid}</span>)
            </p>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-5 max-w-xl mx-auto text-left grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-gray-500 block">Status:</span>
              <span className="font-semibold text-blue-700 capitalize">{createdCase.status}</span>
            </div>
            <div>
              <span className="text-gray-500 block">Priority:</span>
              <span className="font-semibold capitalize text-gray-800">{createdCase.priority}</span>
            </div>
            <div>
              <span className="text-gray-500 block">Tests Booked:</span>
              <span className="font-semibold text-gray-800">{createdCase.items.length} investigation(s)</span>
            </div>
            <div>
              <span className="text-gray-500 block">Net Payable Amount:</span>
              <span className="font-bold text-emerald-700 text-sm">Rs. {createdCase.net_amount.toFixed(2)}</span>
            </div>
            <div className="col-span-2">
              <span className="text-gray-500 block">Assigned Doctor:</span>
              <span className="font-medium text-gray-800">
                {createdCase.reporting_doctor_name || createdCase.referring_doctor_name || "Diagnostic Department"}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => window.print()}
              className="flex items-center gap-2"
            >
              <Printer className="w-4 h-4" />
              Print Registration Slip
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate(`/patients/${createdCase.patient_id}`)}
              className="flex items-center gap-2"
            >
              <User className="w-4 h-4" />
              View Patient Profile
            </Button>
            <Button
              onClick={() => {
                setCreatedCase(null);
                setSelectedPatient(null);
                setSelectedInvestigations([]);
                setAddedOtherCharges([]);
                setStep(1);
              }}
              className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white"
            >
              <Plus className="w-4 h-4" />
              Book Another Case
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-6 px-4 space-y-6">
      <PageHeader
        title="New Patient & Case Registration"
        description="Multi-step clinical case registration, test tariff computation, and specialist routing."
        action={
          <Button variant="outline" size="sm" onClick={() => navigate("/cases")}>
            Back to Case Register
          </Button>
        }
      />

      {/* Stepper Navigation */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <div className="grid grid-cols-5 gap-2">
          {steps.map((s) => {
            const Icon = s.icon;
            const isActive = step === s.num;
            const isCompleted = step > s.num;
            return (
              <button
                key={s.num}
                type="button"
                onClick={() => setStep(s.num)}
                className={`flex items-center gap-2 p-2.5 rounded-lg text-left transition-all ${
                  isActive
                    ? "bg-primary/10 border border-primary text-primary font-semibold"
                    : isCompleted
                    ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
                    : "bg-gray-50 border border-gray-200 text-gray-500 hover:bg-gray-100"
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                    isActive
                      ? "bg-primary text-white"
                      : isCompleted
                      ? "bg-emerald-600 text-white"
                      : "bg-gray-200 text-gray-700"
                  }`}
                >
                  {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : s.num}
                </div>
                <div className="hidden sm:block truncate">
                  <div className="text-xs uppercase tracking-wider opacity-75">Step {s.num}</div>
                  <div className="text-xs font-medium truncate">{s.title}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {submitError && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-start gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold">Registration Issue</div>
            <div>{submitError}</div>
          </div>
        </div>
      )}

      {/* Main Wizard Card */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        {/* ========================================================================= */}
        {/* STEP 1: PATIENT & REFERRING DOCTOR (PMS/New_Patentient/New_Patient.png)    */}
        {/* ========================================================================= */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="border-b border-gray-200 pb-3">
              <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <User className="w-5 h-5 text-primary" />
                Step 1: Patient Selection & Referring Doctor
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Select an existing registered patient or register a new patient, and assign the referring doctor.
              </p>
            </div>

            {/* Patient Card / Selector */}
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Patient Information
                </label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsNewPatientModalOpen(true)}
                  className="text-xs flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Register New Patient
                </Button>
              </div>

              {selectedPatient ? (
                <div className="p-4 bg-white border border-primary/40 rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center">
                      {selectedPatient.first_name[0]}
                      {selectedPatient.last_name[0]}
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900 text-sm">
                        {selectedPatient.first_name} {selectedPatient.last_name}
                      </div>
                      <div className="text-xs text-gray-500">
                        UHID: <span className="font-mono text-primary font-medium">{selectedPatient.patient_uhid}</span> | Phone:{" "}
                        {selectedPatient.phone} | Gender: {selectedPatient.gender}
                        {selectedPatient.age ? ` | Age: ${selectedPatient.age}` : ""}
                      </div>
                      {selectedPatient.category_name && (
                        <span className="inline-block mt-1 px-2 py-0.5 bg-blue-50 text-blue-700 text-[11px] font-medium rounded">
                          {selectedPatient.category_name}
                        </span>
                      )}
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-xs text-red-600 hover:text-red-700"
                    onClick={() => setSelectedPatient(null)}
                  >
                    Change Patient
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                    <Input
                      value={patientSearch}
                      onChange={(e) => setPatientSearch(e.target.value)}
                      placeholder="Search patient by UHID, full name, or phone number..."
                      className="pl-9"
                    />
                  </div>

                  {patientResults.length > 0 && (
                    <div className="border border-gray-200 bg-white rounded-lg divide-y divide-gray-100 max-h-48 overflow-y-auto shadow-sm">
                      {patientResults.map((p) => (
                        <div
                          key={p.id}
                          onClick={() => {
                            setSelectedPatient(p);
                            if (p.category_id) setSelectedPatientCategoryId(p.category_id);
                            setPatientSearch("");
                            setPatientResults([]);
                          }}
                          className="p-2.5 hover:bg-gray-50 cursor-pointer flex items-center justify-between text-xs"
                        >
                          <div>
                            <span className="font-semibold text-gray-800">
                              {p.first_name} {p.last_name}
                            </span>{" "}
                            <span className="font-mono text-primary ml-1 font-medium">({p.patient_uhid})</span>
                            <div className="text-gray-500 text-[11px]">
                              Phone: {p.phone} | Gender: {p.gender} {p.age ? `| Age: ${p.age}` : ""}
                            </div>
                          </div>
                          <Button size="sm" variant="outline" className="text-xs">
                            Select
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Referring Doctor Section */}
            <div className="space-y-4 pt-2">
              <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider block">
                Referring Doctor
              </label>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">City / Region Filter</label>
                  <select
                    value={selectedCityId}
                    onChange={(e) => setSelectedCityId(e.target.value)}
                    className="w-full text-sm border border-gray-300 rounded-md p-2 bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="">All Cities / Locations</option>
                    {cities.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Faculty / Category Filter</label>
                  <select
                    value={selectedDocCategoryId}
                    onChange={(e) => setSelectedDocCategoryId(e.target.value)}
                    className="w-full text-sm border border-gray-300 rounded-md p-2 bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="">All Categories / Specialties</option>
                    {doctorCategories.map((dc) => (
                      <option key={dc.id} value={dc.id}>
                        {dc.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Referring Doctor Name
                  </label>
                  <select
                    value={referringDoctorId}
                    onChange={(e) => setReferringDoctorId(e.target.value)}
                    className="w-full text-sm border border-gray-300 rounded-md p-2 bg-white focus:outline-none focus:ring-1 focus:ring-primary font-medium"
                  >
                    <option value="">Direct Walk-in / Self</option>
                    {filteredDoctors.map((d) => (
                      <option key={d.id} value={d.id}>
                        Dr. {d.full_name} {d.qualification ? `(${d.qualification})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-gray-100">
              <Button
                type="button"
                disabled={!selectedPatient}
                onClick={() => setStep(2)}
                className="flex items-center gap-1.5"
              >
                Proceed to Investigations
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 2: INVESTIGATION & PRICING (PMS/New_Patentient/Investigation.png)    */}
        {/* ========================================================================= */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="border-b border-gray-200 pb-3">
              <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <FlaskConical className="w-5 h-5 text-primary" />
                Step 2: Investigation & Price Calculation
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Select clinical investigations, apply category discounts, and verify calculated tariffs.
              </p>
            </div>

            {/* Case Type & Category Controls */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Case Category</label>
                <div className="flex items-center gap-4 pt-1">
                  <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                    <input
                      type="radio"
                      name="caseCat"
                      value="regular"
                      checked={caseCategory === "regular"}
                      onChange={() => setCaseCategory("regular")}
                      className="text-primary focus:ring-primary"
                    />
                    Regular Tariff
                  </label>
                  <label className="flex items-center gap-2 text-xs font-medium cursor-pointer text-red-600">
                    <input
                      type="radio"
                      name="caseCat"
                      value="emergency"
                      checked={caseCategory === "emergency"}
                      onChange={() => setCaseCategory("emergency")}
                      className="text-red-600 focus:ring-red-500"
                    />
                    Emergency Tariff
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Patient Category Discount</label>
                <select
                  value={selectedPatientCategoryId}
                  onChange={(e) => setSelectedPatientCategoryId(e.target.value)}
                  className="w-full text-sm border border-gray-300 rounded-md p-2 bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">Standard (0% discount)</option>
                  {patientCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.discount_percentage}% discount)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Department Filter</label>
                <select
                  value={departmentId}
                  onChange={(e) => setDepartmentId(e.target.value)}
                  className="w-full text-sm border border-gray-300 rounded-md p-2 bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">All Diagnostic Departments</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Investigation Selection Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column: Catalogue Search & Picker */}
              <div className="space-y-3">
                <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider block">
                  Select Investigations from Catalogue
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                  <Input
                    value={investigationSearch}
                    onChange={(e) => setInvestigationSearch(e.target.value)}
                    placeholder="Search test by name or code (e.g. CBC, MRI, Chest X-Ray)..."
                    className="pl-9 text-xs"
                  />
                </div>

                <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-72 overflow-y-auto">
                  {allInvestigations
                    .filter((inv) => {
                      if (departmentId && inv.department_id !== departmentId) return false;
                      if (!investigationSearch.trim()) return true;
                      const q = investigationSearch.toLowerCase();
                      return (
                        inv.name.toLowerCase().includes(q) || inv.code.toLowerCase().includes(q)
                      );
                    })
                    .slice(0, 20)
                    .map((inv) => {
                      const isAdded = selectedInvestigations.some(
                        (si) => si.investigation.id === inv.id
                      );
                      const displayPrice =
                        caseCategory === "emergency" && inv.emergency_price > 0
                          ? inv.emergency_price
                          : inv.default_price;

                      return (
                        <div
                          key={inv.id}
                          className="p-2.5 flex items-center justify-between hover:bg-gray-50 text-xs"
                        >
                          <div>
                            <span className="font-semibold text-gray-900">{inv.name}</span>
                            <span className="font-mono text-gray-400 ml-1.5">[{inv.code}]</span>
                            <div className="text-gray-500 text-[11px] mt-0.5">
                              Tariff:{" "}
                              <span className="font-semibold text-gray-800">
                                Rs. {Number(displayPrice).toFixed(2)}
                              </span>{" "}
                              | TAT: {inv.turnaround_hours}h
                            </div>
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            variant={isAdded ? "outline" : "default"}
                            disabled={isAdded}
                            onClick={() => handleAddInvestigation(inv)}
                            className="text-xs h-7 px-2.5"
                          >
                            {isAdded ? "Added" : "Add Test"}
                          </Button>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Right Column: Selected Items & Live Price Table */}
              <div className="space-y-3">
                <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider block">
                  Selected Investigations ({selectedInvestigations.length})
                </label>

                {selectedInvestigations.length === 0 ? (
                  <div className="p-8 border-2 border-dashed border-gray-200 rounded-lg text-center text-xs text-gray-400">
                    No investigations selected. Search and add tests from the left catalogue.
                  </div>
                ) : (
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-gray-50 text-gray-500 border-b border-gray-200">
                        <tr>
                          <th className="p-2">Test Name</th>
                          <th className="p-2 text-center">Qty</th>
                          <th className="p-2 text-right">Price</th>
                          <th className="p-2 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {selectedInvestigations.map((row) => {
                          const unitPrice =
                            row.overridePrice !== undefined
                              ? row.overridePrice
                              : caseCategory === "emergency" && row.investigation.emergency_price > 0
                              ? row.investigation.emergency_price
                              : row.investigation.default_price;

                          return (
                            <tr key={row.investigation.id} className="hover:bg-gray-50">
                              <td className="p-2">
                                <div className="font-medium text-gray-800">
                                  {row.investigation.name}
                                </div>
                                <div className="text-[10px] text-gray-400">
                                  {row.investigation.code}
                                </div>
                              </td>
                              <td className="p-2 text-center">
                                <input
                                  type="number"
                                  min={1}
                                  max={10}
                                  value={row.quantity}
                                  onChange={(e) => {
                                    const val = Math.max(1, parseInt(e.target.value) || 1);
                                    setSelectedInvestigations((prev) =>
                                      prev.map((si) =>
                                        si.investigation.id === row.investigation.id
                                          ? { ...si, quantity: val }
                                          : si
                                      )
                                    );
                                  }}
                                  className="w-12 text-center border border-gray-200 rounded p-1 text-xs"
                                />
                              </td>
                              <td className="p-2 text-right font-semibold text-gray-800">
                                Rs. {(Number(unitPrice) * row.quantity).toFixed(2)}
                              </td>
                              <td className="p-2 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveInvestigation(row.investigation.id)}
                                  className="text-red-500 hover:text-red-700"
                                >
                                  <Trash2 className="w-3.5 h-3.5 mx-auto" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>

                    {/* Financial Summary Box */}
                    <div className="bg-gray-50 p-3 border-t border-gray-200 space-y-1.5 text-xs">
                      <div className="flex justify-between text-gray-600">
                        <span>Tests Gross Subtotal:</span>
                        <span>Rs. {subtotalInvestigations.toFixed(2)}</span>
                      </div>
                      {activeDiscountPct > 0 && (
                        <div className="flex justify-between text-emerald-700 font-medium">
                          <span>Category Discount ({activeDiscountPct}%):</span>
                          <span>- Rs. {discountAmount.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between font-bold text-gray-900 border-t border-gray-200 pt-1 text-sm">
                        <span>Investigations Net:</span>
                        <span className="text-primary">
                          Rs. {(subtotalInvestigations - discountAmount).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-between pt-4 border-t border-gray-100">
              <Button type="button" variant="outline" onClick={() => setStep(1)}>
                <ArrowLeft className="w-4 h-4 mr-1.5" />
                Back to Patient
              </Button>
              <Button
                type="button"
                disabled={selectedInvestigations.length === 0}
                onClick={() => setStep(3)}
                className="flex items-center gap-1.5"
              >
                Proceed to Reporting Doctors
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 3: REPORTING DOCTOR (PMS/New_Patentient/Reporting_Doctor.png)         */}
        {/* ========================================================================= */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="border-b border-gray-200 pb-3">
              <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <Stethoscope className="w-5 h-5 text-primary" />
                Step 3: Specialist & Reporting Doctor Assignment
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Assign responsible reporting specialists for diagnostic interpretation and report sign-off.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Primary Reporting Doctor
                </label>
                <select
                  value={reportingDoctorId}
                  onChange={(e) => setReportingDoctorId(e.target.value)}
                  className="w-full text-sm border border-gray-300 rounded-md p-2 bg-white focus:outline-none focus:ring-1 focus:ring-primary font-medium"
                >
                  <option value="">Select Primary Reporting Doctor</option>
                  {radiologistOptions.map((d) => (
                    <option key={d.id} value={d.id}>
                      Dr. {d.full_name} {d.qualification ? `(${d.qualification})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Radiologist (Imaging Studies)
                </label>
                <select
                  value={radiologistId}
                  onChange={(e) => setRadiologistId(e.target.value)}
                  className="w-full text-sm border border-gray-300 rounded-md p-2 bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">Select Radiologist</option>
                  {radiologistOptions.map((d) => (
                    <option key={d.id} value={d.id}>
                      Dr. {d.full_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Pathologist (Laboratory Studies)
                </label>
                <select
                  value={pathologistId}
                  onChange={(e) => setPathologistId(e.target.value)}
                  className="w-full text-sm border border-gray-300 rounded-md p-2 bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">Select Pathologist</option>
                  {radiologistOptions.map((d) => (
                    <option key={d.id} value={d.id}>
                      Dr. {d.full_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Consulting Physician / Specialist
                </label>
                <select
                  value={physicianId}
                  onChange={(e) => setPhysicianId(e.target.value)}
                  className="w-full text-sm border border-gray-300 rounded-md p-2 bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">Select Consulting Physician</option>
                  {doctors.map((d) => (
                    <option key={d.id} value={d.id}>
                      Dr. {d.full_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-between pt-4 border-t border-gray-100">
              <Button type="button" variant="outline" onClick={() => setStep(2)}>
                <ArrowLeft className="w-4 h-4 mr-1.5" />
                Back to Investigations
              </Button>
              <Button type="button" onClick={() => setStep(4)} className="flex items-center gap-1.5">
                Proceed to Other Charges
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 4: OTHER CHARGES (PMS/New_Patentient/Other_Charges.png)               */}
        {/* ========================================================================= */}
        {step === 4 && (
          <div className="space-y-6">
            <div className="border-b border-gray-200 pb-3">
              <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <Receipt className="w-5 h-5 text-primary" />
                Step 4: Ancillary & Other Charges
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Record procedural items such as disposables, contrast media, syringes, or clinical consumables.
              </p>
            </div>

            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Charge Type</label>
                  <select
                    value={selectedChargeTypeId}
                    onChange={(e) => {
                      setSelectedChargeTypeId(e.target.value);
                      const ct = chargeTypes.find((t) => t.id === e.target.value);
                      if (ct) {
                        setChargeAmount(ct.default_amount);
                        setCustomChargeName(ct.name);
                      }
                    }}
                    className="w-full text-sm border border-gray-300 rounded-md p-2 bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="">Select Pre-configured Charge</option>
                    {chargeTypes.map((ct) => (
                      <option key={ct.id} value={ct.id}>
                        {ct.name} (Default: Rs. {Number(ct.default_amount).toFixed(2)})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Charge Description</label>
                  <Input
                    value={customChargeName}
                    onChange={(e) => setCustomChargeName(e.target.value)}
                    placeholder="e.g. Syringe 10ml, Contrast 50ml"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Amount (Rs.)</label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={chargeAmount}
                      onChange={(e) =>
                        setChargeAmount(e.target.value ? Number(e.target.value) : "")
                      }
                      placeholder="0.00"
                    />
                    <Button
                      type="button"
                      onClick={handleAddOtherCharge}
                      disabled={chargeAmount === "" || Number(chargeAmount) <= 0}
                      className="flex items-center gap-1 flex-shrink-0"
                    >
                      <Plus className="w-4 h-4" />
                      Add
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Added Charges Table */}
            <div>
              <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider block mb-2">
                Ancillary Charges Breakdown ({addedOtherCharges.length})
              </label>

              {addedOtherCharges.length === 0 ? (
                <div className="p-6 border border-dashed border-gray-200 rounded-lg text-center text-xs text-gray-400">
                  No other charges added for this case. You can proceed without ancillary charges.
                </div>
              ) : (
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-gray-50 text-gray-500 border-b border-gray-200">
                      <tr>
                        <th className="p-2">Description</th>
                        <th className="p-2 text-right">Amount (Rs.)</th>
                        <th className="p-2 text-center w-16">Remove</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {addedOtherCharges.map((ch, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="p-2 font-medium text-gray-800">{ch.name}</td>
                          <td className="p-2 text-right font-semibold text-gray-800">
                            Rs. {ch.amount.toFixed(2)}
                          </td>
                          <td className="p-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveOtherCharge(idx)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <Trash2 className="w-3.5 h-3.5 mx-auto" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50 border-t border-gray-200">
                      <tr>
                        <td className="p-2 font-bold text-gray-700">Total Ancillary Charges:</td>
                        <td className="p-2 text-right font-bold text-primary">
                          Rs. {otherChargesTotal.toFixed(2)}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>

            <div className="flex justify-between pt-4 border-t border-gray-100">
              <Button type="button" variant="outline" onClick={() => setStep(3)}>
                <ArrowLeft className="w-4 h-4 mr-1.5" />
                Back to Doctors
              </Button>
              <Button type="button" onClick={() => setStep(5)} className="flex items-center gap-1.5">
                Proceed to Symptoms & Review
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 5: SYMPTOMS & REVIEW (PMS/New_Patentient/Symtoms.png)                 */}
        {/* ========================================================================= */}
        {step === 5 && (
          <div className="space-y-6">
            <div className="border-b border-gray-200 pb-3">
              <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Step 5: Clinical Symptoms, Notes & Final Confirmation
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Record patient symptoms, clinical history, priority, and confirm case registration.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Priority Level</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as any)}
                  className="w-full text-sm border border-gray-300 rounded-md p-2 bg-white focus:outline-none focus:ring-1 focus:ring-primary font-medium"
                >
                  <option value="normal">Normal Priority</option>
                  <option value="urgent">Urgent Priority</option>
                  <option value="emergency">Emergency Priority (Stat)</option>
                </select>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Symptoms & Patient Complaints
                </label>
                <textarea
                  value={symptoms}
                  onChange={(e) => setSymptoms(e.target.value)}
                  rows={3}
                  className="w-full text-sm border border-gray-300 rounded-md p-2.5 focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="Record patient complaints, onset, duration, and relevant symptoms..."
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Clinical History & Prescribing Notes
                </label>
                <textarea
                  value={clinicalNotes}
                  onChange={(e) => setClinicalNotes(e.target.value)}
                  rows={3}
                  className="w-full text-sm border border-gray-300 rounded-md p-2.5 focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="Any prior surgical history, allergies, relevant clinical instructions..."
                />
              </div>
            </div>

            {/* Comprehensive Case Summary Card */}
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg space-y-3">
              <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                Case Registration Summary
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-gray-700">
                <div className="p-3 bg-white border border-gray-200 rounded">
                  <div className="text-gray-400 text-[11px] uppercase">Patient</div>
                  <div className="font-semibold text-gray-900 mt-0.5">
                    {selectedPatient?.first_name} {selectedPatient?.last_name}
                  </div>
                  <div className="text-primary font-mono">{selectedPatient?.patient_uhid}</div>
                  <div className="text-gray-500 mt-0.5">{selectedPatient?.phone}</div>
                </div>

                <div className="p-3 bg-white border border-gray-200 rounded">
                  <div className="text-gray-400 text-[11px] uppercase">Doctors</div>
                  <div className="mt-0.5">
                    <span className="text-gray-500">Referring: </span>
                    <span className="font-medium">
                      {doctors.find((d) => d.id === referringDoctorId)?.full_name || "Self / Walk-in"}
                    </span>
                  </div>
                  <div className="mt-0.5">
                    <span className="text-gray-500">Reporting: </span>
                    <span className="font-medium">
                      {doctors.find((d) => d.id === reportingDoctorId)?.full_name || "Department"}
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-white border border-gray-200 rounded space-y-1">
                  <div className="text-gray-400 text-[11px] uppercase">Financial Summary</div>
                  <div className="flex justify-between">
                    <span>Gross Total:</span>
                    <span>Rs. {(subtotalInvestigations + otherChargesTotal).toFixed(2)}</span>
                  </div>
                  {activeDiscountPct > 0 && (
                    <div className="flex justify-between text-emerald-700 font-medium">
                      <span>Discount ({activeDiscountPct}%):</span>
                      <span>- Rs. {discountAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-gray-900 pt-1 border-t border-gray-100 text-sm">
                    <span>Net Amount:</span>
                    <span className="text-emerald-700">Rs. {netTotal.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-between pt-4 border-t border-gray-100">
              <Button type="button" variant="outline" onClick={() => setStep(4)}>
                <ArrowLeft className="w-4 h-4 mr-1.5" />
                Back to Charges
              </Button>
              <Button
                type="button"
                disabled={isSubmitting}
                onClick={handleFinalSubmit}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <CheckCircle2 className="w-4 h-4" />
                {isSubmitting ? "Registering Case..." : "Confirm & Save Case"}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Patient Registration Modal */}
      <PatientRegistrationModal
        isOpen={isNewPatientModalOpen}
        onClose={() => setIsNewPatientModalOpen(false)}
        onSuccess={(pat) => {
          setSelectedPatient(pat);
          if (pat.category_id) setSelectedPatientCategoryId(pat.category_id);
          setIsNewPatientModalOpen(false);
        }}
        onSelectExisting={(patId) => {
          apiClient.get<PatientItem>(`/patients/${patId}`).then((res) => {
            setSelectedPatient(res.data);
            if (res.data.category_id) setSelectedPatientCategoryId(res.data.category_id);
          });
        }}
      />
    </div>
  );
};
