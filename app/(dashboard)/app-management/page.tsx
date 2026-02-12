"use client";

import { useEffect, useState } from "react";
import { getAppConfig, updateAppConfig, AppConfig } from "@/lib/firebase/app-config";
import { useAuth } from "@/components/providers/AuthProvider";
import { Download, Save, Smartphone, Upload, ExternalLink, Keyboard } from "lucide-react";

export default function AppManagementPage() {
    const { user } = useAuth();
    const [config, setConfig] = useState<AppConfig | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // Main App State
    const [uploadProgress, setUploadProgress] = useState(0);
    const [apkFile, setApkFile] = useState<File | null>(null);
    const [formData, setFormData] = useState({
        playStoreUrl: "",
        apkUrl: "",
        apkVersion: "",
    });

    // Nudi App State
    const [nudiUploadProgress, setNudiUploadProgress] = useState(0);
    const [nudiApkFile, setNudiApkFile] = useState<File | null>(null);
    const [nudiFormData, setNudiFormData] = useState({
        nudiApkUrl: "",
        nudiApkVersion: "",
    });

    useEffect(() => {
        loadConfig();
    }, []);

    const loadConfig = async () => {
        try {
            const data = await getAppConfig();
            if (data) {
                setConfig(data);
                setFormData({
                    playStoreUrl: data.playStoreUrl || "",
                    apkUrl: data.apkUrl || "",
                    apkVersion: data.apkVersion || "",
                });
                setNudiFormData({
                    nudiApkUrl: data.nudiApkUrl || "",
                    nudiApkVersion: data.nudiApkVersion || "",
                });
            }
        } catch (error) {
            console.error("Error loading app config:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateMainApp = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setUploadProgress(0);

        try {
            let finalApkUrl = formData.apkUrl;
            let finalApkSize = config?.apkSize;

            if (apkFile) {
                setUploadProgress(10);
                const base64 = await fileToBase64(apkFile);
                setUploadProgress(30);

                const result = await uploadToDrive(apkFile, base64, formData.apkVersion, "PMD User App");

                finalApkUrl = result.url || result.webViewLink;
                finalApkSize = formatFileSize(apkFile.size);
                setUploadProgress(80);
            }

            const configPayload: Partial<AppConfig> = {
                playStoreUrl: formData.playStoreUrl.trim(),
                apkUrl: finalApkUrl || "",
                apkVersion: formData.apkVersion.trim(),
            };

            if (finalApkSize) configPayload.apkSize = finalApkSize;

            await updateAppConfig(configPayload);

            setUploadProgress(100);
            setApkFile(null);
            await loadConfig();
            alert("Main App configuration updated successfully!");
        } catch (error: any) {
            console.error("Error updating config:", error);
            alert(`Failed: ${error.message || "Unknown error"}`);
        } finally {
            setSubmitting(false);
            setUploadProgress(0);
        }
    };

    const handleUpdateNudiApp = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setNudiUploadProgress(0);

        try {
            let finalNudiApkUrl = nudiFormData.nudiApkUrl;
            let finalNudiApkSize = config?.nudiApkSize;

            if (nudiApkFile) {
                setNudiUploadProgress(10);
                const base64 = await fileToBase64(nudiApkFile);
                setNudiUploadProgress(30);

                const result = await uploadToDrive(nudiApkFile, base64, nudiFormData.nudiApkVersion, "Nudi App");

                finalNudiApkUrl = result.url || result.webViewLink;
                finalNudiApkSize = formatFileSize(nudiApkFile.size);
                setNudiUploadProgress(80);
            }

            const configPayload: Partial<AppConfig> = {
                nudiApkUrl: finalNudiApkUrl || "",
                nudiApkVersion: nudiFormData.nudiApkVersion.trim(),
            };

            if (finalNudiApkSize) configPayload.nudiApkSize = finalNudiApkSize;

            await updateAppConfig(configPayload);

            setNudiUploadProgress(100);
            setNudiApkFile(null);
            await loadConfig();
            alert("Nudi App configuration updated successfully!");
        } catch (error: any) {
            console.error("Error updating Nudi config:", error);
            alert(`Failed: ${error.message || "Unknown error"}`);
        } finally {
            setSubmitting(false);
            setNudiUploadProgress(0);
        }
    };

    // Helper functions
    const fileToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const result = reader.result as string;
                const base64 = result.includes(",") ? result.split(",")[1] : result;
                resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    };

    const uploadToDrive = async (file: File, base64: string, version: string, appName: string) => {
        const response = await fetch("/api/documents/upload", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                action: "upload",
                title: version ? `${appName} v${version}` : file.name,
                fileBase64: base64,
                mimeType: "application/vnd.android.package-archive",
                category: "Releases",
                description: `Official ${appName} APK Release v${version}`,
                userEmail: user?.email || "admin@pmd.com",
            }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        if (!result.success) throw new Error(result.error || "Upload failed");
        return result;
    };

    const formatFileSize = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(2)} MB`;


    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="text-lg text-slate-400">Loading...</div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-6xl mx-auto">
            <div className="mb-6">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">App Management</h1>
                <p className="mt-2 text-slate-400">Manage the official Android application links and direct downloads.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                {/* --- MAIN APP SECTION --- */}
                <div className="space-y-6">
                    <div className="rounded-lg bg-dark-card border border-dark-border p-6 shadow-lg">
                        <h2 className="text-xl font-semibold text-slate-100 mb-6 flex items-center gap-2">
                            <Smartphone className="h-5 w-5 text-purple-400" />
                            PMD User App
                        </h2>

                        <form onSubmit={handleUpdateMainApp} className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-2">Play Store URL</label>
                                <div className="relative">
                                    <Smartphone className="absolute left-3 top-2.5 h-5 w-5 text-slate-500" />
                                    <input
                                        type="url"
                                        value={formData.playStoreUrl}
                                        onChange={(e) => setFormData({ ...formData, playStoreUrl: e.target.value })}
                                        className="w-full bg-slate-900/50 border border-slate-700 rounded-lg py-2 pl-10 pr-4 text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-2">Version</label>
                                    <input
                                        type="text"
                                        value={formData.apkVersion}
                                        onChange={(e) => setFormData({ ...formData, apkVersion: e.target.value })}
                                        placeholder="1.33"
                                        className="w-full bg-slate-900/50 border border-slate-700 rounded-lg py-2 px-4 text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-2">APK URL</label>
                                    <input
                                        type="url"
                                        value={formData.apkUrl}
                                        onChange={(e) => setFormData({ ...formData, apkUrl: e.target.value })}
                                        className="w-full bg-slate-900/50 border border-slate-700 rounded-lg py-2 px-4 text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                                    />
                                </div>
                            </div>

                            <div className="pt-4 border-t border-slate-800">
                                <label className="block text-sm font-medium text-slate-400 mb-2">Upload APK</label>
                                <div className="flex items-center gap-4">
                                    <label className="flex-1 cursor-pointer group">
                                        <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-700 rounded-xl p-4 group-hover:border-purple-500/50 transition-colors">
                                            <Upload className="h-6 w-6 text-slate-500 mb-2 group-hover:text-purple-400" />
                                            <span className="text-xs text-slate-500 group-hover:text-slate-300">
                                                {apkFile ? apkFile.name : "Select App APK"}
                                            </span>
                                        </div>
                                        <input type="file" accept=".apk" className="hidden" onChange={(e) => setApkFile(e.target.files?.[0] || null)} />
                                    </label>
                                </div>
                            </div>

                            {uploadProgress > 0 && (
                                <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                                    <div className="h-full bg-purple-500 transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                                </div>
                            )}

                            <button type="submit" disabled={submitting} className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-lg shadow-lg transition-all disabled:opacity-50">
                                <Save className="h-5 w-5" />
                                Save User App
                            </button>
                        </form>
                    </div>
                </div>

                {/* --- NUDI APP SECTION --- */}
                <div className="space-y-6">
                    <div className="rounded-lg bg-dark-card border border-dark-border p-6 shadow-lg">
                        <h2 className="text-xl font-semibold text-slate-100 mb-6 flex items-center gap-2">
                            <Keyboard className="h-5 w-5 text-yellow-400" />
                            Nudi App
                        </h2>

                        <form onSubmit={handleUpdateNudiApp} className="space-y-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-2">Version</label>
                                    <input
                                        type="text"
                                        value={nudiFormData.nudiApkVersion}
                                        onChange={(e) => setNudiFormData({ ...nudiFormData, nudiApkVersion: e.target.value })}
                                        placeholder="1.0"
                                        className="w-full bg-slate-900/50 border border-slate-700 rounded-lg py-2 px-4 text-slate-100 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-2">APK URL</label>
                                    <input
                                        type="url"
                                        value={nudiFormData.nudiApkUrl}
                                        onChange={(e) => setNudiFormData({ ...nudiFormData, nudiApkUrl: e.target.value })}
                                        className="w-full bg-slate-900/50 border border-slate-700 rounded-lg py-2 px-4 text-slate-100 focus:outline-none focus:ring-2 focus:ring-yellow-500 text-sm"
                                    />
                                </div>
                            </div>

                            <div className="pt-4 border-t border-slate-800">
                                <label className="block text-sm font-medium text-slate-400 mb-2">Upload Nudi APK</label>
                                <div className="flex items-center gap-4">
                                    <label className="flex-1 cursor-pointer group">
                                        <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-700 rounded-xl p-4 group-hover:border-yellow-500/50 transition-colors">
                                            <Upload className="h-6 w-6 text-slate-500 mb-2 group-hover:text-yellow-400" />
                                            <span className="text-xs text-slate-500 group-hover:text-slate-300">
                                                {nudiApkFile ? nudiApkFile.name : "Select Nudi APK"}
                                            </span>
                                        </div>
                                        <input type="file" accept=".apk" className="hidden" onChange={(e) => setNudiApkFile(e.target.files?.[0] || null)} />
                                    </label>
                                </div>
                            </div>

                            {nudiUploadProgress > 0 && (
                                <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                                    <div className="h-full bg-yellow-500 transition-all duration-300" style={{ width: `${nudiUploadProgress}%` }} />
                                </div>
                            )}

                            <button type="submit" disabled={submitting} className="w-full flex items-center justify-center gap-2 bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-3 rounded-lg shadow-lg transition-all disabled:opacity-50">
                                <Save className="h-5 w-5" />
                                Save Nudi App
                            </button>
                        </form>
                    </div>
                </div>
            </div>

            {/* Status Footer */}
            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-4 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-sm text-slate-300">
                    <strong className="text-indigo-400 block mb-2">User App Status</strong>
                    Version: {config?.apkVersion || "N/A"} | Size: {config?.apkSize || "N/A"}
                </div>
                <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-sm text-slate-300">
                    <strong className="text-yellow-400 block mb-2">Nudi App Status</strong>
                    Version: {config?.nudiApkVersion || "N/A"} | Size: {config?.nudiApkSize || "N/A"}
                </div>
            </div>

        </div>
    );
}

