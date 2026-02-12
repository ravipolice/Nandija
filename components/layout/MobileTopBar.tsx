"use client";

import { RefreshCw } from "lucide-react";

export function MobileTopBar() {

    return (
        <div className="md:hidden w-full bg-gradient-to-r from-[#00BCD4] to-[#0097A7] shadow-md flex items-center px-4 pt-safe-top min-h-[calc(3.5rem+env(safe-area-inset-top))] justify-between z-40 relative sticky top-0">
            <div className="flex items-center gap-2 pt-1">
                {/* Title */}
                <h1 className="text-white font-bold text-lg tracking-wide">Nandija Admin</h1>
            </div>

            <div className="flex items-center gap-4">
                {/* Refresh Button (Visual only for now, or triggers revalidation) */}
                <button
                    onClick={() => window.location.reload()}
                    className="text-white/90 hover:text-white transition-colors p-1"
                >
                    <RefreshCw className="h-5 w-5" />
                </button>

                {/* Notification Bell (Visual sync with Android, though redundant with bottom bar) */}
                {/* Keeping it simple for now, relying on bottom bar for notifications */}
            </div>
        </div>
    );
}
