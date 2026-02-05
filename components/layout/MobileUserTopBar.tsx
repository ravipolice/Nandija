"use client";

import { RefreshCw, LogOut } from "lucide-react";
import { signOut } from "@/lib/firebase/auth";

export function MobileUserTopBar() {
    const handleSignOut = async () => {
        try {
            await signOut();
            window.location.href = "/login";
        } catch (error) {
            console.error("Error signing out:", error);
        }
    };

    return (
        <div className="md:hidden w-full bg-gradient-to-r from-[#00BCD4] to-[#0097A7] shadow-md flex items-center px-4 pt-safe-top min-h-[calc(3.5rem+env(safe-area-inset-top))] justify-between z-40 relative sticky top-0">
            <div className="flex items-center gap-2 pt-1">
                {/* Title */}
                <h1 className="text-white font-bold text-lg tracking-wide">PMD Directory</h1>
            </div>

            <div className="flex items-center gap-4">
                <button
                    onClick={() => window.location.reload()}
                    className="text-white/90 hover:text-white transition-colors p-1"
                >
                    <RefreshCw className="h-5 w-5" />
                </button>

                <button
                    onClick={handleSignOut}
                    className="text-white/90 hover:text-white transition-colors p-1"
                >
                    <LogOut className="h-5 w-5" />
                </button>
            </div>
        </div>
    );
}
