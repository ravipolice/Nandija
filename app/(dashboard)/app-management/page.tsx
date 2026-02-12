"use client";

import { useEffect, useState } from "react";
import { getAppConfig, updateAppConfig, AppConfig } from "@/lib/firebase/app-config";
import { Download, Save, Smartphone, Upload, ExternalLink } from "lucide-react";

export default function AppManagementPage() {
    const [config, setConfig] = useState<AppConfig | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [apkFile, setApkFile] = useState<File | null>(null);
    const [formData, setFormData] = useState({
        playStoreUrl: "",
        apkUrl: "",
        apkVersion: "",
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
            }
        } catch (error) {
            console.error("Error loading app config:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setUploadProgress(0);

        try {
            let finalApkUrl = formData.apkUrl;
            let finalApkSize = config?.apkSize;

            if (apkFile) {
                setUploadProgress(10);

                // Convert file to Base64 (matching documents/page.tsx logic)
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

                const base64 = await fileToBase64(apkFile);
                setUploadProgress(30);

                // Upload to Google Drive via server-side API
                const response = await fetch("/api/documents/upload", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        action: "upload",
                        title: formData.apkVersion ? `PMD Admin v${formData.apkVersion}` : apkFile.name,
                        fileBase64: base64,
                        mimeType: "application/vnd.android.package-archive",
                        category: "Releases",
                        description: `Official Android APK Release v${formData.apkVersion}`,
                        userEmail: "admin@pmd.com",
                    }),
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
                    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
                }

                const result = await response.json();
                if (!result.success) {
                    throw new Error(result.error || "Upload failed");
                }

                // Apps Script API returns a webViewLink or similar
                finalApkUrl = result.url || result.webViewLink;
                finalApkSize = `${(apkFile.size / 1024 / 1024).toFixed(2)} MB`;
                setUploadProgress(80);
            }

            const configPayload: Partial<AppConfig> = {
                playStoreUrl: formData.playStoreUrl.trim(),
                apkUrl: finalApkUrl || "",
                apkVersion: formData.apkVersion.trim(),
            };

            if (finalApkSize) {
                configPayload.apkSize = finalApkSize;
            }

            // Final sanitization to remove any accidental 'undefined'
            Object.keys(configPayload).forEach(key =>
                (configPayload as any)[key] === undefined && delete (configPayload as any)[key]
            );

            await updateAppConfig(configPayload);

            setUploadProgress(100);
            setApkFile(null);
            await loadConfig();
            alert("App configuration updated (GDrive) successfully!");
        } catch (error: any) {
            console.error("Error updating config:", error);
            alert(`Failed: ${error.message || "Unknown error"}`);
        } finally {
            setSubmitting(false);
            setUploadProgress(0);
        }
    };

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="text-lg text-slate-400">Loading...</div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <div className="mb-6">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">App Management</h1>
                <p className="mt-2 text-slate-400">Manage the official Android application links and direct downloads.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="md:col-span-2 rounded-lg bg-dark-card border border-dark-border p-6 shadow-lg">
                    <h2 className="text-xl font-semibold text-slate-100 mb-6 flex items-center gap-2">
                        <Smartphone className="h-5 w-5 text-purple-400" />
                        Update Application
                    </h2>

                    <form onSubmit={handleUpdate} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-2">
                                Play Store URL
                            </label>
                            <div className="relative">
                                <Smartphone className="absolute left-3 top-2.5 h-5 w-5 text-slate-500" />
                                <input
                                    type="url"
                                    value={formData.playStoreUrl}
                                    onChange={(e) => setFormData({ ...formData, playStoreUrl: e.target.value })}
                                    placeholder="https://play.google.com/store/apps/details?id=..."
                                    className="w-full bg-slate-900/50 border border-slate-700 rounded-lg py-2 pl-10 pr-4 text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-2">
                                    App Version (e.g. 1.33)
                                </label>
                                <input
                                    type="text"
                                    value={formData.apkVersion}
                                    onChange={(e) => setFormData({ ...formData, apkVersion: e.target.value })}
                                    placeholder="1.33"
                                    className="w-full bg-slate-900/50 border border-slate-700 rounded-lg py-2 px-4 text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-2">
                                    Direct APK Download URL
                                </label>
                                <input
                                    type="url"
                                    value={formData.apkUrl}
                                    onChange={(e) => setFormData({ ...formData, apkUrl: e.target.value })}
                                    placeholder="https://storage.googleapis.com/..."
                                    className="w-full bg-slate-900/50 border border-slate-700 rounded-lg py-2 px-4 text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all text-sm"
                                />
                            </div>
                        </div>

                        <div className="pt-4 border-t border-slate-800">
                            <label className="block text-sm font-medium text-slate-400 mb-2">
                                Upload New APK File
                            </label>
                            <div className="flex items-center gap-4">
                                <label className="flex-1 cursor-pointer group">
                                    <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-700 rounded-xl p-6 group-hover:border-purple-500/50 transition-colors">
                                        <Upload className="h-8 w-8 text-slate-500 mb-2 group-hover:text-purple-400 transition-colors" />
                                        <span className="text-sm text-slate-500 group-hover:text-slate-300">
                                            {apkFile ? apkFile.name : "Select signed APK file"}
                                        </span>
                                    </div>
                                    <input
                                        type="file"
                                        accept=".apk"
                                        className="hidden"
                                        onChange={(e) => setApkFile(e.target.files?.[0] || null)}
                                    />
                                </label>
                                {apkFile && (
                                    <button
                                        type="button"
                                        onClick={() => setApkFile(null)}
                                        className="p-2 text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                                    >
                                        Clear
                                    </button>
                                )}
                            </div>
                        </div>

                        {uploadProgress > 0 && (
                            <div className="mt-4">
                                <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-purple-500 transition-all duration-300"
                                        style={{ width: `${uploadProgress}%` }}
                                    />
                                </div>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={submitting}
                            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold py-3 rounded-lg shadow-lg hover:shadow-purple-500/20 transition-all disabled:opacity-50"
                        >
                            <Save className="h-5 w-5" />
                            {submitting ? "Saving Changes..." : "Save Configuration"}
                        </button>
                    </form>
                </div>

                <div className="space-y-6">
                    <div className="rounded-lg bg-dark-card border border-dark-border p-6 shadow-lg">
                        <h3 className="text-lg font-semibold text-slate-100 mb-4">Current Status</h3>
                        <div className="space-y-4">
                            <div>
                                <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Version</p>
                                <p className="text-slate-200">{config?.apkVersion || "None"}</p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">File Size</p>
                                <p className="text-slate-200">{config?.apkSize || "N/A"}</p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Last Updated</p>
                                <p className="text-slate-200 text-sm">
                                    {config?.updatedAt ? new Date(config.updatedAt.toMillis()).toLocaleString() : "Never"}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-lg bg-indigo-500/10 border border-indigo-500/20 p-6 shadow-lg">
                        <h3 className="text-indigo-400 font-bold mb-4 flex items-center gap-2">
                            <Download className="h-5 w-5" />
                            Quick Links
                        </h3>
                        <div className="space-y-3">
                            {config?.playStoreUrl && (
                                <a
                                    href={config.playStoreUrl}
                                    target="_blank"
                                    className="flex items-center justify-between p-2 rounded bg-slate-900 border border-slate-800 hover:border-indigo-400/50 transition-colors group"
                                >
                                    <span className="text-sm text-slate-300">Play Store</span>
                                    <ExternalLink className="h-4 w-4 text-slate-500 group-hover:text-indigo-400" />
                                </a>
                            )}
                            {config?.apkUrl && (
                                <a
                                    href={config.apkUrl}
                                    target="_blank"
                                    className="flex items-center justify-between p-2 rounded bg-slate-900 border border-slate-800 hover:border-green-400/50 transition-colors group"
                                >
                                    <span className="text-sm text-slate-300">Direct Download</span>
                                    <Smartphone className="h-4 w-4 text-slate-500 group-hover:text-green-400" />
                                </a>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
