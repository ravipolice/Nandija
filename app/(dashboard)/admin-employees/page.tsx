"use client";

import { useEffect, useState } from "react";
import { getAdminEmployees, deleteAdminEmployee, updateAdminEmployee, AdminEmployee } from "@/lib/firebase/firestore";
import {
  Users,
  Search,
  FileSpreadsheet,
  Plus,
  Trash2,
  Edit,
  Loader2,
  CheckCircle2,
  Clock,
  ChevronUp,
  ChevronDown,
  ShieldAlert,
  Phone,
  Building2,
  RefreshCw,
  Upload
} from "lucide-react";
import Link from "next/link";
import Papa from "papaparse";
import { toast } from "sonner";
import { generateSmartSearchBlob } from "@/lib/searchUtils";
import { getRankColorClass } from "@/lib/rankUtils";

type SearchableAdminEmployee = AdminEmployee & { searchBlob: string };
type SortField = "kgid" | "name" | "rank" | "email" | "district" | "station" | "unit" | "isApproved" | "mobile1";
type SortDirection = "asc" | "desc";

export default function AdminEmployeesPage() {
  const [employees, setEmployees] = useState<SearchableAdminEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setError(null);
    setLoading(true);
    try {
      const empData = await getAdminEmployees();
      
      const searchableData = empData.map(emp => ({
        ...emp,
        searchBlob: generateSmartSearchBlob(
          emp.name,
          emp.kgid,
          emp.email,
          emp.mobile1,
          emp.mobile2,
          emp.rank,
          emp.displayRank,
          emp.bloodGroup,
          emp.district,
          emp.station,
          emp.unit,
          emp.gender,
          emp.subSection,
          emp.dutyRole
        )
      }));
      setEmployees(searchableData);
    } catch (err) {
      console.error("Error loading Admin employees:", err);
      setError(err instanceof Error ? err.message : "Failed to load admin employees");
      toast.error("Failed to load admin employees");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleApproval = async (employee: SearchableAdminEmployee) => {
    if (!employee.id) return;
    const newStatus = !employee.isApproved;
    setUpdatingId(employee.id);
    try {
      await updateAdminEmployee(employee.id, { isApproved: newStatus });
      setEmployees(prev => prev.map(e => e.id === employee.id ? { ...e, isApproved: newStatus } : e));
      toast.success(`User ${employee.name} is now ${newStatus ? "Approved" : "Pending"}`);
    } catch (error) {
      toast.error("Failed to update status");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete admin employee roster record for ${name}?`)) return;
    try {
      await deleteAdminEmployee(id);
      setEmployees(prev => prev.filter(e => e.id !== id));
      toast.success("Roster record deleted successfully");
    } catch (error) {
      toast.error("Failed to delete roster record");
    }
  };

  const handleExportCSV = () => {
    if (employees.length === 0) return;
    const csvData = filteredEmployees.map(emp => ({
      KGID: emp.kgid,
      Name: emp.name,
      Rank: emp.displayRank || emp.rank || "N/A",
      Email: emp.email || "N/A",
      Mobile: emp.mobile1 || "N/A",
      District: emp.district || "N/A",
      Station: emp.station || "N/A",
      Unit: emp.unit || "N/A",
      BloodGroup: emp.bloodGroup || "N/A",
      Status: emp.isApproved ? "Approved" : "Pending",
      Gender: emp.gender || "N/A",
      SubSection: emp.subSection || "N/A",
      DutyRole: emp.dutyRole || "N/A"
    }));
    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'Admin_Employees_Roster.csv');
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

  const filteredEmployees = employees
    .filter((emp) => {
      if (!searchTerm.trim()) return true;
      const terms = searchTerm.toLowerCase().split(/\s+/).filter(t => t.length > 0);
      return terms.every(term => emp.searchBlob.toLowerCase().includes(term));
    })
    .sort((a, b) => {
      let aVal: any = a[sortField] || "";
      let bVal: any = b[sortField] || "";

      if (typeof aVal === "string") {
        return sortDirection === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortDirection === "asc" ? (aVal === bVal ? 0 : aVal ? -1 : 1) : (aVal === bVal ? 0 : aVal ? 1 : -1);
    });

  if (loading && employees.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
        <p className="text-slate-400">Loading admin employee roster...</p>
      </div>
    );
  }

  if (error && employees.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-6 p-8">
        <div className="rounded-2xl bg-red-500/10 border border-red-500/30 p-8 max-w-md text-center">
          <ShieldAlert className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-slate-200 mb-2">Could not load roster</h2>
          <p className="text-slate-400 text-sm mb-6">{error}</p>
          <button
            onClick={() => loadData()}
            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-lg font-medium transition-all"
          >
            <RefreshCw className="w-4 h-4" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-extrabold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent flex items-center gap-3">
            <Users className="w-8 h-8 text-blue-400" />
            Admin Employee Roster
          </h1>
          <p className="text-slate-400 text-sm">Roster list of personnel eligible to register in the PMD mobile app.</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/upload?type=admin_employee"
            className="flex items-center justify-center gap-2 bg-purple-600/20 text-purple-400 border border-purple-600/30 hover:bg-purple-600/30 px-4 py-2 rounded-lg transition-all text-sm font-bold shadow-sm"
          >
            <Upload className="w-4 h-4" />
            Upload CSV
          </Link>
          <button
            onClick={handleExportCSV}
            className="flex items-center justify-center gap-2 bg-emerald-600/20 text-emerald-400 border border-emerald-600/30 hover:bg-emerald-600/30 px-4 py-2 rounded-lg transition-all text-sm font-bold"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Excel
          </button>
          <Link
            href="/admin-employees/new"
            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg transition-all text-sm font-bold shadow-lg shadow-blue-600/20"
          >
            <Plus className="w-4 h-4" />
            Add New
          </Link>
        </div>
      </div>

      <div className="relative group">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
        <input
          type="text"
          placeholder="Search by name, KGID, phone, station or rank..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-dark-card border border-dark-border rounded-xl py-3 pl-11 pr-4 text-slate-200 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all shadow-inner"
        />
      </div>

      <div className="bg-dark-card border border-dark-border rounded-2xl shadow-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900/50 border-b border-dark-border">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Employee</th>
                <SortableHeader label="KGID" field="kgid" current={sortField} dir={sortDirection} onSort={handleSort} />
                <SortableHeader label="Mobile" field="mobile1" current={sortField} dir={sortDirection} onSort={handleSort} />
                <SortableHeader label="Email" field="email" current={sortField} dir={sortDirection} onSort={handleSort} />
                <SortableHeader label="Rank" field="rank" current={sortField} dir={sortDirection} onSort={handleSort} />
                <SortableHeader label="District" field="district" current={sortField} dir={sortDirection} onSort={handleSort} />
                <SortableHeader label="Station" field="station" current={sortField} dir={sortDirection} onSort={handleSort} />
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Duty Role</th>
                <SortableHeader label="Status" field="isApproved" current={sortField} dir={sortDirection} onSort={handleSort} />
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-center">Roster Approval</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-border/50">
              {filteredEmployees.map((emp) => (
                <tr key={emp.id} className="hover:bg-slate-800/30 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4 relative">
                      <div className="shrink-0 relative">
                        {emp.photoUrl || emp.photoUrlFromGoogle ? (
                          <img
                            src={emp.photoUrl || emp.photoUrlFromGoogle || ""}
                            alt={emp.name}
                            className="h-12 w-12 rounded-full object-cover border-2 border-slate-700 shadow-sm"
                            onError={(e) => {
                              const img = e.currentTarget;
                              img.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(emp.name)}&background=1e293b&color=94a3b8`;
                            }}
                          />
                        ) : (
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-800 text-slate-400 font-bold text-lg border-2 border-slate-700 shadow-inner">
                            {emp.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        {/* Blood Group Badge */}
                        {emp.bloodGroup && (
                          <div className={`absolute -top-1 -right-1 flex items-center justify-center w-5 h-5 rounded-full text-[8px] font-bold text-white shadow-sm ring-2 ring-slate-900 bg-red-500`}>
                            {emp.bloodGroup}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-slate-100 text-base flex items-center gap-2 truncate">
                          {emp.name}
                        </div>
                        <div className={`text-xs mt-0.5 ${getRankColorClass(emp.displayRank || emp.rank)}`}>
                          {emp.displayRank || emp.rank || "Roster Record"}
                        </div>
                        <div className="flex flex-col gap-0.5 mt-1">
                          {emp.mobile1 && (
                            <div className="flex items-center gap-2 text-[10px] text-slate-400 font-medium">
                              <Phone className="w-2.5 h-2.5 text-slate-500" /> {emp.mobile1}
                            </div>
                          )}
                          {(() => {
                            const subtitleParts = [];
                            if (emp.dutyRole && emp.dutyRole !== "Others") subtitleParts.push(emp.dutyRole);
                            if (emp.unit && emp.unit !== emp.district) subtitleParts.push(emp.unit);
                            if (emp.station) subtitleParts.push(emp.station);
                            if (emp.district) subtitleParts.push(emp.district);
                            const finalSubtitle = Array.from(new Set(subtitleParts)).join(", ");
                            return finalSubtitle ? (
                              <div className="flex items-center gap-2 text-[10px] text-slate-500 truncate max-w-[200px]">
                                <Building2 className="w-2.5 h-2.5 opacity-50" />
                                {finalSubtitle}
                              </div>
                            ) : null;
                          })()}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-mono text-sm text-blue-400/80">{emp.kgid}</td>
                  <td className="px-6 py-4 font-mono text-sm text-slate-300">{emp.mobile1 || "N/A"}</td>
                  <td className="px-6 py-4 text-xs text-slate-400 font-medium lowercase truncate max-w-[120px]" title={emp.email || "N/A"}>
                    {emp.email || "N/A"}
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs text-slate-300 font-semibold">{emp.rank || "N/A"}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-xs text-slate-300 font-semibold">{emp.district || "N/A"}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-400 font-medium">{emp.station || "N/A"}</td>
                  <td className="px-6 py-4 text-xs text-slate-400 font-medium capitalize">{emp.dutyRole || "N/A"}</td>
                  <td className="px-6 py-4">
                    <AppBadge isApproved={emp.isApproved} />
                  </td>
                  <td className="px-6 py-4 text-center">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={emp.isApproved}
                        disabled={updatingId === emp.id}
                        onChange={() => handleToggleApproval(emp)}
                      />
                      <div className="w-10 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-600"></div>
                    </label>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Link
                        href={`/admin-employees/edit?id=${emp.id}`}
                        className="p-1.5 text-blue-400 hover:text-blue-300 transition-colors bg-blue-400/10 hover:bg-blue-400/20 rounded-lg"
                      >
                        <Edit className="h-4 w-4" />
                      </Link>
                      <button
                        onClick={() => handleDelete(emp.id!, emp.name)}
                        className="p-1.5 text-red-400 hover:text-red-300 transition-colors bg-red-400/10 hover:bg-red-400/20 rounded-lg"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredEmployees.length === 0 && (
          <div className="p-20 text-center text-slate-500 flex flex-col items-center gap-3">
            <Users className="w-12 h-12 opacity-20" />
            <p>No admin employees found in the roster.</p>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3 p-4 bg-blue-900/10 border border-blue-500/20 rounded-xl">
        <ShieldAlert className="w-5 h-5 text-blue-500" />
        <p className="text-xs text-blue-500/80">
          Admin Employee Roster represents the roster list of eligible employees. Real-time registrations will cross-reference this collection.
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
      className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest cursor-pointer hover:text-blue-400 transition-colors"
      onClick={() => onSort(field)}
    >
      <div className="flex items-center gap-2">
        {label}
        <div className="flex flex-col">
          <ChevronUp className={`w-3 h-3 -mb-1 ${isActive && dir === "asc" ? "text-blue-400" : "text-slate-700"}`} />
          <ChevronDown className={`w-3 h-3 ${isActive && dir === "desc" ? "text-blue-400" : "text-slate-700"}`} />
        </div>
      </div>
    </th>
  );
}

function AppBadge({ isApproved }: { isApproved?: boolean }) {
  if (isApproved) {
    return (
      <span className="flex items-center gap-1.5 text-[10px] font-bold text-green-400 border border-green-400/20 bg-green-400/5 px-2 py-0.5 rounded-full">
        <CheckCircle2 className="w-2.5 h-2.5" /> Approved
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1.5 text-[10px] font-bold text-amber-500 border border-amber-500/20 bg-amber-500/5 px-2 py-0.5 rounded-full">
      <Clock className="w-2.5 h-2.5" /> Pending
    </span>
  );
}
