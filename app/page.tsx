"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Shield, Lock, FileText, LayoutDashboard, Smartphone, Download, Keyboard } from "lucide-react";
import { getAppConfig, AppConfig } from "@/lib/firebase/app-config";
import { getDownloadUrl } from "@/lib/services/documents.service";

export default function LandingPage() {
    const [config, setConfig] = useState<AppConfig | null>(null);

    useEffect(() => {
        const loadConfig = async () => {
            try {
                const data = await getAppConfig();
                if (data) setConfig(data);
            } catch (error) {
                console.error("Error loading config:", error);
            }
        };
        loadConfig();
    }, []);

    const playStoreUrl = config?.playStoreUrl || "https://play.google.com/store/apps/details?id=com.pmd.userapp";

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white font-sans selection:bg-cyan-500 selection:text-white">

            {/* Navbar / Header */}
            <nav className="container mx-auto px-6 py-6 flex justify-between items-center">
                <div className="flex items-center gap-2 font-bold text-xl tracking-tight">
                    <Shield className="h-8 w-8 text-cyan-400" />
                    <span>Nandija</span>
                </div>
                <Link
                    href="/admin"
                    className="hidden md:flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 transition-all text-sm font-medium border border-white/5"
                >
                    <LayoutDashboard className="h-4 w-4" />
                    Admin Login
                </Link>
            </nav>

            {/* Hero Section */}
            <main className="container mx-auto px-6 pt-20 pb-32 flex flex-col items-center text-center">

                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-400 text-xs font-bold uppercase tracking-wider mb-8 border border-cyan-500/20">
                    Official Directory Portal
                </div>

                <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8 bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent max-w-4xl">
                    Police Mobile Directory
                </h1>

                <p className="text-lg md:text-xl text-slate-400 max-w-2xl mb-12 leading-relaxed">
                    Centralized access point for the Nandija Directory services, administrative panel, and resources.
                </p>

                {/* Primary Actions Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-3xl mb-16">

                    {/* User Web App */}
                    <a
                        href="/directory"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group relative p-8 rounded-2xl bg-gradient-to-b from-slate-800 to-slate-900 border border-slate-700 hover:border-cyan-500/50 transition-all hover:shadow-[0_0_40px_-10px_rgba(6,182,212,0.3)] text-left"
                    >
                        <div className="absolute top-6 right-6 p-1.5 rounded-lg bg-white/10 group-hover:scale-110 transition-transform border border-white/5 shadow-inner">
                            <img src="/logo.png" alt="User Portal" className="h-8 w-8 object-contain" />
                        </div>
                        <h3 className="text-2xl font-bold mb-2 text-white">PMD User App</h3>
                        <p className="text-slate-400 text-sm">Access the directory from any browser. Search officers, stations, and units.</p>
                    </a>

                    {/* Android App */}
                    <div className="group relative p-8 rounded-2xl bg-gradient-to-b from-slate-800 to-slate-900 border border-slate-700 hover:border-green-500/50 transition-all hover:shadow-[0_0_40px_-10px_rgba(34,197,94,0.3)] text-left flex flex-col justify-between min-h-[320px]">
                        <div>
                            <div className="absolute top-6 right-6 p-2 rounded-xl bg-white/5 group-hover:scale-110 transition-transform border border-white/5 shadow-inner">
                                <img src="/logo.png" alt="Android App" className="h-10 w-10 object-contain shadow-2xl" />
                            </div>
                            <h3 className="text-2xl font-bold mb-2 text-white flex items-center gap-2">
                                <Smartphone className="h-6 w-6 text-green-400" />
                                PMD Android App
                            </h3>
                            <p className="text-slate-400 text-sm mb-6 max-w-[80%]">
                                Official mobile app for offline access, instant notifications, and enhanced search features.
                            </p>
                        </div>

                        <div className="space-y-3">
                            {config?.apkUrl ? (
                                <a
                                    href={getDownloadUrl(config.apkUrl)}
                                    className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 text-white hover:from-blue-500 hover:to-cyan-500 transition-all text-sm font-bold shadow-lg shadow-blue-500/20 active:scale-[0.98]"
                                >
                                    <Download className="h-5 w-5" />
                                    Download APK {config.apkVersion ? `v${config.apkVersion}` : ""}
                                    {config.apkSize && <span className="text-[10px] opacity-70 ml-1">({config.apkSize})</span>}
                                </a>
                            ) : (
                                <div className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-xl bg-slate-800 border border-slate-700/50 text-slate-500 text-sm font-bold opacity-75">
                                    <Download className="h-5 w-5" />
                                    APK Coming Soon
                                </div>
                            )}

                            <a
                                href={playStoreUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 transition-all text-xs font-bold"
                            >
                                <img src="https://www.gstatic.com/android/market_images/web/play_logo.png" className="h-4 w-4 grayscale saturate-0 brightness-200 group-hover:grayscale-0 transition-all" alt="Play Store" />
                                View on Play Store
                            </a>
                        </div>
                    </div>

                    {/* Nudi Converter App */}
                    <div className="md:col-span-2 group relative p-6 rounded-2xl bg-slate-800/50 border border-slate-700/50 hover:bg-slate-800 transition-all flex flex-col md:flex-row items-center justify-between hover:border-yellow-500/50 hover:shadow-[0_0_40px_-10px_rgba(234,179,8,0.3)]">
                        <div className="flex items-center gap-4 mb-4 md:mb-0">
                            <div className="p-3 rounded-lg bg-yellow-500/10 text-yellow-400">
                                <Keyboard className="h-6 w-6" />
                            </div>
                            <div className="text-left">
                                <h3 className="text-lg font-bold text-white">Nudi Android App</h3>
                                <p className="text-slate-400 text-sm">Ascii to Unicode And Unicode to AScii converter</p>
                            </div>
                        </div>

                        <div className="flex gap-2 w-full md:w-auto">
                            {config?.nudiApkUrl ? (
                                <a
                                    href={getDownloadUrl(config.nudiApkUrl)}
                                    className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-yellow-600 hover:bg-yellow-500 text-white transition-all text-sm font-bold shadow-lg shadow-yellow-500/20"
                                >
                                    <Download className="h-4 w-4" />
                                    Download APK {config.nudiApkVersion ? `v${config.nudiApkVersion}` : ""}
                                </a>
                            ) : (
                                <div className="px-4 py-2 rounded-xl bg-slate-700 text-slate-400 text-xs font-bold">
                                    APK Coming Soon
                                </div>
                            )}
                        </div>
                    </div>


                </div>

                {/* Footer Links */}
                <div className="flex flex-wrap justify-center gap-8 text-sm font-medium text-slate-500">
                    <Link href="/privacy" className="flex items-center gap-2 hover:text-cyan-400 transition-colors">
                        <Lock className="h-4 w-4" />
                        Privacy Policy
                    </Link>
                    <Link href="/terms" className="flex items-center gap-2 hover:text-cyan-400 transition-colors">
                        <FileText className="h-4 w-4" />
                        Terms & Conditions
                    </Link>
                    <a href="mailto:ravipolice@gmail.com" className="hover:text-cyan-400 transition-colors">
                        Contact Support
                    </a>
                </div>

                <div className="mt-16 pt-8 border-t border-slate-800 w-full max-w-4xl text-slate-600 text-sm">
                    &copy; {new Date().getFullYear()} Ravikumar J. All rights reserved. developed for KSP.
                </div>

            </main>
        </div>
    );
}
