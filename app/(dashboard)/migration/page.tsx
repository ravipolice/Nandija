"use client";

import { useState, useEffect } from "react";
import {
    getDistricts,
    getStations,
    getOfficers,
    updateStation,
    deleteOfficer,
    District,
    Station,
    Officer,
} from "@/lib/firebase/firestore";
import { Trash2, AlertTriangle, RefreshCw } from "lucide-react";

export default function MigrationPage() {
    const [loading, setLoading] = useState(false);

    // Data caches
    const [allStations, setAllStations] = useState<Station[]>([]);
    const [allOfficers, setAllOfficers] = useState<Officer[]>([]);
    const [districts, setDistricts] = useState<District[]>([]);
    const [invalidDistricts, setInvalidDistricts] = useState<string[]>([]);

    // Duplicate Analysis State
    const [duplicateGroups, setDuplicateGroups] = useState<Officer[][]>([]);
    const [ghostRecords, setGhostRecords] = useState<Officer[]>([]);
    const [analysisDone, setAnalysisDone] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [dists, stations, officers] = await Promise.all([
                getDistricts(),
                getStations(),
                getOfficers()
            ]);

            setDistricts(dists);
            setAllStations(stations);
            setAllOfficers(officers);

            const uniqueDistricts = Array.from(new Set(stations.map(s => s.district).filter(Boolean))).sort();
            setInvalidDistricts(uniqueDistricts);

            // Auto analyze on load
            analyzeDuplicates(officers);

        } catch (e) {
            console.error(e);
            alert("Error loading data");
        } finally {
            setLoading(false);
        }
    };

    const analyzeDuplicates = (officers: Officer[]) => {
        const groups: Record<string, Officer[]> = {};
        const ghosts: Officer[] = [];

        officers.forEach(off => {
            if (!off.agid || off.agid === "N/A" || off.agid.trim() === "") {
                ghosts.push(off);
            } else {
                const key = off.agid.trim().toLowerCase();
                if (!groups[key]) groups[key] = [];
                groups[key].push(off);
            }
        });

        const duplicates = Object.values(groups).filter(g => g.length > 1);
        setDuplicateGroups(duplicates);
        setGhostRecords(ghosts);
        setAnalysisDone(true);
    };

    const handleCleanup = async () => {
        const totalToDelete = ghostRecords.length + duplicateGroups.reduce((acc, g) => acc + (g.length - 1), 0);

        if (!confirm(`This will permanently delete ${totalToDelete} records (${ghostRecords.length} ghosts, ${totalToDelete - ghostRecords.length} duplicates). Are you sure?`)) return;

        setLoading(true);
        let deletedCount = 0;

        try {
            // 1. Delete Ghosts
            for (const ghost of ghostRecords) {
                if (ghost.id) {
                    await deleteOfficer(ghost.id);
                    deletedCount++;
                }
            }

            // 2. Deduplicate
            for (const group of duplicateGroups) {
                // Keep the one created most recently (if createdAt exists), or just the last one in the list
                // Ideally we check timestamps, but assuming last uploaded might have better data
                // For simplicity, let's keep the LAST one (latest push)
                // const keep = group[group.length - 1]; // Unused variable
                const remove = group.slice(0, group.length - 1);

                for (const item of remove) {
                    if (item.id) {
                        await deleteOfficer(item.id);
                        deletedCount++;
                    }
                }
            }

            alert(`Cleanup Complete! Deleted ${deletedCount} records.`);
            loadData(); // Reload
        } catch (e) {
            console.error(e);
            alert("Cleanup failed: " + e);
        } finally {
            setLoading(false);
        }
    };

    const handleMigrate = async (oldName: string, newName: string) => {
        if (!oldName || !newName) return;
        if (!confirm(`Migrate from '${oldName}' to '${newName}'?`)) return;

        setLoading(true);
        try {
            const stationsToMigrate = allStations.filter(s => s.district === oldName);
            for (const s of stationsToMigrate) {
                if (s.id) await updateStation(s.id, { ...s, district: newName });
            }
            alert(`Migrated ${stationsToMigrate.length} stations.`);
            loadData();
        } catch (e) {
            console.error(e);
            alert("Migration failed");
        } finally {
            setLoading(false);
        }
    };

    const totalDuplicates = duplicateGroups.reduce((acc, g) => acc + (g.length - 1), 0);

    return (
        <div className="p-8 max-w-4xl mx-auto text-slate-200">
            <h1 className="text-3xl font-bold mb-6">System Maintenance</h1>

            {/* Duplicate Cleanup Section */}
            <div className="bg-dark-card p-6 rounded-lg border border-dark-border mb-6">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <Trash2 className="text-red-400" />
                    Duplicate Cleanup
                </h2>

                <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-dark-sidebar p-4 rounded border border-dark-border">
                        <div className="text-slate-400 text-sm mb-1">Total Officers</div>
                        <div className="text-2xl font-bold">{allOfficers.length}</div>
                    </div>
                    <div className="bg-dark-sidebar p-4 rounded border border-dark-border">
                        <div className="text-slate-400 text-sm mb-1">Est. Valid Records</div>
                        <div className="text-2xl font-bold text-green-400">
                            {allOfficers.length - (ghostRecords.length + totalDuplicates)}
                        </div>
                    </div>
                </div>

                {analysisDone && (
                    <div className="space-y-4 mb-6">
                        {(ghostRecords.length > 0 || totalDuplicates > 0) ? (
                            <div className="bg-red-900/20 border border-red-900/50 p-4 rounded text-red-200">
                                <div className="font-semibold flex items-center gap-2 mb-2">
                                    <AlertTriangle className="h-5 w-5" />
                                    Issues Found:
                                </div>
                                <ul className="list-disc list-inside space-y-1">
                                    <li>{ghostRecords.length} "Ghost" records (Missing AGID)</li>
                                    <li>{duplicateGroups.length} Conflict Groups (Total {totalDuplicates} extra copies)</li>
                                </ul>
                            </div>
                        ) : (
                            <div className="bg-green-900/20 border border-green-900/50 p-4 rounded text-green-200 flex items-center gap-2">
                                <div className="h-2 w-2 rounded-full bg-green-400" />
                                No duplicates or ghost records found.
                            </div>
                        )}

                        <div className="flex gap-4">
                            <button
                                onClick={loadData}
                                disabled={loading}
                                className="px-4 py-2 bg-dark-sidebar hover:bg-dark-border rounded border border-dark-border flex items-center gap-2 transition-colors"
                            >
                                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                                Re-Analyze
                            </button>

                            {(ghostRecords.length > 0 || totalDuplicates > 0) && (
                                <button
                                    onClick={handleCleanup}
                                    disabled={loading}
                                    className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded text-white font-medium shadow-lg shadow-red-900/20 transition-all"
                                >
                                    {loading ? "Cleaning..." : "Delete All Duplicates"}
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Station Migration Section */}
            <div className="bg-dark-card p-6 rounded-lg border border-dark-border opacity-75 hover:opacity-100 transition-opacity">
                <h2 className="text-xl font-semibold mb-4">Station Migration (Legacy)</h2>
                <ManualMigrationForm
                    districts={districts}
                    oldDistricts={invalidDistricts}
                    onMigrate={handleMigrate}
                    loading={loading}
                />
            </div>
        </div>
    );
}

function ManualMigrationForm({ districts, oldDistricts, onMigrate, loading }: any) {
    const [oldName, setOldName] = useState("");
    const [newName, setNewName] = useState("");

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <select
                        value={oldName}
                        onChange={(e) => setOldName(e.target.value)}
                        className="w-full bg-dark-sidebar border border-dark-border rounded px-3 py-2 text-sm"
                    >
                        <option value="">Select Old District</option>
                        {oldDistricts.map((d: string) => <option key={d} value={d}>{d}</option>)}
                    </select>
                </div>
                <div>
                    <select
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        className="w-full bg-dark-sidebar border border-dark-border rounded px-3 py-2 text-sm"
                    >
                        <option value="">Select New District</option>
                        {districts.map((d: any) => <option key={d.id} value={d.name}>{d.name}</option>)}
                    </select>
                </div>
            </div>
            <button
                onClick={() => onMigrate(oldName, newName)}
                disabled={loading || !oldName || !newName}
                className="px-3 py-1.5 bg-primary-600/80 hover:bg-primary-600 rounded text-white text-sm"
            >
                Migrate Selection
            </button>
        </div>
    );
}
