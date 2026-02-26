"use client";

import { useEffect, useState } from "react";
// import { useAuth } from "@/components/providers/AuthProvider"; // Unused
import { getAppConfig, updateAppConfig } from "@/lib/firebase/app-config";
import { Loader2, Save, FileText, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

const GLOBAL_CONFIGURABLE_FIELDS = [
    { id: "gender", label: "Gender", description: "Show Gender selection in registration form." },
    { id: "bloodGroup", label: "Blood Group", description: "Show Blood Group selection in registration form." },
    { id: "email", label: "Email", description: "Show Email address field." },
    { id: "mobile2", label: "Mobile 2", description: "Show secondary Mobile Number field." },
    { id: "landline", label: "Landline", description: "Show Landline/Office number field." },
    { id: "dob", label: "Date of Birth (DOB)", description: "Show Date of Birth field." },
    { id: "doa", label: "Date of Appointment (DOA)", description: "Show Date of Appointment (Service Start Date)." },
];

export default function RegistrationSettingsPage() {
    // const { user } = useAuth(); // Unused
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    // const [config, setConfig] = useState<AppConfig | null>(null); // Unused
    const [hiddenFields, setHiddenFields] = useState<string[]>([]);

    useEffect(() => {
        const fetchConfig = async () => {
            try {
                const appConfig = await getAppConfig();
                // setConfig(appConfig); // Unused
                setHiddenFields(appConfig?.hiddenFields || []);
            } catch (error) {
                console.error("Error fetching config:", error);
                toast.error("Failed to load settings");
            } finally {
                setLoading(false);
            }
        };

        fetchConfig();
    }, []);

    const toggleField = (fieldId: string) => {
        setHiddenFields(prev =>
            prev.includes(fieldId)
                ? prev.filter(f => f !== fieldId) // Un-hide (Show)
                : [...prev, fieldId] // Hide
        );
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await updateAppConfig({
                hiddenFields: hiddenFields
            });
            toast.success("Settings saved successfully");
            // No need to setConfig locally as we don't use 'config' state for anything other than initial load check
        } catch (error) {
            console.error("Error saving settings:", error);
            toast.error("Failed to save settings");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[500px]">
                <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
            </div>
        );
    }

    // Default: If a field is NOT in the list, it is visible.
    // So "checked" means "Visible", which means NOT in hiddenFields.
    const isVisible = (fieldId: string) => !hiddenFields.includes(fieldId);

    return (
        <div className="p-6 space-y-8 animate-in fade-in duration-500 max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-dark-card/30 p-6 rounded-2xl border border-dark-border backdrop-blur-md">
                <div className="space-y-1">
                    <h1 className="text-3xl font-extrabold bg-gradient-to-r from-purple-400 via-blue-400 to-purple-400 bg-clip-text text-transparent animate-gradient-x flex items-center gap-3">
                        <FileText className="w-8 h-8 text-purple-400" />
                        Registration Form
                    </h1>
                    <p className="text-slate-400 text-sm">Configure global settings for the employee registration and profile forms.</p>
                </div>
            </div>

            {/* Settings Card */}
            <div className="bg-dark-card border border-dark-border rounded-xl overflow-hidden shadow-lg">
                <div className="p-6 border-b border-dark-border bg-slate-800/20">
                    <h2 className="text-xl font-semibold text-slate-200">Global Field Visibility</h2>
                    <p className="text-slate-400 text-sm mt-1">
                        Control which fields are available across the entire application (Registration, Profile, Edit).
                        These settings apply to <strong>all units</strong>.
                    </p>
                </div>

                <div className="p-6 space-y-6">
                    <div className="grid gap-4">
                        {GLOBAL_CONFIGURABLE_FIELDS.map((field) => {
                            const active = isVisible(field.id);
                            return (
                                <div
                                    key={field.id}
                                    onClick={() => toggleField(field.id)}
                                    className={`relative flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer ${active
                                        ? "bg-purple-900/10 border-purple-500/50 shadow-[0_0_15px_rgba(168,85,247,0.1)]"
                                        : "bg-dark-card/50 border-dark-border hover:border-slate-600"
                                        }`}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${active ? "bg-purple-500/20 text-purple-400" : "bg-slate-800 text-slate-500"}`}>
                                            {active ? <CheckCircle2 className="w-5 h-5" /> : <div className="w-5 h-5 rounded-full border-2 border-slate-600" />}
                                        </div>
                                        <div>
                                            <h3 className={`font-medium ${active ? "text-purple-300" : "text-slate-400"}`}>{field.label}</h3>
                                            <p className="text-xs text-slate-500 mt-0.5">{field.description}</p>
                                        </div>
                                    </div>
                                    <div className="relative">
                                        <div className={`w-12 h-6 rounded-full transition-colors ${active ? "bg-purple-600" : "bg-slate-700"}`} />
                                        <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${active ? "translate-x-6" : "translate-x-0"}`} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="p-6 bg-dark-card/50 border-t border-dark-border flex justify-end">
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 px-8 py-3 text-white font-medium transition-all hover:shadow-lg hover:shadow-purple-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                        {saving ? "Saving Changes..." : "Save Configuration"}
                    </button>
                </div>
            </div>
        </div>
    );
}
