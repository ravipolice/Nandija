"use client";

import { useEffect, useState, useMemo } from "react";
import {
  getOfficers,
  createOfficer,
  deleteOfficer,
  updateOfficer,
  Officer,
  getRanks,
  Rank,
  getDistricts,
  getStations,
  getUnitSections,
  District,
  Station,
  getUnits,
  Unit
} from "@/lib/firebase/firestore";
import { Plus, Trash2, Edit, ChevronUp, ChevronDown, Search, Eye, EyeOff, FileSpreadsheet, FileJson } from "lucide-react";
import Link from "next/link";
import Papa from "papaparse";
import { format } from "date-fns";
import { generateSmartSearchBlob } from "@/lib/searchUtils"; // Smart Search

type SearchableOfficer = Officer & { searchBlob: string };

type SortField = "rank" | "agid" | "name" | "mobile" | "email" | "landline" | "district" | "office" | "unit";
type SortDirection = "asc" | "desc";
type ColumnKey = "rank" | "agid" | "name" | "mobile" | "email" | "landline" | "district" | "office" | "unit" | "actions";

const defaultOfficerColumnWidths: Record<ColumnKey, number> = {
  rank: 100,
  agid: 120,
  name: 200,
  mobile: 120,
  email: 200,
  landline: 120,
  district: 150,
  office: 150,
  unit: 100,
  actions: 100,
};

