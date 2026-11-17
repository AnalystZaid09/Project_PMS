import React, { useEffect, useState } from "react";
import { Search, Plus, FileSpreadsheet, Trash2, Filter } from "lucide-react";
import { apiClient } from "@/lib/api";
import { DoctorItem, InvestigationItem, DoctorInvestigationRateItem } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogHeader, DialogFooter } from "@/components/ui/dialog";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/common/PageHeader";

export const DoctorRatesPage: React.FC = () => {
  const [rates, setRates] = useState<DoctorInvestigationRateItem[]>([]);
  const [doctors, setDoctors] = useState<DoctorItem[]>([]);
  const [investigations, setInvestigations] = useState<InvestigationItem[]>([]);

  const [selectedDoctorId, setSelectedDoctorId] = useState<string>("");
  const [selectedRateType, setSelectedRateType] = useState<string>("referral");
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [formDoctorId, setFormDoctorId] = useState("");
  const [formInvestigationId, setFormInvestigationId] = useState("");
  const [formRateType, setFormRateType] = useState<"referral" | "reporting">("referral");
  const [regularFixed, setRegularFixed] = useState<number>(0);
  const [regularPercentage, setRegularPercentage] = useState<number>(0);
  const [emergencyFixed, setEmergencyFixed] = useState<number>(0);
  const [emergencyPercentage, setEmergencyPercentage] = useState<number>(0);

  const [modalError, setModalError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const fetchDependencies = async () => {
    try {
      const [docsRes, invsRes] = await Promise.all([
        apiClient.get<DoctorItem[]>("/doctors", { params: { active_only: true } }),
        apiClient.get<InvestigationItem[]>("/investigations", { params: { active_only: true } }),
      ]);
      setDoctors(docsRes.data);
      setInvestigations(invsRes.data);
    } catch (err) {
      console.error("Failed to load doctor tariff dependencies:", err);
    }
  };

  const fetchRates = async () => {
    try {
      const params: any = {};
      if (selectedDoctorId) params.doctor_id = selectedDoctorId;
      if (selectedRateType) params.rate_type = selectedRateType;

      const res = await apiClient.get<DoctorInvestigationRateItem[]>("/doctor-rates", { params });
      setRates(res.data);
    } catch (err) {
      console.error("Failed to load doctor rates:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDependencies();
  }, []);

  useEffect(() => {
    fetchRates();
  }, [selectedDoctorId, selectedRateType]);

  const handleOpenAdd = () => {
    setFormDoctorId(selectedDoctorId || doctors[0]?.id || "");
    setFormInvestigationId(investigations[0]?.id || "");
    setFormRateType(selectedRateType as any || "referral");
    setRegularFixed(0);
    setRegularPercentage(0);
    setEmergencyFixed(0);
    setEmergencyPercentage(0);
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleDeleteRate = async (rateId: string) => {
    if (!window.confirm("Are you sure you want to remove this tariff rate override?")) return;
    try {
      await apiClient.delete(`/doctor-rates/${rateId}`);
      setRates((prev) => prev.filter((r) => r.id !== rateId));
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to delete rate entry.");
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    setIsSaving(true);

    try {
      const payload = {
        doctor_id: formDoctorId,
        investigation_id: formInvestigationId,
        rate_type: formRateType,
        regular_fixed: Number(regularFixed),
        regular_percentage: Number(regularPercentage),
        emergency_fixed: Number(emergencyFixed),
        emergency_percentage: Number(emergencyPercentage),
      };

      const res = await apiClient.post("/doctor-rates", payload);
      setRates((prev) => {
        const filtered = prev.filter(
          (r) => !(r.doctor_id === formDoctorId && r.investigation_id === formInvestigationId && r.rate_type === formRateType)
        );
        return [res.data, ...filtered];
      });
      setIsModalOpen(false);
    } catch (err: any) {
      setModalError(err.response?.data?.detail || "Failed to set doctor investigation rate.");
    } finally {
      setIsSaving(false);
    }
  };

  const filteredRates = rates.filter((r) => {
    if (!search) return true;
    const query = search.toLowerCase();
    return (
      r.doctor_name?.toLowerCase().includes(query) ||
      r.investigation_name?.toLowerCase().includes(query) ||
      r.investigation_code?.toLowerCase().includes(query)
    );
  });

  const displayedRates = filteredRates.slice(0, pageSize);

  const handleExportExcel = () => {
    const csvContent =
      "data:text/csv;charset=utf-8," +
      ["Serial No,Doctor Name,Investigation Code,Investigation Name,Rate Type,Regular Fixed,Regular %,Emergency Fixed,Emergency %"]
        .concat(
          filteredRates.map(
            (r, idx) =>
              `"${idx + 1}","${r.doctor_name || ""}","${r.investigation_code || ""}","${r.investigation_name || ""}","${
                r.rate_type
              }","${r.regular_fixed}","${r.regular_percentage}%","${r.emergency_fixed}","${r.emergency_percentage}%"`
          )
        )
        .join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `apex_doctor_tariff_rates_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Doctor Tariff & Rate Chart"
        description="Configure investigation commission and interpretation fees for referring and reporting doctors"
        action={
          <div className="flex items-center space-x-3">
            <Button variant="outline" onClick={handleExportExcel}>
              <FileSpreadsheet className="h-4 w-4 mr-2 text-emerald-600" />
              Export to Excel
            </Button>
            <Button onClick={handleOpenAdd}>
              <Plus className="h-4 w-4 mr-2" />
              Add Doctor Tariff
            </Button>
          </div>
        }
      />

      {/* Filter and Doctor Selector Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="SEARCH TEST OR DOCTOR..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 uppercase text-xs"
            />
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold text-slate-500 uppercase">Doctor:</span>
            <select
              value={selectedDoctorId}
              onChange={(e) => setSelectedDoctorId(e.target.value)}
              className="border border-slate-200 rounded-md px-2.5 py-1.5 text-xs bg-white text-slate-700 font-medium max-w-xs"
            >
              <option value="">All Doctors</option>
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.full_name} ({d.doctor_type})
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold text-slate-500 uppercase">Tariff Type:</span>
            <select
              value={selectedRateType}
              onChange={(e) => setSelectedRateType(e.target.value)}
              className="border border-slate-200 rounded-md px-2.5 py-1.5 text-xs bg-white text-slate-700 font-medium"
            >
              <option value="referral">Referring Doctor Chart</option>
              <option value="reporting">Reporting Doctor Chart</option>
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
          <span>Showing {displayedRates.length} of {filteredRates.length} results</span>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-20 flex justify-center">
            <LoadingSpinner />
          </div>
        ) : filteredRates.length === 0 ? (
          <EmptyState
            title="No doctor tariff rates configured"
            description="Set specific fixed or percentage commission rates for investigations."
            action={
              <Button onClick={handleOpenAdd} size="sm">
                <Plus className="h-4 w-4 mr-1" /> Add Tariff
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-semibold text-slate-500 tracking-wider uppercase">
                  <th className="py-3.5 px-4 w-16">Serial No.</th>
                  <th className="py-3.5 px-5">Doctor Name</th>
                  <th className="py-3.5 px-4">Investigation</th>
                  <th className="py-3.5 px-3">Tariff Type</th>
                  <th className="py-3.5 px-4">Regular Fixed</th>
                  <th className="py-3.5 px-4">Regular %</th>
                  <th className="py-3.5 px-4">Emergency Fixed</th>
                  <th className="py-3.5 px-4">Emergency %</th>
                  <th className="py-3.5 px-4 text-right w-20">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayedRates.map((rate, index) => (
                  <tr key={rate.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3.5 px-4 text-slate-500 font-mono text-xs">{index + 1}</td>
                    <td className="py-3.5 px-5 font-semibold text-slate-800">
                      {rate.doctor_name || "—"}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-mono text-xs font-semibold text-blue-600">
                        {rate.investigation_code}
                      </div>
                      <div className="text-xs text-slate-700">{rate.investigation_name}</div>
                    </td>
                    <td className="py-3.5 px-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold capitalize ${
                          rate.rate_type === "reporting"
                            ? "bg-purple-50 text-purple-700 border border-purple-200"
                            : "bg-blue-50 text-blue-700 border border-blue-200"
                        }`}
                      >
                        {rate.rate_type}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-medium text-slate-800">
                      ₹{Number(rate.regular_fixed).toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-700">
                      {rate.regular_percentage}%
                    </td>
                    <td className="py-3.5 px-4 font-mono font-medium text-slate-800">
                      ₹{Number(rate.emergency_fixed).toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-700">
                      {rate.emergency_percentage}%
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleDeleteRate(rate.id)}
                        className="p-1.5 text-rose-500 hover:bg-rose-50 rounded transition-colors"
                        title="Delete Tariff Override"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
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
        <div className="p-6">
          <DialogHeader
            title="Set Doctor Tariff Rate"
            description="Assign specific compensation rates for a diagnostic investigation."
            onClose={() => setIsModalOpen(false)}
          />
          {modalError && (
            <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
              {modalError}
            </div>
          )}
          <form onSubmit={handleSave} className="space-y-4 mt-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Doctor *
              </label>
              <select
                required
                value={formDoctorId}
                onChange={(e) => setFormDoctorId(e.target.value)}
                className="w-full rounded-md border border-slate-200 p-2 text-sm bg-white font-medium"
              >
                <option value="">Select Doctor...</option>
                {doctors.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.full_name} ({d.doctor_type})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Investigation / Test *
                </label>
                <select
                  required
                  value={formInvestigationId}
                  onChange={(e) => setFormInvestigationId(e.target.value)}
                  className="w-full rounded-md border border-slate-200 p-2 text-sm bg-white"
                >
                  <option value="">Select Investigation...</option>
                  {investigations.map((i) => (
                    <option key={i.id} value={i.id}>
                      [{i.code}] {i.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Rate Type *
                </label>
                <select
                  value={formRateType}
                  onChange={(e) => setFormRateType(e.target.value as any)}
                  className="w-full rounded-md border border-slate-200 p-2 text-sm bg-white font-medium"
                >
                  <option value="referral">Referring Doctor Rate</option>
                  <option value="reporting">Reporting Doctor Rate</option>
                </select>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Regular Service Tariff
              </span>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Regular Fixed Amount (₹)
                  </label>
                  <Input
                    type="number"
                    min={0}
                    step={1}
                    value={regularFixed}
                    onChange={(e) => setRegularFixed(Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Regular Percentage (%)
                  </label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    step={0.5}
                    value={regularPercentage}
                    onChange={(e) => setRegularPercentage(Number(e.target.value))}
                  />
                </div>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Emergency Service Tariff
              </span>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Emergency Fixed Amount (₹)
                  </label>
                  <Input
                    type="number"
                    min={0}
                    step={1}
                    value={emergencyFixed}
                    onChange={(e) => setEmergencyFixed(Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Emergency Percentage (%)
                  </label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    step={0.5}
                    value={emergencyPercentage}
                    onChange={(e) => setEmergencyPercentage(Number(e.target.value))}
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="mt-6 pt-4 border-t border-slate-100 flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? "Saving..." : "Save Tariff Rate"}
              </Button>
            </DialogFooter>
          </form>
        </div>
      </Dialog>
    </div>
  );
};
