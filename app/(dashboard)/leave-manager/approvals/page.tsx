"use client";

import { useEffect, useState } from "react";
import {
    getPendingLeaveManagerUsers,
    updateLeaveManagerUserStatus,
    LeaveManagerUser
} from "@/lib/firebase/leave-manager";
import { Loader2, UserCheck, Check, X, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

export default function ApprovalsPage() {
    const [users, setUsers] = useState<LeaveManagerUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState<string | null>(null);

    const fetchUsers = async () => {
        try {
            const data = await getPendingLeaveManagerUsers();
            setUsers(data);
        } catch (error) {
            console.error("Error fetching users:", error);
            toast.error("Failed to load pending users");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleAction = async (kgid: string, status: "approved" | "rejected") => {
        setProcessingId(kgid);
        try {
            await updateLeaveManagerUserStatus(kgid, status);
            setUsers(users.filter(u => u.kgid !== kgid));
            toast.success(`User ${status === "approved" ? "approved" : "rejected"} successfully`);
        } catch (error) {
            toast.error("Action failed");
        } finally {
            setProcessingId(null);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[500px]">
                <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
            </div>
        );
    }

    return (
        <div className="p-6 space-y-8 animate-in fade-in duration-500 max-w-6xl mx-auto">
            <div className="space-y-1">
                <h1 className="text-3xl font-extrabold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent flex items-center gap-3">
                    <UserCheck className="w-8 h-8 text-purple-400" />
                    Leave Manager Approvals
                </h1>
                <p className="text-slate-400 text-sm">Review and approve new registrations for the Leave Manager App.</p>
            </div>

            {users.length === 0 ? (
                <div className="bg-dark-card border border-dark-border rounded-2xl p-20 text-center space-y-4">
                    <div className="w-16 h-16 bg-slate-800/50 rounded-full flex items-center justify-center mx-auto">
                        <UserCheck className="w-8 h-8 text-slate-600" />
                    </div>
                    <div className="space-y-1">
                        <h3 className="text-lg font-medium text-slate-300">All caught up!</h3>
                        <p className="text-slate-500 max-w-xs mx-auto">There are no pending registrations for the Leave Manager at the moment.</p>
                    </div>
                </div>
            ) : (
                <div className="grid gap-6 md:grid-cols-2">
                    {users.map((user) => (
                        <div key={user.kgid} className="bg-dark-card border border-dark-border rounded-xl shadow-lg overflow-hidden flex flex-col hover:border-purple-500/30 transition-all group">
                            <div className="p-6 flex-1 space-y-4">
                                <div className="flex justify-between items-start">
                                    <div className="space-y-0.5">
                                        <h3 className="text-xl font-bold text-slate-100">{user.name}</h3>
                                        <p className="text-xs font-mono text-purple-400">KGID: {user.kgid}</p>
                                    </div>
                                    <div className="bg-purple-900/20 text-purple-300 px-3 py-1 rounded-full text-xs border border-purple-500/20 font-medium">
                                        {user.department}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div className="space-y-1">
                                        <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">Email</span>
                                        <p className="text-slate-300 truncate font-medium">{user.email}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">Phone</span>
                                        <p className="text-slate-300 font-medium">{user.phone}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">District</span>
                                        <p className="text-slate-300 font-medium">{user.district}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">Working at</span>
                                        <p className="text-slate-300 font-medium">{user.placeOfWorking}</p>
                                    </div>
                                </div>

                                <div className="pt-2 text-[10px] text-slate-600 flex flex-col gap-1">
                                    <span>Registered on: {new Date(user.createdAt).toLocaleDateString()}</span>
                                    {user.lastActive && (
                                        <span className="text-purple-400/60">Last Active: {new Date(user.lastActive).toLocaleDateString()}</span>
                                    )}
                                </div>
                            </div>

                            <div className="bg-slate-900/40 p-4 border-t border-dark-border flex gap-3">
                                <button
                                    onClick={() => handleAction(user.kgid, "approved")}
                                    disabled={!!processingId}
                                    className="flex-1 bg-green-600 hover:bg-green-500 text-white font-bold py-2 rounded-lg transition-all flex items-center justify-center gap-2 shadow-lg shadow-green-900/20 disabled:opacity-50"
                                >
                                    {processingId === user.kgid ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                    Approve
                                </button>
                                <button
                                    onClick={() => handleAction(user.kgid, "rejected")}
                                    disabled={!!processingId}
                                    className="px-4 bg-slate-800 hover:bg-red-900/40 text-slate-400 hover:text-red-400 border border-slate-700 hover:border-red-400/20 rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {processingId === user.kgid ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                                    Reject
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <div className="flex items-center gap-3 p-4 bg-amber-900/10 border border-amber-500/20 rounded-xl">
                <ShieldAlert className="w-5 h-5 text-amber-500" />
                <p className="text-xs text-amber-500/80">Approved users will be granted immediate access to the Leave Manager App and can sign in with their PIN or Google account.</p>
            </div>
        </div>
    );
}
