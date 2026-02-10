import Link from "next/link";
import { Shield, Smartphone, Globe, Lock, FileText, LayoutDashboard } from "lucide-react";

export default function LandingPage() {
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
                    Centralized access point for the Karnataka State Police directory services, administrative panels, and public resources.
                </p>

                {/* Primary Actions Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-3xl mb-16">

                    {/* User Web App */}
                    <a
                        href="https://pmd-user.vercel.app"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group relative p-8 rounded-2xl bg-gradient-to-b from-slate-800 to-slate-900 border border-slate-700 hover:border-cyan-500/50 transition-all hover:shadow-[0_0_40px_-10px_rgba(6,182,212,0.3)] text-left"
                    >
                        <div className="absolute top-6 right-6 p-2 rounded-lg bg-cyan-500/10 text-cyan-400 group-hover:scale-110 transition-transform">
                            <Globe className="h-6 w-6" />
                        </div>
                        <h3 className="text-2xl font-bold mb-2 text-white">User Web Portal</h3>
                        <p className="text-slate-400 text-sm">Access the directory from any browser. Search officers, stations, and units.</p>
                    </a>

                    {/* Android App */}
                    <a
                        href="https://play.google.com/store/apps/details?id=com.pmd.userapp"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group relative p-8 rounded-2xl bg-gradient-to-b from-slate-800 to-slate-900 border border-slate-700 hover:border-green-500/50 transition-all hover:shadow-[0_0_40px_-10px_rgba(34,197,94,0.3)] text-left"
                    >
                        <div className="absolute top-6 right-6 p-2 rounded-lg bg-green-500/10 text-green-400 group-hover:scale-110 transition-transform">
                            <Smartphone className="h-6 w-6" />
                        </div>
                        <h3 className="text-2xl font-bold mb-2 text-white">Android App</h3>
                        <p className="text-slate-400 text-sm">Download the official mobile app for offline access and enhanced features.</p>
                        <span className="inline-block mt-4 text-xs font-semibold text-green-500 bg-green-500/10 px-2 py-1 rounded">Available on Play Store</span>
                    </a>

                    {/* Admin Panel */}
                    <Link
                        href="/admin"
                        className="md:col-span-2 group relative p-6 rounded-2xl bg-slate-800/50 border border-slate-700/50 hover:bg-slate-800 transition-all flex items-center justify-between"
                    >
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-lg bg-purple-500/10 text-purple-400">
                                <LayoutDashboard className="h-6 w-6" />
                            </div>
                            <div className="text-left">
                                <h3 className="text-lg font-bold text-white">Administrative Panel</h3>
                                <p className="text-slate-400 text-sm">Restricted access for authorized personnel only.</p>
                            </div>
                        </div>
                        <div className="hidden md:block px-4 py-2 rounded-full bg-slate-700 text-sm font-medium group-hover:bg-purple-600 group-hover:text-white transition-colors">
                            Login
                        </div>
                    </Link>

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
