"use client";

import { useEffect, useState } from "react";
import {
    getLeaveManagerDepartments,
    addLeaveManagerDepartment,
    deleteLeaveManagerDepartment,
    LeaveManagerDepartment
} from "@/lib/firebase/leave-manager";
import { Loader2, Plus, Trash2, Building2 } from "lucide-react";
import { toast } from "sonner";

export default function DepartmentsPage() {
    const [departments, setDepartments] = useState<LeaveManagerDepartment[]>([]);
    const [loading, setLoading] = useState(true);
    const [adding, setAdding] = useState(false);
    const [newDeptName, setNewDeptName] = useState("");

    const fetchDepts = async () => {
        try {
            const data = await getLeaveManagerDepartments();
            setDepartments(data);
        } catch (error) {
            console.error("Error fetching depts:", error);
            toast.error("Failed to load departments");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDepts();
    }, []);

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newDeptName.trim()) return;

        setAdding(true);
        try {
            await addLeaveManagerDepartment(newDeptName.trim());
            setNewDeptName("");
            await fetchDepts();
            toast.success("Department added successfully");
        } catch (error) {
            toast.error("Failed to add department");
        } finally {
            setAdding(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this department?")) return;

        try {
            await deleteLeaveManagerDepartment(id);
            setDepartments(departments.filter(d => d.id !== id));
            toast.success("Department deleted");
        } catch (error) {
            toast.error("Failed to delete");
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
        <div className="p-6 space-y-8 animate-in fade-in duration-500 w-full">
            <div className="space-y-1">
                <h1 className="text-3xl font-extrabold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent flex items-center gap-3">
                    <Building2 className="w-8 h-8 text-purple-400" />
                    Leave Manager Departments
                </h1>
                <p className="text-slate-400 text-sm">Manage the list of departments available in the registration form.</p>
            </div>

            <div className="bg-dark-card border border-dark-border rounded-xl shadow-lg overflow-hidden">
                <div className="p-6 border-b border-dark-border bg-slate-800/20">
                    <form onSubmit={handleAdd} className="flex gap-4">
                        <input
                            type="text"
                            value={newDeptName}
                            onChange={(e) => setNewDeptName(e.target.value)}
                            placeholder="New Department Name"
                            className="flex-1 bg-dark-sidebar border border-dark-border rounded-lg px-4 py-2 text-dark-text focus:outline-none focus:ring-2 focus:ring-purple-500"
                            disabled={adding}
                        />
                        <button
                            type="submit"
                            disabled={adding || !newDeptName.trim()}
                            className="bg-gradient-to-r from-purple-600 to-blue-600 px-6 py-2 rounded-lg text-white font-medium flex items-center gap-2 hover:shadow-lg hover:shadow-purple-500/30 transition-all disabled:opacity-50"
                        >
                            {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                            Add
                        </button>
                    </form>
                </div>

                <div className="divide-y divide-dark-border">
                    {departments.length === 0 ? (
                        <div className="p-12 text-center text-slate-500 italic">
                            No departments found. Use the field above to add one.
                        </div>
                    ) : (
                        departments.map((dept) => (
                            <div key={dept.id} className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors group">
                                <span className="text-slate-200 font-medium">{dept.name}</span>
                                <button
                                    onClick={() => dept.id && handleDelete(dept.id)}
                                    className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
                                    title="Delete department"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
