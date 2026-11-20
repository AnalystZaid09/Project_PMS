import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Clock,
  Plus,
  Edit2,
  FileText,
  Activity,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Stethoscope,
  Printer,
} from "lucide-react";
import { apiClient } from "@/lib/api";
import { PatientProfile, PatientItem } from "@/types";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/common/PageHeader";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { EmptyState } from "@/components/common/EmptyState";
import { Dialog, DialogHeader, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export const PatientProfilePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"timeline" | "cases" | "demographics">("timeline");

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editCity, setEditCity] = useState("");
  const [editEmergency, setEditEmergency] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const fetchProfile = async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const res = await apiClient.get<PatientProfile>(`/patients/${id}/profile`);
      setProfile(res.data);
    } catch (err) {
      console.error("Failed to load patient profile:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [id]);

  const handleOpenEdit = () => {
    if (!profile) return;
    setEditFirstName(profile.patient.first_name);
    setEditLastName(profile.patient.last_name);
    setEditPhone(profile.patient.phone);
    setEditEmail(profile.patient.email || "");
    setEditAddress(profile.patient.address || "");
    setEditCity(profile.patient.city || "");
    setEditEmergency(profile.patient.emergency_contact || "");
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setIsSaving(true);
    try {
      await apiClient.put(`/patients/${id}`, {
        first_name: editFirstName.trim(),
        last_name: editLastName.trim(),
        phone: editPhone.trim(),
        email: editEmail.trim() || null,
        address: editAddress.trim() || null,
        city: editCity.trim() || null,
        emergency_contact: editEmergency.trim() || null,
      });
      setIsEditModalOpen(false);
      fetchProfile();
    } catch (err) {
      console.error("Failed to update patient:", err);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-16 flex justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-12">
        <EmptyState
          title="Patient Not Found"
          description="The requested patient record could not be found or has been removed."
          action={
            <Button onClick={() => navigate("/patients")}>
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              Return to Patient Directory
            </Button>
          }
        />
      </div>
    );
  }

  const { patient, cases, timeline, total_visits, total_billed } = profile;

  return (
    <div className="space-y-6 max-w-6xl mx-auto py-4">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/patients")}
          className="text-xs text-gray-500 hover:text-gray-900"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1" />
          Back to Directory
        </Button>
      </div>

      {/* Patient Overview Card */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 text-primary font-bold text-xl flex items-center justify-center border border-primary/20">
              {patient.first_name[0]}
              {patient.last_name[0]}
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold text-gray-900">
                  {patient.first_name} {patient.last_name}
                </h2>
                <span className="px-2 py-0.5 bg-primary/10 text-primary font-mono text-xs font-semibold rounded">
                  {patient.patient_uhid}
                </span>
                {patient.category_name && (
                  <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs font-medium rounded">
                    {patient.category_name}
                  </span>
                )}
                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-xs font-medium rounded capitalize">
                  {patient.gender} {patient.age ? `• ${patient.age} yrs` : ""}
                </span>
              </div>

              <div className="flex items-center gap-4 text-xs text-gray-500 flex-wrap pt-0.5">
                <span className="flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5" />
                  {patient.phone}
                </span>
                {patient.email && (
                  <span className="flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5" />
                    {patient.email}
                  </span>
                )}
                {patient.city && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    {patient.city}
                  </span>
                )}
                {patient.blood_group && (
                  <span className="px-1.5 py-0.5 bg-red-50 text-red-700 font-bold text-[10px] rounded">
                    Blood Group: {patient.blood_group}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap w-full md:w-auto justify-end">
            <Button variant="outline" size="sm" onClick={handleOpenEdit} className="text-xs">
              <Edit2 className="w-3.5 h-3.5 mr-1" />
              Edit Details
            </Button>
            <Button
              size="sm"
              onClick={() => navigate(`/cases/new?patient_id=${patient.id}`)}
              className="text-xs bg-primary hover:bg-primary/90 text-white flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Book New Case
            </Button>
          </div>
        </div>

        {/* Quick Patient Stat Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6 pt-6 border-t border-gray-100 text-xs">
          <div className="p-3 bg-gray-50 rounded-lg">
            <span className="text-gray-500 block">Total Clinical Encounters</span>
            <span className="text-lg font-bold text-gray-900 mt-0.5 block">{total_visits}</span>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <span className="text-gray-500 block">Cumulative Billed</span>
            <span className="text-lg font-bold text-primary mt-0.5 block">
              Rs. {Number(total_billed).toFixed(2)}
            </span>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <span className="text-gray-500 block">Registration Branch</span>
            <span className="font-semibold text-gray-800 mt-0.5 block">
              {patient.branch_name || "Apex Diagnostics Central"}
            </span>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <span className="text-gray-500 block">Registered Since</span>
            <span className="font-semibold text-gray-800 mt-0.5 block">
              {new Date(patient.created_at).toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="border-b border-gray-200 flex gap-4 text-xs font-semibold">
        <button
          onClick={() => setActiveTab("timeline")}
          className={`pb-3 px-1 border-b-2 flex items-center gap-1.5 transition-colors ${
            activeTab === "timeline"
              ? "border-primary text-primary"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          <Activity className="w-4 h-4" />
          Interactive Clinical Timeline ({timeline.length})
        </button>
        <button
          onClick={() => setActiveTab("cases")}
          className={`pb-3 px-1 border-b-2 flex items-center gap-1.5 transition-colors ${
            activeTab === "cases"
              ? "border-primary text-primary"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          <FileText className="w-4 h-4" />
          Case History ({cases.length})
        </button>
        <button
          onClick={() => setActiveTab("demographics")}
          className={`pb-3 px-1 border-b-2 flex items-center gap-1.5 transition-colors ${
            activeTab === "demographics"
              ? "border-primary text-primary"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          <User className="w-4 h-4" />
          Demographics & Contact
        </button>
      </div>

      {/* Tab 1: Interactive Timeline */}
      {activeTab === "timeline" && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-6">
            Chronological Care & Activity Timeline
          </h3>

          <div className="relative border-l-2 border-primary/20 ml-4 space-y-8 pl-6">
            {timeline.map((event) => {
              const isReg = event.event_type === "patient_registration";
              const isCase = event.event_type === "case_booked";

              return (
                <div key={event.id} className="relative group">
                  {/* Timeline Node Dot */}
                  <div
                    className={`absolute -left-[31px] top-0.5 w-5 h-5 rounded-full border-2 border-white flex items-center justify-center text-[10px] ${
                      isReg
                        ? "bg-emerald-600 text-white"
                        : isCase
                        ? "bg-primary text-white"
                        : "bg-blue-500 text-white"
                    }`}
                  >
                    {isReg ? "✓" : "●"}
                  </div>

                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 transition-all hover:shadow-sm">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-bold text-gray-900">{event.title}</span>
                      <span className="text-gray-400">
                        {new Date(event.timestamp).toLocaleString([], {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </span>
                    </div>

                    <p className="text-xs text-gray-600">{event.description}</p>

                    {event.actor_name && (
                      <div className="mt-2 text-[11px] text-gray-500 font-medium">
                        Referring: {event.actor_name}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 2: Case History */}
      {activeTab === "cases" && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {cases.length === 0 ? (
            <div className="p-8 text-center text-xs text-gray-500">
              No examination cases recorded for this patient.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="p-3">Case Number</th>
                    <th className="p-3">Exam Date</th>
                    <th className="p-3">Investigations</th>
                    <th className="p-3">Referring Doctor</th>
                    <th className="p-3 text-right">Net Amount</th>
                    <th className="p-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {cases.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className="p-3 font-mono font-bold text-gray-900">{c.case_number}</td>
                      <td className="p-3 text-gray-600">
                        {new Date(c.exam_date).toLocaleDateString()}
                      </td>
                      <td className="p-3 max-w-xs truncate">{c.investigations_summary}</td>
                      <td className="p-3 text-gray-700">{c.referring_doctor_name || "Self"}</td>
                      <td className="p-3 text-right font-bold text-gray-900">
                        Rs. {Number(c.net_amount).toFixed(2)}
                      </td>
                      <td className="p-3 text-center">
                        <span className="inline-block px-2 py-0.5 text-[10px] font-semibold bg-blue-50 text-blue-700 rounded-full capitalize">
                          {c.status.replace("_", " ")}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Demographics */}
      {activeTab === "demographics" && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 text-xs space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-lg space-y-2">
              <span className="font-semibold text-gray-800 block text-xs uppercase tracking-wider">
                Personal Identification
              </span>
              <div>
                <span className="text-gray-500 block">Full Legal Name:</span>
                <span className="font-medium text-gray-900">
                  {patient.first_name} {patient.last_name}
                </span>
              </div>
              <div>
                <span className="text-gray-500 block">UHID:</span>
                <span className="font-mono text-primary font-bold">{patient.patient_uhid}</span>
              </div>
              <div>
                <span className="text-gray-500 block">National ID / Aadhar:</span>
                <span className="text-gray-900">{patient.national_id || "Not recorded"}</span>
              </div>
              <div>
                <span className="text-gray-500 block">Date of Birth & Age:</span>
                <span className="text-gray-900">
                  {patient.dob ? new Date(patient.dob).toLocaleDateString() : "DOB not recorded"}{" "}
                  {patient.age ? `(${patient.age} years)` : ""}
                </span>
              </div>
            </div>

            <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-lg space-y-2">
              <span className="font-semibold text-gray-800 block text-xs uppercase tracking-wider">
                Address & Emergency Contacts
              </span>
              <div>
                <span className="text-gray-500 block">Primary Phone:</span>
                <span className="font-medium text-gray-900">{patient.phone}</span>
              </div>
              <div>
                <span className="text-gray-500 block">Emergency Contact:</span>
                <span className="text-gray-900">{patient.emergency_contact || "None recorded"}</span>
              </div>
              <div>
                <span className="text-gray-500 block">Residential Address:</span>
                <span className="text-gray-900">
                  {patient.address || "None recorded"}{" "}
                  {patient.city ? `(${patient.city})` : ""}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Demographics Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={() => setIsEditModalOpen(false)}>
        <DialogHeader title="Edit Patient Demographics" onClose={() => setIsEditModalOpen(false)} />
        <form onSubmit={handleSaveEdit} className="p-6 space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-gray-700 font-medium mb-1">First Name</label>
              <Input
                value={editFirstName}
                onChange={(e) => setEditFirstName(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-gray-700 font-medium mb-1">Last Name</label>
              <Input
                value={editLastName}
                onChange={(e) => setEditLastName(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-gray-700 font-medium mb-1">Mobile Phone</label>
              <Input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} required />
            </div>
            <div>
              <label className="block text-gray-700 font-medium mb-1">Email</label>
              <Input
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-gray-700 font-medium mb-1">City</label>
              <Input value={editCity} onChange={(e) => setEditCity(e.target.value)} />
            </div>
            <div>
              <label className="block text-gray-700 font-medium mb-1">Emergency Contact</label>
              <Input
                value={editEmergency}
                onChange={(e) => setEditEmergency(e.target.value)}
              />
            </div>
            <div className="col-span-2">
              <label className="block text-gray-700 font-medium mb-1">Address</label>
              <textarea
                value={editAddress}
                onChange={(e) => setEditAddress(e.target.value)}
                rows={2}
                className="w-full text-xs border border-gray-300 rounded p-2"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsEditModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isSaving}>
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>
    </div>
  );
};

