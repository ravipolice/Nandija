"use client";

import { useEffect, useState } from "react";
import {
  getPendingRegistrations,
  approveRegistration,
  rejectRegistration,
  markPendingRegistrationAsViewed,
  PendingRegistration,
  updatePendingRegistration,
} from "@/lib/firebase/firestore";
import { logAudit } from "@/lib/firebase/auditLog";
import { useAuth } from "@/components/providers/AuthProvider";
import {
  Check,
  X,
  RefreshCw,
  UserPlus,
  Search,
  Clock,
  Mail,
  Phone,
  ShieldCheck,
  ShieldAlert,
  Building2,
  MapPin,
  GraduationCap,
  Loader2,
  Pencil
} from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import { toast } from "sonner";

export default function ApprovalsPage() {
  const { user } = useAuth();
  const [registrations, setRegistrations] = useState<PendingRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [editingRegistration, setEditingRegistration] = useState<PendingRegistration | null>(null);
  const [rejectTarget, setRejectTarget] = useState<{ id: string; name: string } | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  useEffect(() => {
    loadRegistrations();
  }, []);

  const loadRegistrations = async () => {
    setLoading(true);
    try {
      const data = await getPendingRegistrations();
      setRegistrations(data);

      // Mark unviewed as viewed
      const unviewed = data.filter(r => !r.viewedByAdmin && r.id);
      if (unviewed.length > 0) {
        Promise.all(unviewed.map(r => markPendingRegistrationAsViewed(r.id!)))
          .catch(err => console.error("Error marking as viewed", err));
      }
    } catch (error) {
      console.error("Error loading registrations:", error);
      toast.error("Failed to load registrations");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (registration: PendingRegistration) => {
    if (!registration.id) return;
    setProcessingId(registration.id);
    const promise = approveRegistration(registration.id, registration);

    toast.promise(promise, {
      loading: `Approving ${registration.name}...`,
      success: async () => {
        await logAudit({
          action: "approve_registration",
          targetType: "pending_registration",
          targetId: registration.id,
          targetName: registration.name,
          performedBy: user?.uid ?? "unknown",
          performedByEmail: user?.email ?? undefined,
          details: `Approved KGID: ${registration.kgid}`,
        });
        setRegistrations(prev => prev.filter(r => r.id !== registration.id));
        setProcessingId(null);
        return `Registration for ${registration.name} approved!`;
      },
      error: () => {
        setProcessingId(null);
        return "Failed to approve registration";
      }
    });
  };

  const handleReject = async () => {
    if (!rejectTarget) return;
    const { id, name } = rejectTarget;
    if (!rejectReason.trim()) {
      toast.error("Please enter a rejection reason");
      return;
    }

    setProcessingId(id);
    try {
      await rejectRegistration(id, rejectReason.trim());
      await logAudit({
        action: "reject_registration",
        targetType: "pending_registration",
        targetId: id,
        targetName: name,
        performedBy: user?.uid ?? "unknown",
        performedByEmail: user?.email ?? undefined,
        details: `Registration rejected. Reason: ${rejectReason.trim()}`,
      });
      setRegistrations(prev => prev.filter(r => r.id !== id));
      toast.success(`Registration for ${name} rejected`);
    } catch (error) {
      console.error("Error rejecting registration:", error);
      toast.error("Failed to reject registration");
    } finally {
      setProcessingId(null);
      setRejectTarget(null);
      setRejectReason("");
    }
  };

  const openRejectModal = (id: string, name: string) => {
    setRejectTarget({ id, name });
    setRejectReason("");
  };

  const handleUpdateRegistration = async (id: string, data: Partial<PendingRegistration>) => {
    try {
      await updatePendingRegistration(id, data);
      setRegistrations(prev => prev.map(r => r.id === id ? { ...r, ...data } : r));
      toast.success("Registration updated successfully");
      setEditingRegistration(null);
    } catch (error) {
      console.error("Error updating registration:", error);
      toast.error("Failed to update registration");
    }
  };

  const filteredRegistrations = registrations.filter(reg => {
    const term = searchTerm.toLowerCase();
    return (
      reg.name.toLowerCase().includes(term) ||
      reg.kgid.toLowerCase().includes(term) ||
      reg.email.toLowerCase().includes(term) ||
      reg.mobile1.includes(term)
    );
  });

  if (loading && registrations.length === 0) {
    return (
      <div className="flex h-[500px] items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-extrabold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent flex items-center gap-3">
            <UserPlus className="w-8 h-8 text-blue-400" />
            Pending Approvals
          </h1>
          <p className="text-slate-400 text-sm">Review and approve new employee registrations.</p>
        </div>
        <button
          onClick={loadRegistrations}
          className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2 rounded-lg transition-all text-sm font-bold border border-slate-700"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="relative group">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
        <input
          type="text"
          placeholder="Search registrations by name, KGID, phone or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-dark-card border border-dark-border rounded-xl py-3 pl-11 pr-4 text-slate-200 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all shadow-inner"
        />
      </div>

      {filteredRegistrations.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-dark-border p-20 text-center bg-slate-900/10">
          <div className="flex flex-col items-center gap-4">
            <ShieldCheck className="w-16 h-16 text-slate-800" />
            <div className="space-y-1">
              <p className="text-lg font-bold text-slate-400">All caught up!</p>
              <p className="text-sm text-slate-600">No new registrations to review at this moment.</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredRegistrations.map((reg) => (
            <div
              key={reg.id}
              className="group relative rounded-2xl bg-dark-card border border-dark-border overflow-hidden hover:border-blue-500/30 transition-all hover:shadow-2xl hover:shadow-blue-500/5"
            >
              <div className="absolute top-0 right-0 p-4">
                <span className="flex items-center gap-1.5 text-[10px] font-bold text-amber-500 border border-amber-500/20 bg-amber-500/5 px-2 py-0.5 rounded-full uppercase tracking-tighter">
                  <Clock className="w-2.5 h-2.5" /> Pending
                </span>
              </div>

              <div className="p-6 space-y-4">
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 rounded-full bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 flex items-center justify-center text-slate-400 text-xl font-black">
                    {reg.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-100 leading-tight">{reg.name}</h3>
                    <p className="text-xs font-mono text-blue-400">{reg.kgid}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-y-2.5 py-2">
                  <InfoRow icon={<Mail className="w-3.5 h-3.5" />} label="Email" value={reg.email} />
                  <InfoRow icon={<Phone className="w-3.5 h-3.5" />} label="Mobile" value={reg.mobile1} />
                  <InfoRow icon={<GraduationCap className="w-3.5 h-3.5" />} label="Rank" value={reg.rank || "N/A"} />
                  {reg.dutyRole && <InfoRow icon={<ShieldCheck className="w-3.5 h-3.5 text-blue-400" />} label="Duty Role" value={reg.dutyRole} />}
                  <InfoRow icon={<MapPin className="w-3.5 h-3.5 text-red-500/50" />} label="District" value={reg.district} />
                  <InfoRow icon={<Building2 className="w-3.5 h-3.5 text-blue-500/50" />} label="Station" value={reg.station} />
                  {reg.gender && <InfoRow icon={<UserPlus className="w-3.5 h-3.5 text-indigo-400" />} label="Gender" value={reg.gender} />}
                  {reg.dateOfBirth && <InfoRow icon={<Clock className="w-3.5 h-3.5 text-amber-500" />} label="DOB" value={reg.dateOfBirth instanceof Date ? reg.dateOfBirth.toLocaleDateString() : String(reg.dateOfBirth)} />}
                  {reg.serviceStartDate && <InfoRow icon={<Clock className="w-3.5 h-3.5 text-green-500" />} label="DOA" value={reg.serviceStartDate instanceof Date ? reg.serviceStartDate.toLocaleDateString() : String(reg.serviceStartDate)} />}
                </div>

                {reg.createdAt && (
                  <div className="pt-2 border-t border-dark-border flex items-center justify-between text-[10px] text-slate-600">
                    <span className="flex items-center gap-1 uppercase font-bold tracking-tighter">
                      <Clock className="w-3 h-3" /> Registered
                    </span>
                    <span>{formatDateTime(reg.createdAt.toDate())}</span>
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={() => setEditingRegistration(reg)}
                    className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2 text-sm font-bold transition-all border border-slate-700 active:scale-95"
                  >
                    <Pencil className="h-4 w-4" />
                    Edit
                  </button>
                </div>

                <div className="pt-4 flex gap-3">
                  <button
                    onClick={() => handleApprove(reg)}
                    disabled={processingId === reg.id}
                    className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-4 py-2.5 text-sm font-bold transition-all shadow-lg shadow-blue-600/10 active:scale-95"
                  >
                    {processingId === reg.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    Approve
                  </button>
                  <button
                    onClick={() => openRejectModal(reg.id!, reg.name)}
                    disabled={processingId === reg.id}
                    className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-slate-800 hover:bg-red-600/20 hover:text-red-400 disabled:opacity-50 text-slate-200 px-4 py-2.5 text-sm font-bold transition-all border border-slate-700 hover:border-red-600/30 active:scale-95"
                  >
                    <X className="h-4 w-4" />
                    Reject
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {editingRegistration && (
        <EditRegistrationModal 
          registration={editingRegistration} 
          onClose={() => setEditingRegistration(null)} 
          onSave={handleUpdateRegistration}
        />
      )}

      {/* Reject Reason Modal */}
      {rejectTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-dark-card border border-red-500/30 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-dark-border flex items-center gap-3">
              <div className="p-2 rounded-xl bg-red-500/10">
                <ShieldAlert className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-100">Reject Registration</h2>
                <p className="text-xs text-slate-500">For: <span className="text-slate-300 font-semibold">{rejectTarget.name}</span></p>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-400">This reason will be shown to the user on the mobile app when they try to sign in.</p>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Rejection Reason <span className="text-red-400">*</span></label>
                <textarea
                  autoFocus
                  rows={3}
                  value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                  placeholder="e.g. KGID not found in records, Invalid details provided..."
                  className="w-full bg-slate-900 border border-dark-border rounded-xl px-4 py-3 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/20 resize-none transition-all text-sm"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => { setRejectTarget(null); setRejectReason(""); }}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-dark-border text-slate-300 font-bold hover:bg-slate-800 transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReject}
                  disabled={!rejectReason.trim() || processingId === rejectTarget.id}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-bold transition-all text-sm active:scale-95"
                >
                  {processingId === rejectTarget.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                  Confirm Reject
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3 p-4 bg-blue-900/10 border border-blue-500/20 rounded-xl">
        <ShieldAlert className="w-5 h-5 text-blue-500" />
        <p className="text-xs text-blue-500/80">
          Approving a registration will automatically create an employee record and grant the user full access to the mobile application features.
        </p>
      </div>
    </div>
  );
}

function EditRegistrationModal({ 
  registration, 
  onClose, 
  onSave 
}: { 
  registration: PendingRegistration, 
  onClose: () => void, 
  onSave: (id: string, data: Partial<PendingRegistration>) => Promise<void> 
}) {
  // Helper to format date values for input fields
  const formatDateForInput = (val: any) => {
    if (!val) return "";
    if (val instanceof Date) return val.toISOString().split('T')[0];
    if (val.toDate && typeof val.toDate === 'function') {
      try {
        return val.toDate().toISOString().split('T')[0];
      } catch (e) {
        return String(val);
      }
    }
    return String(val);
  };

  const [formData, setFormData] = useState({
    name: registration.name,
    email: registration.email,
    kgid: registration.kgid,
    rank: registration.rank || "",
    metalNumber: registration.metalNumber || "",
    mobile1: registration.mobile1,
    gender: registration.gender || "",
    bloodGroup: registration.bloodGroup || "",
    district: registration.district,
    unit: registration.unit || "",
    station: registration.station,
    dutyRole: registration.dutyRole || "",
    dateOfBirth: formatDateForInput(registration.dateOfBirth),
    serviceStartDate: formatDateForInput(registration.serviceStartDate),
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!registration.id) return;
    setIsSaving(true);
    try {
      await onSave(registration.id, formData);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-dark-card border border-dark-border rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="px-6 py-4 border-b border-dark-border flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Pencil className="w-5 h-5 text-blue-400" />
            Edit Registration
          </h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Full Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full bg-slate-900 border border-dark-border rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500/50"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Email Address</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                className="w-full bg-slate-900 border border-dark-border rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500/50"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">KGID Number</label>
              <input
                type="text"
                value={formData.kgid}
                onChange={(e) => setFormData(prev => ({ ...prev, kgid: e.target.value }))}
                className="w-full bg-slate-900 border border-dark-border rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500/50"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Rank</label>
              <input
                type="text"
                value={formData.rank}
                onChange={(e) => setFormData(prev => ({ ...prev, rank: e.target.value }))}
                className="w-full bg-slate-900 border border-dark-border rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500/50"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Metal Number</label>
              <input
                type="text"
                value={formData.metalNumber}
                onChange={(e) => setFormData(prev => ({ ...prev, metalNumber: e.target.value }))}
                className="w-full bg-slate-900 border border-dark-border rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500/50"
                placeholder="N/A"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Mobile Number</label>
              <input
                type="text"
                value={formData.mobile1}
                onChange={(e) => setFormData(prev => ({ ...prev, mobile1: e.target.value }))}
                className="w-full bg-slate-900 border border-dark-border rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500/50"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Gender</label>
              <select
                value={formData.gender}
                onChange={(e) => setFormData(prev => ({ ...prev, gender: e.target.value }))}
                className="w-full bg-slate-900 border border-dark-border rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500/50"
              >
                <option value="">Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Blood Group</label>
              <input
                type="text"
                value={formData.bloodGroup}
                onChange={(e) => setFormData(prev => ({ ...prev, bloodGroup: e.target.value }))}
                className="w-full bg-slate-900 border border-dark-border rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500/50"
                placeholder="e.g. O+"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">District</label>
              <input
                type="text"
                value={formData.district}
                onChange={(e) => setFormData(prev => ({ ...prev, district: e.target.value }))}
                className="w-full bg-slate-900 border border-dark-border rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500/50"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Unit / Battalion</label>
              <input
                type="text"
                value={formData.unit}
                onChange={(e) => setFormData(prev => ({ ...prev, unit: e.target.value }))}
                className="w-full bg-slate-900 border border-dark-border rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500/50"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Station</label>
              <input
                type="text"
                value={formData.station}
                onChange={(e) => setFormData(prev => ({ ...prev, station: e.target.value }))}
                className="w-full bg-slate-900 border border-dark-border rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500/50"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Duty Role</label>
              <input
                type="text"
                value={formData.dutyRole}
                onChange={(e) => setFormData(prev => ({ ...prev, dutyRole: e.target.value }))}
                className="w-full bg-slate-900 border border-dark-border rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500/50"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Date of Birth</label>
              <input
                type="text"
                value={formData.dateOfBirth}
                onChange={(e) => setFormData(prev => ({ ...prev, dateOfBirth: e.target.value }))}
                className="w-full bg-slate-900 border border-dark-border rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500/50"
                placeholder="e.g. 1990-01-01"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Service Start Date</label>
              <input
                type="text"
                value={formData.serviceStartDate}
                onChange={(e) => setFormData(prev => ({ ...prev, serviceStartDate: e.target.value }))}
                className="w-full bg-slate-900 border border-dark-border rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500/50"
                placeholder="e.g. 2015-05-20"
              />
            </div>
          </div>

          <div className="pt-6 flex gap-3 sticky bottom-0 bg-dark-card border-t border-dark-border mt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl border border-dark-border text-slate-300 font-bold hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 px-4 py-2.5 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-500 transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode, label: string, value: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="p-1.5 rounded-lg bg-slate-800/50 text-slate-500">
        {icon}
      </div>
      <div className="flex-1">
        <p className="text-[10px] font-bold text-slate-600 uppercase tracking-tighter leading-none mb-0.5">{label}</p>
        <p className="text-xs text-slate-300 font-medium truncate">{value}</p>
      </div>
    </div>
  );
}



