"use client";

import { useEffect, useState } from "react";
import {
  getDistricts, createDistrict, updateDistrict, deleteDistrict, District,
  getDocuments, updateDocument
} from "@/lib/firebase/firestore";
import { Plus, Edit, Trash2, RefreshCw, Eraser, PenLine, Check, X } from "lucide-react";
import { DISTRICTS } from "@/lib/constants";
import { where } from "firebase/firestore";

type ColumnKey = "name" | "shortCode" | "range" | "status" | "actions";

const defaultColumnWidths: Record<ColumnKey, number> = {
  name: 250,
  shortCode: 110,
  range: 200,
  status: 120,
  actions: 120,
};

export default function DistrictsPage() {
  const [districts, setDistricts] = useState<District[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: "", range: "", shortCode: "" });
  const [submitting, setSubmitting] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [cleaning, setCleaning] = useState(false);

  // Inline short-code edit state
  const [editingShortCodeId, setEditingShortCodeId] = useState<string | null>(null);
  const [shortCodeValue, setShortCodeValue] = useState("");
  const [savingShortCode, setSavingShortCode] = useState(false);

  const [columnWidths, setColumnWidths] = useState<Record<ColumnKey, number>>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("districtColumnWidths");
      return saved ? { ...defaultColumnWidths, ...JSON.parse(saved) } : defaultColumnWidths;
    }
    return defaultColumnWidths;
  });
  const [, setResizingColumn] = useState<ColumnKey | null>(null);

  useEffect(() => {
    loadDistricts();
  }, []);

  const loadDistricts = async () => {
    try {
      const data = await getDistricts();
      setDistricts(data);
    } catch (error) {
      console.error("Error loading districts:", error);
      alert("Failed to load districts. Please check the console for details.");
    } finally {
      setLoading(false);
    }
  };

  const handlePopulateDefaults = async () => {
    if (!confirm(`This will add up to ${DISTRICTS.length} default districts from the system constants (including DCRE Ranges & IRB). Continue?`)) return;
    setMigrating(true);
    try {
      const existingNames = new Set(districts.map(d => d.name.toLowerCase()));
      let addedCount = 0;
      for (const districtName of DISTRICTS) {
        if (!existingNames.has(districtName.toLowerCase())) {
          await createDistrict({ name: districtName, isActive: true });
          addedCount++;
        }
      }
      alert(`Successfully added ${addedCount} new districts.`);
      await loadDistricts();
    } catch (error: any) {
      console.error("Error populating default districts:", error);
      alert(`Failed to populate default districts: ${error.message}`);
    } finally {
      setMigrating(false);
    }
  };

  const handleCleanupNames = async () => {
    if (!confirm("⚠️ DANGER: This will RENAME districts by removing suffixes (e.g., 'Raichur -BR' -> 'Raichur') and update ALL linked Stations, Employees, and Units. This cannot be undone. Are you sure?")) return;

    setCleaning(true);
    try {
      const suffixRegex = /\s*-[A-Z]{2,4}$/;
      let processed = 0;
      const allDistricts = await getDistricts();
      const nameToId = new Map<string, string>();
      allDistricts.forEach(d => nameToId.set(d.name.toLowerCase(), d.id!));

      for (const dist of allDistricts) {
        if (dist.name.match(suffixRegex)) {
          const oldName = dist.name;
          const newName = dist.name.replace(suffixRegex, "").trim();
          if (oldName === newName) continue;

          const stations = await getDocuments<any>("stations", [where("district", "==", oldName)]);
          for (const st of stations) await updateDocument("stations", st.id, { district: newName });

          const employees = await getDocuments<any>("employees", [where("district", "==", oldName)]);
          for (const emp of employees) await updateDocument("employees", emp.id, { district: newName });

          const units = await getDocuments<any>("units", []);
          for (const unit of units) {
            if (unit.mappedDistricts && unit.mappedDistricts.includes(oldName)) {
              const newMapped = unit.mappedDistricts.map((d: string) => d === oldName ? newName : d);
              const uniqueMapped = Array.from(new Set(newMapped));
              await updateDocument("units", unit.id, { mappedDistricts: uniqueMapped });
            }
          }

          const targetId = nameToId.get(newName.toLowerCase());
          if (targetId && targetId !== dist.id) {
            await deleteDistrict(dist.id!);
          } else {
            await updateDistrict(dist.id!, { name: newName });
            nameToId.set(newName.toLowerCase(), dist.id!);
          }
          processed++;
        }
      }
      alert(`Cleanup complete. Processed ${processed} districts.`);
      await loadDistricts();
    } catch (e: any) {
      console.error("Cleanup error:", e);
      alert(`Error during cleanup: ${e.message}`);
    } finally {
      setCleaning(false);
    }
  };

  const handleAutoPopulateRanges = async () => {
    if (!confirm("This will automatically assign ranges to all districts based on official Karnataka Police structure. Continue?")) return;
    setMigrating(true);
    try {
      const rangeMapping: Record<string, string> = {
        "Mysuru": "Southern Range", "Kodagu": "Southern Range", "Mandya": "Southern Range",
        "Hassan": "Southern Range", "Chamarajanagara": "Southern Range", "Chamarajanagar": "Southern Range",
        "Dakshina Kannada": "Western Range", "Mangaluru": "Western Range", "Udupi": "Western Range",
        "Chikkamagaluru": "Western Range", "Chikmagalur": "Western Range", "Uttara Kannada": "Western Range",
        "Chitradurga": "Eastern Range", "Davanagere": "Eastern Range", "Davangere": "Eastern Range",
        "Haveri": "Eastern Range", "Shivamogga": "Eastern Range", "Shimoga": "Eastern Range",
        "Bengaluru Rural": "Central Range", "Bengaluru Urban": "Central Range", "Bengaluru City": "Central Range",
        "Bengaluru": "Central Range", "Bangalore": "Central Range", "Chikkaballapura": "Central Range",
        "Chikballapur": "Central Range", "Kolar": "Central Range", "Ramanagara": "Central Range",
        "Ramanagar": "Central Range", "Tumakuru": "Central Range", "Tumkur": "Central Range",
        "Bagalkote": "Northern Range", "Bagalkot": "Northern Range", "Belagavi": "Northern Range",
        "Belgaum": "Northern Range", "Dharwad": "Northern Range", "Gadag": "Northern Range",
        "Vijayapura": "Northern Range", "Bijapur": "Northern Range",
        "Bidar": "North Eastern Range", "Kalaburagi": "North Eastern Range", "Gulbarga": "North Eastern Range",
        "Yadgir": "North Eastern Range", "Yadagiri": "North Eastern Range",
        "Ballari": "Ballari Range", "Bellary": "Ballari Range", "Koppal": "Ballari Range",
        "Raichur": "Ballari Range", "Raichuru": "Ballari Range", "Vijayanagara": "Ballari Range",
      };

      let updatedCount = 0;
      for (const district of districts) {
        const range = rangeMapping[district.name];
        if (range && district.range !== range) {
          await updateDistrict(district.id!, { range });
          updatedCount++;
        }
      }
      alert(`Successfully assigned ranges to ${updatedCount} districts.`);
      await loadDistricts();
    } catch (error: any) {
      console.error("Error populating ranges:", error);
      alert(`Failed to populate ranges: ${error.message}`);
    } finally {
      setMigrating(false);
    }
  };

  const handleAutoPopulateShortCodes = async () => {
    if (!confirm("This will auto-assign short codes to all districts that don't already have one. Existing codes will NOT be overwritten. Continue?")) return;
    setMigrating(true);
    try {
      const shortCodeMapping: Record<string, string> = {
        // Central Range (Bengaluru)
        "Bengaluru City": "BLR-C",
        "Belagavi City": "BGM-C",
        "Bengaluru Rural": "BLR-R",
        "Bengaluru Dist": "BLR-R",
        "Bengaluru": "BLR",
        "Bangalore": "BLR",
        "Chikkaballapura": "CBP",
        "Chikballapur": "CBP",
        "Kolar": "KLR",
        "Ramanagara": "RNR",
        "Ramanagar": "RNR",
        "Tumakuru": "TUM",
        "Tumkur": "TUM",
        // Southern Range (Mysuru)
        "Mysuru": "MYS",
        "Mandya": "MDY",
        "Hassan": "HSN",
        "Kodagu": "KDG",
        "Chamarajanagar": "CMR",
        "Chamarajanagara": "CMR",
        // Western Range (Mangaluru)
        "Dakshina Kannada": "DK",
        "Mangaluru": "DK",
        "Uttara Kannada": "UK",
        "Udupi": "UDP",
        "Chikkamagaluru": "CKM",
        "Chikmagalur": "CKM",
        // Eastern Range (Davangere)
        "Davangere": "DVG",
        "Davanagere": "DVG",
        "Chitradurga": "CTA",
        "Shivamogga": "SMG",
        "Shimoga": "SMG",
        "Haveri": "HVR",
        // Northern Range (Belagavi)
        "Belagavi": "BGM",
        "Belagavi Dist": "BGM",
        "Belgaum": "BGM",
        "Bagalkote": "BGK",
        "Bagalkot": "BGK",
        "Dharwad": "DWD",
        "Hubballi Dharwad City": "HBL",
        "Hubli Dharwad": "HBL",
        "Gadag": "GDG",
        "Vijayapura": "VJP",
        "Bijapur": "VJP",
        // North Eastern Range (Kalaburagi)
        "Kalaburagi": "KLB",
        "Gulbarga": "KLB",
        "Bidar": "BDR",
        "Yadgir": "YDG",
        "Yadagiri": "YDG",
        // Ballari Range
        "Ballari": "BLR",
        "Bellary": "BLR",
        "Koppal": "KPL",
        "Raichur": "RCR",
        "Raichuru": "RCR",
        "Vijayanagara": "VJN",
      };

      let updatedCount = 0;
      for (const district of districts) {
        if (district.shortCode) continue; // don't overwrite existing
        const code = shortCodeMapping[district.name];
        if (code) {
          await updateDistrict(district.id!, { shortCode: code });
          updatedCount++;
        }
      }
      alert(`Successfully assigned short codes to ${updatedCount} district(s).`);
      await loadDistricts();
    } catch (error: any) {
      console.error("Error assigning short codes:", error);
      alert(`Failed to assign short codes: ${error.message}`);
    } finally {
      setMigrating(false);
    }
  };

  const handleEdit = (district: District) => {
    setEditingId(district.id || null);
    setEditingShortCodeId(null); // close any open short-code editor
    setFormData({
      name: district.name,
      range: district.range || "",
      shortCode: district.shortCode || "",
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;
    try {
      await deleteDistrict(id);
      await loadDistricts();
    } catch (error) {
      console.error("Error deleting district:", error);
      alert("Failed to delete district");
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({ name: "", range: "", shortCode: "" });
  };

  // ── Short-code inline edit ──────────────────────────────────────────────────
  const startEditShortCode = (district: District) => {
    setEditingShortCodeId(district.id || null);
    setShortCodeValue(district.shortCode || "");
  };

  const cancelEditShortCode = () => {
    setEditingShortCodeId(null);
    setShortCodeValue("");
  };

  const saveShortCode = async (district: District) => {
    const code = shortCodeValue.trim().toUpperCase();
    if (code.length > 0 && (code.length < 2 || code.length > 5)) {
      alert("Short code must be 2–5 characters (e.g. SR, DWD or BLR-C).");
      return;
    }
    setSavingShortCode(true);
    try {
      await updateDistrict(district.id!, { shortCode: code || undefined });
      await loadDistricts();
      cancelEditShortCode();
    } catch (err: any) {
      alert(`Failed to save short code: ${err.message}`);
    } finally {
      setSavingShortCode(false);
    }
  };
  // ───────────────────────────────────────────────────────────────────────────

  const handleMouseDown = (e: React.MouseEvent, column: ColumnKey) => {
    e.preventDefault();
    setResizingColumn(column);
    const startX = e.pageX;
    const startWidth = columnWidths[column];

    const handleMouseMove = (e: MouseEvent) => {
      const diff = e.pageX - startX;
      const newWidth = Math.max(50, startWidth + diff);
      setColumnWidths((prev) => {
        const updated = { ...prev, [column]: newWidth };
        if (typeof window !== "undefined") {
          localStorage.setItem("districtColumnWidths", JSON.stringify(updated));
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = formData.shortCode.trim().toUpperCase();
    if (code.length > 0 && (code.length < 2 || code.length > 5)) {
      alert("Short code must be 2–5 characters (e.g. SR, DWD or BLR-C).");
      return;
    }
    setSubmitting(true);
    try {
      const payload: Partial<District> = {
        name: formData.name.trim(),
        range: formData.range.trim() || "",
        ...(code ? { shortCode: code } : {}),
      };
      if (editingId) {
        await updateDistrict(editingId, payload);
      } else {
        await createDistrict({ ...payload, name: formData.name.trim(), isActive: true });
      }
      handleCancel();
      await loadDistricts();
    } catch (error) {
      console.error("Error saving district:", error);
      alert(`Failed to ${editingId ? "update" : "create"} district`);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-dark">
        <div className="text-lg text-slate-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">Districts</h1>
        <div className="flex gap-3">
          <button
            onClick={handlePopulateDefaults}
            disabled={migrating}
            className="flex items-center gap-2 rounded-lg bg-slate-700 px-4 py-2 text-white transition-all hover:bg-slate-600 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${migrating ? "animate-spin" : ""}`} />
            {migrating ? "Populating..." : "Sync Defaults"}
          </button>
          <button
            onClick={handleAutoPopulateRanges}
            disabled={migrating}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white transition-all hover:bg-blue-500 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${migrating ? "animate-spin" : ""}`} />
            {migrating ? "Assigning..." : "Auto-Assign Ranges"}
          </button>
          <button
            onClick={handleAutoPopulateShortCodes}
            disabled={migrating}
            className="flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-white transition-all hover:bg-teal-500 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${migrating ? "animate-spin" : ""}`} />
            {migrating ? "Assigning..." : "Auto-Assign Codes"}
          </button>
          <button
            onClick={handleCleanupNames}
            disabled={cleaning}
            className="flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2 text-white transition-all hover:bg-orange-500 disabled:opacity-50"
          >
            <Eraser className={`h-4 w-4 ${cleaning ? "animate-pulse" : ""}`} />
            {cleaning ? "Cleaning..." : "Normalize Names"}
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 px-4 py-2 text-white transition-all hover:shadow-lg hover:shadow-purple-500/50"
          >
            <Plus className="h-5 w-5" />
            Add District
          </button>
        </div>
      </div>

      {showForm && !editingId && (
        <div className="mb-6 rounded-lg bg-dark-card border border-dark-border p-6 shadow-lg">
          <h2 className="mb-4 text-xl font-semibold text-slate-100">Add New District</h2>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <label className="block text-sm font-medium text-slate-400">Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="mt-1 block w-full rounded-md bg-dark-sidebar border border-dark-border px-3 py-2 text-slate-100 placeholder-slate-400 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400">Short Code <span className="text-slate-500 text-xs">(2–5 chars, e.g. SR / DWD / BLR-C)</span></label>
                <input
                  type="text"
                  maxLength={5}
                  placeholder="e.g. BLR"
                  value={formData.shortCode}
                  onChange={(e) => setFormData({ ...formData, shortCode: e.target.value.toUpperCase() })}
                  className="mt-1 block w-full rounded-md bg-dark-sidebar border border-dark-border px-3 py-2 text-slate-100 placeholder-slate-400 font-mono tracking-widest focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400">Range</label>
                <select
                  value={formData.range}
                  onChange={(e) => setFormData({ ...formData, range: e.target.value })}
                  className="mt-1 block w-full rounded-md bg-dark-sidebar border border-dark-border px-3 py-2 text-slate-100 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                >
                  <option value="">Select Range</option>
                  <option value="Southern Range">Southern Range (Mysuru)</option>
                  <option value="Western Range">Western Range (Mangaluru)</option>
                  <option value="Eastern Range">Eastern Range (Davangere)</option>
                  <option value="Central Range">Central Range (Bengaluru)</option>
                  <option value="Northern Range">Northern Range (Belagavi)</option>
                  <option value="North Eastern Range">North Eastern Range (Kalaburagi)</option>
                  <option value="Ballari Range">Ballari Range (Ballari)</option>
                </select>
              </div>
            </div>
            <div className="mt-4 flex gap-4">
              <button
                type="submit"
                disabled={submitting}
                className="rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 px-6 py-2 text-white transition-all hover:shadow-lg hover:shadow-purple-500/50 disabled:opacity-50"
              >
                {submitting ? "Saving..." : "Save District"}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="rounded-lg border border-dark-border px-6 py-2 text-slate-400 transition-colors hover:bg-dark-sidebar hover:text-slate-100"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="overflow-x-auto rounded-lg bg-dark-card border border-dark-border shadow-lg" style={{ overflowX: 'scroll', WebkitOverflowScrolling: 'touch' }}>
        <table className="w-full" style={{ tableLayout: 'fixed' }}>
          <thead className="bg-dark-sidebar border-b border-dark-border">
            <tr>
              <th
                className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-400 relative"
                style={{ width: columnWidths.name }}
              >
                Name
                <div
                  onMouseDown={(e) => handleMouseDown(e, "name")}
                  className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-purple-500"
                />
              </th>
              <th
                className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-400 relative"
                style={{ width: columnWidths.shortCode }}
              >
                Short Code
                <div
                  onMouseDown={(e) => handleMouseDown(e, "shortCode")}
                  className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-purple-500"
                />
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-400 relative"
                style={{ width: columnWidths.range }}
              >
                Range
                <div
                  onMouseDown={(e) => handleMouseDown(e, "range")}
                  className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-purple-500"
                />
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-400 relative"
                style={{ width: columnWidths.status }}
              >
                Status
                <div
                  onMouseDown={(e) => handleMouseDown(e, "status")}
                  className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-purple-500"
                />
              </th>
              <th
                className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-400 relative"
                style={{ width: columnWidths.actions }}
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-dark-border bg-dark-card">
            {districts.map((district) => (
              editingId === district.id ? (
                // ── Full inline edit row ──────────────────────────────────
                <tr key={district.id} className="bg-dark-sidebar">
                  <td colSpan={5} className="px-6 py-4">
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                        <div>
                          <label className="block text-sm font-medium text-slate-400 mb-1">Name *</label>
                          <input
                            type="text"
                            required
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="block w-full rounded-md bg-dark-card border border-dark-border px-3 py-2 text-slate-100 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-400 mb-1">
                            Short Code <span className="text-slate-500 text-xs">(2–5 chars, e.g. SR / DWD / BLR-C)</span>
                          </label>
                          <input
                            type="text"
                            maxLength={5}
                            placeholder="e.g. BLR"
                            value={formData.shortCode}
                            onChange={(e) => setFormData({ ...formData, shortCode: e.target.value.toUpperCase() })}
                            className="block w-full rounded-md bg-dark-card border border-dark-border px-3 py-2 text-slate-100 font-mono tracking-widest focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-400 mb-1">Range</label>
                          <select
                            value={formData.range}
                            onChange={(e) => setFormData({ ...formData, range: e.target.value })}
                            className="block w-full rounded-md bg-dark-card border border-dark-border px-3 py-2 text-slate-100 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                          >
                            <option value="">Select Range</option>
                            <option value="Southern Range">Southern Range (Mysuru)</option>
                            <option value="Western Range">Western Range (Mangaluru)</option>
                            <option value="Eastern Range">Eastern Range (Davangere)</option>
                            <option value="Central Range">Central Range (Bengaluru)</option>
                            <option value="Northern Range">Northern Range (Belagavi)</option>
                            <option value="North Eastern Range">North Eastern Range (Kalaburagi)</option>
                            <option value="Ballari Range">Ballari Range (Ballari)</option>
                          </select>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <button
                          type="submit"
                          disabled={submitting}
                          className="rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 px-4 py-2 text-sm text-white transition-all hover:shadow-lg hover:shadow-purple-500/50 disabled:opacity-50"
                        >
                          {submitting ? "Saving..." : "Save"}
                        </button>
                        <button
                          type="button"
                          onClick={handleCancel}
                          className="rounded-lg border border-dark-border px-4 py-2 text-sm text-slate-400 transition-colors hover:bg-dark-card hover:text-slate-100"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  </td>
                </tr>
              ) : (
                // ── Normal row ────────────────────────────────────────────
                <tr key={district.id} className="hover:bg-dark-sidebar transition-colors">
                  {/* Name */}
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-slate-100 overflow-hidden text-ellipsis" style={{ maxWidth: columnWidths.name }}>
                    {district.name}
                  </td>

                  {/* Short Code – inline editable */}
                  <td className="px-4 py-4 text-sm overflow-hidden" style={{ maxWidth: columnWidths.shortCode }}>
                    {editingShortCodeId === district.id ? (
                      <div className="flex items-center gap-1">
                        <input
                          autoFocus
                          type="text"
                          maxLength={4}
                          value={shortCodeValue}
                          onChange={(e) => setShortCodeValue(e.target.value.toUpperCase())}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") saveShortCode(district);
                            if (e.key === "Escape") cancelEditShortCode();
                          }}
                          className="w-16 rounded-md bg-dark-sidebar border border-purple-500 px-2 py-1 text-xs font-mono text-purple-300 tracking-widest focus:outline-none"
                          placeholder="---"
                        />
                        <button
                          onClick={() => saveShortCode(district)}
                          disabled={savingShortCode}
                          className="text-green-400 hover:text-green-300 transition-colors disabled:opacity-50"
                          title="Save"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                        <button
                          onClick={cancelEditShortCode}
                          className="text-slate-400 hover:text-slate-300 transition-colors"
                          title="Cancel"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 group">
                        {district.shortCode ? (
                          <span className="inline-flex items-center rounded-md bg-purple-500/15 border border-purple-500/30 px-2 py-0.5 text-xs font-mono font-semibold text-purple-300 tracking-widest">
                            {district.shortCode}
                          </span>
                        ) : (
                          <span className="text-slate-600 text-xs italic">—</span>
                        )}
                        <button
                          onClick={() => startEditShortCode(district)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-500 hover:text-purple-400"
                          title="Edit short code"
                        >
                          <PenLine className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </td>

                  {/* Range */}
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-400 overflow-hidden text-ellipsis" style={{ maxWidth: columnWidths.range }}>
                    {district.range || "N/A"}
                  </td>

                  {/* Status */}
                  <td className="whitespace-nowrap px-6 py-4 overflow-hidden text-ellipsis" style={{ maxWidth: columnWidths.status }}>
                    <span className="inline-flex rounded-full bg-green-500/20 px-2 text-xs font-semibold text-green-400">
                      Active
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleEdit(district)}
                        className="text-purple-400 hover:text-purple-300 transition-colors"
                        title="Edit"
                      >
                        <Edit className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(district.id!, district.name)}
                        className="text-red-400 hover:text-red-300 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            ))}
          </tbody>
        </table>
        {districts.length === 0 && (
          <div className="py-12 text-center text-slate-400">
            No districts found
          </div>
        )}
      </div>
    </div>
  );
}
