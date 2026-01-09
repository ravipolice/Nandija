"use client";

import { useAuth } from "@/components/providers/AuthProvider";
import { signOut } from "@/lib/firebase/auth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Logo } from "@/components/common/Logo";

export default function UserLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { user, loading, employeeData } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (typeof window === "undefined") return;

        if (!loading) {
            if (!user) {
                router.push("/login");
            } else if (!employeeData) {
                // User is authenticated in Firebase but not in our database
                // Force logout and redirect to login
                signOut().then(() => router.push("/login"));
            }
        }
    }, [user, loading, employeeData, router]);

    const handleSignOut = async () => {
        try {
            await signOut();
            router.push("/login");
        } catch (error) {
            console.error("Error signing out:", error);
        }
    };

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="text-lg text-gray-600">Loading...</div>
            </div>
        );
    }

    if (!user) return null;

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Simple Header */}
            <header className="bg-white shadow-sm z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        <div className="flex">
                            <div className="flex-shrink-0 flex items-center">
                                <Logo size="sm" />
                                <span className="ml-2 font-bold text-gray-900">PMD Directory</span>
                            </div>
                        </div>
                        <div className="flex items-center space-x-4">
                            <span className="text-sm text-gray-600 hidden sm:block">Welcome, {user.displayName}</span>
                            <button
                                onClick={handleSignOut}
                                className="text-sm text-red-600 hover:text-red-800"
                            >
                                Sign Out
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {children}
            </main>

            <footer className="bg-white border-t border-gray-200 mt-auto">
                <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
                    <p className="text-center text-sm text-gray-500">
                        © {new Date().getFullYear()} Police Mobile Directory
                    </p>
                </div>
            </footer>
        </div>
    );
}
