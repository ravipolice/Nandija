"use client";

import { useEffect, useState, useMemo } from "react";
import { getUnits, createUnit, updateUnit, deleteUnit, Unit, getDistricts, District, getUnitSections, updateUnitSections, getRanks, Rank } from "@/lib/firebase/firestore";
import { getAppConfig } from "@/lib/firebase/app-config";
import { Plus, Edit, Trash2, Save, X, Check, RefreshCw, Search, Shield, MapPin, Layers, LayoutGrid, AlertCircle, ChevronDown, ChevronRight } from 'lucide-react';
import { DEFAULT_UNITS, ALL_BATTALIONS, STATE_INT_SECTIONS } from "@/lib/constants";

// Configurable Fields for Visibility
const CONFIGURABLE_FIELDS = [
    { id: "gender", label: "Gender" },
    { id: "bloodGroup", label: "Blood Group" },
    { id: "email", label: "Email" },
    { id: "mobile2", label: "Mobile 2" },
    { id: "landline", label: "Landline" },
    { id: "dob", label: "Date of Birth (DOB)" },
    { id: "doa", label: "Date of Appointment (DOA)" },
];

// Fixed mapping types (kept for reference/legacy display if needed)


export default function UnitsPage() {
    const [units, setUnits] = useState<Unit[]>([]);
    const [districts, setDistricts] = useState<District[]>([]); // For dropdowns
    const [allRanks, setAllRanks] = useState<Rank[]>([]); // Available ranks
    const [globalHiddenFields, setGlobalHiddenFields] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState<Partial<Unit>>({
        name: "",
        isActive: true,
        scopes: [],
        mappedAreaIds: [],
        isDistrictLevel: false,
        isHqLevel: false,
        hideFromRegistration: false
    });
    const [submitting, setSubmitting] = useState(false);
    const [migrating, setMigrating] = useState(false);
    const [sectionsList, setSectionsList] = useState<string[]>([]);
    const [newSectionInput, setNewSectionInput] = useState("");
    const [isSectionDropdownOpen, setIsSectionDropdownOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
        identity: true,
        status: true,
        visibility: false,
        scope: true,
        sections: true,
        ranks: false
    });

    const toggleSectionCollapse = (sectionId: string) => {
        setExpandedSections(prev => ({
            ...prev,
            [sectionId]: !prev[sectionId]
        }));
    };

    const filteredUnits = useMemo(() => {
        return units.filter(unit =>
            unit.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            unit.scopes?.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()))
        );
    }, [units, searchQuery]);

    useEffect(() => {
        loadUnits();
        loadDistricts();
        loadRanks();
        loadGlobalConfig();
    }, []);

    const loadGlobalConfig = async () => {
        try {
            const config = await getAppConfig();
            setGlobalHiddenFields(config?.hiddenFields || []);
        } catch (error) {
            console.error("Error loading global config:", error);
        }
    };

    const loadUnits = async () => {
        try {
            // Updated to fetch all units and handle filtering client-side for better UX
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
        if (!unit.id) {
            alert("Error: Unit ID is missing. Cannot edit.");
            console.error("Unit ID missing:", unit);
            return;
        }
        setEditingId(unit.id);

        // Initialize scopes from legacy or new data
        let initialScopes: string[] = unit.scopes || [];

        // Migration logic for existing data if scopes are missing
        if (initialScopes.length === 0 && unit.mappingType) {
            console.log("Migrating legacy unit scopes:", unit.name, unit.mappingType); // DEBUG LOG
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
            stationKeyword: unit.stationKeyword || ((unit.name === "DCRB" || unit.name === "ESCOM") ? unit.name : ""),
            hideFromRegistration: unit.hideFromRegistration || false,
            hiddenFields: unit.hiddenFields || [],
        });

        // Fetch sections
        try {
            const sections = await getUnitSections(unit.name);
            console.log(`Fetched sections for ${unit.name}:`, sections); // DEBUG LOG
            setSectionsList(sections);
        } catch (error) {
            console.error("Error fetching sections:", error);
            setSectionsList([]);
        }

        setShowForm(true);
    };

    const toggleHiddenField = (fieldId: string) => {
        const current = formData.hiddenFields || [];
        if (current.includes(fieldId)) {
            setFormData({ ...formData, hiddenFields: current.filter(id => id !== fieldId) });
        } else {
            setFormData({ ...formData, hiddenFields: [...current, fieldId] });
        }
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
            setFormData({ name: "", isActive: true, scopes: [], mappedAreaIds: [], applicableRanks: [], hideFromRegistration: false, hiddenFields: [] });
            setSectionsList([]);
        }
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
        } catch (error: unknown) {
            const err = error as { code?: string; message?: string };
            const msg = err?.message || err?.code || String(error);
            console.error("Error populating default units:", err?.code ?? err?.message ?? error);
            alert(`Failed to populate default units: ${msg || "Unknown error"}`);
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

        console.log("Submitting unit form...", { editingId, formData }); // DEBUG LOG

        // Strict Validation Rules
        const scopes = formData.scopes || [];

        if (!formData.name?.trim()) {
            alert("❌ Validation Error: Unit Name is required.");
            return;
        }

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
                applicableRanks: formData.applicableRanks || [],
                stationKeyword: formData.stationKeyword?.trim() || "",
                hideFromRegistration: formData.hideFromRegistration || false
            };

            console.log("Executing unit update/create with payload:", payload); // DEBUG LOG

            if (editingId) {
                await updateUnit(editingId, payload);
                console.log("Unit updated successfully:", editingId);
            } else {
                const newId = await createUnit(payload);
                console.log("New unit created:", newId);
            }

            // Save sections if name is present
            const unitName = formData.name?.trim();
            if (unitName) {
                // Use sectionsList directly
                console.log(`Updating sections for ${unitName}:`, sectionsList); // DEBUG LOG
                await updateUnitSections(unitName, sectionsList);
            }

            setShowForm(false);
            setEditingId(null);
            setFormData({ name: "", isActive: true, scopes: [], mappedAreaIds: [], applicableRanks: [], hideFromRegistration: false });
            setSectionsList([]);
            await loadUnits();
            alert("Unit saved successfully!"); // Explicit success message
        } catch (error: any) {
            console.error("Error saving unit:", error);
            alert(`Failed to save unit: ${error.message || "Unknown error"}`);
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
                        <button
                            onClick={() => toggleSectionCollapse('identity')}
                            className="w-full flex items-center justify-between text-left group"
                        >
                            <h3 className="text-sm font-semibold uppercase tracking-wider text-purple-400">1. Unit Identity</h3>
                            {expandedSections.identity ? <ChevronDown className="w-4 h-4 text-purple-400" /> : <ChevronRight className="w-4 h-4 text-purple-400" />}
                        </button>

                        {expandedSections.identity && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-top-1 duration-200">
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
                        )}
                    </div>

                    {/* Section 2: Status */}
                    <div className="space-y-4">
                        <button
                            onClick={() => toggleSectionCollapse('status')}
                            className="w-full flex items-center justify-between text-left group"
                        >
                            <h3 className="text-sm font-semibold uppercase tracking-wider text-purple-400">2. Unit Status</h3>
                            {expandedSections.status ? <ChevronDown className="w-4 h-4 text-purple-400" /> : <ChevronRight className="w-4 h-4 text-purple-400" />}
                        </button>

                        {expandedSections.status && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-top-1 duration-200">
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

                                {/* Hide from Registration */}
                                <div className="pt-2 border-t border-dark-border">
                                    <label className="flex items-center gap-3 cursor-pointer group">
                                        <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${formData.hideFromRegistration ? "bg-orange-600 border-orange-600" : "border-slate-500 group-hover:border-slate-400"}`}>
                                            {formData.hideFromRegistration && <Check className="w-3.5 h-3.5 text-white" />}
                                        </div>
                                        <input
                                            type="checkbox"
                                            className="hidden"
                                            checked={!!formData.hideFromRegistration}
                                            onChange={(e) => setFormData({ ...formData, hideFromRegistration: e.target.checked })}
                                        />
                                        <div className="flex flex-col">
                                            <span className={`font-medium ${formData.hideFromRegistration ? "text-orange-300" : "text-slate-300 group-hover:text-slate-200"}`}>Hide from Registration Form</span>
                                            <span className="text-xs text-slate-500">If checked, this unit will not appear in the registration form dropdown</span>
                                        </div>
                                    </label>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Section 2.5: Field Visibility */}
                    <div className="space-y-4">
                        <button
                            onClick={() => toggleSectionCollapse('visibility')}
                            className="w-full flex items-center justify-between text-left group"
                        >
                            <h3 className="text-sm font-semibold uppercase tracking-wider text-purple-400">Field Visibility Control</h3>
                            {expandedSections.visibility ? <ChevronDown className="w-4 h-4 text-purple-400" /> : <ChevronRight className="w-4 h-4 text-purple-400" />}
                        </button>

                        {expandedSections.visibility && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-top-1 duration-200">
                                <p className="text-xs text-slate-500">Uncheck to hide fields from the Registration Form for this unit.</p>

                                <div className="grid grid-cols-2 gap-3">
                                    {CONFIGURABLE_FIELDS.filter(f => !globalHiddenFields.includes(f.id)).map(field => (
                                        <label key={field.id} className="flex items-center gap-3 p-2 rounded hover:bg-white/5 cursor-pointer transition-colors border border-slate-700/50">
                                            <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${!formData.hiddenFields?.includes(field.id) ? "bg-green-600 border-green-600" : "border-slate-500 bg-slate-800"}`}>
                                                {!formData.hiddenFields?.includes(field.id) && <Check className="w-3.5 h-3.5 text-white" />}
                                            </div>
                                            <input
                                                type="checkbox"
                                                className="hidden"
                                                checked={!formData.hiddenFields?.includes(field.id)}
                                                onChange={() => toggleHiddenField(field.id)}
                                            />
                                            <span className={`${!formData.hiddenFields?.includes(field.id) ? "text-green-300 font-medium" : "text-slate-500 line-through decoration-slate-600"}`}>
                                                {field.label}
                                            </span>
                                        </label>
                                    ))}
                                    {CONFIGURABLE_FIELDS.filter(f => !globalHiddenFields.includes(f.id)).length === 0 && (
                                        <p className="col-span-2 text-center text-xs text-slate-500 italic py-2">All configurable fields are hidden globally.</p>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Section 3: Scope */}
                    <div className="space-y-4">
                        <button
                            onClick={() => toggleSectionCollapse('scope')}
                            className="w-full flex items-center justify-between text-left group"
                        >
                            <h3 className="text-sm font-semibold uppercase tracking-wider text-purple-400 flex items-center gap-2">
                                3. Unit Scope
                            </h3>
                            {expandedSections.scope ? <ChevronDown className="w-4 h-4 text-purple-400" /> : <ChevronRight className="w-4 h-4 text-purple-400" />}
                        </button>

                        {expandedSections.scope && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-top-1 duration-200">
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
                                        <p className="text-xs text-slate-500 mt-2 ml-8">Maps to District HQ (No Stations). Enables sections management.</p>
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
                                    <div className="space-y-4 pt-4 border-t border-dark-border">
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
                        )}
                    </div>

                    {/* Section 4: Unit Sections (If HQ or District HQ scope) */}
                    {(formData.scopes?.includes("hq") || formData.scopes?.includes("district") || formData.isHqLevel || formData.isDistrictLevel) && (
                        <div className="space-y-4">
                            <button
                                onClick={() => toggleSectionCollapse('sections')}
                                className="w-full flex items-center justify-between text-left group"
                            >
                                <h3 className="text-sm font-semibold uppercase tracking-wider text-purple-400">4. Unit Sections</h3>
                                {expandedSections.sections ? <ChevronDown className="w-4 h-4 text-purple-400" /> : <ChevronRight className="w-4 h-4 text-purple-400" />}
                            </button>

                            {expandedSections.sections && (
                                <div className="space-y-4 animate-in fade-in slide-in-from-top-1 duration-200">
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
                        </div>
                    )}

                    {/* Section 5: Applicable Ranks */}
                    <div className="space-y-4">
                        <button
                            onClick={() => toggleSectionCollapse('ranks')}
                            className="w-full flex items-center justify-between text-left group"
                        >
                            <h3 className="text-sm font-semibold uppercase tracking-wider text-purple-400">5. Unit Ranks</h3>
                            {expandedSections.ranks ? <ChevronDown className="w-4 h-4 text-purple-400" /> : <ChevronRight className="w-4 h-4 text-purple-400" />}
                        </button>

                        {expandedSections.ranks && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-top-1 duration-200">
                                <div className="flex items-center justify-between">
                                    <p className="text-xs text-slate-500 mb-2">Select the ranks that are applicable/visible for this unit.</p>
                                    <div className="flex gap-2">
                                        <button type="button" onClick={handleSelectAllRanks} className="text-xs text-blue-400 hover:text-blue-300">Select All</button>
                                        <span className="text-slate-600">|</span>
                                        <button type="button" onClick={handleDeselectAllRanks} className="text-xs text-red-400 hover:text-red-300">Deselect All</button>
                                    </div>
                                </div>

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
                        )}
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
        <div className="p-6 space-y-8 animate-in fade-in duration-500">
            {/* Enhanced Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-dark-card/30 p-6 rounded-2xl border border-dark-border backdrop-blur-md">
                <div className="space-y-1">
                    <h1 className="text-4xl font-extrabold bg-gradient-to-r from-purple-400 via-blue-400 to-purple-400 bg-clip-text text-transparent animate-gradient-x">
                        Units
                    </h1>
                    <p className="text-slate-400 text-sm">Manage organizational units, scopes, and section mappings.</p>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                    {/* Add Unit Button */}
                    <button
                        onClick={() => {
                            setEditingId(null);
                            setFormData({ name: "", isActive: true, scopes: [], mappedAreaIds: [], applicableRanks: [], hideFromRegistration: false, hiddenFields: [] });
                            setSectionsList([]);
                            setShowForm(true);
                        }}
                        className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 px-6 py-3 text-white font-semibold transition-all hover:scale-105 hover:shadow-[0_0_20px_rgba(126,34,206,0.4)] active:scale-95"
                    >
                        <Plus className="h-5 w-5" />
                        Add Unit
                    </button>
                </div>
            </div>

            {showForm && renderModal()}

            {/* Main Content Area */}
            <div className="space-y-6">
                {/* Search and Tool Bar */}
                <div className="flex flex-col sm:flex-row items-center gap-4">
                    <div className="relative flex-1 w-full">
                        <input
                            type="text"
                            placeholder="Search units by name or scope..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-dark-card/50 border border-dark-border rounded-2xl px-12 py-4 text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all placeholder:text-slate-600 shadow-inner"
                        />
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                        {searchQuery && (
                            <button onClick={() => setSearchQuery("")} className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-white/10 rounded-full transition-colors">
                                <X className="w-4 h-4 text-slate-400" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Unit List (Card-based Layout) */}
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filteredUnits.map((unit) => (
                        <div
                            key={unit.id}
                            className={`group relative overflow-hidden rounded-2xl border transition-all duration-300 hover:scale-[1.02] hover:shadow-xl ${unit.isActive !== false
                                ? "bg-dark-card/40 border-dark-border hover:border-purple-500/30"
                                : "bg-dark-card/20 border-dark-border/50 opacity-80"
                                }`}
                        >
                            {/* Glassmorphism Background Accent - Fixed with pointer-events-none */}
                            <div className={`absolute top-0 right-0 w-32 h-32 blur-3xl rounded-full opacity-10 transition-opacity group-hover:opacity-20 pointer-events-none ${unit.isActive !== false ? "bg-purple-600" : "bg-slate-600"}`} />

                            <div className="p-6 space-y-4 relative z-10">
                                {/* Top Info: Icon + Name + Status */}
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2.5 rounded-xl border ${unit.isActive !== false ? "bg-purple-500/10 border-purple-500/20 text-purple-400" : "bg-slate-700/30 border-slate-700 text-slate-500"}`}>
                                            <Shield className="w-5 h-5 text-current" />
                                        </div>
                                        <div className="flex flex-col">
                                            <h3 className="font-bold text-slate-100 text-lg group-hover:text-purple-300 transition-colors uppercase tracking-tight">{unit.name}</h3>
                                            <span className={`text-[10px] font-bold uppercase tracking-widest ${unit.isActive !== false ? "text-green-500" : "text-slate-500"}`}>
                                                {unit.isActive !== false ? "● Active" : "○ Inactive"}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Action Buttons - Always visible for easier access */}
                                    <div className="flex items-center gap-1 bg-dark-card/50 rounded-lg p-1 border border-white/5 backdrop-blur-md shadow-sm">
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                handleEdit(unit);
                                            }}
                                            className="p-2 hover:bg-purple-500/20 rounded-lg text-slate-400 hover:text-purple-400 transition-all active:scale-95"
                                            title="Edit unit"
                                        >
                                            <Edit className="w-4 h-4" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                handleDelete(unit.id!, unit.name);
                                            }}
                                            className="p-2 hover:bg-red-500/20 rounded-lg text-slate-400 hover:text-red-400 transition-all active:scale-95"
                                            title="Delete unit"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                {/* Scopes Chip List */}
                                <div className="flex flex-wrap gap-1.5 min-h-[50px] items-center">
                                    {(unit.scopes || []).map((scope) => (
                                        <span key={scope} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-[10px] font-medium text-slate-300 shadow-sm transition-colors hover:border-slate-600">
                                            <Layers className="w-3 h-3 text-purple-400" />
                                            {scope.replace("_", " ").toUpperCase()}
                                        </span>
                                    ))}
                                    {(!unit.scopes || unit.scopes.length === 0) && (
                                        <span className="text-xs text-slate-600 italic">No scopes assigned</span>
                                    )}
                                </div>

                                {/* Bottom Info: Stats & Badges */}
                                <div className="flex items-center justify-between pt-4 border-t border-dark-border/10">
                                    <div className="flex gap-4">
                                        {unit.mappedAreaIds && (
                                            <div className="flex items-center gap-1.5 text-slate-400">
                                                <MapPin className="w-3.5 h-3.5 text-blue-400" />
                                                <span className="text-xs font-medium">{unit.mappedAreaIds.length} Areas</span>
                                            </div>
                                        )}
                                        {unit.applicableRanks && (
                                            <div className="flex items-center gap-1.5 text-slate-400">
                                                <LayoutGrid className="w-3.5 h-3.5 text-orange-400" />
                                                <span className="text-xs font-medium">{unit.applicableRanks.length} Ranks</span>
                                            </div>
                                        )}
                                    </div>

                                    {unit.hideFromRegistration && (
                                        <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-orange-500/10 border border-orange-500/20 text-[9px] font-bold text-orange-400 uppercase tracking-tighter">
                                            <AlertCircle className="w-2.5 h-2.5" />
                                            Hidden
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {filteredUnits.length === 0 && (
                    <div className="py-20 flex flex-col items-center justify-center text-center space-y-6 bg-dark-card/20 rounded-3xl border-2 border-dashed border-dark-border">
                        <div className="relative">
                            <div className="absolute inset-0 blur-3xl bg-purple-500/20 animate-pulse rounded-full" />
                            <RefreshCw className={`w-16 h-16 text-slate-700 relative z-10 ${migrating ? "animate-spin" : "opacity-50"}`} />
                        </div>
                        <div className="space-y-2 relative z-10">
                            <h3 className="text-2xl font-bold text-slate-200">
                                {searchQuery ? "No matching units found" : "Your fleet is empty"}
                            </h3>
                            <p className="text-slate-500 max-w-sm mx-auto">
                                {searchQuery
                                    ? `We couldn't find any unit matching "${searchQuery}". Try a different term.`
                                    : "It seems you haven't added any units yet. Start by creating a manual unit or populate the system defaults."
                                }
                            </p>
                        </div>

                        <div className="flex gap-4 pt-4">
                            {!searchQuery && (
                                <button
                                    onClick={handlePopulateDefaults}
                                    disabled={migrating}
                                    className="px-8 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold transition-all hover:scale-105 active:scale-95 disabled:opacity-50 flex items-center gap-2 border border-slate-700"
                                >
                                    <RefreshCw className={`h-4 w-4 ${migrating ? "animate-spin" : ""}`} />
                                    {migrating ? "Populating..." : "Populate Default Units"}
                                </button>
                            )}
                            <button
                                onClick={() => setShowForm(true)}
                                className="px-8 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold transition-all hover:scale-105 active:scale-95 shadow-lg shadow-purple-500/20"
                            >
                                Add Manual Unit
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div >
    );
}
