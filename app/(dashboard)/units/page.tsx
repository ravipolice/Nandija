"use client";

import { useEffect, useState, useMemo, useRef, Fragment } from "react";
import { getUnits, createUnit, updateUnit, deleteUnit, Unit, getDistricts, District, getUnitSections, updateUnitSections, getRanks, Rank } from "@/lib/firebase/firestore";
import { getAppConfig } from "@/lib/firebase/app-config";
import { Plus, Edit, Trash2, Save, X, Check, RefreshCw, Search, Shield, ChevronDown } from 'lucide-react';
import { DEFAULT_UNITS, ALL_BATTALIONS } from "@/lib/constants";

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

interface MultiSelectProps {
    label: string;
    options: { id: string; label: string }[];
    selectedIds: string[];
    onToggle: (id: string) => void;
    placeholder?: string;
    required?: boolean;
}

const MultiSelectBox = ({ label, options, selectedIds, onToggle, placeholder, required }: MultiSelectProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState("");
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const filteredOptions = options.filter(opt =>
        opt.label.toLowerCase().includes(search.toLowerCase()) ||
        opt.id.toLowerCase().includes(search.toLowerCase())
    );

    const selectedOptions = options.filter(opt => selectedIds.includes(opt.id));

    return (
        <div className="space-y-2" ref={dropdownRef}>
            <label className="block text-sm font-medium text-slate-400">
                {label} {required && <span className="text-red-500">*</span>}
            </label>
            <div
                className={`min-h-[48px] p-1.5 rounded-xl border bg-dark-sidebar/30 transition-all cursor-text flex flex-wrap gap-2 items-center ${isOpen ? "border-purple-500 ring-2 ring-purple-500/20" : "border-dark-border hover:border-slate-600"
                    }`}
                onClick={() => setIsOpen(true)}
            >
                {selectedOptions.map(opt => (
                    <span key={opt.id} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-500/20 border border-purple-500/30 text-xs font-medium text-purple-300 animate-in zoom-in-95 duration-200">
                        {opt.label}
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); onToggle(opt.id); }}
                            className="hover:text-purple-100 transition-colors"
                        >
                            <X className="w-3 h-3" />
                        </button>
                    </span>
                ))}

                <input
                    type="text"
                    className="flex-1 min-w-[120px] bg-transparent border-none outline-none text-sm text-slate-200 placeholder:text-slate-600 px-2"
                    placeholder={selectedIds.length === 0 ? placeholder : ""}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onFocus={() => setIsOpen(true)}
                />

                {selectedIds.length > 0 && (
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            selectedIds.forEach(id => onToggle(id));
                        }}
                        className="p-1 hover:bg-white/5 rounded-md text-slate-500 transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                )}
                <ChevronDown className={`w-4 h-4 text-slate-500 mr-2 transition-transform ${isOpen ? "rotate-180" : ""}`} />
            </div>

            {isOpen && (
                <div className="relative">
                    <div className="absolute z-[60] mt-1 w-full rounded-xl bg-dark-card border border-dark-border shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="max-h-60 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                            {filteredOptions.length > 0 ? (
                                filteredOptions.map(opt => (
                                    <button
                                        key={opt.id}
                                        type="button"
                                        onClick={() => onToggle(opt.id)}
                                        className={`w-full flex items-center justify-between p-2.5 rounded-lg text-left text-sm transition-colors ${selectedIds.includes(opt.id)
                                            ? "bg-purple-500/10 text-purple-300"
                                            : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
                                            }`}
                                    >
                                        <div className="flex flex-col">
                                            <span className="font-medium">{opt.label}</span>
                                            <span className="text-[10px] opacity-50">{opt.id}</span>
                                        </div>
                                        {selectedIds.includes(opt.id) && <Check className="w-4 h-4 text-purple-500" />}
                                    </button>
                                ))
                            ) : (
                                <div className="p-4 text-center text-sm text-slate-600 italic">
                                    No options found matching &quot;{search}&quot;
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default function UnitsPage() {
    const [units, setUnits] = useState<Unit[]>([]);
    const [districts, setDistricts] = useState<District[]>([]);
    const [allRanks, setAllRanks] = useState<Rank[]>([]);
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
    const [searchQuery, setSearchQuery] = useState("");
    const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
        identity: true,
        status: true,
        visibility: false,
        scope: true,
        sections: true,
        ranks: false
    });

    // Resizable columns state
    const [columnWidths, setColumnWidths] = useState({
        status: 100,
        name: 450,
        scopes: 180,
        areas: 250,
        actions: 100
    });
    const resizingColumn = useRef<string | null>(null);
    const startX = useRef<number>(0);
    const startWidth = useRef<number>(0);

    const handleMouseDown = (e: React.MouseEvent, column: string) => {
        resizingColumn.current = column;
        startX.current = e.pageX;
        startWidth.current = columnWidths[column as keyof typeof columnWidths];
        document.addEventListener("mousemove", handleMouseMove);
        document.addEventListener("mouseup", handleMouseUp);
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
    };

    const handleMouseMove = (e: MouseEvent) => {
        if (!resizingColumn.current) return;
        const diff = e.pageX - startX.current;
        const newWidth = Math.max(50, startWidth.current + diff);
        setColumnWidths(prev => ({
            ...prev,
            [resizingColumn.current!]: newWidth
        }));
    };

    const handleMouseUp = () => {
        resizingColumn.current = null;
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
    };

    // Clean up event listeners on unmount
    useEffect(() => {
        return () => {
            document.removeEventListener("mousemove", handleMouseMove);
            document.removeEventListener("mouseup", handleMouseUp);
        };
    }, []);

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
            const data = await getUnits();
            setUnits(data);
        } catch (error) {
            console.error("Error loading units:", error);
        } finally {
            setLoading(false);
        }
    };

    const loadDistricts = async () => {
        try {
            const data = await getDistricts();
            console.log("DEBUG: Loaded districts from Firestore:", data.map(d => d.name));
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
        if (!unit.id) return;
        setEditingId(unit.id);

        let initialScopes: string[] = unit.scopes || [];

        // Migration logic
        if (initialScopes.length === 0 && unit.mappingType) {
            if (unit.mappingType === "state") initialScopes.push("hq");
            if (unit.mappingType === "single" || unit.mappingType === "subset") initialScopes.push("district");
            if (unit.mappingType === "commissionerate") initialScopes.push("commissionerate");
            if (unit.name?.toUpperCase().includes("KSRP") && unit.mappingType === "subset") {
                initialScopes = initialScopes.filter(s => s !== "district").concat("battalion");
            }
            if (unit.isHqLevel && !initialScopes.includes("hq")) initialScopes.push("hq");
        }

        setFormData({
            name: unit.name,
            isActive: unit.isActive !== false,
            scopes: [...new Set(initialScopes)],
            mappedAreaIds: unit.mappedAreaIds || unit.mappedDistricts || [],
            isDistrictLevel: unit.isDistrictLevel || false,
            isHqLevel: unit.isHqLevel || false,
            applicableRanks: unit.applicableRanks || [],
            stationKeyword: unit.stationKeyword || "",
            hideFromRegistration: unit.hideFromRegistration || false,
            hiddenFields: unit.hiddenFields || [],
        });

        try {
            const sections = await getUnitSections(unit.name);
            setSectionsList(sections);
        } catch (error) {
            console.error("Error fetching sections:", error);
            setSectionsList([]);
        }

        setShowForm(true);
    };

    const toggleHiddenField = (fieldId: string) => {
        const current = formData.hiddenFields || [];
        setFormData({
            ...formData,
            hiddenFields: current.includes(fieldId) ? current.filter(id => id !== fieldId) : [...current, fieldId]
        });
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
        setShowForm(false);
        setEditingId(null);
        setFormData({ name: "", isActive: true, scopes: [], mappedAreaIds: [], applicableRanks: [], hideFromRegistration: false, hiddenFields: [] });
        setSectionsList([]);
    };

    const handlePopulateDefaults = async () => {
        if (!confirm(`This will add ${DEFAULT_UNITS.length} default units. Continue?`)) return;
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
            alert(`Failed: ${error.message || "Unknown error"}`);
        } finally {
            setMigrating(false);
        }
    };

    const toggleScope = (scopeId: string) => {
        const current = formData.scopes || [];
        setFormData({
            ...formData,
            scopes: current.includes(scopeId) ? current.filter(s => s !== scopeId) : [...current, scopeId]
        });
    };

    const toggleMappedArea = (areaId: string) => {
        const current = formData.mappedAreaIds || [];
        setFormData({
            ...formData,
            mappedAreaIds: current.includes(areaId) ? current.filter(id => id !== areaId) : [...current, areaId]
        });
    };

    const toggleApplicableRank = (rankId: string) => {
        const current = formData.applicableRanks || [];
        setFormData({
            ...formData,
            applicableRanks: current.includes(rankId) ? current.filter(id => id !== rankId) : [...current, rankId]
        });
    };

    const handleAddSection = () => {
        const trimmed = newSectionInput.trim();
        if (!trimmed || sectionsList.includes(trimmed)) return;
        setSectionsList([...sectionsList, trimmed].sort());
        setNewSectionInput("");
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const scopes = formData.scopes || [];

        if (!formData.name?.trim()) {
            alert("âŒ Unit Name is required.");
            return;
        }

        const requiresArea = scopes.some(s => ["district", "battalion", "commissionerate", "district_stations"].includes(s));
        if (requiresArea && (!formData.mappedAreaIds || formData.mappedAreaIds.length === 0)) {
            alert("âŒ Selected scope(s) require selecting specific areas.");
            return;
        }

        setSubmitting(true);
        try {
            // Computed legacy fields
            let derivedMappingType: Unit["mappingType"] = "none";
            if (scopes.some(s => ["district", "battalion", "district_stations"].includes(s))) derivedMappingType = "subset";
            else if (scopes.includes("commissionerate")) derivedMappingType = "commissionerate";
            else if (scopes.includes("hq") && scopes.length === 1) derivedMappingType = "state";

            let mappedAreaType: Unit["mappedAreaType"] = "DISTRICT";
            if (scopes.includes("battalion")) mappedAreaType = "BATTALION";
            else if (scopes.includes("commissionerate")) mappedAreaType = "CITY";
            else if (scopes.includes("hq")) mappedAreaType = "HQ";

            const payload = {
                name: formData.name?.trim() || "",
                isActive: formData.isActive,
                scopes: scopes,
                mappedAreaIds: requiresArea ? formData.mappedAreaIds : [],
                mappingType: derivedMappingType,
                mappedAreaType: mappedAreaType,
                mappedDistricts: requiresArea ? formData.mappedAreaIds : [],
                isHqLevel: scopes.includes("hq"),
                isDistrictLevel: scopes.includes("district"),
                applicableRanks: formData.applicableRanks || [],
                stationKeyword: formData.stationKeyword?.trim() || "",
                hideFromRegistration: formData.hideFromRegistration || false,
                hiddenFields: formData.hiddenFields || []
            };

            if (editingId) {
                await updateUnit(editingId, payload);
            } else {
                await createUnit(payload);
            }

            const unitName = formData.name?.trim();
            if (unitName) {
                await updateUnitSections(unitName, sectionsList);
            }

            setShowForm(false);
            setEditingId(null);
            setFormData({ name: "", isActive: true, scopes: [], mappedAreaIds: [], applicableRanks: [], hideFromRegistration: false });
            setSectionsList([]);
            await loadUnits();
            alert("Unit saved successfully!");
        } catch (error: any) {
            alert(`Failed to save: ${error.message}`);
        } finally {
            setSubmitting(false);
        }
    };

    const scopeOptions = [
        { id: "hq", label: "HQ Level" },
        { id: "district", label: "District HQ (No Stations)" },
        { id: "district_stations", label: "Districts (With Stations)" },
        { id: "battalion", label: "Battalion" },
        { id: "commissionerate", label: "Commissionerate" }
    ];

    const areaOptions = useMemo(() => {
        const scopes = formData.scopes || [];
        const options: { id: string; label: string }[] = [];

        if (scopes.includes("district") || scopes.includes("district_stations")) {
            districts.filter(d => !d.name.toUpperCase().endsWith(" CITY") && !ALL_BATTALIONS.includes(d.name))
                .forEach(d => options.push({ id: d.name, label: d.name }));
        }
        if (scopes.includes("battalion")) {
            ALL_BATTALIONS.forEach(bn => options.push({ id: bn, label: bn }));
        }
        if (scopes.includes("commissionerate")) {
            districts.filter(d => d.name.toUpperCase().endsWith(" CITY"))
                .forEach(d => options.push({ id: d.name, label: d.name }));
        }
        return options;
    }, [formData.scopes, districts]);

    const rankOptions = useMemo(() =>
        allRanks.map(r => ({ id: r.rank_id, label: `${r.rank_id} - ${r.rank_label}` }))
        , [allRanks]);

    if (loading) {
        return (
            <div className="flex h-[80vh] items-center justify-center p-6">
                <div className="flex flex-col items-center gap-4">
                    <RefreshCw className="w-10 h-10 text-purple-500 animate-spin" />
                    <div className="text-lg font-medium text-slate-400">Loading Units Inventory...</div>
                </div>
            </div>
        );
    }

    const renderForm = () => (
        <div className="w-full rounded-2xl bg-dark-card border border-dark-border shadow-lg flex flex-col mb-8 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Form Header */}
            <div className="flex items-center justify-between border-b border-dark-border px-8 py-6">
                <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-2xl ${editingId ? "bg-purple-500/10 text-purple-400" : "bg-green-500/10 text-green-400"}`}>
                        {editingId ? <Edit className="w-6 h-6" /> : <Plus className="w-6 h-6" />}
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-slate-100 uppercase tracking-tight">
                            {editingId ? "Edit Unit Configuration" : "New Unit Establishment"}
                        </h2>
                        <p className="text-xs text-slate-500 font-medium tracking-wide">Configure organizational parameters and access scopes.</p>
                    </div>
                </div>
                <button onClick={handleCancel} className="p-2 rounded-xl hover:bg-white/5 text-slate-400 hover:text-white transition-all">
                    <X className="w-6 h-6" />
                </button>
            </div>

            {/* Form Body */}
            <div className="p-8 space-y-10">
                {/* Identity Section */}
                <div className="space-y-6">
                    <div className="flex items-center gap-2 mb-2">
                        <Shield className="w-4 h-4 text-purple-400" />
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Base Identity</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-slate-400">Unit Name {!editingId && <span className="text-red-500">*</span>}</label>
                            <input
                                type="text"
                                value={formData.name}
                                disabled={!!editingId}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="w-full rounded-xl bg-dark-sidebar/50 border border-dark-border px-4 py-3 text-slate-200 focus:ring-2 focus:ring-purple-500/50 outline-none transition-all disabled:opacity-50"
                                placeholder="e.g. Traffic Branch"
                            />
                            {editingId && <p className="text-[10px] text-slate-600 italic">Name cannot be changed after creation.</p>}
                        </div>
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-slate-400">Identifier Filter (Optional)</label>
                            <input
                                type="text"
                                value={formData.stationKeyword || ""}
                                onChange={(e) => setFormData({ ...formData, stationKeyword: e.target.value })}
                                className="w-full rounded-xl bg-dark-sidebar/50 border border-dark-border px-4 py-3 text-slate-200 focus:ring-2 focus:ring-purple-500/50 outline-none transition-all placeholder:text-slate-700"
                                placeholder="e.g. CEN"
                            />
                        </div>
                    </div>
                </div>

                {/* Configuration Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    {/* Scope & Mapping */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-2 mb-2">
                            <Layers className="w-4 h-4 text-blue-400" />
                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Access Scopes</h3>
                        </div>
                        <MultiSelectBox
                            label="Operational Scopes"
                            options={scopeOptions}
                            selectedIds={formData.scopes || []}
                            onToggle={toggleScope}
                            placeholder="Select organizational scopes..."
                            required
                        />
                        {areaOptions.length > 0 && (
                            <MultiSelectBox
                                label="Mapped Geographic Areas"
                                options={areaOptions}
                                selectedIds={formData.mappedAreaIds || []}
                                onToggle={toggleMappedArea}
                                placeholder="Search districts/battalions..."
                                required
                            />
                        )}
                    </div>

                    {/* Ranks & Staffing */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-2 mb-2">
                            <LayoutGrid className="w-4 h-4 text-orange-400" />
                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Human Resources</h3>
                        </div>
                        <MultiSelectBox
                            label="Permitted Personnel Ranks"
                            options={rankOptions}
                            selectedIds={formData.applicableRanks || []}
                            onToggle={toggleApplicableRank}
                            placeholder="Select authorized ranks..."
                        />

                        {/* Status Toggles */}
                        <div className="pt-4 space-y-4">
                            <div className="flex items-center justify-between p-4 rounded-2xl bg-dark-sidebar/20 border border-dark-border">
                                <div className="flex items-center gap-3">
                                    <div className={`w-3 h-3 rounded-full ${formData.isActive ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" : "bg-red-500"}`} />
                                    <span className="text-sm font-semibold text-slate-300">Unit Status</span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
                                    className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase transition-all ${formData.isActive ? "bg-green-500/10 text-green-500 hover:bg-green-500/20" : "bg-red-500/10 text-red-500 hover:bg-red-500/20"
                                        }`}
                                >
                                    {formData.isActive ? "Active" : "Inactive"}
                                </button>
                            </div>
                            <label className="flex items-center justify-between p-4 rounded-2xl bg-dark-sidebar/20 border border-dark-border cursor-pointer group">
                                <div className="flex items-center gap-3">
                                    <AlertCircle className={`w-4 h-4 ${formData.hideFromRegistration ? "text-orange-500" : "text-slate-600"}`} />
                                    <div>
                                        <span className="text-sm font-semibold text-slate-300">Privacy Control</span>
                                        <p className="text-[10px] text-slate-500">Hide from enrollment forms</p>
                                    </div>
                                </div>
                                <input
                                    type="checkbox"
                                    className="hidden"
                                    checked={!!formData.hideFromRegistration}
                                    onChange={(e) => setFormData({ ...formData, hideFromRegistration: e.target.checked })}
                                />
                                <div className={`w-10 h-5 rounded-full relative transition-colors ${formData.hideFromRegistration ? "bg-orange-600" : "bg-slate-700"}`}>
                                    <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${formData.hideFromRegistration ? "left-6" : "left-1"}`} />
                                </div>
                            </label>
                        </div>
                    </div>
                </div>

                {/* Sections Management */}
                {(formData.scopes?.includes("hq") || formData.scopes?.includes("district")) && (
                    <div className="space-y-6 pt-6 border-t border-dark-border">
                        <div className="flex items-center gap-2 mb-2">
                            <Filter className="w-4 h-4 text-emerald-400" />
                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Branch Sections</h3>
                        </div>
                        <div className="flex gap-4">
                            <input
                                type="text"
                                value={newSectionInput}
                                onChange={(e) => setNewSectionInput(e.target.value)}
                                placeholder="Add specialized section (e.g. Accounts)..."
                                className="flex-1 rounded-xl bg-dark-sidebar/50 border border-dark-border px-4 py-3 text-slate-200 outline-none focus:ring-2 focus:ring-emerald-500/30"
                                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddSection())}
                            />
                            <button
                                type="button"
                                onClick={handleAddSection}
                                className="px-6 py-3 bg-emerald-600/20 text-emerald-400 border border-emerald-600/30 rounded-xl font-bold hover:bg-emerald-600/30 active:scale-95 transition-all"
                            >
                                Append
                            </button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {sectionsList.map(s => (
                                <span key={s} className="group inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs font-medium text-emerald-300 transition-all hover:border-emerald-500/40">
                                    {s}
                                    <button
                                        type="button"
                                        onClick={() => setSectionsList(prev => prev.filter(x => x !== s))}
                                        className="opacity-40 group-hover:opacity-100 transition-opacity hover:text-white"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                </span>
                            ))}
                            {sectionsList.length === 0 && <p className="text-xs text-slate-600 italic py-2">No sections defined yet for this HQ unit.</p>}
                        </div>
                    </div>
                )}
            </div>

            {/* Form Footer */}
            <div className="border-t border-dark-border p-8 flex justify-end gap-4 bg-dark-sidebar/10 rounded-b-2xl">
                <button
                    type="button"
                    onClick={handleCancel}
                    className="rounded-2xl border border-dark-border px-8 py-3.5 text-slate-400 font-bold tracking-tight hover:bg-white/5 hover:text-white transition-all active:scale-95"
                >
                    Discard Changes
                </button>
                <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="flex items-center gap-3 rounded-2xl bg-gradient-to-r from-purple-600 to-blue-600 px-10 py-3.5 text-white font-bold tracking-tighter transition-all hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(126,34,206,0.3)] active:scale-95 disabled:opacity-50"
                >
                    {submitting ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    {submitting ? "Syncing..." : editingId ? "Save Configurations" : "Establish Unit"}
                </button>
            </div>
        </div>
    );

    return (
        <div className="p-6">
            {/* Page Header â€” matches Ranks page */}
            <div className="mb-6 flex items-center justify-between">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">Units</h1>
                <div className="flex items-center gap-2">
                    {/* Search */}
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Search units..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="bg-dark-sidebar border border-dark-border rounded-lg pl-9 pr-4 py-2 text-sm text-slate-200 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50 placeholder:text-slate-500 w-52"
                        />
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        {searchQuery && (
                            <button onClick={() => setSearchQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                    <button
                        onClick={handlePopulateDefaults}
                        className="p-2 rounded-lg border border-dark-border text-slate-400 hover:text-white hover:border-slate-500 transition-colors"
                        title="Sync Default Units"
                    >
                        <RefreshCw className={`w-4 h-4 ${migrating ? "animate-spin" : ""}`} />
                    </button>
                    <button
                        onClick={() => setShowForm(true)}
                        className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 px-4 py-2 text-white transition-all hover:shadow-lg hover:shadow-purple-500/50"
                    >
                        <Plus className="h-5 w-5" />
                        Add Unit
                    </button>
                </div>
            </div>

            {/* Add-new form (shows above table, matches Ranks page) */}
            {showForm && !editingId && (
                <div className="mb-6 rounded-lg bg-dark-card border border-dark-border shadow-lg">
                    {renderForm()}
                </div>
            )}

            {/* Table — matches Ranks page container */}
            <div className="overflow-hidden rounded-lg bg-dark-card border border-dark-border shadow-lg flex flex-col h-[calc(100vh-140px)]">
                <div className="flex-1 overflow-auto custom-scrollbar">
                    <table className="w-full min-w-full" style={{ tableLayout: 'fixed' }}>
                        <thead className="bg-dark-sidebar border-b border-dark-border sticky top-0 z-10">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-400 bg-dark-sidebar relative group/th select-none" style={{ width: columnWidths.status }}>
                                    Status
                                    <div
                                        onMouseDown={(e) => handleMouseDown(e, 'status')}
                                        className="absolute right-0 top-0 h-full w-4 -mr-2 cursor-col-resize z-20 flex justify-center group-hover/th:opacity-100 opacity-[0.15] transition-opacity"
                                    >
                                        <div className="w-[1px] h-full bg-purple-500/50" />
                                    </div>
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-400 bg-dark-sidebar relative group/th select-none" style={{ width: columnWidths.name }}>
                                    Unit Name
                                    <div
                                        onMouseDown={(e) => handleMouseDown(e, 'name')}
                                        className="absolute right-0 top-0 h-full w-4 -mr-2 cursor-col-resize z-20 flex justify-center group-hover/th:opacity-100 opacity-[0.15] transition-opacity"
                                    >
                                        <div className="w-[1px] h-full bg-purple-500/50" />
                                    </div>
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-400 bg-dark-sidebar relative group/th select-none" style={{ width: columnWidths.scopes }}>
                                    Scopes
                                    <div
                                        onMouseDown={(e) => handleMouseDown(e, 'scopes')}
                                        className="absolute right-0 top-0 h-full w-4 -mr-2 cursor-col-resize z-20 flex justify-center group-hover/th:opacity-100 opacity-[0.15] transition-opacity"
                                    >
                                        <div className="w-[1px] h-full bg-purple-500/50" />
                                    </div>
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-400 bg-dark-sidebar relative group/th select-none" style={{ width: columnWidths.areas }}>
                                    Areas / Ranks
                                    <div
                                        onMouseDown={(e) => handleMouseDown(e, 'areas')}
                                        className="absolute right-0 top-0 h-full w-4 -mr-2 cursor-col-resize z-20 flex justify-center group-hover/th:opacity-100 opacity-[0.15] transition-opacity"
                                    >
                                        <div className="w-[1px] h-full bg-purple-500/50" />
                                    </div>
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-400 bg-dark-sidebar" style={{ width: columnWidths.actions }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-dark-border bg-dark-card">
                            {filteredUnits.length > 0 ? (
                                filteredUnits.map((unit) => (
                                    <Fragment key={unit.id}>
                                        {editingId === unit.id ? (
                                            <tr className="bg-dark-sidebar">
                                                <td colSpan={5} className="p-0">
                                                    {renderForm()}
                                                </td>
                                            </tr>
                                        ) : (
                                            <tr className={`hover:bg-dark-sidebar transition-colors ${unit.isActive === false ? "opacity-50" : ""}`}>
                                                <td className="whitespace-nowrap px-6 py-4 text-sm">
                                                    {unit.isActive !== false ? (
                                                        <span className="inline-flex rounded-full bg-green-500/20 px-2 text-xs font-semibold text-green-400">Active</span>
                                                    ) : (
                                                        <span className="inline-flex rounded-full bg-red-500/20 px-2 text-xs font-semibold text-red-400">Inactive</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-sm font-medium text-slate-100 overflow-hidden text-ellipsis whitespace-nowrap">{unit.name}</td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-wrap gap-1">
                                                        {(unit.scopes || []).length > 0
                                                            ? unit.scopes?.map(s => (
                                                                <span key={s} className="inline-flex rounded-full bg-purple-500/20 px-2 text-xs font-semibold text-purple-300">
                                                                    {s.replace("_", " ")}
                                                                </span>
                                                            ))
                                                            : <span className="text-slate-500 text-xs">Global</span>}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-slate-400 overflow-hidden text-ellipsis whitespace-nowrap">
                                                    <span className="text-blue-400">{unit.mappedAreaIds?.length || 0}</span> areas Â· <span className="text-orange-400">{unit.applicableRanks?.length || 0}</span> ranks
                                                </td>
                                                <td className="whitespace-nowrap px-6 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button
                                                            onClick={() => handleEdit(unit)}
                                                            className="text-purple-400 hover:text-purple-300 transition-colors"
                                                            title="Edit"
                                                        >
                                                            <Edit className="h-5 w-5" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(unit.id!, unit.name)}
                                                            className="text-red-400 hover:text-red-300 transition-colors"
                                                            title="Delete"
                                                        >
                                                            <Trash2 className="h-5 w-5" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </Fragment>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="py-12 text-center text-slate-400">
                                        No units found
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
