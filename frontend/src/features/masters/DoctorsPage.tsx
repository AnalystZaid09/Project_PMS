import React, { useEffect, useState } from "react";
import { Search, Plus, FileSpreadsheet, Edit2, Trash2, Phone, Mail, UserCheck } from "lucide-react";
import { apiClient } from "@/lib/api";
import { DoctorItem, DoctorCategoryItem, DepartmentItem, CityItem } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogHeader, DialogFooter } from "@/components/ui/dialog";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/common/PageHeader";

export const DoctorsPage: React.FC = () => {
  const [doctors, setDoctors] = useState<DoctorItem[]>([]);
  const [categories, setCategories] = useState<DoctorCategoryItem[]>([]);
  const [departments, setDepartments] = useState<DepartmentItem[]>([]);
  const [cities, setCities] = useState<CityItem[]>([]);

  const [search, setSearch] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [pageSize, setPageSize] = useState(10);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<DoctorItem | null>(null);

  // Form State
  const [fullName, setFullName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [qualification, setQualification] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [doctorType, setDoctorType] = useState<"referring" | "reporting" | "both">("both");
  const [commissionRate, setCommissionRate] = useState<number>(0);
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [city, setCity] = useState("");
  const [isActive, setIsActive] = useState(true);

  const [modalError, setModalError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const fetchDependencies = async () => {
    try {
      const [catsRes, deptsRes, citiesRes] = await Promise.all([
        apiClient.get<DoctorCategoryItem[]>("/doctor-categories", { params: { active_only: true } }),
        apiClient.get<DepartmentItem[]>("/departments", { params: { active_only: true } }),
        apiClient.get<CityItem[]>("/cities", { params: { active_only: true } }),
      ]);
      setCategories(catsRes.data);
      setDepartments(deptsRes.data);
      setCities(citiesRes.data);
    } catch (err) {
      console.error("Failed to load doctor master dependencies:", err);
    }
  };

  const fetchDoctors = async () => {
    try {
      const params: any = {};
      if (search) params.search = search;
      if (selectedType !== "all") params.doctor_type = selectedType;

      const res = await apiClient.get<DoctorItem[]>("/doctors", { params });
      setDoctors(res.data);
    } catch (err) {
      console.error("Failed to load doctors:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDependencies();
  }, []);

  useEffect(() => {
    fetchDoctors();
  }, [search, selectedType]);

  const handleOpenAdd = () => {
    setEditingDoc(null);
    setFullName("");
    setCategoryId(categories[0]?.id || "");
    setDepartmentId(departments[0]?.id || "");
    setQualification("");
    setPhone("");
    setEmail("");
    setDoctorType("both");
    setCommissionRate(0);
    setAddressLine1("");
    setAddressLine2("");
    setCity(cities[0]?.name || "");
    setIsActive(true);
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (doc: DoctorItem) => {
    setEditingDoc(doc);
    setFullName(doc.full_name);
    setCategoryId(doc.category_id || "");
    setDepartmentId(doc.department_id || "");
    setQualification(doc.qualification || "");
    setPhone(doc.phone || "");
    setEmail(doc.email || "");
    setDoctorType(doc.doctor_type);
    setCommissionRate(doc.commission_rate || 0);
    setAddressLine1(doc.address_line1 || "");
    setAddressLine2(doc.address_line2 || "");
    setCity(doc.city || "");
    setIsActive(doc.is_active);
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleToggleStatus = async (doc: DoctorItem) => {
    try {
      const res = await apiClient.patch(`/doctors/${doc.id}/toggle-status`);
      setDoctors((prev) =>
        prev.map((d) => (d.id === doc.id ? { ...d, is_active: res.data.is_active } : d))
      );
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to update doctor status.");
    }
  };

  const handleDelete = async (doc: DoctorItem) => {
    if (!window.confirm(`Are you sure you want to delete "${doc.full_name}"?`)) return;
    try {
      await apiClient.delete(`/doctors/${doc.id}`);
      setDoctors((prev) => prev.filter((d) => d.id !== doc.id));
    } catch (err: any) {
      alert(err.response?.data?.detail || "Cannot delete doctor referenced by active clinical cases. Deactivate instead.");
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    setIsSaving(true);

    try {
      const payload = {
        full_name: fullName,
        category_id: categoryId || null,
        department_id: departmentId || null,
        qualification,
        phone,
        email,
        doctor_type: doctorType,
        commission_rate: Number(commissionRate),
        address_line1: addressLine1,
        address_line2: addressLine2,
        city,
        is_active: isActive,
      };

      if (editingDoc) {
        const res = await apiClient.put(`/doctors/${editingDoc.id}`, payload);
        setDoctors((prev) => prev.map((d) => (d.id === editingDoc.id ? res.data : d)));
      } else {
        const res = await apiClient.post("/doctors", payload);
        setDoctors((prev) => [res.data, ...prev]);
      }
      setIsModalOpen(false);
    } catch (err: any) {
      setModalError(err.response?.data?.detail || "Failed to save doctor details.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportExcel = () => {
    const csvContent =
      "data:text/csv;charset=utf-8," +
      ["Serial No,Doctor Name,Category,Department,Type,Mobile,City,Qualification,Commission %,Status"]
        .concat(
          doctors.map(
            (d, idx) =>
              `"${idx + 1}","${d.full_name}","${d.category_name || ""}","${d.department_name || ""}","${
                d.doctor_type
              }","${d.phone || ""}","${d.city || ""}","${d.qualification || ""}","${d.commission_rate}%","${
                d.is_active ? "Active" : "Inactive"
              }"`
          )
        )
        .join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `apex_doctors_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const displayedDoctors = doctors.slice(0, pageSize);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Doctor Master"
        description="Manage referring physicians, reporting clinical consultants, and specialist credentials"
        action={
          <div className="flex items-center space-x-3">
            <Button variant="outline" onClick={handleExportExcel}>
              <FileSpreadsheet className="h-4 w-4 mr-2 text-emerald-600" />
              Export to Excel
            </Button>
            <Button onClick={handleOpenAdd}>
              <Plus className="h-4 w-4 mr-2" />
              Add Doctor
            </Button>
          </div>
        }
      />

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="SEARCH DOCTOR NAME / PHONE..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 uppercase text-xs"
            />
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold text-slate-500 uppercase">Type:</span>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="border border-slate-200 rounded-md px-2.5 py-1.5 text-xs bg-white text-slate-700 font-medium"
            >
              <option value="all">All Types</option>
              <option value="referring">Referring Doctors</option>
              <option value="reporting">Reporting Doctors</option>
              <option value="both">Both</option>
            </select>
          </div>
        </div>

        <div className="flex items-center space-x-2 text-sm text-slate-500">
          <span>Show</span>
          <select
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            className="border border-slate-200 rounded-md px-2 py-1 text-sm bg-white"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>
          <span>Showing {displayedDoctors.length} of {doctors.length} results</span>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-20 flex justify-center">
            <LoadingSpinner />
          </div>
        ) : doctors.length === 0 ? (
          <EmptyState
            title="No doctors found"
            description="Add referring physicians or reporting medical consultants to get started."
            action={
              <Button onClick={handleOpenAdd} size="sm">
                <Plus className="h-4 w-4 mr-1" /> Add Doctor
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-semibold text-slate-500 tracking-wider uppercase">
                  <th className="py-3.5 px-4 w-16">S.No.</th>
                  <th className="py-3.5 px-6">Doctor Name</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Department</th>
                  <th className="py-3.5 px-3">Role Type</th>
                  <th className="py-3.5 px-4">Contact</th>
                  <th className="py-3.5 px-4">City</th>
                  <th className="py-3.5 px-4">Comm. Rate</th>
                  <th className="py-3.5 px-4 w-28">Status</th>
                  <th className="py-3.5 px-4 text-right w-24">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayedDoctors.map((doc, index) => (
                  <tr key={doc.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3.5 px-4 text-slate-500 font-mono text-xs">{index + 1}</td>
                    <td className="py-3.5 px-6">
                      <div className="font-semibold text-slate-900">{doc.full_name}</div>
                      <div className="text-[11px] text-slate-500">{doc.qualification || "Consultant"}</div>
                    </td>
                    <td className="py-3.5 px-4 text-xs font-medium text-slate-700">
                      {doc.category_name || "—"}
                    </td>
                    <td className="py-3.5 px-4 text-xs font-medium text-blue-600">
                      {doc.department_name || "—"}
                    </td>
                    <td className="py-3.5 px-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold capitalize ${
                          doc.doctor_type === "reporting"
                            ? "bg-purple-50 text-purple-700 border border-purple-200"
                            : doc.doctor_type === "referring"
                            ? "bg-blue-50 text-blue-700 border border-blue-200"
                            : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        }`}
                      >
                        {doc.doctor_type}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-600 space-y-0.5">
                      {doc.phone && (
                        <div className="flex items-center space-x-1">
                          <Phone className="h-3 w-3 text-slate-400" />
                          <span>{doc.phone}</span>
                        </div>
                      )}
                      {doc.email && (
                        <div className="flex items-center space-x-1 text-slate-500 truncate max-w-[140px]">
                          <Mail className="h-3 w-3 text-slate-400" />
                          <span>{doc.email}</span>
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-700 uppercase font-medium">
                      {doc.city || "—"}
                    </td>
                    <td className="py-3.5 px-4 text-xs font-semibold text-slate-800">
                      {doc.commission_rate}%
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={doc.is_active}
                          onCheckedChange={() => handleToggleStatus(doc)}
                        />
                        <span className={`text-xs font-medium ${doc.is_active ? "text-emerald-600" : "text-slate-400"}`}>
                          {doc.is_active ? "Active" : "Inactive"}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end space-x-1">
                        <button
                          onClick={() => handleOpenEdit(doc)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="Edit Doctor"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(doc)}
                          className="p-1.5 text-rose-500 hover:bg-rose-50 rounded transition-colors"
                          title="Delete Doctor"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Dialog */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <div className="p-6 max-h-[90vh] overflow-y-auto">
          <DialogHeader
            title={editingDoc ? "Edit Doctor Details" : "Add New Doctor"}
            description="Enter doctor qualifications, category, contact, and commission rates."
            onClose={() => setIsModalOpen(false)}
          />
          {modalError && (
            <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
              {modalError}
            </div>
          )}
          <form onSubmit={handleSave} className="space-y-4 mt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Doctor Full Name *
                </label>
                <Input
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Dr. Marcus Vance"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Doctor Category
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full rounded-md border border-slate-200 p-2 text-sm bg-white"
                >
                  <option value="">Select Category...</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Department
                </label>
                <select
                  value={departmentId}
                  onChange={(e) => setDepartmentId(e.target.value)}
                  className="w-full rounded-md border border-slate-200 p-2 text-sm bg-white"
                >
                  <option value="">Select Department...</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.code})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Qualification / Credentials
                </label>
                <Input
                  value={qualification}
                  onChange={(e) => setQualification(e.target.value)}
                  placeholder="e.g. MBBS, MD Radio-Diagnosis"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Doctor Type *
                </label>
                <select
                  value={doctorType}
                  onChange={(e) => setDoctorType(e.target.value as any)}
                  className="w-full rounded-md border border-slate-200 p-2 text-sm bg-white font-medium"
                >
                  <option value="both">Both (Referral & Reporting)</option>
                  <option value="referring">Referring Doctor</option>
                  <option value="reporting">Reporting Doctor</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Mobile / Phone
                </label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98250 11001"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Commission Rate (%)
                </label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  step={0.5}
                  value={commissionRate}
                  onChange={(e) => setCommissionRate(Number(e.target.value))}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Email Address
                </label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="doctor@apexhealth.org"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  City / Location
                </label>
                <select
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full rounded-md border border-slate-200 p-2 text-sm bg-white"
                >
                  <option value="">Select City...</option>
                  {cities.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name} ({c.country})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Clinic / Residence Address Line 1
              </label>
              <Input
                value={addressLine1}
                onChange={(e) => setAddressLine1(e.target.value)}
                placeholder="Street address or clinic suite..."
              />
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <Switch checked={isActive} onCheckedChange={setIsActive} />
              <label className="text-xs font-medium text-slate-700">Active Doctor Account</label>
            </div>

            <DialogFooter className="mt-6 pt-4 border-t border-slate-100 flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? "Saving..." : editingDoc ? "Save Changes" : "Register Doctor"}
              </Button>
            </DialogFooter>
          </form>
        </div>
      </Dialog>
    </div>
  );
};
