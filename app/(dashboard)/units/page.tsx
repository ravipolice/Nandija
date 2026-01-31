"use client";

import { useEffect, useState } from "react";
import { getUnits, createUnit, updateUnit, deleteUnit, Unit, getDistricts, District, getUnitSections, updateUnitSections, getRanks, Rank } from "@/lib/firebase/firestore";
import { Plus, Edit, Trash2, Save, X, Info, Check, RefreshCw } from 'lucide-react';
import { DEFAULT_UNITS, ALL_BATTALIONS, STATE_INT_SECTIONS } from "@/lib/constants";

type ColumnKey = "name" | "status" | "scope" | "actions";

const defaultColumnWidths: Record<ColumnKey, number> = {
    name: 300,
    status: 120,
    scope: 150,
    actions: 120,
};

// Fixed mapping types (kept for reference/legacy display if needed)
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
    const [allRanks, setAllRanks] = useState<Rank[]>([]); // Available ranks
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState<Partial<Unit>>({
        name: "",
        isActive: true,
        scopes: [],
        mappedAreaIds: [],
        isDistrictLevel: false,
        isHqLevel: false
    });
    const [sectionsText, setSectionsText] = useState("");
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
    const [sectionsList, setSectionsList] = useState<string[]>([]);
    const [newSectionInput, setNewSectionInput] = useState("");
    const [isSectionDropdownOpen, setIsSectionDropdownOpen] = useState(false);

    useEffect(() => {
        loadUnits();
        loadDistricts();
        loadRanks();
    }, []);

    const loadUnits = async () => {
        try {
            const data = await getUnits();
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

    const loadRanks = async () => {
        try {
            const data = await getRanks();
            setAllRanks(data);
        } catch (error) {
            console.error("Error loading ranks:", error);
        }
    };

    const handleEdit = async (unit: Unit) => {
        setEditingId(unit.id || null);

        // Initialize scopes from legacy or new data
        let initialScopes: string[] = unit.scopes || [];

        // Migration logic for existing data if scopes are missing
        if (initialScopes.length === 0 && unit.mappingType) {
            if (unit.mappingType === "state") initialScopes.push("hq");
            if (unit.mappingType === "single" || unit.mappingType === "subset") initialScopes.push("district");
            if (unit.mappingType === "commissionerate") initialScopes.push("commissionerate");
            if (unit.name?.toUpperCase().includes("KSRP") && unit.mappingType === "subset") {
                // Convert district to battalion if previously detected as such
                initialScopes = initialScopes.filter(s => s !== "district").concat("battalion");
            }
            if (unit.isHqLevel && !initialScopes.includes("hq")) initialScopes.push("hq");
        }

        setFormData({
            name: unit.name,
            isActive: unit.isActive !== false,
            scopes: [...new Set(initialScopes)], // Dedupe
            mappedAreaIds: unit.mappedAreaIds || unit.mappedDistricts || [],
            isDistrictLevel: unit.isDistrictLevel || false,
            isHqLevel: unit.isHqLevel || false,
            applicableRanks: unit.applicableRanks || [],
            stationKeyword: unit.stationKeyword || ((unit.name === "DCRB" || unit.name === "ESCOM") ? unit.name : "")
        });

        // Fetch sections
        try {
            const sections = await getUnitSections(unit.name);
            setSectionsList(sections);
            setSectionsText(sections.join(", ")); // Keep legacy for syncing just in case, or remove if unused
        } catch (error) {
            console.error("Error fetching sections:", error);
            setSectionsList([]);
            setSectionsText("");
        }

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
            setFormData({ name: "", isActive: true, scopes: [], mappedAreaIds: [], applicableRanks: [] });
            setSectionsText("");
            setSectionsList([]);
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

    const toggleScope = (scope: string) => {
        const current = formData.scopes || [];
        if (current.includes(scope)) {
            setFormData({ ...formData, scopes: current.filter(s => s !== scope) });
        } else {
            setFormData({ ...formData, scopes: [...current, scope] });
        }
    };

    const toggleMappedArea = (areaId: string) => {
        const current = formData.mappedAreaIds || [];
        if (current.includes(areaId)) {
            setFormData({ ...formData, mappedAreaIds: current.filter(id => id !== areaId) });
        } else {
            setFormData({ ...formData, mappedAreaIds: [...current, areaId] });
        }
    };

    const toggleSection = (section: string) => {
        if (sectionsList.includes(section)) {
            setSectionsList(sectionsList.filter(s => s !== section));
        } else {
            setSectionsList([...sectionsList, section].sort());
        }
    };

    const handleAddSection = () => {
        const trimmed = newSectionInput.trim();
        if (!trimmed) return;
        if (!sectionsList.includes(trimmed)) {
            setSectionsList([...sectionsList, trimmed].sort());
        }
        setNewSectionInput("");
    };

    const toggleApplicableRank = (rankId: string) => {
        const current = formData.applicableRanks || [];
        if (current.includes(rankId)) {
            setFormData({ ...formData, applicableRanks: current.filter(id => id !== rankId) });
        } else {
            setFormData({ ...formData, applicableRanks: [...current, rankId] });
        }
    };

    const handleSelectAllRanks = () => {
        setFormData({ ...formData, applicableRanks: allRanks.map(r => r.rank_id) });
    };

    const handleDeselectAllRanks = () => {
        setFormData({ ...formData, applicableRanks: [] });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Strict Validation Rules
        const scopes = formData.scopes || [];

        const requiresArea = scopes.includes("district") || scopes.includes("battalion") || scopes.includes("commissionerate") || scopes.includes("district_stations");
        if (requiresArea && (!formData.mappedAreaIds || formData.mappedAreaIds.length === 0)) {
            alert("❌ Validation Error: Selected scope(s) require selecting specific areas (Districts/Battalions/Cities).");
            return;
        }

        setSubmitting(true);
        try {
            // Derive legacy fields for backward compatibility
            let derivedMappingType: Unit["mappingType"] = "none";
            if (scopes.includes("district") || scopes.includes("battalion") || scopes.includes("district_stations")) derivedMappingType = "subset";
            else if (scopes.includes("commissionerate")) derivedMappingType = "commissionerate";
            else if (scopes.includes("hq") && scopes.length === 1) derivedMappingType = "state";
            else if (scopes.length === 0) derivedMappingType = "none";

            // Derive mappedAreaType
            let mappedAreaType: Unit["mappedAreaType"] = "DISTRICT";
            if (scopes.includes("battalion")) mappedAreaType = "BATTALION";
            else if (scopes.includes("commissionerate")) mappedAreaType = "CITY";
            else if (scopes.includes("district") || scopes.includes("district_stations")) mappedAreaType = "DISTRICT";
            else if (scopes.includes("hq")) mappedAreaType = "HQ";

            const payload = {
                name: formData.name?.trim() || "",
                isActive: formData.isActive,
                scopes: scopes,
                mappedAreaIds: requiresArea ? formData.mappedAreaIds : [],
                // Legacy / Computed Fields
                mappingType: derivedMappingType,
                mappedAreaType: mappedAreaType,
                mappedDistricts: requiresArea ? formData.mappedAreaIds : [],
                isHqLevel: scopes.includes("hq"),
                isDistrictLevel: scopes.includes("district"),
                applicableRanks: formData.applicableRanks,
                stationKeyword: formData.stationKeyword?.trim()
            };

            if (editingId) {
                await updateUnit(editingId, payload);
            } else {
                await createUnit(payload);
            }

            // Save sections if name is present
            const unitName = formData.name?.trim();
            if (unitName) {
                // Use sectionsList directly
                await updateUnitSections(unitName, sectionsList);
            }

            setShowForm(false);
            setEditingId(null);
            setShowForm(false);
            setEditingId(null);
            setFormData({ name: "", isActive: true, scopes: [], mappedAreaIds: [], applicableRanks: [] });
            setSectionsText("");
            setSectionsList([]);
            setSectionsText("");
            setSectionsList([]);
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

                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1">Station Keyword Filter (Optional)</label>
                            <input
                                type="text"
                                value={formData.stationKeyword || ""}
                                onChange={(e) => setFormData({ ...formData, stationKeyword: e.target.value })}
                                className="w-full rounded-lg bg-dark-sidebar/50 border border-dark-border px-4 py-2.5 text-slate-300 focus:ring-2 focus:ring-purple-500/50 outline-none transition-all placeholder:text-slate-600"
                                placeholder="e.g. DCRB"
                            />
                            <p className="text-xs text-slate-500 mt-1">If set, only stations containing this keyword will be shown.</p>
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
                        <h3 className="text-sm font-semibold uppercase tracking-wider text-purple-400 flex items-center gap-2">
                            3. Unit Scope
                        </h3>

                        {/* Multi-Select Scopes */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* HQ */}
                            <div className={`p-4 rounded-lg border transition-colors ${formData.scopes?.includes("hq") ? "bg-purple-900/20 border-purple-500/50" : "bg-dark-sidebar/30 border-dark-border"}`}>
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${formData.scopes?.includes("hq") ? "bg-purple-600 border-purple-600" : "border-slate-500"}`}>
                                        {formData.scopes?.includes("hq") && <Check className="w-3.5 h-3.5 text-white" />}
                                    </div>
                                    <input type="checkbox" className="hidden" checked={!!formData.scopes?.includes("hq")} onChange={() => toggleScope("hq")} />
                                    <span className={`font-medium ${formData.scopes?.includes("hq") ? "text-purple-300" : "text-slate-300"}`}>HQ Level</span>
                                </label>
                                <p className="text-xs text-slate-500 mt-2 ml-8">Enables sections for this unit.</p>
                            </div>

                            {/* District HQ (No Stations) */}
                            <div className={`p-4 rounded-lg border transition-colors ${formData.scopes?.includes("district") ? "bg-purple-900/20 border-purple-500/50" : "bg-dark-sidebar/30 border-dark-border"}`}>
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${formData.scopes?.includes("district") ? "bg-purple-600 border-purple-600" : "border-slate-500"}`}>
                                        {formData.scopes?.includes("district") && <Check className="w-3.5 h-3.5 text-white" />}
                                    </div>
                                    <input type="checkbox" className="hidden" checked={!!formData.scopes?.includes("district")} onChange={() => toggleScope("district")} />
                                    <span className={`font-medium ${formData.scopes?.includes("district") ? "text-purple-300" : "text-slate-300"}`}>District HQ</span>
                                </label>
                                <p className="text-xs text-slate-500 mt-2 ml-8">Maps to District HQ (No Stations).</p>
                            </div>

                            {/* Districts (With Stations) */}
                            <div className={`p-4 rounded-lg border transition-colors ${formData.scopes?.includes("district_stations") ? "bg-purple-900/20 border-purple-500/50" : "bg-dark-sidebar/30 border-dark-border"}`}>
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${formData.scopes?.includes("district_stations") ? "bg-purple-600 border-purple-600" : "border-slate-500"}`}>
                                        {formData.scopes?.includes("district_stations") && <Check className="w-3.5 h-3.5 text-white" />}
                                    </div>
                                    <input type="checkbox" className="hidden" checked={!!formData.scopes?.includes("district_stations")} onChange={() => toggleScope("district_stations")} />
                                    <span className={`font-medium ${formData.scopes?.includes("district_stations") ? "text-purple-300" : "text-slate-300"}`}>Districts</span>
                                </label>
                                <p className="text-xs text-slate-500 mt-2 ml-8">Maps to Districts (Shows Stations).</p>
                            </div>

                            {/* Battalion */}
                            <div className={`p-4 rounded-lg border transition-colors ${formData.scopes?.includes("battalion") ? "bg-purple-900/20 border-purple-500/50" : "bg-dark-sidebar/30 border-dark-border"}`}>
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${formData.scopes?.includes("battalion") ? "bg-purple-600 border-purple-600" : "border-slate-500"}`}>
                                        {formData.scopes?.includes("battalion") && <Check className="w-3.5 h-3.5 text-white" />}
                                    </div>
                                    <input type="checkbox" className="hidden" checked={!!formData.scopes?.includes("battalion")} onChange={() => toggleScope("battalion")} />
                                    <span className={`font-medium ${formData.scopes?.includes("battalion") ? "text-purple-300" : "text-slate-300"}`}>Battalion</span>
                                </label>
                            </div>

                            {/* Commissionerate */}
                            <div className={`p-4 rounded-lg border transition-colors ${formData.scopes?.includes("commissionerate") ? "bg-purple-900/20 border-purple-500/50" : "bg-dark-sidebar/30 border-dark-border"}`}>
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${formData.scopes?.includes("commissionerate") ? "bg-purple-600 border-purple-600" : "border-slate-500"}`}>
                                        {formData.scopes?.includes("commissionerate") && <Check className="w-3.5 h-3.5 text-white" />}
                                    </div>
                                    <input type="checkbox" className="hidden" checked={!!formData.scopes?.includes("commissionerate")} onChange={() => toggleScope("commissionerate")} />
                                    <span className={`font-medium ${formData.scopes?.includes("commissionerate") ? "text-purple-300" : "text-slate-300"}`}>Commissionerate</span>
                                </label>
                            </div>
                        </div>

                        {/* Selection Areas */}
                        {(formData.scopes?.includes("district") || formData.scopes?.includes("battalion") || formData.scopes?.includes("commissionerate") || formData.scopes?.includes("district_stations")) && (
                            <div className="space-y-4 pt-4 border-t border-dark-border animate-in fade-in slide-in-from-top-2">
                                <label className="block text-sm font-medium text-slate-300">
                                    Select Mapped Areas <span className="text-red-400">*</span>
                                </label>

                                <div className="max-h-64 overflow-y-auto rounded-lg border border-dark-border bg-dark-sidebar/20 p-2 grid grid-cols-1 sm:grid-cols-2 gap-1.5 shadow-inner">
                                    {/* District List */}
                                    {(formData.scopes?.includes("district") || formData.scopes?.includes("district_stations")) && (
                                        <>
                                            <div className="col-span-1 sm:col-span-2 text-xs font-bold text-slate-500 uppercase mt-2 mb-1 px-1">Districts</div>
                                            {districts.filter(d => !d.name.toUpperCase().endsWith(" CITY") && !ALL_BATTALIONS.includes(d.name)).map(d => (
                                                <label key={d.id || d.name} className="flex items-center gap-2 p-1.5 rounded hover:bg-white/5 cursor-pointer group transition-colors">
                                                    <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${formData.mappedAreaIds?.includes(d.name) ? "bg-purple-600 border-purple-600 text-white" : "border-slate-600 group-hover:border-slate-400"}`}>
                                                        {formData.mappedAreaIds?.includes(d.name) && <Check className="w-3 h-3" />}
                                                    </div>
                                                    <span className={`text-xs ${formData.mappedAreaIds?.includes(d.name) ? "text-purple-300" : "text-slate-400"}`}>{d.name}</span>
                                                    <input type="checkbox" className="hidden" checked={!!formData.mappedAreaIds?.includes(d.name)} onChange={() => toggleMappedArea(d.name)} />
                                                </label>
                                            ))}
                                        </>
                                    )}

                                    {/* Battalion List */}
                                    {formData.scopes?.includes("battalion") && (
                                        <>
                                            <div className="col-span-1 sm:col-span-2 text-xs font-bold text-slate-500 uppercase mt-2 mb-1 px-1 border-t border-slate-700/50 pt-2">Battalions</div>
                                            {ALL_BATTALIONS.map(bn => (
                                                <label key={bn} className="flex items-center gap-2 p-1.5 rounded hover:bg-white/5 cursor-pointer group transition-colors">
                                                    <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${formData.mappedAreaIds?.includes(bn) ? "bg-purple-600 border-purple-600 text-white" : "border-slate-600 group-hover:border-slate-400"}`}>
                                                        {formData.mappedAreaIds?.includes(bn) && <Check className="w-3 h-3" />}
                                                    </div>
                                                    <span className={`text-xs ${formData.mappedAreaIds?.includes(bn) ? "text-purple-300" : "text-slate-400"}`}>{bn}</span>
                                                    <input type="checkbox" className="hidden" checked={!!formData.mappedAreaIds?.includes(bn)} onChange={() => toggleMappedArea(bn)} />
                                                </label>
                                            ))}
                                        </>
                                    )}

                                    {/* Commissionerate List */}
                                    {formData.scopes?.includes("commissionerate") && (
                                        <>
                                            <div className="col-span-1 sm:col-span-2 text-xs font-bold text-slate-500 uppercase mt-2 mb-1 px-1 border-t border-slate-700/50 pt-2">Commissionerates</div>
                                            {districts.filter(d => d.name.toUpperCase().endsWith(" CITY")).map(d => (
                                                <label key={d.id || d.name} className="flex items-center gap-2 p-1.5 rounded hover:bg-white/5 cursor-pointer group transition-colors">
                                                    <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${formData.mappedAreaIds?.includes(d.name) ? "bg-purple-600 border-purple-600 text-white" : "border-slate-600 group-hover:border-slate-400"}`}>
                                                        {formData.mappedAreaIds?.includes(d.name) && <Check className="w-3 h-3" />}
                                                    </div>
                                                    <span className={`text-xs ${formData.mappedAreaIds?.includes(d.name) ? "text-purple-300" : "text-slate-400"}`}>{d.name}</span>
                                                    <input type="checkbox" className="hidden" checked={!!formData.mappedAreaIds?.includes(d.name)} onChange={() => toggleMappedArea(d.name)} />
                                                </label>
                                            ))}
                                        </>
                                    )}
                                </div>
                                <p className="text-[10px] text-right text-slate-500 italic">Total selected: {formData.mappedAreaIds?.length || 0}</p>
                            </div>
                        )}
                    </div>

                    {/* Section 4: Unit Sections (Only if HQ or Scopes include HQ) */}
                    {(formData.scopes?.includes("hq") || formData.isHqLevel) && (
                        <div className="space-y-4">
                            <h3 className="text-sm font-semibold uppercase tracking-wider text-purple-400">4. Unit Sections</h3>

                            {/* Add Section Input (Top) */}
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={newSectionInput}
                                    onChange={(e) => setNewSectionInput(e.target.value)}
                                    placeholder="Add new section..."
                                    className="flex-1 rounded-lg bg-dark-sidebar/50 border border-dark-border px-4 py-2 text-slate-300 focus:ring-2 focus:ring-purple-500/50 outline-none transition-all placeholder:text-slate-600"
                                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddSection())}
                                />
                                <button
                                    type="button"
                                    onClick={handleAddSection}
                                    disabled={!newSectionInput.trim()}
                                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Add
                                </button>
                            </div>

                            {/* Dropdown with Checkboxes */}
                            <div className="relative">
                                <button
                                    type="button"
                                    onClick={() => setIsSectionDropdownOpen(!isSectionDropdownOpen)}
                                    className="w-full flex items-center justify-between rounded-lg bg-dark-sidebar/30 border border-dark-border px-4 py-3 text-left transition-all hover:bg-dark-sidebar/50 focus:ring-2 focus:ring-purple-500/50"
                                >
                                    <span className="text-slate-300">
                                        {sectionsList.length > 0
                                            ? `${sectionsList.length} Sections Selected`
                                            : "Select Sections"}
                                    </span>
                                    {/* Chevron Icon (CSS or Lucide) */}
                                    <span className={`transition-transform duration-200 ${isSectionDropdownOpen ? "rotate-180" : ""}`}>
                                        ▼
                                    </span>
                                </button>

                                {/* Dropdown Content */}
                                {isSectionDropdownOpen && (
                                    <div className="absolute z-10 mt-2 w-full rounded-lg bg-dark-card border border-dark-border shadow-xl max-h-60 overflow-y-auto p-2">
                                        {/* Combine Defaults + Current Custom into a unique set for display, or just display current list? 
                                            Request said "Dropdown with check box" which typically implies creating/managing the selection.
                                            If we use STATE_INT_SECTIONS as defaults, we should include them options.
                                        */}
                                        {Array.from(new Set([...STATE_INT_SECTIONS, ...sectionsList])).sort().map(section => (
                                            <label key={section} className="flex items-center gap-3 p-2 rounded hover:bg-white/5 cursor-pointer transition-colors">
                                                <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${sectionsList.includes(section) ? "bg-purple-600 border-purple-600" : "border-slate-500"}`}>
                                                    {sectionsList.includes(section) && <Check className="w-3.5 h-3.5 text-white" />}
                                                </div>
                                                <input
                                                    type="checkbox"
                                                    className="hidden"
                                                    checked={sectionsList.includes(section)}
                                                    onChange={() => toggleSection(section)}
                                                />
                                                <span className={`${sectionsList.includes(section) ? "text-slate-200 font-medium" : "text-slate-400"}`}>
                                                    {section}
                                                </span>
                                            </label>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Selected Chips View (Optional, for visibility when closed) */}
                            {!isSectionDropdownOpen && sectionsList.length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {sectionsList.map(s => (
                                        <span key={s} className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-purple-500/10 border border-purple-500/20 text-xs text-purple-300">
                                            {s}
                                            <button type="button" onClick={() => toggleSection(s)} className="hover:text-purple-100"><X className="w-3 h-3" /></button>
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Section 5: Applicable Ranks */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-semibold uppercase tracking-wider text-purple-400">5. Unit Ranks</h3>
                            <div className="flex gap-2">
                                <button type="button" onClick={handleSelectAllRanks} className="text-xs text-blue-400 hover:text-blue-300">Select All</button>
                                <span className="text-slate-600">|</span>
                                <button type="button" onClick={handleDeselectAllRanks} className="text-xs text-red-400 hover:text-red-300">Deselect All</button>
                            </div>
                        </div>
                        <p className="text-xs text-slate-500 mb-2">Select the ranks that are applicable/visible for this unit.</p>

                        <div className="max-h-60 overflow-y-auto rounded-lg border border-dark-border bg-dark-sidebar/20 p-2 grid grid-cols-1 sm:grid-cols-2 gap-1.5 shadow-inner">
                            {allRanks.map(rank => (
                                <label key={rank.rank_id} className="flex items-center gap-2 p-1.5 rounded hover:bg-white/5 cursor-pointer group transition-colors">
                                    <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${formData.applicableRanks?.includes(rank.rank_id) ? "bg-purple-600 border-purple-600 text-white" : "border-slate-600 group-hover:border-slate-400"}`}>
                                        {formData.applicableRanks?.includes(rank.rank_id) && <Check className="w-3 h-3" />}
                                    </div>
                                    <span className={`text-xs ${formData.applicableRanks?.includes(rank.rank_id) ? "text-purple-300" : "text-slate-400"}`}>
                                        <span className="font-semibold">{rank.rank_id}</span> - {rank.rank_label}
                                    </span>
                                    <input type="checkbox" className="hidden" checked={!!formData.applicableRanks?.includes(rank.rank_id)} onChange={() => toggleApplicableRank(rank.rank_id)} />
                                </label>
                            ))}
                            {allRanks.length === 0 && (
                                <div className="col-span-2 text-center text-slate-500 text-xs py-4">No ranks found.</div>
                            )}
                        </div>
                        <p className="text-[10px] text-right text-slate-500 italic">Total selected: {formData.applicableRanks?.length || 0}</p>
                    </div>

                    {/* Info Read-only */}
                    {editingId && (
                        <div className="mt-8 rounded-lg bg-slate-800/50 p-4 border border-slate-700/50 text-xs font-mono text-slate-400">
                            <h4 className="font-bold text-slate-300 border-b border-slate-700 pb-1 mb-2">ℹ️ Information</h4>
                            <div className="grid grid-cols-[100px_1fr] gap-1">
                                <span>Scopes</span> <span>: {formData.scopes?.join(", ") || "None"}</span>
                                <span>Mapped Areas</span> <span>: {formData.mappedAreaIds?.length ? `${formData.mappedAreaIds.length} areas` : "None"}</span>
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
                        setEditingId(null);
                        setEditingId(null);
                        setFormData({ name: "", isActive: true, scopes: [], mappedAreaIds: [], applicableRanks: [] });
                        setSectionsList([]);
                        setSectionsText("");
                        setShowForm(true);
                        setSectionsList([]);
                        setSectionsText("");
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
                                    <div className="flex flex-col">
                                        <span>{unit.scopes?.join(", ") || (unit.mappingType === "all" ? "All" : unit.mappingType)}</span>
                                        {unit.mappedAreaIds && unit.mappedAreaIds.length > 0 && (
                                            <span className="text-[10px] text-purple-400 font-medium">
                                                {unit.mappedAreaIds.length} areas selected
                                            </span>
                                        )}
                                        {unit.scopes?.includes("hq") && (
                                            <span className="text-[10px] text-blue-400 italic">HQ Level</span>
                                        )}
                                    </div>
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

