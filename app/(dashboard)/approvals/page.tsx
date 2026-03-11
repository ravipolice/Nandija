"use client";

import { useEffect, useState } from "react";
import {
  getPendingRegistrations,
  approveRegistration,
  rejectRegistration,
  markPendingRegistrationAsViewed,
  PendingRegistration,
} from "@/lib/firebase/firestore";
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
  Loader2
} from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import { toast } from "sonner";

export default function ApprovalsPage() {
  const [registrations, setRegistrations] = useState<PendingRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [processingId, setProcessingId] = useState<string | null>(null);

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
      success: () => {
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

  const handleReject = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to reject registration for ${name}?`)) return;

    setProcessingId(id);
    try {
      await rejectRegistration(id);
      setRegistrations(prev => prev.filter(r => r.id !== id));
      toast.success(`Registration for ${name} rejected`);
    } catch (error) {
      console.error("Error rejecting registration:", error);
      toast.error("Failed to reject registration");
    } finally {
      setProcessingId(null);
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
                  <InfoRow icon={<MapPin className="w-3.5 h-3.5 text-red-500/50" />} label="District" value={reg.district} />
                  <InfoRow icon={<Building2 className="w-3.5 h-3.5 text-blue-500/50" />} label="Station" value={reg.station} />
                </div>

                {reg.createdAt && (
                  <div className="pt-2 border-t border-dark-border flex items-center justify-between text-[10px] text-slate-600">
                    <span className="flex items-center gap-1 uppercase font-bold tracking-tighter">
                      <Clock className="w-3 h-3" /> Registered
                    </span>
                    <span>{formatDateTime(reg.createdAt.toDate())}</span>
                  </div>
                )}

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
                    onClick={() => handleReject(reg.id!, reg.name)}
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

      <div className="flex items-center gap-3 p-4 bg-blue-900/10 border border-blue-500/20 rounded-xl">
        <ShieldAlert className="w-5 h-5 text-blue-500" />
        <p className="text-xs text-blue-500/80">
          Approving a registration will automatically create an employee record and grant the user full access to the mobile application features.
        </p>
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



