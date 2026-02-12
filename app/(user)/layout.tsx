"use client";

import { useAuth } from "@/components/providers/AuthProvider";
import { signOut } from "@/lib/firebase/auth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { ThemeSwitcher } from "@/components/common/ThemeSwitcher";
import { Logo } from "@/components/common/Logo";
import { MobileUserTopBar } from "@/components/layout/MobileUserTopBar";
import { MobileUserBottomNav } from "@/components/layout/MobileUserBottomNav";

export default function UserLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    // ... hooks ...
    const { user, loading, isAdmin, employeeData } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (typeof window === "undefined") return;

        if (!loading) {
            if (!user) {
                router.push("/login?redirect=/directory");
            } else if (!employeeData && !isAdmin) {
                // User is authenticated in Firebase but not in our database (and not an admin)
                // Force logout and redirect to login
                signOut().then(() => router.push("/login?redirect=/directory"));
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
            <div className="flex h-screen items-center justify-center bg-background">
                <div className="text-lg text-muted-foreground">Loading...</div>
            </div>
        );
    }

    if (!user) return null;

    return (
        <div className="min-h-screen bg-background flex flex-col">
            {/* Desktop Header - Hidden on Mobile */}
            <header className="hidden md:block bg-card shadow-sm z-10 border-b border-border">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        <div className="flex">
                            <div className="flex-shrink-0 flex items-center">
                                <Logo size="sm" />
                                <span className="ml-2 font-bold text-foreground">PMD Directory</span>
                            </div>
                        </div>
                        <div className="flex items-center space-x-4">
                            <ThemeSwitcher />
                            <span className="text-sm text-foreground/80 hidden sm:block">Welcome, {user.displayName}</span>
                            <button
                                onClick={handleSignOut}
                                className="text-sm text-destructive hover:text-destructive/80 font-medium"
                            >
                                Sign Out
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Mobile Top Bar */}
            <MobileUserTopBar />

            <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24 md:pb-8">
                {children}
            </main>

            {/* Mobile Bottom Nav */}
            <MobileUserBottomNav />

            <footer className="hidden md:block bg-card border-t border-border mt-auto">
                <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
                    <p className="text-center text-sm text-muted-foreground">
                        © {new Date().getFullYear()} Police Mobile Directory
                    </p>
                    <div className="flex space-x-6 text-sm font-medium text-muted-foreground">
                        <a href="/contact" className="hover:text-primary transition-colors">
                            Contact Us
                        </a>
                        <a href="/contact" className="hover:text-primary transition-colors">
                            Developer Info
                        </a>
                    </div>
                </div>
            </footer>
        </div>
    );
}
