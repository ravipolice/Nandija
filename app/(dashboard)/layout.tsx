"use client";

import { useAuth } from "@/components/providers/AuthProvider";
import { Sidebar } from "@/components/layout/Sidebar";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Only redirect on client side
    if (typeof window === "undefined") return;

    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-lg text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gradient-dark relative">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-gradient-dark">
        {children}
        <div className="fixed bottom-2 right-4 text-xs text-slate-500 opacity-50 pointer-events-none">
          v2.2-PagesAPI
        </div>
      </main>
    </div>
  );
}

