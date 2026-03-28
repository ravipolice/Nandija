"use client";

import { useEffect, useState } from "react";
import { getSubSections, updateSubSections } from "@/lib/firebase/firestore";
import { 
  Briefcase, 
  Plus, 
  Trash2, 
  Edit2, 
  Save, 
  X, 
  Search, 
  Loader2, 
  ArrowLeft
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

export default function DutyRolesPage() {
  const [roles, setRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [newRole, setNewRole] = useState("");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadRoles();
  }, []);

  const loadRoles = async () => {
    setLoading(true);
    try {
      const data = await getSubSections();
      setRoles(data);
    } catch (error) {
      console.error("Error loading duty roles:", error);
      toast.error("Failed to load duty roles");
    } finally {
      setLoading(false);
    }
  };

  const handleAddRole = async (e: React.FormEvent) => {
    e.preventDefault();
    const roleToAdd = newRole.trim();
    if (!roleToAdd) return;

    if (roles.includes(roleToAdd)) {
      toast.error("Role already exists");
      return;
    }

    setIsSaving(true);
    try {
      const updatedRoles = [...roles, roleToAdd];
      await updateSubSections(updatedRoles);
      setRoles(updatedRoles.sort());
      setNewRole("");
      toast.success("Duty role added successfully");
    } catch (error) {
      toast.error("Failed to add duty role");
    } finally {
      setIsSaving(false);
    }
  };

  const handleStartEdit = (index: number, value: string) => {
    setEditingIndex(index);
    setEditingValue(value);
  };

  const handleSaveEdit = async (index: number) => {
    const newValue = editingValue.trim();
    if (!newValue) return;

    if (roles.includes(newValue) && roles[index] !== newValue) {
      toast.error("Role already exists");
      return;
    }

    setIsSaving(true);
    try {
      const updatedRoles = [...roles];
      updatedRoles[index] = newValue;
      await updateSubSections(updatedRoles);
      setRoles(updatedRoles.sort());
      setEditingIndex(null);
      toast.success("Duty role updated successfully");
    } catch (error) {
      toast.error("Failed to update duty role");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteRole = async (roleToDelete: string) => {
    if (!confirm(`Are you sure you want to delete the role "${roleToDelete}"?`)) return;

    setIsSaving(true);
    try {
      const updatedRoles = roles.filter(r => r !== roleToDelete);
      await updateSubSections(updatedRoles);
      setRoles(updatedRoles);
      toast.success("Duty role deleted successfully");
    } catch (error) {
      toast.error("Failed to delete duty role");
    } finally {
      setIsSaving(false);
    }
  };

  const filteredRoles = roles.filter(role => 
    role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading && roles.length === 0) {
    return (
      <div className="flex h-[500px] flex-col items-center justify-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary-500" />
        <p className="text-slate-400">Loading duty roles...</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm text-slate-500 hover:text-primary-400 transition-colors">
            <Link href="/units" className="flex items-center gap-1">
              <ArrowLeft className="h-3 w-3" /> Back to Units
            </Link>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold bg-gradient-to-r from-primary-400 to-indigo-400 bg-clip-text text-transparent flex items-center gap-3">
            <Briefcase className="h-8 w-8 text-primary-400" />
            Duty Roles Management
          </h1>
          <p className="text-slate-400 text-sm">Manage the master list of roles (Writer, Court, Summons, etc.)</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Add New Role */}
        <div className="lg:col-span-1 space-y-6">
          <div className="rounded-2xl bg-dark-card border border-dark-border p-6 shadow-xl">
            <h2 className="text-lg font-bold text-slate-200 mb-4 flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary-400" />
              Add New Role
            </h2>
            <form onSubmit={handleAddRole} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Role Name</label>
                <input
                  type="text"
                  placeholder="e.g. Writer, Court, CSB"
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="w-full bg-dark-sidebar border border-dark-border rounded-xl py-3 px-4 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-primary-500/50 transition-all font-medium"
                />
              </div>
              <button
                type="submit"
                disabled={isSaving || !newRole.trim()}
                className="w-full bg-primary-600 hover:bg-primary-500 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-primary-600/20 flex items-center justify-center gap-2"
              >
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Add Duty Role
              </button>
            </form>
          </div>

          <div className="rounded-2xl bg-primary-500/5 border border-primary-500/10 p-6">
            <h3 className="text-sm font-bold text-primary-400 mb-2">Pro Tip</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              These roles can be assigned to specific units later. Once assigned, they will appear as selectable options when adding or editing employees in those units.
            </p>
          </div>
        </div>

        {/* Right Column: Roles List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500 group-focus-within:text-primary-400 transition-colors" />
            <input
              type="text"
              placeholder="Filter roles..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-dark-card border border-dark-border rounded-2xl py-4 pl-12 pr-4 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-primary-500/50 transition-all shadow-xl"
            />
          </div>

          <div className="rounded-2xl bg-dark-card border border-dark-border shadow-2xl overflow-hidden">
            <div className="max-h-[600px] overflow-y-auto custom-scrollbar">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-900/50 border-b border-dark-border">
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-widest w-12 text-center">#</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-widest">Duty Role</th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-widest">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-border/50">
                  {filteredRoles.map((role, idx) => (
                    <tr key={role} className="hover:bg-slate-800/30 transition-colors group">
                      <td className="px-6 py-4 text-center">
                        <span className="text-xs font-mono text-slate-600">{idx + 1}</span>
                      </td>
                      <td className="px-6 py-4">
                        {editingIndex === idx ? (
                          <input
                            type="text"
                            value={editingValue}
                            onChange={(e) => setEditingValue(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleSaveEdit(idx)}
                            className="bg-dark-sidebar border border-primary-500/50 rounded-lg px-3 py-1 text-slate-100 focus:outline-none w-full animate-in zoom-in-95 duration-200"
                            autoFocus
                          />
                        ) : (
                          <span className="text-slate-200 font-medium group-hover:text-primary-400 transition-colors">
                            {role}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {editingIndex === idx ? (
                            <>
                              <button
                                onClick={() => handleSaveEdit(idx)}
                                disabled={isSaving}
                                className="p-2 text-green-400 hover:bg-green-400/10 rounded-lg transition-all"
                              >
                                <Save className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => setEditingIndex(null)}
                                className="p-2 text-slate-400 hover:bg-slate-400/10 rounded-lg transition-all"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => handleStartEdit(idx, role)}
                                className="p-2 text-slate-400 hover:text-primary-400 hover:bg-primary-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteRole(role)}
                                className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredRoles.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-6 py-12 text-center text-slate-500">
                        {searchTerm ? "No roles match your search" : "No duty roles added yet"}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
