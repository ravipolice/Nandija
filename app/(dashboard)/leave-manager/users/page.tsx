"use client";

import { useEffect, useState } from "react";
import {
    getAllLeaveManagerUsers,
    updateLeaveManagerUserStatus,
    LeaveManagerUser
} from "@/lib/firebase/leave-manager";
import {
    Loader2,
    Search,
    Users,
    CheckCircle2,
    XCircle,
    Clock,
    Calendar,
    ChevronUp,
    ChevronDown,
    FileSpreadsheet,
    ShieldAlert
} from "lucide-react";
import { toast } from "sonner";
import Papa from "papaparse";

type SortField = "name" | "kgid" | "email" | "department" | "status" | "lastActive" | "createdAt";
type SortDirection = "asc" | "desc";

export default function LMUsersPage() {
    const [users, setUsers] = useState<LeaveManagerUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [sortField, setSortField] = useState<SortField>("createdAt");
    const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
    const [updatingId, setUpdatingId] = useState<string | null>(null);

    const fetchUsers = async () => {
        try {
            const data = await getAllLeaveManagerUsers();
            setUsers(data);
        } catch (error) {
            console.error("Error fetching users:", error);
            toast.error("Failed to load users");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const toggleUserStatus = async (user: LeaveManagerUser) => {
        const newStatus = user.status === "approved" ? "rejected" : "approved";
        setUpdatingId(user.kgid);
        try {
            await updateLeaveManagerUserStatus(user.kgid, newStatus);
            setUsers(prev => prev.map(u => u.kgid === user.kgid ? { ...u, status: newStatus } : u));
            toast.success(`User ${user.name} is now ${newStatus === "approved" ? "Enabled" : "Disabled"}`);
        } catch (error) {
            toast.error("Failed to update status");
        } finally {
            setUpdatingId(null);
        }
    };

    const handleExportCSV = () => {
        if (users.length === 0) return;
        const csvData = users.map(u => ({
            Name: u.name,
            KGID: u.kgid,
            Email: u.email,
            Phone: u.phone,
            Department: u.department,
            District: u.district,
            Status: u.status,
            LastActive: u.lastActive ? new Date(u.lastActive).toLocaleString() : "Never",
            RegisteredOn: new Date(u.createdAt).toLocaleString()
        }));
        const csv = Papa.unparse(csvData);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'LM_Users_Export.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortDirection(sortDirection === "asc" ? "desc" : "asc");
        } else {
            setSortField(field);
            setSortDirection("asc");
        }
    };

    const filteredUsers = users
        .filter(u => {
            const term = searchTerm.toLowerCase();
            return u.name.toLowerCase().includes(term) ||
                u.kgid.toLowerCase().includes(term) ||
                u.email.toLowerCase().includes(term) ||
                u.department.toLowerCase().includes(term);
        })
        .sort((a, b) => {
            let aVal: any = a[sortField] || "";
            let bVal: any = b[sortField] || "";

            if (sortField === "lastActive" || sortField === "createdAt") {
                aVal = Number(aVal);
                bVal = Number(bVal);
            }

            if (typeof aVal === "string") {
                return sortDirection === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
            }
            return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
        });

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[500px]">
                <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-2xl sm:text-3xl font-extrabold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent flex items-center gap-3">
                        <Users className="w-8 h-8 text-purple-400" />
                        Leave Manager Users
                    </h1>
                    <p className="text-slate-400 text-sm">Manage access and monitor activity for all LM users.</p>
                </div>
                <button
                    onClick={handleExportCSV}
                    className="flex items-center justify-center gap-2 bg-emerald-600/20 text-emerald-400 border border-emerald-600/30 hover:bg-emerald-600/30 px-4 py-2 rounded-lg transition-all text-sm font-bold"
                >
                    <FileSpreadsheet className="w-4 h-4" />
                    Export Excel (CSV)
                </button>
            </div>

            <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-purple-400 transition-colors" />
                <input
                    type="text"
                    placeholder="Search by name, KGID, email or department..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-dark-card border border-dark-border rounded-xl py-3 pl-11 pr-4 text-slate-200 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20 transition-all shadow-inner"
                />
            </div>

            <div className="bg-dark-card border border-dark-border rounded-2xl shadow-2xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-900/50 border-b border-dark-border">
                                <SortableHeader label="Name" field="name" current={sortField} dir={sortDirection} onSort={handleSort} />
                                <SortableHeader label="KGID" field="kgid" current={sortField} dir={sortDirection} onSort={handleSort} />
                                <SortableHeader label="Department" field="department" current={sortField} dir={sortDirection} onSort={handleSort} />
                                <SortableHeader label="Last Active" field="lastActive" current={sortField} dir={sortDirection} onSort={handleSort} />
                                <SortableHeader label="Status" field="status" current={sortField} dir={sortDirection} onSort={handleSort} />
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-center">App Access</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-dark-border/50">
                            {filteredUsers.map((user) => (
                                <tr key={user.kgid} className="hover:bg-slate-800/30 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-slate-200">{user.name}</div>
                                        <div className="text-[10px] text-slate-500 truncate max-w-[150px]">{user.email}</div>
                                    </td>
                                    <td className="px-6 py-4 font-mono text-sm text-purple-400">{user.kgid}</td>
                                    <td className="px-6 py-4">
                                        <span className="px-2 py-1 rounded bg-slate-800 text-slate-400 text-xs border border-slate-700">
                                            {user.department}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 font-medium text-xs text-slate-400 whitespace-nowrap">
                                        {user.lastActive ? (
                                            <div className="flex items-center gap-2">
                                                <Clock className="w-3 h-3 text-blue-400" />
                                                {new Date(user.lastActive).toLocaleDateString()}
                                            </div>
                                        ) : (
                                            <span className="text-slate-600">Never</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <StatusBadge status={user.status} />
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                className="sr-only peer"
                                                checked={user.status === "approved"}
                                                disabled={updatingId === user.kgid}
                                                onChange={() => toggleUserStatus(user)}
                                            />
                                            <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                                        </label>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {filteredUsers.length === 0 && (
                    <div className="p-20 text-center text-slate-500 flex flex-col items-center gap-3">
                        <Users className="w-12 h-12 opacity-20" />
                        <p>No users found matching your search.</p>
                    </div>
                )}
            </div>

            <div className="flex items-center gap-3 p-4 bg-amber-900/10 border border-amber-500/20 rounded-xl">
                <ShieldAlert className="w-5 h-5 text-amber-500" />
                <p className="text-xs text-amber-500/80">
                    Disabling a user (App Access toggle OFF) will immediately prevent them from logging in or using any features of the Leave Manager App.
                </p>
            </div>
        </div>
    );
}

function SortableHeader({ label, field, current, dir, onSort }: {
    label: string,
    field: SortField,
    current: SortField,
    dir: SortDirection,
    onSort: (f: SortField) => void
}) {
    const isActive = current === field;
    return (
        <th
            className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest cursor-pointer hover:text-purple-400 transition-colors"
            onClick={() => onSort(field)}
        >
            <div className="flex items-center gap-2">
                {label}
                <div className="flex flex-col">
                    <ChevronUp className={`w-3 h-3 -mb-1 ${isActive && dir === "asc" ? "text-purple-400" : "text-slate-700"}`} />
                    <ChevronDown className={`w-3 h-3 ${isActive && dir === "desc" ? "text-purple-400" : "text-slate-700"}`} />
                </div>
            </div>
        </th>
    );
}

function StatusBadge({ status }: { status: string }) {
    switch (status) {
        case "approved":
            return (
                <span className="flex items-center gap-1.5 text-xs font-bold text-green-400 border border-green-400/20 bg-green-400/5 px-2 py-1 rounded-full">
                    <CheckCircle2 className="w-3 h-3" /> Enabled
                </span>
            );
        case "rejected":
            return (
                <span className="flex items-center gap-1.5 text-xs font-bold text-red-400 border border-red-400/20 bg-red-400/5 px-2 py-1 rounded-full">
                    <XCircle className="w-3 h-3" /> Disabled
                </span>
            );
        default:
            return (
                <span className="flex items-center gap-1.5 text-xs font-bold text-amber-400 border border-amber-400/20 bg-amber-400/5 px-2 py-1 rounded-full">
                    <Clock className="w-3 h-3" /> Pending
                </span>
            );
    }
}