export default function OfficersPage() {
  const [officers, setOfficers] = useState<SearchableOfficer[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [ranks, setRanks] = useState<Rank[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedDistrict, setSelectedDistrict] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [columnWidths, setColumnWidths] = useState<Record<ColumnKey, number>>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("officerColumnWidths");
      return saved ? { ...defaultOfficerColumnWidths, ...JSON.parse(saved) } : defaultOfficerColumnWidths;
    }
    return defaultOfficerColumnWidths;
  });
  const [_resizingColumn, setResizingColumn] = useState<ColumnKey | null>(null);

  const [formData, setFormData] = useState({
    agid: "",
    rank: "",
    name: "",
    mobile: "",
    mobile2: "",
    email: "",
    landline: "",
    landline2: "",
    district: "",
    office: "",
    unit: "",
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    loadStations(selectedDistrict, formData.unit);
  }, [selectedDistrict, formData.unit, units]); // dependent on unit and units loaded

  // Derived Logic
  const selectedUnitObj = useMemo(() => units.find(u => u.name === formData.unit), [units, formData.unit]);
  const isSpecialUnit = selectedUnitObj?.mappingType === "none";
  const hasSections = ["State INT", "S INT"].includes(formData.unit); // Simplified, or use unitSections check if needed

  // Available Districts based on Unit
  const availableDistricts = useMemo(() => {
    if (!selectedUnitObj) return districts;
    const { mappingType, mappedDistricts } = selectedUnitObj;

    if (mappingType === "subset" || mappingType === "single" || mappingType === "commissionerate") {
      if (mappedDistricts && mappedDistricts.length > 0) {
        return districts.filter(d => mappedDistricts.includes(d.name));
      }
    }
    if (mappingType === "state") return districts.filter(d => d.name === "HQ"); // Or just allow all? Usually state units have HQ or specific districts.

    return districts;
  }, [districts, selectedUnitObj]);

  const loadStations = async (district: string, unitName: string) => {
    try {
      const unitObj = units.find(u => u.name === unitName);
      let data: Station[] = [];

      // 1. Sections Logic (State INT)
      // Check for hardcoded section logic or fetch sections if applicable
      // For now, mirroring Directory page simple check or just fetch sections if no district selected?
      // Actually, if district is empty but unit has sections, we might want to load them?
      // But typically we select District -> Station.

      // If "State INT", we fetch sections as stations
      if (unitName === "State INT" || unitName === "S INT") {
        const sections = await getUnitSections(unitName);
        data = sections.map(s => ({ id: s, name: s, district: unitName }));
      } else if (district) {
        data = await getStations(district);

        // 2. Keyword Filtering
        if (unitObj?.stationKeyword) {
          const keywords = unitObj.stationKeyword.split(',').map(k => k.trim()).filter(k => k);
          if (keywords.length > 0) {
            data = data.filter(s =>
              s.isActive !== false &&
              keywords.some(k => s.name.toUpperCase().includes(k.toUpperCase()))
            );
          } else {
            data = data.filter(s => s.isActive !== false);
          }
        } else {
          data = data.filter(s => s.isActive !== false);
        }
      }

      setStations(data);
    } catch (error) {
      console.error("Error loading stations:", error);
      // Don't alert on every keystroke/change, just log
    }
  };

  const loadData = async () => {
    try {
      const [officersData, districtsData, ranksData, unitsData] = await Promise.all([
        getOfficers(),
        getDistricts(),
        getRanks(),
        getUnits(),
      ]);

      // Generate Smart Search Blob
      const searchableOfficers = officersData.map(off => ({
        ...off,
        searchBlob: generateSmartSearchBlob(
          off.name,
          off.agid,
          off.rank,
          off.mobile,
          off.email,
          off.district,
          off.office || (off as any).station,
          off.unit,
          off.bloodGroup
        )
      }));
      setOfficers(searchableOfficers);
      setDistricts(districtsData);
      setRanks(ranksData);
      setUnits(unitsData);

      if (districtsData.length === 0) {
        console.warn("No districts found.");
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUnitChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newUnit = e.target.value;
    setFormData(prev => ({ ...prev, unit: newUnit, district: "", office: "" }));
    setSelectedDistrict("");
    setStations([]);

    // If "State INT", we might want to trigger loadStations immediately
    if (newUnit === "State INT" || newUnit === "S INT") {
      loadStations("", newUnit);
    }
  };

  const handleDistrictChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newDistrict = e.target.value;
    setSelectedDistrict(newDistrict);
    setFormData(prev => ({ ...prev, district: newDistrict, office: "" }));
    loadStations(newDistrict, formData.unit);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this officer?")) return;
    try {
      await deleteOfficer(id);
      await loadData();
    } catch (error) {
      console.error("Error deleting officer:", error);
      alert("Failed to delete officer");
    }
  };

  const handleToggleVisibility = async (officer: Officer) => {
    if (!officer.id) return;
    try {
      const newStatus = !officer.isHidden;
      await updateOfficer(officer.id, { isHidden: newStatus });
      setOfficers(prev => prev.map(o => o.id === officer.id ? { ...o, isHidden: newStatus } : o));
    } catch (error) {
      console.error("Error updating visibility:", error);
      alert("Failed to update visibility");
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const handleMouseDown = (e: React.MouseEvent, column: ColumnKey) => {
    e.preventDefault();
    setResizingColumn(column);
    const startX = e.pageX;
    const startWidth = columnWidths[column];

    const handleMouseMove = (e: MouseEvent) => {
      const diff = e.pageX - startX;
      const newWidth = Math.max(50, startWidth + diff); // Minimum width of 50px
      setColumnWidths((prev) => {
        const updated = { ...prev, [column]: newWidth };
        if (typeof window !== "undefined") {
          localStorage.setItem("officerColumnWidths", JSON.stringify(updated));
        }
        return updated;
      });
    };

    const handleMouseUp = () => {
      setResizingColumn(null);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const sortedOfficers = [...officers].sort((a, b) => {
    let aValue: string = "";
    let bValue: string = "";

    switch (sortField) {
      case "rank":
        aValue = a.rank || "";
        bValue = b.rank || "";
        break;
      case "agid":
        aValue = a.agid || "";
        bValue = b.agid || "";
        break;
      case "name":
        aValue = a.name || "";
        bValue = b.name || "";
        break;
      case "mobile":
        aValue = a.mobile || "";
        bValue = b.mobile || "";
        break;
      case "email":
        aValue = a.email || "";
        bValue = b.email || "";
        break;
      case "landline":
        aValue = a.landline || "";
        bValue = b.landline || "";
        break;
      case "district":
        aValue = a.district || "";
        bValue = b.district || "";
        break;
      case "office":
        aValue = a.office || "";
        bValue = b.office || "";
        break;
      case "unit":
        aValue = a.unit || "";
        bValue = b.unit || "";
        break;
    }

    const comparison = aValue.localeCompare(bValue);
    return sortDirection === "asc" ? comparison : -comparison;
  });

  const filteredOfficers = sortedOfficers.filter((officer) => {
    if (!searchTerm.trim()) return true;
    const terms = searchTerm.toLowerCase().split(/\s+/).filter(t => t.length > 0);
    // Smart Search using pre-calculated blob
    return terms.every(term => officer.searchBlob.includes(term));
  });

  const handleExportCSV = () => {
    if (officers.length === 0) return;

    // Prepare data for CSV
    const csvData = officers.map(off => ({
      AGID: off.agid || "",
      Name: off.name || "",
      Rank: off.rank || "",
      Email: off.email || "",
      Mobile: off.mobile || "",
      Landline: off.landline || "",
      District: off.district || "",
      Office: off.office || "",
      Unit: off.unit || "",
    }));

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `officers_export_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportJSON = () => {
    if (officers.length === 0) return;

    const jsonString = JSON.stringify(officers, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `officers_export_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate mobile number format - allow "NM" or 10 digits if provided
    const mobileUpper = formData.mobile.trim().toUpperCase();
    if (mobileUpper && mobileUpper !== "NM" && mobileUpper.length !== 10) {
      alert("Mobile number must be 10 digits or 'NM' if provided");
      return;
    }

    // Validate District for Non-Special Units
    if (!isSpecialUnit && !formData.district) {
      alert("District is required for this unit.");
      return;
    }

    setSubmitting(true);

    try {
      await createOfficer({
        agid: formData.agid.trim() || undefined,
        rank: formData.rank.trim(),
        name: formData.name.trim(),
        mobile: formData.mobile.trim().toUpperCase() || "",
        email: formData.email.trim() || undefined,
        landline: formData.landline.trim() || undefined,
        // If special unit, we might allow empty district, or handle it as specific value?
        // Standard Officer model has 'district'. If empty, it's fine if backend allows.
        // Assuming undefined is fine if model allows.
        district: formData.district || "HQ", // Fallback to HQ if hidden? Or undefined? Let's check model. 
        // Actually, if hidden, usually we just send whatever or empty string. 
        // Let's send what's in formData. If validation passed, it's fine.
        office: formData.office.trim() || undefined,
        unit: formData.unit.trim() || undefined,
      });
      setFormData({
        agid: "",
        rank: "",
        name: "",
        mobile: "",
        mobile2: "",
        email: "",
        landline: "",
        landline2: "",
        district: "",
        office: "",
        unit: "",
      });
      setSelectedDistrict("");
      setStations([]);
      setShowForm(false);
      await loadData();
    } catch (error) {
      console.error("Error creating officer:", error);
      alert("Failed to create officer");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-lg text-slate-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold text-slate-100">Officers</h1>
          <span className="rounded-full bg-dark-sidebar px-3 py-1 text-sm font-medium text-primary-400 border border-dark-border">
            Total: {officers.length}
          </span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 rounded-lg bg-emerald-600/20 px-4 py-2 text-emerald-400 border border-emerald-600/50 hover:bg-emerald-600/30 transition-all"
            title="Export to CSV"
          >
            <FileSpreadsheet className="h-5 w-5" />
            <span className="hidden sm:inline">CSV</span>
          </button>
          <button
            onClick={handleExportJSON}
            className="flex items-center gap-2 rounded-lg bg-amber-600/20 px-4 py-2 text-amber-400 border border-amber-600/50 hover:bg-amber-600/30 transition-all"
            title="Export to JSON"
          >
            <FileJson className="h-5 w-5" />
            <span className="hidden sm:inline">JSON</span>
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-white transition-colors hover:bg-primary-700"
          >
            <Plus className="h-5 w-5" />
            Add Officer
          </button>
        </div>
      </div>

      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search officers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg bg-dark-card border border-dark-border py-2 pl-10 pr-4 text-slate-100 placeholder-slate-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50"
          />
        </div>
      </div>

      {showForm && (
        <div className="mb-6 rounded-lg bg-dark-card border border-dark-border p-6 shadow-lg">
          <h2 className="mb-4 text-xl font-semibold text-slate-100">Add New Officer</h2>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div>
                <label className="block text-sm font-medium text-slate-400">
                  Unit (Optional)
                </label>
                <select
                  value={formData.unit}
                  onChange={handleUnitChange}
                  className="mt-1 block w-full rounded-md bg-dark-sidebar border border-dark-border px-3 py-2 text-slate-100 placeholder-slate-400 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-400/50"
                >
                  <option value="">Select Unit</option>
                  {units.map((unit) => (
                    <option key={unit.id} value={unit.name}>
                      {unit.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400">
                  AGID
                </label>
                <input
                  type="text"
                  value={formData.agid}
                  onChange={(e) => setFormData({ ...formData, agid: e.target.value })}
                  className="mt-1 block w-full rounded-md bg-dark-sidebar border border-dark-border px-3 py-2 text-slate-100 placeholder-slate-400 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-400/50"
                  placeholder="Auto-generated or enter manually"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400">
                  Rank
                </label>
                <select
                  value={formData.rank}
                  onChange={(e) => setFormData({ ...formData, rank: e.target.value })}
                  className="mt-1 block w-full rounded-md bg-dark-sidebar border border-dark-border px-3 py-2 text-slate-100 placeholder-slate-400 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-400/50"
                >
                  <option value="">Select Rank (Optional)</option>
                  {ranks.map((rank) => (
                    <option key={rank.rank_id} value={rank.equivalent_rank || rank.rank_id}>
                      {rank.rank_id}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400">
                  Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="mt-1 block w-full rounded-md bg-dark-sidebar border border-dark-border px-3 py-2 text-slate-100 placeholder-slate-400 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-400/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400">
                  Mobile
                </label>
                <input
                  type="text"
                  value={formData.mobile}
                  onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                  className="mt-1 block w-full rounded-md bg-dark-sidebar border border-dark-border px-3 py-2 text-slate-100 placeholder-slate-400 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-400/50"
                  placeholder="Enter 10 digits or 'NM'"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="mt-1 block w-full rounded-md bg-dark-sidebar border border-dark-border px-3 py-2 text-slate-100 placeholder-slate-400 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-400/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400">
                  Landline
                </label>
                <input
                  type="tel"
                  value={formData.landline}
                  onChange={(e) => setFormData({ ...formData, landline: e.target.value })}
                  className="mt-1 block w-full rounded-md bg-dark-sidebar border border-dark-border px-3 py-2 text-slate-100 placeholder-slate-400 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-400/50"
                  placeholder="e.g., 08151-123456"
                />
              </div>
              {!isSpecialUnit && (
                <div>
                  <label className="block text-sm font-medium text-slate-400">
                    District / HQ *
                  </label>
                  <select
                    required={!isSpecialUnit}
                    value={selectedDistrict}
                    onChange={handleDistrictChange}
                    className="mt-1 block w-full rounded-md bg-dark-sidebar border border-dark-border px-3 py-2 text-slate-100 placeholder-slate-400 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-400/50"
                  >
                    <option value="">Select District / HQ</option>
                    {availableDistricts.map((d) => (
                      <option key={d.id} value={d.name}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {(!isSpecialUnit || hasSections) && (
                <div>
                  <label className="block text-sm font-medium text-slate-400">
                    Station / Section
                  </label>
                  <select
                    value={formData.office}
                    onChange={(e) => setFormData({ ...formData, office: e.target.value })}
                    disabled={!selectedDistrict && !hasSections}
                    className="mt-1 block w-full rounded-md bg-dark-sidebar border border-dark-border px-3 py-2 text-slate-100 placeholder-slate-400 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-400/50 disabled:bg-dark-accent-light disabled:text-slate-500"
                  >
                    <option value="">Select Station / Section</option>
                    {stations.map((s) => (
                      <option key={s.id} value={s.name}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <div className="mt-4 flex gap-4">
              <button
                type="submit"
                disabled={submitting}
                className="rounded-lg bg-primary-600 px-6 py-2 text-white transition-colors hover:bg-primary-700 disabled:opacity-50"
              >
                {submitting ? "Saving..." : "Save Officer"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setFormData({
                    agid: "",
                    rank: "",
                    name: "",
                    mobile: "",
                    mobile2: "",
                    email: "",
                    landline: "",
                    landline2: "",
                    district: "",
                    office: "",
                    unit: "",
                  });
                  setSelectedDistrict("");
                  setStations([]);
                }}
                className="rounded-lg border border-dark-border px-6 py-2 text-slate-400 transition-colors hover:bg-dark-sidebar hover:text-slate-100"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="overflow-auto rounded-lg bg-dark-card border border-dark-border shadow-lg h-[calc(100vh-220px)]" style={{ WebkitOverflowScrolling: 'touch' }}>
        <table className="w-full" style={{ tableLayout: 'fixed', minWidth: '1200px' }}>
          <thead className="bg-dark-sidebar border-b border-dark-border sticky top-0 z-10">
            <tr>
              <th
                className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-400 cursor-pointer hover:bg-dark-card select-none relative"
                onClick={() => handleSort("agid")}
                style={{ width: columnWidths.agid }}
              >
                <div className="flex items-center gap-1">
                  AGID
                  {sortField === "agid" && (
                    sortDirection === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                  )}
                </div>
                <div
                  className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary-500 bg-transparent"
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    handleMouseDown(e, "agid");
                  }}
                />
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-400 cursor-pointer hover:bg-dark-card select-none relative"
                onClick={() => handleSort("rank")}
                style={{ width: columnWidths.rank }}
              >
                <div className="flex items-center gap-1">
                  Rank
                  {sortField === "rank" && (
                    sortDirection === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                  )}
                </div>
                <div
                  className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary-500 bg-transparent"
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    handleMouseDown(e, "rank");
                  }}
                />
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-400 cursor-pointer hover:bg-dark-card select-none relative"
                onClick={() => handleSort("name")}
                style={{ width: columnWidths.name }}
              >
                <div className="flex items-center gap-1">
                  Name
                  {sortField === "name" && (
                    sortDirection === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                  )}
                </div>
                <div
                  className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary-500 bg-transparent"
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    handleMouseDown(e, "name");
                  }}
                />
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-400 cursor-pointer hover:bg-dark-card select-none relative"
                onClick={() => handleSort("mobile")}
                style={{ width: columnWidths.mobile }}
              >
                <div className="flex items-center gap-1">
                  Mobile
                  {sortField === "mobile" && (
                    sortDirection === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                  )}
                </div>
                <div
                  className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary-500 bg-transparent"
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    handleMouseDown(e, "mobile");
                  }}
                />
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-400 cursor-pointer hover:bg-dark-card select-none relative"
                onClick={() => handleSort("email")}
                style={{ width: columnWidths.email }}
              >
                <div className="flex items-center gap-1">
                  Email
                  {sortField === "email" && (
                    sortDirection === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                  )}
                </div>
                <div
                  className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary-500 bg-transparent"
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    handleMouseDown(e, "email");
                  }}
                />
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-400 cursor-pointer hover:bg-dark-card select-none relative"
                onClick={() => handleSort("landline")}
                style={{ width: columnWidths.landline }}
              >
                <div className="flex items-center gap-1">
                  Landline
                  {sortField === "landline" && (
                    sortDirection === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                  )}
                </div>
                <div
                  className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary-500 bg-transparent"
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    handleMouseDown(e, "landline");
                  }}
                />
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-400 cursor-pointer hover:bg-dark-card select-none relative"
                onClick={() => handleSort("district")}
                style={{ width: columnWidths.district }}
              >
                <div className="flex items-center gap-1">
                  District
                  {sortField === "district" && (
                    sortDirection === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                  )}
                </div>
                <div
                  className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary-500 bg-transparent"
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    handleMouseDown(e, "district");
                  }}
                />
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-400 cursor-pointer hover:bg-dark-card select-none relative"
                onClick={() => handleSort("office")}
                style={{ width: columnWidths.office }}
              >
                <div className="flex items-center gap-1">
                  Station
                  {sortField === "office" && (
                    sortDirection === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                  )}
                </div>
                <div
                  className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary-500 bg-transparent"
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    handleMouseDown(e, "office");
                  }}
                />
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-400 cursor-pointer hover:bg-dark-card select-none relative"
                onClick={() => handleSort("unit")}
                style={{ width: columnWidths.unit }}
              >
                <div className="flex items-center gap-1">
                  Unit
                  {sortField === "unit" && (
                    sortDirection === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                  )}
                </div>
                <div
                  className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary-500 bg-transparent"
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    handleMouseDown(e, "unit");
                  }}
                />
              </th>
              <th
                className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-400 relative"
                style={{ width: columnWidths.actions }}
              >
                Actions
                <div
                  className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary-500 bg-transparent"
                  onMouseDown={(e) => handleMouseDown(e, "actions")}
                />
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-dark-border bg-dark-card">
            {filteredOfficers.map((officer) => (
              <tr key={officer.id} className={`hover:bg-dark-sidebar transition-colors ${officer.isHidden ? 'opacity-50 grayscale' : ''}`}>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-100 overflow-hidden text-ellipsis" style={{ maxWidth: columnWidths.agid }}>
                  {officer.agid || "N/A"}
                  {officer.isHidden && <span className="ml-2 text-xs bg-gray-700 text-gray-300 px-1 rounded">Hidden</span>}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-slate-100">
                  {officer.rank}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-100 overflow-hidden text-ellipsis" style={{ maxWidth: columnWidths.name }}>
                  {officer.name}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-400 overflow-hidden text-ellipsis" style={{ maxWidth: columnWidths.mobile }}>
                  {officer.mobile}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-400 overflow-hidden text-ellipsis" style={{ maxWidth: columnWidths.email }}>
                  {officer.email || "N/A"}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-400 overflow-hidden text-ellipsis" style={{ maxWidth: columnWidths.landline }}>
                  {officer.landline || "N/A"}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-400 overflow-hidden text-ellipsis" style={{ maxWidth: columnWidths.district }}>
                  {officer.district}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-400 overflow-hidden text-ellipsis" style={{ maxWidth: columnWidths.office }}>
                  {officer.office || "N/A"}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-400 overflow-hidden text-ellipsis" style={{ maxWidth: columnWidths.unit }}>
                  {officer.unit || "N/A"}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => handleToggleVisibility(officer)}
                      className="text-slate-400 hover:text-slate-200"
                      title={officer.isHidden ? "Unhide" : "Hide"}
                    >
                      {officer.isHidden ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                    <Link
                      href={`/officers/edit?id=${officer.id}`}
                      className="text-primary-400 hover:text-primary-300"
                    >
                      <Edit className="h-5 w-5" />
                    </Link>
                    <button
                      onClick={() => handleDelete(officer.id!)}
                      className="text-red-400 hover:text-red-300"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredOfficers.length === 0 && (
              <tr>
                <td colSpan={9} className="px-6 py-4 text-center text-sm text-slate-400">
                  No officers found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
