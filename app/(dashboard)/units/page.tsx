"use client";

import { useEffect, useState } from "react";
import { getUnits, createUnit, updateUnit, deleteUnit, Unit } from "@/lib/firebase/firestore";
import { Plus, Edit, Trash2, RefreshCw } from "lucide-react";
import { DEFAULT_UNITS } from "@/lib/constants";

type ColumnKey = "name" | "status" | "actions";

const defaultColumnWidths: Record<ColumnKey, number> = {
    name: 300,
    status: 120,
    actions: 120,
};

export default function UnitsPage() {
    const [units, setUnits] = useState<Unit[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState({ name: "" });
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
    }, []);

    const loadUnits = async () => {
        try {
            const data = await getUnits();
            console.log("Loaded units:", data);
            setUnits(data);
            if (data.length === 0) {
                console.warn("No units found. Make sure units exist in Firestore.");
            }
        } catch (error) {
            console.error("Error loading units:", error);
            alert("Failed to load units. Please check the console for details.");
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (unit: Unit) => {
        setEditingId(unit.id || null);
        setFormData({
            name: unit.name,
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
        setShowForm(false);
        setEditingId(null);
        setFormData({ name: "" });
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
            // Get existing unit names to avoid duplicates
            const existingNames = new Set(units.map(u => u.name.toLowerCase()));
            let addedCount = 0;

            for (const unitName of DEFAULT_UNITS) {
                if (!existingNames.has(unitName.toLowerCase())) {
                    await createUnit({ name: unitName });
                    addedCount++;
                }
            }

            alert(`Successfully added ${addedCount} new units.`);
            await loadUnits();
        } catch (error: any) {
            console.error("Error populating default units:", error);
            alert(`Failed to populate default units. Error: ${error.message || error}`);
        } finally {
            setMigrating(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            if (editingId) {
                await updateUnit(editingId, {
                    name: formData.name.trim(),
                });
            } else {
                await createUnit({
                    name: formData.name.trim(),
                });
            }
            handleCancel();
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
                <div className="text-lg text-slate-100-secondary">Loading...</div>
            </div>
        );
    }

    return (
        <div className="p-6">
            <div className="mb-6 flex items-center justify-between">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">Units</h1>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 px-4 py-2 text-white transition-all hover:shadow-lg hover:shadow-purple-500/50"
                >
                    <Plus className="h-5 w-5" />
                    Add Unit
                </button>
            </div>

            {showForm && (
                <div className="mb-6 rounded-lg bg-dark-card border border-dark-border p-6 shadow-lg">
                    <h2 className="mb-4 text-xl font-semibold text-slate-100">
                        {editingId ? "Edit Unit" : "Add New Unit"}
                    </h2>
                    <form onSubmit={handleSubmit}>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div>
                                <label className="block text-sm font-medium text-slate-100-secondary">
                                    Name *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="mt-1 block w-full rounded-md bg-dark-sidebar border border-dark-border px-3 py-2 text-slate-100 placeholder-slate-400 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                                />
                            </div>
                        </div>
                        <div className="mt-4 flex gap-4">
                            <button
                                type="submit"
                                disabled={submitting}
                                className="rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 px-6 py-2 text-white transition-all hover:shadow-lg hover:shadow-purple-500/50 disabled:opacity-50"
                            >
                                {submitting ? "Saving..." : "Save Unit"}
                            </button>
                            <button
                                type="button"
                                onClick={handleCancel}
                                className="rounded-lg border border-dark-border px-6 py-2 text-slate-100-secondary transition-colors hover:bg-dark-sidebar hover:text-slate-100"
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
                                className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-100-secondary relative"
                                style={{ width: columnWidths.name }}
                            >
                                Name
                                <div
                                    onMouseDown={(e) => handleMouseDown(e, "name")}
                                    style={{ cursor: resizingColumn === "name" ? "col-resize" : "col-resize" }}
                                    className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-purple-500"
                                />
                            </th>
                            <th
                                className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-100-secondary relative"
                                style={{ width: columnWidths.status }}
                            >
                                Status
                                <div
                                    onMouseDown={(e) => handleMouseDown(e, "status")}
                                    style={{ cursor: resizingColumn === "status" ? "col-resize" : "col-resize" }}
                                    className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-purple-500"
                                />
                            </th>
                            <th
                                className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-100-secondary relative"
                                style={{ width: columnWidths.actions }}
                            >
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-dark-border bg-dark-card">
                        {units.map((unit) => (
                            <tr key={unit.id} className="hover:bg-dark-sidebar transition-colors">
                                <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-slate-100 overflow-hidden text-ellipsis" style={{ maxWidth: columnWidths.name }}>
                                    {unit.name}
                                </td>
                                <td className="whitespace-nowrap px-6 py-4 overflow-hidden text-ellipsis" style={{ maxWidth: columnWidths.status }}>
                                    <span className="inline-flex rounded-full bg-green-500/20 px-2 text-xs font-semibold text-green-400">
                                        Active
                                    </span>
                                </td>
                                <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
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
                        ))}
                    </tbody>
                </table>
                {units.length === 0 && (
                    <div className="py-12 text-center text-slate-100-secondary flex flex-col items-center gap-4">
                        <p>No units found</p>
                        <button
                            onClick={handlePopulateDefaults}
                            disabled={migrating}
                            className="flex items-center gap-2 rounded-lg bg-slate-700 px-4 py-2 text-white transition-all hover:bg-slate-600 disabled:opacity-50"
                        >
                            <RefreshCw className={`h-4 w-4 ${migrating ? "animate-spin" : ""}`} />
                            {migrating ? "Populating..." : "Populate Default Units"}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
