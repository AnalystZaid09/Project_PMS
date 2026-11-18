import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Plus, FileSpreadsheet, Eye, UserPlus, Phone, MapPin } from "lucide-react";
import { apiClient } from "@/lib/api";
import { PatientItem } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/common/PageHeader";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { EmptyState } from "@/components/common/EmptyState";
import { PatientRegistrationModal } from "./PatientRegistrationModal";

export const PatientsListPage: React.FC = () => {
  const navigate = useNavigate();

  const [patients, setPatients] = useState<PatientItem[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);

  const fetchPatients = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get<PatientItem[]>("/patients", {
        params: search.trim() ? { search: search.trim() } : {},
      });
      setPatients(res.data);
    } catch (err) {
      console.error("Failed to load patients:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, [search]);

  const handleExportCSV = () => {
    if (patients.length === 0) return;
    const headers = [
      "UHID",
      "First Name",
      "Last Name",
      "Gender",
      "Age",
      "Phone",
      "City",
      "Category",
      "Registered At",
    ];

    const rows = patients.map((p) => [
      p.patient_uhid,
      `"${p.first_name}"`,
      `"${p.last_name}"`,
      p.gender,
      p.age || "",
      p.phone,
      `"${p.city || ""}"`,
      `"${p.category_name || "General"}"`,
      new Date(p.created_at).toLocaleDateString(),
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Apex_Patients_Directory_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Patient Directory"
        description="Search, view medical history timelines, and manage registered patient demographics."
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              disabled={patients.length === 0}
              className="flex items-center gap-1.5"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              Export
            </Button>
            <Button
              size="sm"
              onClick={() => setIsRegisterModalOpen(true)}
              className="flex items-center gap-1.5 bg-primary hover:bg-primary/90 text-white"
            >
              <Plus className="w-4 h-4" />
              Register Patient
            </Button>
          </div>
        }
      />

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by UHID, full name, phone number, city..."
            className="pl-9 text-xs"
          />
        </div>
        <div className="text-xs text-gray-500 font-medium">
          Showing {patients.length} patient{patients.length === 1 ? "" : "s"}
        </div>
      </div>

      {/* Patients Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 flex justify-center">
            <LoadingSpinner />
          </div>
        ) : patients.length === 0 ? (
          <div className="p-12">
            <EmptyState
              title="No Patients Found"
              description="No registered patients match your search query."
              action={
                <Button onClick={() => setIsRegisterModalOpen(true)}>
                  <Plus className="w-4 h-4 mr-1.5" />
                  Register First Patient
                </Button>
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="p-3">UHID</th>
                  <th className="p-3">Full Name</th>
                  <th className="p-3">Gender / Age</th>
                  <th className="p-3">Contact Phone</th>
                  <th className="p-3">City / Address</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Registered Date</th>
                  <th className="p-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {patients.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="p-3 font-mono font-bold text-primary">{p.patient_uhid}</td>
                    <td className="p-3">
                      <span
                        className="font-semibold text-gray-900 hover:underline cursor-pointer"
                        onClick={() => navigate(`/patients/${p.id}`)}
                      >
                        {p.first_name} {p.last_name}
                      </span>
                    </td>
                    <td className="p-3 capitalize text-gray-700">
                      {p.gender} {p.age ? `• ${p.age} yrs` : ""}
                    </td>
                    <td className="p-3 text-gray-700 font-medium">{p.phone}</td>
                    <td className="p-3 text-gray-600 max-w-xs truncate">{p.city || "—"}</td>
                    <td className="p-3">
                      <span className="inline-block px-2 py-0.5 text-[10px] font-semibold bg-blue-50 text-blue-700 rounded-full">
                        {p.category_name || "General"}
                      </span>
                    </td>
                    <td className="p-3 text-gray-500">
                      {new Date(p.created_at).toLocaleDateString()}
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          title="View Timeline & Profile"
                          onClick={() => navigate(`/patients/${p.id}`)}
                        >
                          <Eye className="w-3.5 h-3.5 text-gray-600" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          title="Book New Case"
                          onClick={() => navigate(`/cases/new?patient_id=${p.id}`)}
                        >
                          <Plus className="w-3.5 h-3.5 text-primary" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Registration Modal */}
      <PatientRegistrationModal
        isOpen={isRegisterModalOpen}
        onClose={() => setIsRegisterModalOpen(false)}
        onSuccess={(pat) => {
          fetchPatients();
          navigate(`/patients/${pat.id}`);
        }}
        onSelectExisting={(patId) => {
          navigate(`/patients/${patId}`);
        }}
      />
    </div>
  );
};
