import React, { useEffect, useState } from "react";
import { Save, Building, Image as ImageIcon, Check } from "lucide-react";
import { apiClient } from "@/lib/api";
import { GeneralSettings } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { PageHeader } from "@/components/common/PageHeader";

export const SettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<GeneralSettings | null>(null);
  const [appName, setAppName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [faviconUrl, setFaviconUrl] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await apiClient.get<GeneralSettings>("/settings/general");
        setSettings(res.data);
        setAppName(res.data.app_name);
        setLogoUrl(res.data.logo_url || "");
        setFaviconUrl(res.data.favicon_url || "");
      } catch (err) {
        console.error("Failed to load settings:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      const res = await apiClient.put<GeneralSettings>("/settings/general", {
        app_name: appName,
        logo_url: logoUrl || null,
        favicon_url: faviconUrl || null,
      });
      setSettings(res.data);
      setSaveSuccess(true);
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to save settings.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <LoadingSpinner message="Loading organization settings..." />;
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader
        title="General Settings"
        description="Configure organization identity, application branding, and document styling"
      />

      {saveSuccess && (
        <div className="flex items-center space-x-2 rounded-lg bg-emerald-50 p-3.5 text-xs text-emerald-800 border border-emerald-200">
          <Check className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>Branding and general settings saved successfully.</span>
        </div>
      )}

      {/* Form matching general_settings.png */}
      <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <form onSubmit={handleSave} className="space-y-8">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              App Name: *
            </label>
            <Input
              value={appName}
              onChange={(e) => setAppName(e.target.value)}
              className="max-w-md h-10"
              placeholder="e.g. Nexus Health PMS"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            {/* App Logo */}
            <div>
              <label className="flex items-center space-x-1 text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                <span>App Logo:</span>
                <span className="text-slate-400 font-normal">?</span>
              </label>
              <div className="flex flex-col items-center justify-center h-32 w-48 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 p-4 hover:bg-slate-100/50 transition-colors">
                <ImageIcon className="h-8 w-8 text-slate-400 mb-1" />
                <span className="text-[11px] text-slate-500 font-medium">Click to upload logo</span>
              </div>
            </div>

            {/* Favicon */}
            <div>
              <label className="flex items-center space-x-1 text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                <span>Favicon: *</span>
                <span className="text-slate-400 font-normal">?</span>
              </label>
              <div className="flex flex-col items-center justify-center h-32 w-32 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 p-4 hover:bg-slate-100/50 transition-colors">
                <ImageIcon className="h-8 w-8 text-slate-400 mb-1" />
                <span className="text-[11px] text-slate-500 font-medium">Upload favicon</span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-4 pt-6 border-t border-slate-100">
            <Button
              type="submit"
              disabled={isSaving}
              className="bg-blue-600 hover:bg-blue-700 px-6 font-semibold"
            >
              <Save className="h-4 w-4 mr-1.5" />
              {isSaving ? "Saving..." : "SAVE"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                if (settings) setAppName(settings.app_name);
              }}
              className="px-6 font-semibold text-slate-600"
            >
              CANCEL
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
