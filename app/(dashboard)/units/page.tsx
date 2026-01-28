"use client";

import { useEffect, useState } from "react";
import { getUnits, createUnit, updateUnit, deleteUnit, Unit, getDistricts, District } from "@/lib/firebase/firestore";
import { Plus, Edit, Trash2, RefreshCw, X, Save, AlertTriangle, Info, Check } from "lucide-react";
import { DEFAULT_UNITS, KSRP_BATTALIONS } from "@/lib/constants";

type ColumnKey = "name" | "status" | "scope" | "actions";

const defaultColumnWidths: Record<ColumnKey, number> = {
    name: 300,
    status: 120,
    scope: 150,
    actions: 120,
};

// Fixed mapping types
const MAPPING_TYPES = [
    { value: "all", label: "All Districts" },
    { value: "state", label: "State Level" },
    { value: "single", label: "District Specific" },
    { value: "subset", label: "Multi-District / Battalion" },
    { value: "commissionerate", label: "Commissionerate" },
    { value: "none", label: "No District Required" },
];

export default function UnitsPage() {
    const [units, setUnits] = useState<Unit[]>([]);
    const [districts, setDistricts] = useState<District[]>([]); // For dropdowns
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState<Partial<Unit>>({ name: "", isActive: true, mappingType: "all", scopes: ["all"], mappedDistricts: [], isDistrictLevel: false });
    const [submitting, setSubmitting] = useState(false);
    const [migrating, setMigrating] = useState(false);
    const [columnWidths, setColumnWidths] = useState<Record<ColumnKey, number>>(() => {
        if (typeof window !== "undefined") {
            const saved = localStorage.getItem("unitColumnWidths");
            return saved ? { ...defaultColumnWidths, ...JSON.parse(saved) } : defaultColumnWidths;
        }
        return defaultColumnWidths;
    });
    const [resizingColumn, setResizingColumn] = useState<ColumnKey | null>(null);

    useEffect(() => {
        loadUnits();
        loadDistricts();
    }, []);

    const loadUnits = async () => {
        try {
            const data = await getUnits();
            console.log("Loaded units:", data);
            setUnits(data);
        } catch (error) {
            console.error("Error loading units:", error);
            alert("Failed to load units.");
        } finally {
            setLoading(false);
        }
    };

    const loadDistricts = async () => {
        try {
            const data = await getDistricts();
            setDistricts(data);
        } catch (error) {
            console.error("Error loading districts:", error);
        }
    };

    const handleEdit = (unit: Unit) => {
        setEditingId(unit.id || null);
        setFormData({
            name: unit.name,
            isActive: unit.isActive !== false,
            mappingType: unit.mappingType || "all",
            // Migrate legacy single scope to array
            scopes: unit.scopes || (unit.mappingType ? [unit.mappingType] : ["all"]),
            mappedDistricts: unit.mappedDistricts || [],
            isDistrictLevel: unit.isDistrictLevel || false,
        });
        setShowForm(true);
    };

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Are you sure you want to delete "${name}"?`)) return;
        try {
            await deleteUnit(id);
            await loadUnits();
        } catch (error) {
            console.error("Error deleting unit:", error);
            alert("Failed to delete unit");
        }
    };

    const handleCancel = () => {
        if (confirm("Discard changes?")) {
            setShowForm(false);
            setEditingId(null);
            setFormData({ name: "", isActive: true, mappingType: "all", mappedDistricts: [] });
        }
    };

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
                    localStorage.setItem("unitColumnWidths", JSON.stringify(updated));
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

    const handlePopulateDefaults = async () => {
        if (!confirm(`This will add ${DEFAULT_UNITS.length} default units from the system constants. Continue?`)) return;
        setMigrating(true);
        try {
            const existingNames = new Set(units.map(u => u.name.toLowerCase()));
            let addedCount = 0;
            for (const unitName of DEFAULT_UNITS) {
                if (!existingNames.has(unitName.toLowerCase())) {
                    await createUnit({ name: unitName, isActive: true, mappingType: "all" });
                    addedCount++;
                }
            }
            alert(`Successfully added ${addedCount} new units.`);
            await loadUnits();
        } catch (error: any) {
            console.error("Error populating default units:", error);
            alert(`Failed to populate default units: ${error.message}`);
        } finally {
            setMigrating(false);
        }
    };

    const handleScopeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newScope = e.target.value as Unit["mappingType"];
        setFormData({
            ...formData,
            mappingType: newScope,
            mappedDistricts: [] // Auto-clear mapped districts on scope change
        });
    };

    const toggleMappedDistrict = (districtName: string) => {
        const current = formData.mappedDistricts || [];
        if (current.includes(districtName)) {
            setFormData({ ...formData, mappedDistricts: current.filter(d => d !== districtName) });
        } else {
            setFormData({ ...formData, mappedDistricts: [...current, districtName] });
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Strict Validation Rules
        if (formData.mappingType === "single" && (!formData.mappedDistricts || formData.mappedDistricts.length === 0)) {
            alert("❌ Validation Error: Scope is 'District Specific' but no district is selected.");
            return;
        }
        if ((formData.mappingType === "subset" || formData.mappingType === "commissionerate") && (!formData.mappedDistricts || formData.mappedDistricts.length === 0)) {
            alert("❌ Validation Error: Scope is 'Multi-District' but no districts are selected.");
            return;
        }

        setSubmitting(true);
        try {
            const payload = {
                name: formData.name?.trim() || "",
                isActive: formData.isActive,
                mappingType: formData.mappingType,
                mappedDistricts: formData.mappedDistricts,
                isDistrictLevel: formData.isDistrictLevel
            };

            if (editingId) {
                await updateUnit(editingId, payload);
            } else {
                await createUnit(payload);
            }
            setShowForm(false); // Close without confirm for success
            setEditingId(null);
            setFormData({ name: "", isActive: true, mappingType: "all", mappedDistricts: [] });
            await loadUnits();
        } catch (error) {
            console.error("Error saving unit:", error);
            alert(`Failed to ${editingId ? "update" : "create"} unit`);
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

    // Modal UI
    const renderModal = () => (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="w-full max-w-2xl rounded-xl bg-dark-card border border-dark-border shadow-2xl flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-dark-border p-6">
                    <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                        {editingId ? <Edit className="w-5 h-5 text-purple-400" /> : <Plus className="w-5 h-5 text-green-400" />}
                        {editingId ? "Edit Unit" : "Add New Unit"}
                    </h2>
                    <button onClick={handleCancel} className="text-slate-400 hover:text-white transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Content - Scrollable */}
                <div className="p-6 overflow-y-auto flex-1 space-y-8">
                    {/* Section 1: Unit Identity */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-semibold uppercase tracking-wider text-purple-400">1. Unit Identity</h3>
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1">Unit Name (Read-only)</label>
                            <input
                                type="text"
                                value={formData.name}
                                disabled={!!editingId} // Read-only in edit mode
                                onChange={(e) => !editingId && setFormData({ ...formData, name: e.target.value })}
                                className="w-full rounded-lg bg-dark-sidebar/50 border border-dark-border px-4 py-2.5 text-slate-300 disabled:opacity-70 disabled:cursor-not-allowed focus:ring-2 focus:ring-purple-500/50 outline-none transition-all"
                                placeholder="Enter Unit Name (e.g., Traffic)"
                            />
                            {!editingId && <p className="text-xs text-slate-500 mt-1">ID will be generated from name. Cannot be changed later.</p>}
                        </div>
                    </div>

                    {/* Section 2: Status */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-semibold uppercase tracking-wider text-purple-400">2. Unit Status</h3>
                        <div className="flex items-center gap-6">
                            <label className="flex items-center gap-2 cursor-pointer group">
                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${formData.isActive ? "border-green-500" : "border-slate-600 group-hover:border-slate-400"}`}>
                                    {formData.isActive && <div className="w-2.5 h-2.5 rounded-full bg-green-500" />}
                                </div>
                                <input
                                    type="radio"
                                    className="hidden"
                                    checked={formData.isActive}
                                    onChange={() => setFormData({ ...formData, isActive: true })}
                                />
                                <span className={formData.isActive ? "text-green-400 font-medium" : "text-slate-400 group-hover:text-slate-200"}>Active</span>
                            </label>

                            <label className="flex items-center gap-2 cursor-pointer group">
                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${!formData.isActive ? "border-red-500" : "border-slate-600 group-hover:border-slate-400"}`}>
                                    {!formData.isActive && <div className="w-2.5 h-2.5 rounded-full bg-red-500" />}
                                </div>
                                <input
                                    type="radio"
                                    className="hidden"
                                    checked={!formData.isActive}
                                    onChange={() => setFormData({ ...formData, isActive: false })}
                                />
                                <span className={!formData.isActive ? "text-red-400 font-medium" : "text-slate-400 group-hover:text-slate-200"}>Inactive</span>
                            </label>
                        </div>
                    </div>

                    {/* Section 3: Scope */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-semibold uppercase tracking-wider text-purple-400 flex items-center gap-2">
                                3. Unit Scope
                                {formData.mappingType !== "all" && <span className="bg-purple-500/20 text-purple-300 text-[10px] px-2 py-0.5 rounded-full">Core Field</span>}
                            </h3>
                        </div>

                        <div className="bg-dark-sidebar/30 p-4 rounded-lg border border-dark-border">
                            <label className="block text-sm font-medium text-slate-300 mb-2">Select Scope</label>
                            <select
                                value={formData.mappingType}
                                onChange={handleScopeChange}
                                className="w-full rounded-lg bg-dark-card border border-dark-border px-4 py-2.5 text-slate-100 focus:ring-2 focus:ring-purple-500/50 outline-none cursor-pointer"
                            >
                                {MAPPING_TYPES.map(type => (
                                    <option key={type.value} value={type.value}>{type.label}</option>
                                ))}
                            </select>
                            <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
                                <Info className="w-3 h-3" />
                                {formData.mappingType === "all" && "Unit applies to all districts equally."}
                                {formData.mappingType === "state" && "Unit exists only at State HQ level."}
                                {formData.mappingType === "single" && "Unit exists in exactly ONE district (e.g. Traffic -> Bangalore)."}
                                {formData.mappingType === "subset" && "Unit exists in SPECIFIC districts/battalions only."}
                                {formData.mappingType === "commissionerate" && "Unit applies to selected Commissionerate districts."}
                                {formData.mappingType === "none" && "Unit does not require any district tag."}
                            </p>
                        </div>

                        {(formData.mappingType === "single" || formData.mappingType === "subset" || formData.mappingType === "commissionerate") && (
                            <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                                <label className="block text-sm font-medium text-slate-300 mb-2">Mapped Districts / Battalions <span className="text-red-400">*</span></label>
                                {(() => {
                                    // Filter districts based on scope type
                                    let filteredDistricts: any[] = districts;

                                    // Special handling for known units
                                    if (formData.name?.toUpperCase().includes("KSRP")) {
                                        filteredDistricts = KSRP_BATTALIONS.map((bn, index) => ({ id: `ksrp-${index}`, name: bn }));
                                    } else if (formData.name?.toUpperCase().includes("IRB")) {
                                        // Show only IRB battalions
                                        filteredDistricts = districts.filter(d => d.name.toUpperCase().includes("IRB"));
                                    } else if (formData.mappingType === "commissionerate") {
                                        filteredDistricts = districts.filter(d => d.name.toUpperCase().endsWith("-COP"));
                                    }

                                    const allVisibleSelected = filteredDistricts.length > 0 && filteredDistricts.every(d => formData.mappedDistricts?.includes(d.name));

                                    const handleSelectAllToggle = () => {
                                        const visibleNames = filteredDistricts.map(d => d.name);
                                        let newMapped: string[] = [];

                                        if (allVisibleSelected) {
                                            // Deselect all visible
                                            newMapped = (formData.mappedDistricts || []).filter(name => !visibleNames.includes(name));
                                        } else {
                                            // Select all visible
                                            const current = formData.mappedDistricts || [];
                                            const toAdd = visibleNames.filter(name => !current.includes(name));
                                            newMapped = [...current, ...toAdd];
                                        }
                                        setFormData({ ...formData, mappedDistricts: newMapped });
                                    };

                                    return (
                                        <>
                                            {filteredDistricts.length > 0 && (
                                                <div className="flex justify-between items-center px-1 mb-2">
                                                    <span className="text-xs text-slate-500">{filteredDistricts.length} available</span>
                                                    <button
                                                        type="button"
                                                        onClick={handleSelectAllToggle}
                                                        className="text-xs font-medium text-purple-400 hover:text-purple-300 transition-colors"
                                                    >
                                                        {allVisibleSelected ? "Deselect All" : "Select All"}
                                                    </button>
                                                </div>
                                            )}
                                            <div className="max-h-60 overflow-y-auto rounded-lg border border-purple-500/50 bg-dark-card p-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                {filteredDistricts.length > 0 ? filteredDistricts.map((d: any) => (
                                                    <label key={d.id} className="flex items-center gap-2 p-2 rounded hover:bg-dark-sidebar cursor-pointer group transition-colors">
                                                        <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${formData.mappedDistricts?.includes(d.name) ? "bg-purple-600 border-purple-600" : "border-slate-500 group-hover:border-slate-300"}`}>
                                                            {formData.mappedDistricts?.includes(d.name) && <Check className="w-3 h-3 text-white" />}
                                                        </div>
                                                        <span className={formData.mappedDistricts?.includes(d.name) ? "text-purple-300" : "text-slate-300"}>{d.name}</span>
                                                        <input
                                                            type="checkbox"
                                                            className="hidden"
                                                            checked={formData.mappedDistricts?.includes(d.name)}
                                                            onChange={() => toggleMappedDistrict(d.name)}
                                                        />
                                                    </label>
                                                )) : <div className="col-span-2 text-center text-slate-500 py-4">
                                                    {formData.name?.toUpperCase().includes("IRB")
                                                        ? "No IRB battalions found. Please go to Districts page and 'Sync Defaults'."
                                                        : "No matching districts found"}
                                                </div>}
                                            </div>
                                        </>
                                    );
                                })()}
                                <p className="text-xs text-right text-slate-400 mt-1">Selected: {formData.mappedDistricts?.length || 0}</p>
                            </div>
                        )}

                        {/* District Level Toggle */}
                        <div className="bg-dark-sidebar/30 p-4 rounded-lg border border-dark-border mt-4">
                            <label className="flex items-center gap-3 cursor-pointer group">
                                <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${formData.isDistrictLevel ? "bg-purple-600 border-purple-600" : "border-slate-500 group-hover:border-slate-400"}`}>
                                    {formData.isDistrictLevel && <Check className="w-3.5 h-3.5 text-white" />}
                                </div>
                                <input
                                    type="checkbox"
                                    className="hidden"
                                    checked={!!formData.isDistrictLevel}
                                    onChange={() => setFormData({ ...formData, isDistrictLevel: !formData.isDistrictLevel })}
                                />
                                <div className="flex flex-col">
                                    <span className={formData.isDistrictLevel ? "text-purple-300 font-medium" : "text-slate-300 group-hover:text-slate-200"}>
                                        District Level Unit
                                    </span>
                                    <span className="text-xs text-slate-500">
                                        Check this if the unit functions at District HQ and does NOT belong to a Police Station (e.g., FPB, DCRB).
                                    </span>
                                </div>
                            </label>
                        </div>
                    </div>

                    {/* Section 4: Info Read-only */}
                    {editingId && (
                        <div className="mt-8 rounded-lg bg-slate-800/50 p-4 border border-slate-700/50 text-xs font-mono text-slate-400">
                            <h4 className="font-bold text-slate-300 border-b border-slate-700 pb-1 mb-2">ℹ️ Information</h4>
                            <div className="grid grid-cols-[100px_1fr] gap-1">
                                <span>Mapping Type</span> <span>: {MAPPING_TYPES.find(t => t.value === formData.mappingType)?.label}</span>
                                <span>Mapped Areas</span> <span>: {formData.mappedDistricts?.length ? `${formData.mappedDistricts.length} areas` : "Not Applicable"}</span>
                                <span>Users Affected</span> <span>: (Unavailable)</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="border-t border-dark-border p-6 flex justify-end gap-3 bg-dark-card rounded-b-xl">
                    <button
                        type="button"
                        onClick={handleCancel}
                        className="rounded-lg border border-dark-border px-6 py-2.5 text-slate-400 transition-colors hover:bg-dark-sidebar hover:text-white"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={submitting}
                        className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 px-6 py-2.5 text-white font-medium transition-all hover:shadow-lg hover:shadow-purple-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {submitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        {submitting ? "Saving..." : "Save Changes"}
                    </button>
                </div>
            </div>
        </div>
    );

    return (
        <div className="p-6">
            <div className="mb-6 flex items-center justify-between">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">Units</h1>
                <button
                    onClick={() => {
                        setEditingId(null);
                        setFormData({ name: "", isActive: true, mappingType: "all", mappedDistricts: [] });
                        setShowForm(true);
                    }}
                    className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 px-4 py-2 text-white transition-all hover:shadow-lg hover:shadow-purple-500/50"
                >
                    <Plus className="h-5 w-5" />
                    Add Unit
                </button>
            </div>

            {showForm && renderModal()}

            <div className="overflow-x-auto rounded-lg bg-dark-card border border-dark-border shadow-lg" style={{ overflowX: 'scroll', WebkitOverflowScrolling: 'touch' }}>
                <table className="w-full" style={{ tableLayout: 'fixed' }}>
                    <thead className="bg-dark-sidebar border-b border-dark-border">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-400 relative" style={{ width: columnWidths.name }}>
                                Name
                                <div
                                    onMouseDown={(e) => handleMouseDown(e, "name")}
                                    className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-purple-500"
                                />
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-400 relative" style={{ width: columnWidths.status }}>
                                Status
                                <div
                                    onMouseDown={(e) => handleMouseDown(e, "status")}
                                    className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-purple-500"
                                />
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-400 relative" style={{ width: columnWidths.scope }}>
                                Scope
                                <div
                                    onMouseDown={(e) => handleMouseDown(e, "scope")}
                                    className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-purple-500"
                                />
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-400" style={{ width: columnWidths.actions }}>
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-dark-border bg-dark-card">
                        {units.map((unit) => (
                            <tr key={unit.id} className="hover:bg-dark-sidebar transition-colors">
                                <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-slate-100 overflow-hidden text-ellipsis">
                                    {unit.name}
                                </td>
                                <td className="whitespace-nowrap px-6 py-4">
                                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${unit.isActive !== false ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
                                        {unit.isActive !== false ? "Active" : "Inactive"}
                                    </span>
                                </td>
                                <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-400">
                                    {MAPPING_TYPES.find(t => t.value === (unit.mappingType || "all"))?.label || "All Districts"}
                                </td>
                                <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                                    <div className="flex items-center justify-end gap-2">
                                        <button onClick={() => handleEdit(unit)} className="text-purple-400 hover:text-purple-300 transition-colors" title="Edit">
                                            <Edit className="h-5 w-5" />
                                        </button>
                                        <button onClick={() => handleDelete(unit.id!, unit.name)} className="text-red-400 hover:text-red-300 transition-colors" title="Delete">
                                            <Trash2 className="h-5 w-5" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {units.length === 0 && (
                    <div className="py-12 text-center text-slate-400 flex flex-col items-center gap-4">
                        <p>No units found</p>
                        <button onClick={handlePopulateDefaults} disabled={migrating} className="flex items-center gap-2 rounded-lg bg-slate-700 px-4 py-2 text-white transition-all hover:bg-slate-600 disabled:opacity-50">
                            <RefreshCw className={`h-4 w-4 ${migrating ? "animate-spin" : ""}`} />
                            {migrating ? "Populating..." : "Populate Default Units"}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
