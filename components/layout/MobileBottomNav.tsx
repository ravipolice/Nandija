"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, UserCheck, Bell, Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { getPendingRegistrations } from "@/lib/firebase/firestore";

const bottomNavItems = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Employees", href: "/employees", icon: Users },
    { name: "Approvals", href: "/approvals", icon: UserCheck },
    { name: "Notify", href: "/notifications", icon: Bell },
    // Menu item handling will be added later or can toggle sidebar
];

export function MobileBottomNav({ onMenuClick }: { onMenuClick: () => void }) {
    const pathname = usePathname();
    const [pendingCount, setPendingCount] = useState<number>(0);

    useEffect(() => {
        const fetchPendingCount = async () => {
            try {
                const registrations = await getPendingRegistrations();
                const unviewedCount = registrations.filter(r => !r.viewedByAdmin).length;
                setPendingCount(unviewedCount);
            } catch (error) {
                setPendingCount(0);
            }
        };

        fetchPendingCount();
    }, []);

    return (
        <div className="fixed bottom-0 left-0 z-50 w-full md:hidden bg-transparent pointer-events-none">
            {/* Floating container styling to match Android rounded-top, shadow */}
            <div className="pointer-events-auto bg-[#F5F5F5] border-t border-[#E0E0E0] shadow-[0_-4px_8px_rgba(0,0,0,0.1)] rounded-t-[20px] pb-safe-bottom">
                <div className="flex justify-around items-center h-20 px-2 pb-2">
                    {bottomNavItems.map((item) => {
                        const isActive = pathname === item.href;
                        const showBadge = item.name === "Approvals" && pendingCount > 0;

                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                className={cn(
                                    "flex flex-col items-center justify-center w-full h-full space-y-1 relative",
                                    isActive ? "text-[#00BCD4]" : "text-[#757575] hover:text-[#212121]"
                                )}
                            >
                                {/* Icon container with potential glow/shadow for active state */}
                                <div className={cn(
                                    "p-1 rounded-full transition-all duration-300",
                                    isActive && "scale-110 drop-shadow-[0_4px_4px_rgba(0,188,212,0.2)]"
                                )}>
                                    <item.icon className={cn("h-6 w-6", isActive ? "stroke-[2.5px] fill-[#00BCD4]/10" : "stroke-2")} />
                                </div>

                                <span className="text-[10px] font-medium tracking-tight">
                                    {item.name}
                                </span>

                                {showBadge && (
                                    <span className="absolute top-2 right-4 flex h-2.5 w-2.5">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-secondary"></span>
                                    </span>
                                )}
                            </Link>
                        );
                    })}

                    {/* Menu Button */}
                    <button
                        onClick={onMenuClick}
                        className="flex flex-col items-center justify-center w-full h-full space-y-1 text-muted-foreground hover:text-foreground"
                    >
                        <div className="p-1">
                            <Menu className="h-6 w-6 stroke-2" />
                        </div>
                        <span className="text-[10px] font-medium tracking-tight">Menu</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
