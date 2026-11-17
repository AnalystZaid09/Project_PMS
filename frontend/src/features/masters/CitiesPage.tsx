import React, { useEffect, useState } from "react";
import { Search, Plus, FileSpreadsheet, Edit2, Trash2 } from "lucide-react";
import { apiClient } from "@/lib/api";
import { CityItem } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogHeader, DialogFooter } from "@/components/ui/dialog";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/common/PageHeader";

export const CitiesPage: React.FC = () => {
  const [cities, setCities] = useState<CityItem[]>([]);
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCity, setEditingCity] = useState<CityItem | null>(null);

  // Form State
  const [name, setName] = useState("");
  const [state, setState] = useState("");
  const [country, setCountry] = useState("India");
  const [isActive, setIsActive] = useState(true);
  const [modalError, setModalError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const fetchCities = async () => {
    try {
      const res = await apiClient.get<CityItem[]>("/cities", {
        params: search ? { search } : {},
      });
      setCities(res.data);
    } catch (err) {
      console.error("Failed to load cities:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCities();
  }, [search]);

  const handleOpenAdd = () => {
    setEditingCity(null);
    setName("");
    setState("");
    setCountry("India");
    setIsActive(true);
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (city: CityItem) => {
    setEditingCity(city);
    setName(city.name);
    setState(city.state);
    setCountry(city.country);
    setIsActive(city.is_active);
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleToggleStatus = async (city: CityItem) => {
    try {
      const res = await apiClient.patch(`/cities/${city.id}/toggle-status`);
      setCities((prev) =>
        prev.map((c) => (c.id === city.id ? { ...c, is_active: res.data.is_active } : c))
      );
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to update city status.");
    }
  };

  const handleDelete = async (city: CityItem) => {
    if (!window.confirm(`Are you sure you want to delete city "${city.name}"?`)) return;
    try {
      await apiClient.delete(`/cities/${city.id}`);
      setCities((prev) => prev.filter((c) => c.id !== city.id));
    } catch (err: any) {
      alert(err.response?.data?.detail || "Cannot delete city.");
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    setIsSaving(true);

    try {
      if (editingCity) {
        const res = await apiClient.put(`/cities/${editingCity.id}`, {
          name,
          state,
          country,
          is_active: isActive,
        });
        setCities((prev) => prev.map((c) => (c.id === editingCity.id ? res.data : c)));
      } else {
        const res = await apiClient.post("/cities", {
          name,
          state,
          country,
          is_active: isActive,
        });
        setCities((prev) => [res.data, ...prev]);
      }
      setIsModalOpen(false);
    } catch (err: any) {
      setModalError(err.response?.data?.detail || "Failed to save city.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportExcel = () => {
    const csvContent =
      "data:text/csv;charset=utf-8," +
      ["Serial No,City Name,State / Province,Country,Status"]
        .concat(
          cities.map(
            (c, idx) =>
              `"${idx + 1}","${c.name}","${c.state}","${c.country}","${
                c.is_active ? "Active" : "Inactive"
              }"`
          )
        )
        .join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `apex_cities_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const displayedCities = cities.slice(0, pageSize);

  return (
    <div className="space-y-6">
      <PageHeader
        title="City / Location Master"
        description="Manage cities, regional areas, and geographical locations for patient and doctor registration"
        action={
          <div className="flex items-center space-x-3">
            <Button variant="outline" onClick={handleExportExcel}>
              <FileSpreadsheet className="h-4 w-4 mr-2 text-emerald-600" />
              Export to Excel
            </Button>
            <Button onClick={handleOpenAdd}>
              <Plus className="h-4 w-4 mr-2" />
              Add City
            </Button>
          </div>
        }
      />

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="SEARCH CITIES..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 uppercase text-xs"
          />
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
          <span>Showing {displayedCities.length} of {cities.length} results</span>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-20 flex justify-center">
            <LoadingSpinner />
          </div>
        ) : cities.length === 0 ? (
          <EmptyState
            title="No cities found"
            description={search ? "No locations match your search criteria." : "Get started by adding your first city."}
            action={
              <Button onClick={handleOpenAdd} size="sm">
                <Plus className="h-4 w-4 mr-1" /> Add City
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-semibold text-slate-500 tracking-wider uppercase">
                  <th className="py-3.5 px-4 w-20">Serial No.</th>
                  <th className="py-3.5 px-6">City Name</th>
                  <th className="py-3.5 px-6">State / Province</th>
                  <th className="py-3.5 px-6">Country</th>
                  <th className="py-3.5 px-4 w-32">Status</th>
                  <th className="py-3.5 px-4 text-right w-28">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayedCities.map((city, index) => (
                  <tr key={city.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3.5 px-4 text-slate-500 font-mono text-xs">{index + 1}</td>
                    <td className="py-3.5 px-6 font-medium text-slate-800 uppercase tracking-wide">
                      {city.name}
                    </td>
                    <td className="py-3.5 px-6 text-slate-600">{city.state}</td>
                    <td className="py-3.5 px-6 text-slate-600 font-medium">{city.country}</td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={city.is_active}
                          onCheckedChange={() => handleToggleStatus(city)}
                        />
                        <span className={`text-xs font-medium ${city.is_active ? "text-emerald-600" : "text-slate-400"}`}>
                          {city.is_active ? "Active" : "Inactive"}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end space-x-1">
                        <button
                          onClick={() => handleOpenEdit(city)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="Edit City"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(city)}
                          className="p-1.5 text-rose-500 hover:bg-rose-50 rounded transition-colors"
                          title="Delete City"
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
        <div className="p-6">
          <DialogHeader
            title={editingCity ? "Edit City" : "Add City"}
            description="Enter the geographical location details."
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
                City Name *
              </label>
              <Input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. VADODARA, KAMPALA, MOMBASA"
                className="uppercase"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                State / Province / Region *
              </label>
              <Input
                required
                value={state}
                onChange={(e) => setState(e.target.value)}
                placeholder="e.g. Gujarat, Central, Coast"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Country *
              </label>
              <Input
                required
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="e.g. India, Uganda, Ghana, Kenya"
              />
            </div>
            <div className="flex items-center space-x-2 pt-1">
              <Switch checked={isActive} onCheckedChange={setIsActive} />
              <label className="text-xs font-medium text-slate-700">Active Location</label>
            </div>
            <DialogFooter className="mt-6 pt-4 border-t border-slate-100 flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? "Saving..." : editingCity ? "Save Changes" : "Create City"}
              </Button>
            </DialogFooter>
          </form>
        </div>
      </Dialog>
    </div>
  );
};
