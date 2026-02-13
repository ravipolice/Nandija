"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Shield, Lock, FileText, Smartphone, Download, Keyboard, Mail, Phone, Globe } from "lucide-react";
import { getAppConfig, AppConfig } from "@/lib/firebase/app-config";
import { getDownloadUrl } from "@/lib/services/documents.service";

export default function LandingPage() {
    const [config, setConfig] = useState<AppConfig | null>(null);
    const [showContact, setShowContact] = useState(false);

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
                <Link href="/admin" className="flex items-center gap-2 font-bold text-xl tracking-tight hover:opacity-80 transition-opacity">
                    <Shield className="h-8 w-8 text-cyan-400" />
                    <span>Nandija</span>
                </Link>
            </nav>

            {/* Hero Section */}
            <main className="container mx-auto px-6 pt-20 pb-32 flex flex-col items-center text-center">

                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-400 text-xs font-bold uppercase tracking-wider mb-8 border border-cyan-500/20">
                    Official Directory Portal
                </div>

                <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8 bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent max-w-4xl">
                    Nandija
                </h1>

                <p className="text-lg md:text-xl text-slate-400 max-w-2xl mb-12 leading-relaxed">
                    Centralized access point for the Nandija Directory services, administrative panel, and resources.
                </p>

                {/* Primary Actions Grid */}
                <div className="w-full max-w-4xl space-y-8 mb-16">

                    {/* PMD Services Section */}
                    <div className="relative border border-slate-700/50 rounded-3xl p-8 bg-slate-800/20 overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent"></div>

                        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2 opacity-90">
                            <Shield className="h-5 w-5 text-cyan-400" />
                            Police Mobile Directory Services
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* User Web App */}
                            <div
                                className="group relative p-6 rounded-2xl bg-gradient-to-b from-slate-800 to-slate-900 border border-slate-700 hover:border-cyan-500/50 transition-all hover:shadow-[0_0_40px_-10px_rgba(6,182,212,0.3)] text-left cursor-pointer"
                                onClick={() => window.open('/directory', '_blank')}
                            >
                                <div
                                    className="absolute top-4 right-4 p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-all border border-white/5 shadow-inner z-10 cursor-zoom-in"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setConfig(prev => prev ? { ...prev, showLogo: true } : { showLogo: true } as any);
                                    }}
                                >
                                    <img src="/logo.png" alt="User Portal" className="h-6 w-6 object-contain" />
                                </div>
                                <h3 className="text-xl font-bold mb-2 text-white">Web Portal</h3>
                                <p className="text-slate-400 text-sm">Access the directory from any browser. Search officers, stations, and units.</p>
                            </div>

                            {/* Android App */}
                            <div className="group relative p-6 rounded-2xl bg-gradient-to-b from-slate-800 to-slate-900 border border-slate-700 hover:border-green-500/50 transition-all hover:shadow-[0_0_40px_-10px_rgba(34,197,94,0.3)] text-left flex flex-col justify-between min-h-[280px]">
                                <div>
                                    <div
                                        className="absolute top-4 right-4 p-2 rounded-xl bg-white/5 group-hover:scale-110 transition-transform border border-white/5 shadow-inner cursor-zoom-in"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            setConfig(prev => prev ? { ...prev, showLogo: true } : { showLogo: true } as any);
                                        }}
                                    >
                                        <img src="/logo.png" alt="Android App" className="h-8 w-8 object-contain shadow-2xl" />
                                    </div>
                                    <h3 className="text-xl font-bold mb-2 text-white flex items-center gap-2">
                                        <Smartphone className="h-5 w-5 text-green-400" />
                                        Android App
                                    </h3>
                                    <p className="text-slate-400 text-sm mb-6 max-w-[80%]">
                                        Official mobile app for offline access and instant notifications.
                                    </p>
                                </div>

                                <div className="space-y-3">
                                    {config?.apkUrl ? (
                                        <a
                                            href={getDownloadUrl(config.apkUrl)}
                                            className="w-full flex items-center justify-center gap-3 px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 text-white hover:from-blue-500 hover:to-cyan-500 transition-all text-sm font-bold shadow-lg shadow-blue-500/20 active:scale-[0.98]"
                                        >
                                            <Download className="h-4 w-4" />
                                            Download APK {config.apkVersion ? `v${config.apkVersion}` : ""}
                                            {config.apkSize && <span className="text-[10px] opacity-70 ml-1">({config.apkSize})</span>}
                                        </a>
                                    ) : (
                                        <div className="w-full flex items-center justify-center gap-3 px-6 py-3 rounded-xl bg-slate-800 border border-slate-700/50 text-slate-500 text-sm font-bold opacity-75">
                                            <Download className="h-4 w-4" />
                                            APK Coming Soon
                                        </div>
                                    )}

                                    <a
                                        href={playStoreUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 transition-all text-xs font-bold"
                                    >
                                        <img src="https://www.gstatic.com/android/market_images/web/play_logo.png" className="h-4 w-4 grayscale saturate-0 brightness-200 group-hover:grayscale-0 transition-all" alt="Play Store" />
                                        View on Play Store
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Nudi Converter App */}
                    <div className="group relative p-6 rounded-3xl bg-slate-800/50 border border-slate-700/50 hover:bg-slate-800 transition-all flex flex-col md:flex-row items-center justify-between hover:border-yellow-500/50 hover:shadow-[0_0_40px_-10px_rgba(234,179,8,0.3)]">
                        <div className="flex items-center gap-4 mb-4 md:mb-0">
                            <div className="p-3 rounded-xl bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
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

                {/* Contact & Developer Information */}
                {showContact && (
                    <div id="contact-section" className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-6 mb-16 text-left animate-in slide-in-from-bottom-4 duration-500 fade-in">

                        {/* Contact Us */}
                        <div className="p-6 rounded-2xl bg-slate-800/50 border border-yellow-500/30 hover:border-yellow-500/50 transition-all shadow-[0_0_20px_-10px_rgba(234,179,8,0.1)]">
                            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                                <Phone className="h-5 w-5 text-yellow-400" />
                                Contact Us
                            </h3>
                            <p className="text-slate-400 text-sm mb-6 leading-relaxed">
                                For any support, feedback, or inquiries regarding the Police Mobile Directory application, please feel free to reach out to us.
                            </p>
                            <div className="space-y-3">
                                <a href="mailto:noreply.pmdapp@gmail.com" className="flex items-center gap-3 text-sm font-medium text-slate-300 hover:text-yellow-400 transition-colors group">
                                    <div className="p-2 rounded-lg bg-slate-700/50 group-hover:bg-yellow-500/10 transition-colors">
                                        <Mail className="h-4 w-4 text-slate-400 group-hover:text-yellow-400" />
                                    </div>
                                    noreply.pmdapp@gmail.com
                                </a>
                                <a href="tel:+919844610264" className="flex items-center gap-3 text-sm font-medium text-slate-300 hover:text-yellow-400 transition-colors group">
                                    <div className="p-2 rounded-lg bg-slate-700/50 group-hover:bg-yellow-500/10 transition-colors">
                                        <Phone className="h-4 w-4 text-slate-400 group-hover:text-yellow-400" />
                                    </div>
                                    +91 98446 10264
                                </a>
                            </div>
                        </div>

                        {/* Developer Information */}
                        <div className="p-6 rounded-2xl bg-slate-800/50 border border-yellow-500/30 hover:border-yellow-500/50 transition-all shadow-[0_0_20px_-10px_rgba(234,179,8,0.1)] flex flex-col justify-between">
                            <div>
                                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                                    <span className="text-yellow-400 font-mono">&lt;/&gt;</span>
                                    Developer Information
                                </h3>
                                <p className="text-slate-400 text-sm mb-6 leading-relaxed">
                                    This application was designed and developed with a focus on usability, performance, and modern web standards.
                                </p>

                                <div className="space-y-2 mb-6">
                                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Technical Stack</h4>
                                    <ul className="text-sm text-slate-300 space-y-1">
                                        <li className="flex items-center gap-2">
                                            <span className="w-1 h-1 rounded-full bg-cyan-400"></span>
                                            Frontend: Next.js (React)
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <span className="w-1 h-1 rounded-full bg-cyan-400"></span>
                                            Styling: Tailwind CSS
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <span className="w-1 h-1 rounded-full bg-cyan-400"></span>
                                            Backend: Firebase (Firestore, Auth)
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <span className="w-1 h-1 rounded-full bg-cyan-400"></span>
                                            Deployment: Vercel
                                        </li>
                                    </ul>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-slate-700/50">
                                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Developed By</h4>
                                <p className="text-white font-bold text-base">Ravikumar J, Nandija Tech Group</p>

                                <div className="flex gap-3 mt-3">
                                    <a href="https://nandija.com" target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg bg-slate-700/50 hover:bg-cyan-500/20 hover:text-cyan-400 text-slate-400 transition-all">
                                        <Globe className="h-4 w-4" />
                                    </a>
                                    <a href="mailto:ravikumar@nandija.com" className="p-2 rounded-lg bg-slate-700/50 hover:bg-cyan-500/20 hover:text-cyan-400 text-slate-400 transition-all">
                                        <Mail className="h-4 w-4" />
                                    </a>
                                </div>
                            </div>
                        </div>

                    </div>
                )}

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
                    <button
                        onClick={() => {
                            setShowContact(!showContact);
                            if (!showContact) {
                                setTimeout(() => {
                                    document.getElementById('contact-section')?.scrollIntoView({ behavior: 'smooth' });
                                }, 100);
                            }
                        }}
                        className="flex items-center gap-2 hover:text-cyan-400 transition-colors bg-transparent border-none cursor-pointer"
                    >
                        <Mail className="h-4 w-4" />
                        Contact Support
                    </button>
                </div>

                <div className="mt-16 pt-8 border-t border-slate-800 w-full max-w-4xl text-slate-600 text-sm">
                    &copy; {new Date().getFullYear()} Ravikumar J, Nandija Tech Group. All rights reserved. developed for KSP.
                </div>
            </main>

            {/* Logo Lightbox Modal */}
            {config?.showLogo && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-sm p-4 animate-fade-in"
                    onClick={() => setConfig(prev => prev ? { ...prev, showLogo: false } : null)}
                >
                    <div className="relative max-w-4xl max-h-[90vh] w-full flex items-center justify-center">
                        <button
                            className="absolute -top-12 right-0 text-white/70 hover:text-white transition-colors"
                            onClick={() => setConfig(prev => prev ? { ...prev, showLogo: false } : null)}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </button>
                        <img
                            src="/logo.png"
                            alt="Full Logo"
                            className="max-w-full max-h-[85vh] object-contain drop-shadow-2xl"
                            onClick={(e) => e.stopPropagation()}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
