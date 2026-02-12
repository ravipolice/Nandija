"use client";

import { useAuth } from "@/components/providers/AuthProvider";
import { Sidebar } from "@/components/layout/Sidebar";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { MobileTopBar } from "@/components/layout/MobileTopBar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading, isAdmin, employeeData } = useAuth();
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    // Only redirect on client side
    if (typeof window === "undefined") return;

    if (!loading) {
      if (!user) {
        router.push("/login?redirect=/admin");
      } else if (!isAdmin) {
        if (employeeData) {
          router.push("/directory");
        } else {
          router.push("/login?redirect=/admin");
        }
      }
    }
  }, [user, loading, isAdmin, employeeData, router]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-lg text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return null;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop Sidebar (hidden on mobile) */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Top Bar for Mobile */}
        <MobileTopBar />

        {/* Scrollable Content */}
        <main className="flex-1 overflow-y-auto bg-background pb-20 md:pb-0">
          {/* Added pb-20 for bottom nav space on mobile */}
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav onMenuClick={() => setIsMobileMenuOpen(true)} />

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden bg-background/80 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)}>
          <div className="fixed inset-y-0 left-0 w-3/4 bg-card border-r shadow-xl" onClick={e => e.stopPropagation()}>
            <Sidebar />
          </div>
        </div>
      )}
    </div>
  );
}

