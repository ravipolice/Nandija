"use client";

import { useState, useEffect } from "react";
import {
    getUnits,
    Unit,
    getUnitSections,
    updateUnitSections
} from "@/lib/firebase/firestore";
import { Plus, Trash2, Save, Loader2, RotateCcw } from "lucide-react";
import { STATE_INT_SECTIONS } from "@/lib/constants";

export default function SectionsPage() {
    const [units, setUnits] = useState<Unit[]>([]);
    const [selectedUnit, setSelectedUnit] = useState<string>("");
    const [sections, setSections] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [newSection, setNewSection] = useState("");
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // Fetch Units on Load
    useEffect(() => {
        async function fetchUnits() {
            try {
                const unitsData = await getUnits();
                setUnits(unitsData);
                // Default to State INT if exists
                if (unitsData.find(u => u.name === "State INT")) {
                    setSelectedUnit("State INT");
                } else if (unitsData.length > 0) {
                    setSelectedUnit(unitsData[0].name);
                }
            } catch (error) {
                console.error("Failed to fetch units", error);
                setMessage({ type: "error", text: "Failed to load units" });
            } finally {
                setLoading(false);
            }
        }
        fetchUnits();
    }, []);

    // Fetch Sections when Unit changes
    useEffect(() => {
        async function fetchSections() {
            if (!selectedUnit) return;
            setLoading(true);
            try {
                const sectionsData = await getUnitSections(selectedUnit);
                setSections(sectionsData);
                setMessage(null);
            } catch (error) {
                console.error("Failed to fetch sections", error);
                setMessage({ type: "error", text: "Failed to load sections" });
            } finally {
                setLoading(false);
            }
        }
        fetchSections();
    }, [selectedUnit]);

    const handleAddSection = async () => {
        if (!newSection.trim()) return;
        if (sections.includes(newSection.trim())) {
            setMessage({ type: "error", text: "Section already exists" });
            return;
        }

        const updatedSections = [...sections, newSection.trim()].sort();
        setSections(updatedSections);
        setNewSection("");

        await saveSections(updatedSections);
    };

    const handleDeleteSection = async (sectionToDelete: string) => {
        if (!confirm(`Are you sure you want to delete "${sectionToDelete}"?`)) return;

        const updatedSections = sections.filter(s => s !== sectionToDelete);
        setSections(updatedSections);

        await saveSections(updatedSections);
    };

    const saveSections = async (updatedSections: string[]) => {
        setSaving(true);
        try {
            await updateUnitSections(selectedUnit, updatedSections);
            setMessage({ type: "success", text: "Saved successfully" });
        } catch (error) {
            console.error("Failed to save", error);
            setMessage({ type: "error", text: "Failed to save changes" });
        } finally {
            setSaving(false);
        }
    };

    const initializeDefaults = async () => {
        if (!confirm(`Initialize "${selectedUnit}" with default sections from constants?`)) return;

        // We only have defaults for State INT currently
        let defaults: string[] = [];
        if (selectedUnit === "State INT") defaults = STATE_INT_SECTIONS;

        if (defaults.length === 0) {
            setMessage({ type: "error", text: "No defaults available for this unit" });
            return;
        }

        const merged = Array.from(new Set([...sections, ...defaults])).sort();
        setSections(merged);
        await saveSections(merged);
    };

    return (
        <div className="p-6">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Manage Unit Sections</h1>
                <p className="text-sm text-gray-500">Add or remove sections (stations) for specific units like State INT.</p>
            </div>

            {/* Unit Selector */}
            <div className="mb-8 w-full max-w-md">
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Unit</label>
                <select
                    value={selectedUnit}
                    onChange={(e) => setSelectedUnit(e.target.value)}
                    className="block w-full rounded-md border border-gray-300 p-2 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm text-gray-900 bg-white"
                    disabled={loading && units.length === 0}
                >
                    <option value="" disabled>Select a unit...</option>
                    {units.map(u => (
                        <option key={u.id} value={u.name}>{u.name}</option>
                    ))}
                </select>
            </div>

            {selectedUnit && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* List */}
                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-medium text-gray-900">
                                Current Sections ({sections.length})
                            </h2>
                            <div className="flex items-center gap-2">
                                {selectedUnit === "State INT" && (
                                    <button
                                        onClick={initializeDefaults}
                                        className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded border border-gray-300 flex items-center"
                                        title="Load Defaults"
                                    >
                                        <RotateCcw className="w-3 h-3 mr-1" /> Defaults
                                    </button>
                                )}
                                {saving && <span className="text-sm text-gray-500 flex items-center"><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Saving...</span>}
                            </div>
                        </div>

                        {message && (
                            <div className={`mb-4 p-3 rounded text-sm ${message.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                                {message.text}
                            </div>
                        )}

                        <div className="space-y-2 max-h-[500px] overflow-y-auto">
                            {sections.length === 0 ? (
                                <p className="text-gray-500 text-sm italic">No sections defined for this unit. Add one below.</p>
                            ) : (
                                sections.map((section) => (
                                    <div key={section} className="flex justify-between items-center p-3 bg-gray-50 rounded-md group hover:bg-gray-100 transition-colors">
                                        <span className="text-gray-800 font-medium">{section}</span>
                                        <button
                                            onClick={() => handleDeleteSection(section)}
                                            className="text-gray-400 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100"
                                            title="Delete Section"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Add New */}
                    <div className="bg-white rounded-lg shadow p-6 h-fit">
                        <h2 className="text-lg font-medium text-gray-900 mb-4">Add New Section</h2>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={newSection}
                                onChange={(e) => setNewSection(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleAddSection()}
                                placeholder="Enter section name..."
                                className="flex-1 rounded-md border border-gray-300 p-2 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                            />
                            <button
                                onClick={handleAddSection}
                                disabled={!newSection.trim() || saving}
                                className="inline-flex items-center justify-center rounded-md border border-transparent bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50"
                            >
                                <Plus className="w-4 h-4 mr-1" />
                                Add
                            </button>
                        </div>
                        <p className="mt-2 text-xs text-gray-500">
                            Updates are saved automatically.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
