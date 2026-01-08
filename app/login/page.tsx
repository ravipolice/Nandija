"use client";

import { useState } from "react";
import { signInWithGoogle } from "@/lib/firebase/auth";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/common/Logo";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      await signInWithGoogle();
      router.push("/");
    } catch (err: any) {
      setError(err.message || "Failed to sign in");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4">
      {/* Background Image - Full Screen Fixed */}
      <div
        className="fixed inset-0 z-0 bg-cover bg-center"
        style={{
          backgroundImage: "url('/login_bg.png')",
          filter: "brightness(0.5)" // Dark background for contrast
        }}
      />

      {/* Main Split Card */}
      <div className="relative z-10 w-full max-w-5xl bg-white rounded-2xl shadow-2xl overflow-hidden grid md:grid-cols-2 animate-fade-in-up min-h-[600px]">

        {/* LEFT SIDE: Branding (Dark to support Yellow text) */}
        <div className="relative flex flex-col items-center justify-center p-8 md:p-12 text-center bg-slate-900/90 text-white">
          {/* Logo */}
          <div className="mb-8 h-40 w-40 rounded-full overflow-hidden border-4 border-white/10 shadow-2xl bg-white p-2">
            <img src="/app_logo.png" alt="PMD Logo" className="h-full w-full object-contain" />
          </div>

          {/* Title */}
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-6 drop-shadow-lg" style={{ color: "#F8D722" }}>
            Police Mobile Directory
          </h1>

          <div className="w-16 h-1 bg-white/20 rounded-full mb-8" />

          {/* Disclaimer */}
          <div className="animate-pulse-slow max-w-sm">
            <p className="text-red-400 font-semibold text-lg bg-black/30 backdrop-blur-sm p-4 rounded-xl border border-red-500/20 shadow-inner">
              This app is exclusively for Karnataka State Police Department personnel.
            </p>
            <p className="text-red-400/80 text-sm mt-2">
              If you are not a member of KSP, please uninstall this app.
            </p>
          </div>
        </div>

        {/* RIGHT SIDE: Login Form (Light) */}
        <div className="flex flex-col justify-center p-8 md:p-12 bg-white">
          <div className="max-w-md mx-auto w-full">
            <div className="mb-10">
              <h2 className="text-2xl font-bold text-gray-800">Admin Portal</h2>
              <p className="text-gray-500 mt-2">Sign in to manage the directory</p>
            </div>

            {/* Google Sign In Button */}
            <button
              onClick={handleSignIn}
              disabled={loading}
              className="w-full relative flex items-center justify-center space-x-4 bg-white border border-gray-200 rounded-xl px-8 py-4 shadow-sm hover:shadow-md hover:border-gray-300 hover:bg-gray-50 transition-all duration-200 group disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="h-6 w-6 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  {/* Google Logo SVG */}
                  <svg className="h-6 w-6" viewBox="0 0 24 24">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                  <span className="text-gray-700 font-medium text-lg group-hover:text-gray-900">Sign in with Google</span>
                </>
              )}
            </button>

            {error && (
              <div className="mt-6 bg-red-50 border-l-4 border-red-500 p-4 rounded text-sm text-red-700">
                <p className="font-bold">Error</p>
                <p>{error}</p>
              </div>
            )}

            <div className="mt-8 text-center border-t pt-6">
              <p className="text-gray-500 text-sm mb-2">New Admin?</p>
              <a href="/register" className="inline-flex items-center text-primary-600 hover:text-primary-800 font-semibold transition-colors">
                Register for Access
                <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
              </a>
            </div>

            {/* Footer Info inside the card for cleaner look */}
            <div className="mt-auto pt-10 text-center">
              <p className="text-xs text-gray-400">
                Developed By Ravikumar J, AHC, DAR Chikkaballapura
              </p>
              <p className="text-[10px] text-gray-300 mt-1">© {new Date().getFullYear()} Police Mobile Directory</p>
            </div>

          </div>
        </div>

      </div>

      {/* Custom Keyframes */}
      <style jsx global>{`
        @keyframes pulse-slow {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        .animate-pulse-slow {
          animation: pulse-slow 2s ease-in-out infinite;
        }
        @keyframes fade-in-up {
            0% { opacity: 0; transform: translateY(20px); }
            100% { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up {
            animation: fade-in-up 0.6s ease-out;
        }
      `}</style>
    </div>
  );
}
