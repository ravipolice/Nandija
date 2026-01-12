"use client";

import { useState, useEffect } from "react";
import { signInWithGoogle } from "@/lib/firebase/auth";
import { useRouter } from "next/navigation";
import { loginWithPin, requestOtp, verifyOtpCode, resetPin } from "@/lib/auth-helpers";
import { collection, query, where, getDocs, limit } from "firebase/firestore";
import { db } from "@/lib/firebase/config";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPinLogin, setShowPinLogin] = useState(false);
  const [showUnregisteredPopup, setShowUnregisteredPopup] = useState(false);
  const [unregisteredEmail, setUnregisteredEmail] = useState("");

  // Forgot PIN State
  const [showForgotPin, setShowForgotPin] = useState(false);
  const [forgotStep, setForgotStep] = useState(1); // 1: Email, 2: OTP, 3: New PIN
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotOtp, setForgotOtp] = useState("");
  const [forgotNewPin, setForgotNewPin] = useState("");
  const [forgotConfirmPin, setForgotConfirmPin] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState("");
  const [forgotSuccess, setForgotSuccess] = useState("");

  // Extra UI State for Parity
  const [timeLeft, setTimeLeft] = useState(0); // Countdown in seconds
  const [showNewPin, setShowNewPin] = useState(false);
  const [showConfirmPin, setShowConfirmPin] = useState(false);

  // Timer Logic
  useEffect(() => {
    if (timeLeft > 0) {
      const timerId = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timerId);
    }
  }, [timeLeft]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // PIN Login State
  const [email, setEmail] = useState("");
  const [pin, setPin] = useState("");

  const router = useRouter();

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      const user = await signInWithGoogle();
      if (!user) throw new Error("Google Sign-In failed");

      // Check if employee exists
      if (!db) {
        throw new Error("Firestore is not initialized");
      }
      const employeesRef = collection(db, "employees");
      const q = query(employeesRef, where("email", "==", user.email), limit(1));
      const querySnapshot = await getDocs(q);

      let isFound = !querySnapshot.empty;

      if (!isFound) {
        // Check admins collection as fallback
        const adminsRef = collection(db, "admins");
        const qAdmin = query(adminsRef, where("email", "==", user.email), limit(1));
        const adminSnapshot = await getDocs(qAdmin);
        if (!adminSnapshot.empty) {
          const adminData = adminSnapshot.docs[0].data();
          if (adminData.isActive) {
            isFound = true;
          }
        }
      }

      if (!isFound) {
        // New user -> Show popup
        setUnregisteredEmail(user.email || "");
        setShowUnregisteredPopup(true);
      } else {
        // Existing user -> Dashboard
        router.push("/");
      }
    } catch (err: any) {
      console.error("Google Sign In Error:", err);
      setError(err.message || "Failed to sign in with Google");
    } finally {
      setLoading(false);
    }
  };

  const handlePinLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !pin) {
      setError("Please enter both email and PIN");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await loginWithPin(email, pin);
      if (result.success) {
        router.push("/");
      } else {
        setError(result.error || "Login failed");
      }
    } catch (err: any) {
      console.error("PIN Login Error:", err);
      setError(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  // Forgot PIN Handlers
  const handleRequestOtp = async () => {
    if (!forgotEmail) {
      setForgotError("Please enter your email");
      return;
    }
    setForgotLoading(true);
    setForgotError("");
    const res = await requestOtp(forgotEmail);
    setForgotLoading(false);
    if (res.success) {
      setForgotStep(2);
      setForgotSuccess("OTP sent successfully onto " + forgotEmail);
      setTimeLeft(300); // 5 minutes
      setTimeout(() => setForgotSuccess(""), 3000);
    } else {
      setForgotError(res.message || "Failed to send OTP");
    }
  };

  const handleVerifyOtp = async () => {
    if (!forgotOtp) {
      setForgotError("Please enter OTP");
      return;
    }
    setForgotLoading(true);
    setForgotError("");
    const res = await verifyOtpCode(forgotEmail, forgotOtp);
    setForgotLoading(false);
    if (res.success) {
      setForgotStep(3);
      setForgotSuccess("OTP Verified!");
      setTimeout(() => setForgotSuccess(""), 3000);
    } else {
      setForgotError(res.message || "Invalid OTP");
    }
  };

  const handleResetPin = async () => {
    if (!forgotNewPin || !forgotConfirmPin) {
      setForgotError("Please enter and confirm PIN");
      return;
    }
    if (forgotNewPin !== forgotConfirmPin) {
      setForgotError("PINs do not match");
      return;
    }
    if (forgotNewPin.length < 6) {
      setForgotError("PIN must be 6 digits");
      return;
    }

    setForgotLoading(true);
    setForgotError("");
    const res = await resetPin(forgotEmail, forgotNewPin);
    setForgotLoading(false);
    if (res.success) {
      setForgotSuccess("PIN reset successfully! Please login.");
      setTimeout(() => {
        closeForgotPin();
      }, 2000);
    } else {
      setForgotError(res.message || "Failed to reset PIN");
    }
  };

  const closeForgotPin = () => {
    setShowForgotPin(false);
    setForgotStep(1);
    setForgotEmail("");
    setForgotOtp("");
    setForgotNewPin("");
    setForgotConfirmPin("");
    setForgotError("");
    setForgotSuccess("");
    setTimeLeft(0);
    setShowNewPin(false);
    setShowConfirmPin(false);
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
              If you are not a member of KSP, please don't proceed.
            </p>
          </div>
        </div>

        {/* RIGHT SIDE: Login Form (Light) */}
        <div className="flex flex-col justify-center p-8 md:p-12 bg-white">
          <div className="max-w-md mx-auto w-full">
            <div className="mb-10">
              <h2 className="text-2xl font-bold text-gray-800">User Portal</h2>
              <p className="text-gray-500 mt-2">Sign in to access the directory</p>
            </div>

            {error && (
              <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded text-sm text-red-700">
                <p className="font-bold">Error</p>
                <p>{error}</p>
              </div>
            )}

            {/* Login Options */}
            {!showPinLogin ? (
              <>
                {/* Google Sign In Button */}
                <button
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                  className="w-full relative flex items-center justify-center space-x-4 bg-white border border-gray-200 rounded-xl px-8 py-4 shadow-sm hover:shadow-md hover:border-gray-300 hover:bg-gray-50 transition-all duration-200 group disabled:opacity-70 disabled:cursor-not-allowed mb-4"
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

                <div className="relative mb-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white text-gray-500">Or continue with</span>
                  </div>
                </div>

                <button
                  onClick={() => setShowPinLogin(true)}
                  className="w-full text-center px-4 py-3 border border-transparent rounded-lg shadow-sm text-sm font-medium text-primary-700 bg-primary-50 hover:bg-primary-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  Login with Email & PIN
                </button>
              </>
            ) : (
              <form onSubmit={handlePinLogin} className="space-y-4 animate-fade-in-up">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email Address</label>
                  <input
                    type="email"
                    id="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-primary-500 sm:text-sm text-gray-900"
                    placeholder="user@gmail.com"
                  />
                </div>
                <div>
                  <label htmlFor="pin" className="block text-sm font-medium text-gray-700">PIN (6 digits)</label>
                  <input
                    type="password"
                    id="pin"
                    required
                    maxLength={6}
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-primary-500 sm:text-sm text-gray-900"
                    placeholder="******"
                  />
                  <div className="flex justify-end mt-1">
                    <button
                      type="button"
                      onClick={() => setShowForgotPin(true)}
                      className="text-xs text-primary-600 hover:text-primary-800 font-medium"
                    >
                      Forgot PIN?
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
                >
                  {loading ? "Verifying..." : "Login"}
                </button>

                <button
                  type="button"
                  onClick={() => setShowPinLogin(false)}
                  className="w-full text-center text-sm text-gray-600 hover:text-gray-900 mt-2"
                >
                  Back to Google Login
                </button>
              </form>
            )}

            <div className="mt-8 text-center border-t pt-6">
              <p className="text-gray-500 text-sm mb-2">New User?</p>
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

      {/* Account Not Registered Popup */}
      {showUnregisteredPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in-up">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-red-400 via-orange-400 to-red-500"></div>

            <h3 className="text-2xl font-serif text-gray-900 mb-4 tracking-wide">Account Not Registered</h3>

            <p className="text-gray-600 mb-6 text-sm leading-relaxed">
              The Google account below isn&apos;t registered. You can register it now or choose another account.
            </p>

            <div className="bg-gray-100 rounded-lg py-3 px-4 mb-8 text-gray-900 font-medium break-all border border-gray-200">
              {unregisteredEmail}
            </div>

            <div className="flex justify-between items-center gap-4">
              <button
                onClick={() => setShowUnregisteredPopup(false)}
                className="text-primary-600 hover:text-primary-700 text-sm font-medium transition-colors"
              >
                Use another account
              </button>

              <button
                onClick={() => router.push(`/register?email=${encodeURIComponent(unregisteredEmail)}`)}
                className="text-primary-600 hover:text-primary-700 text-sm font-bold text-lg transition-colors"
                style={{ color: '#00abc9' }}
              >
                Register
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Forgot PIN Modal */}
      {showForgotPin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in-up">
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl relative">
            <button
              onClick={closeForgotPin}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>

            <h3 className="text-xl font-bold text-gray-900 mb-6">
              {forgotStep === 1 ? "Reset PIN" : forgotStep === 2 ? "Enter OTP" : "Set New PIN"}
            </h3>

            {forgotError && (
              <div className="mb-4 bg-red-50 text-red-600 text-sm p-3 rounded">
                {forgotError}
              </div>
            )}

            {forgotSuccess && (
              <div className="mb-4 bg-green-50 text-green-600 text-sm p-3 rounded">
                {forgotSuccess}
              </div>
            )}

            <div className="space-y-4">
              {forgotStep === 1 && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                    <input
                      type="email"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:ring-primary-500 focus:border-primary-500"
                      placeholder="Enter your registered email"
                    />
                  </div>
                  <button
                    onClick={handleRequestOtp}
                    disabled={forgotLoading}
                    className="w-full py-2 px-4 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
                  >
                    {forgotLoading ? "Sending..." : "Send OTP"}
                  </button>
                </>
              )}

              {forgotStep === 2 && (
                <>
                  <p className="text-sm text-gray-500 mb-2">OTP sent to {forgotEmail}</p>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">OTP Code</label>
                    <input
                      type="text"
                      value={forgotOtp}
                      onChange={(e) => setForgotOtp(e.target.value)}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:ring-primary-500 focus:border-primary-500 tracking-widest text-center text-lg"
                      placeholder="XXXXXX"
                    />
                  </div>

                  {timeLeft > 0 ? (
                    <p className="text-sm text-primary-600 text-center">OTP expires in {formatTime(timeLeft)}</p>
                  ) : (
                    <p className="text-sm text-red-500 text-center">OTP expired. Please request a new one.</p>
                  )}

                  <button
                    onClick={handleVerifyOtp}
                    disabled={forgotLoading || timeLeft === 0}
                    className="w-full py-2 px-4 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
                  >
                    {forgotLoading ? "Verifying..." : "Verify OTP"}
                  </button>
                </>
              )}

              {forgotStep === 3 && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">New PIN (6 digits)</label>
                    <div className="relative">
                      <input
                        type={showNewPin ? "text" : "password"}
                        value={forgotNewPin}
                        onChange={(e) => setForgotNewPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:ring-primary-500 focus:border-primary-500 pr-10"
                        placeholder="Create new PIN"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPin(!showNewPin)}
                        className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-400 hover:text-gray-600"
                      >
                        {showNewPin ? (
                          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                          </svg>
                        ) : (
                          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Confirm PIN</label>
                    <div className="relative">
                      <input
                        type={showConfirmPin ? "text" : "password"}
                        value={forgotConfirmPin}
                        onChange={(e) => setForgotConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:ring-primary-500 focus:border-primary-500 pr-10"
                        placeholder="Confirm new PIN"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPin(!showConfirmPin)}
                        className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-400 hover:text-gray-600"
                      >
                        {showConfirmPin ? (
                          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                          </svg>
                        ) : (
                          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                  <button
                    onClick={handleResetPin}
                    disabled={forgotLoading}
                    className="w-full py-2 px-4 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
                  >
                    {forgotLoading ? "Resetting..." : "Reset PIN"}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

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
