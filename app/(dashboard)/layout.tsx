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
  const { user, loading, isAdmin, employeeData } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Only redirect on client side
    if (typeof window === "undefined") return;

    if (!loading) {
      if (!user) {
        router.push("/login");
      } else if (!isAdmin) {
        // If logged in but not admin
        if (employeeData) {
          // Valid employee, send to user portal
          router.push("/directory");
        } else {
          // Unregistered user trying to access dashboard -> kick out
          // (This might happen if they somehow got past login page without being stopped)
          // We can't use signOut here easily without import, but let's just redirect to login 
          // or let UserLayout handle it if they were going to directory?
          // Actually, if we don't push to directory, they stay on dashboard layout?
          // Dashboard layout renders children. If they are here, they are trying to access a dashboard route.
          // If they are not admin, they shouldn't be here.

          // Wait, if they are NOT admin, we redirect them OUT of dashboard.
          // If we just do nothing, they see the dashboard (but maybe empty?).
          // We MUST redirect them.

          // If !employeeData, they are unregistered.
          // If we send them to /login, and they are still "logged in" to Firebase, login page logic runs.

          // Best approach:
          router.push("/login");
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
    <div className="flex h-screen overflow-hidden bg-gradient-dark">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-gradient-dark">
        {children}

      </main>
    </div>
  );
}

