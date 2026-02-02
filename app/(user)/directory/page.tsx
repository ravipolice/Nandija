"use client";

import { useEffect, useState } from "react";
import {
    Officer,
    getOfficers,
    Employee,
    getEmployees,
    getUnits,
    getRanks,
    Unit,
    Rank,
    getDistricts,
    getStations,
    getUnitSections,
    District,
    Station
} from "@/lib/firebase/firestore";
import { Search, X } from "lucide-react";

export default function DirectoryPage() {
    const [activeTab, setActiveTab] = useState<"officers" | "employees">("officers");
    const [searchTerm, setSearchTerm] = useState("");
    const [officers, setOfficers] = useState<Officer[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);

    // Filters Data
    const [units, setUnits] = useState<Unit[]>([]);
    const [ranks, setRanks] = useState<Rank[]>([]);
    const [districts, setDistricts] = useState<District[]>([]);
    const [stations, setStations] = useState<Station[]>([]);

    // Selected Filter States
    const [selectedUnit, setSelectedUnit] = useState("");
    const [selectedDistrict, setSelectedDistrict] = useState("");
    const [selectedStation, setSelectedStation] = useState("");
    const [selectedRank, setSelectedRank] = useState("");

    // Loading State
    const [loading, setLoading] = useState(true);

    // Initial Data Fetch
    useEffect(() => {
        async function fetchData() {
            try {
                const [officersData, employeesData, unitsData, ranksData, districtsData] = await Promise.all([
                    getOfficers(),
                    getEmployees(),
                    getUnits(),
                    getRanks(),
                    getDistricts()
                ]);
                setOfficers(officersData.filter(o => !o.isHidden));
                setEmployees(employeesData.filter(e => !e.isHidden));
                setUnits(unitsData);
                setRanks(ranksData);
                setDistricts(districtsData);
            } catch (error: any) {
                console.error("Error fetching data:", error);
                if (error.code === 'permission-denied') {
                    console.error("User does not have permission to view directory.");
                }
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, []);

    // Derived Logic for Special Units (Sync with Android CommonEmployeeForm)
    const selectedUnitObj = units.find(u => u.name === selectedUnit);
    // Dynamic Special Unit: mappingType == 'none' means it doesn't map to districts
    const isSpecialUnit = selectedUnitObj?.mappingType === "none";

    // Check if unit has sections (either from DB unitSections or specific logic)
    // We can check if getUnitSections returns specific list, or rely on naming convention. 
    // Ideally we should use a property, but for now we can infer if sections exist.
    // However, since we fetch sections dynamically in useEffect, let's use a state for hasSections or derive it.
    // The previous code had hardcoded ["State INT", "S INT"].
    // Let's defer hasSections determination to the useEffect or keep it simple for now if we don't have 'hasSections' property on Unit.
    // Wait, Android logic uses `ProduceState` to fetch sections. Here we do it in useEffect.
    // Let's use a state for 'hasSections' which becomes true if the fetch returns > 0 sections.
    // BUT for visibility logic (lines 77-78), we need it immediately.
    // Let's assume for now that if mappingType is 'state' or 'commissionerate' it MIGHT have sections?
    // Actually, let's check if we can query strictly by the hardcoded list REPLACEMENT if we can't fetch sync.
    // BETTER: The user wants "units logic". In Android, I check `unitSections.isNotEmpty()`. 
    // Here `unitSections` isn't state, it's fetched. 
    // Let's add `unitSections` state.

    const isDistrictLevelUnit = selectedUnitObj?.isDistrictLevel || false;

    // Visibility Logic - will be updated after unitSections are fetched
    const [unitSections, setUnitSections] = useState<string[]>([]);

    const hasSections = unitSections.length > 0;

    const showDistrict = !isSpecialUnit;
    // Show station if it's NOT a district level unit (unless it has sections) OR if it has sections.
    // AND if district is selected (if district is required).
    const showStation = (!isDistrictLevelUnit || hasSections) && (showDistrict ? !!selectedDistrict : true);

    // Effect: Reset dependent fields when Unit changes
    useEffect(() => {
        if (!loading) {
            setSelectedDistrict("");
            setSelectedStation("");
            // Check if rank is still valid
            if (selectedRank && selectedUnitObj?.applicableRanks?.length) {
                if (!selectedUnitObj.applicableRanks.includes(selectedRank)) {
                    setSelectedRank("");
                }
            }
        }
    }, [selectedUnit, loading]);

    // Effect: Reset Station when District changes
    useEffect(() => {
        if (!loading && showDistrict) {
            setSelectedStation("");
        }
    }, [selectedDistrict, loading]);

    // Effect: Fetch Stations/Sections logic
    useEffect(() => {
        async function fetchStationsOrSections() {
            setLoading(true); // Short loading state for dropdowns
            try {
                // Always try to fetch sections for the unit first
                // This covers "State INT", "S INT", etc.
                const sections = selectedUnit ? await getUnitSections(selectedUnit) : [];
                setUnitSections(sections);

                if (sections.length > 0) {
                    // Map to Station objects
                    const sectionsAsStations: Station[] = sections.map(s => ({
                        id: s,
                        name: s,
                        district: selectedUnit // Mock district
                    }));
                    setStations(sectionsAsStations);
                } else if (selectedDistrict && selectedDistrict !== "All") {
                    // Standard District Selection -> Fetch Stations for District
                    const stnData = await getStations(selectedDistrict);

                    // Dynamic Station Filtering using stationKeyword
                    const stationKeyword = selectedUnitObj?.stationKeyword;
                    if (stationKeyword && stationKeyword.trim() !== "") {
                        const keywords = stationKeyword.split(',').map(k => k.trim()).filter(k => k);
                        const filtered = stnData.filter(s =>
                            s.isActive !== false &&
                            keywords.some(k => s.name.toUpperCase().includes(k.toUpperCase()))
                        );
                        setStations(filtered);
                    } else {
                        setStations(stnData.filter(s => s.isActive !== false));
                    }
                } else {
                    setStations([]);
                }
            } catch (e) {
                console.error("Error fetching stations/sections:", e);
                setStations([]);
                setUnitSections([]);
            } finally {
                setLoading(false);
            }
        }

        fetchStationsOrSections();
    }, [selectedDistrict, selectedUnit, selectedUnitObj]); // Added selectedUnitObj dependency


    // Filtering Logic
    const filterData = <T extends Officer | Employee>(data: T[]) => {
        if (!searchTerm.trim()) return data;

        const terms = searchTerm.toLowerCase().split(/\s+/).filter(t => t.length > 0);

        return data.filter(item => {
            // 1. Build a "Search Blob" containing all searchable text from the item
            const searchableText = [
                item.name,
                item.rank,
                (item as Employee).mobile1,
                (item as any).mobile, // For Officer
                (item as Employee).station, // Employee Station
                (item as Officer).office,   // Officer Office
                (item as Employee).kgid,
                (item as Officer).agid,
                (item as Employee).bloodGroup,
                (item as Officer).bloodGroup,
                item.district,
                item.unit,
                (item as Employee).email
            ].filter(Boolean).join(" ").toLowerCase();

            // 2. Multi-keyword Check: Every typed word must be present in the blob
            const matchesSearch = terms.every(term => searchableText.includes(term));

            if (!matchesSearch) return false;

            // 3. Apply standard Dropdown Filters (Bypassed if searching)
            const isGlobalSearch = searchTerm.trim().length > 0;

            const matchesUnit = isGlobalSearch || (selectedUnit ? item.unit === selectedUnit : true);

            const matchesDistrict = isGlobalSearch || ((showDistrict && selectedDistrict)
                ? item.district === selectedDistrict
                : true);

            const itemStation = (item as Employee).station || (item as Officer).office;
            const matchesStation = isGlobalSearch || ((showStation && selectedStation)
                ? itemStation === selectedStation
                : true);

            const matchesRank = isGlobalSearch || (selectedRank
                ? (item.rank === selectedRank || (item.rank && item.rank.includes(selectedRank)))
                : true);

            return matchesUnit && matchesDistrict && matchesStation && matchesRank;
        });
    };

    const filteredOfficers = filterData(officers);
    const filteredEmployees = filterData(employees);

    // Derived Ranks for Dropdown
    const applicableRanks = selectedUnitObj?.applicableRanks || [];
    const filteredRanks = ranks.filter(rank => {
        if (selectedUnit && applicableRanks.length > 0) {
            return applicableRanks.includes(rank.rank_id);
        }
        return true;
    });


    if (loading) {
        return <div className="text-center py-10">Loading directory...</div>;
    }

    return (
        <div className="space-y-6 animate-fade-in-up">

            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold tracking-tight">Directory</h1>
                <div className="text-sm text-muted-foreground">
                    {filteredOfficers.length + filteredEmployees.length} Total Records
                </div>
            </div>

            {/* Filters & Search Container */}
            <div className="bg-card rounded-xl border border-border shadow-sm p-4 space-y-4">

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Unit Dropdown */}
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground ml-1">Unit</label>
                        <select
                            value={selectedUnit}
                            onChange={(e) => setSelectedUnit(e.target.value)}
                            className="block w-full px-3 py-2 border border-input rounded-lg bg-background text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                        >
                            <option value="">All Units</option>
                            {units.map((u) => (
                                <option key={u.id} value={u.name}>{u.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* District Dropdown (Conditional) */}
                    {showDistrict && (
                        <div className="space-y-1 animate-fade-in">
                            <label className="text-xs font-medium text-muted-foreground ml-1">District / HQ</label>
                            <select
                                value={selectedDistrict}
                                onChange={(e) => setSelectedDistrict(e.target.value)}
                                className="block w-full px-3 py-2 border border-input rounded-lg bg-background text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                            >
                                <option value="">All Districts / HQs</option>
                                {districts.map((d) => (
                                    <option key={d.id} value={d.name}>{d.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Station/Section Dropdown (Conditional) */}
                    {showStation && (
                        <div className="space-y-1 animate-fade-in">
                            <label className="text-xs font-medium text-muted-foreground ml-1">Station / Section</label>
                            <select
                                value={selectedStation}
                                onChange={(e) => setSelectedStation(e.target.value)}
                                className="block w-full px-3 py-2 border border-input rounded-lg bg-background text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                            >
                                <option value="">All Stations / Sections</option>
                                {stations.map((s) => (
                                    <option key={s.id || s.name} value={s.name}>{s.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Rank Dropdown */}
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground ml-1">Rank</label>
                        <select
                            value={selectedRank}
                            onChange={(e) => setSelectedRank(e.target.value)}
                            className="block w-full px-3 py-2 border border-input rounded-lg bg-background text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                        >
                            <option value="">All Ranks</option>
                            {filteredRanks.map((r) => (
                                <option key={r.rank_id} value={r.rank_id}>{r.rank_id} - {r.rank_label}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Search Bar - Full Width Row */}
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <input
                        type="text"
                        className="block w-full pl-10 pr-10 py-2.5 border border-input rounded-lg bg-background text-sm placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                        placeholder="Search by name, mobile number, office..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    {searchTerm && (
                        <button
                            onClick={() => setSearchTerm("")}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center hover:text-foreground text-muted-foreground"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-border">
                <button
                    onClick={() => setActiveTab("officers")}
                    className={`px-6 py-3 font-medium text-sm border-b-2 transition-all ${activeTab === "officers"
                        ? "border-primary text-primary"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                        }`}
                >
                    Officers <span className="ml-2 bg-primary/10 text-primary px-2 py-0.5 rounded-full text-xs">{filteredOfficers.length}</span>
                </button>
                <button
                    onClick={() => setActiveTab("employees")}
                    className={`px-6 py-3 font-medium text-sm border-b-2 transition-all ${activeTab === "employees"
                        ? "border-primary text-primary"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                        }`}
                >
                    Employees <span className="ml-2 bg-primary/10 text-primary px-2 py-0.5 rounded-full text-xs">{filteredEmployees.length}</span>
                </button>
            </div>

            {/* List / Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeTab === "officers" ? (
                    filteredOfficers.map((officer) => (
                        <div key={officer.id || officer.agid} className="bg-card rounded-lg shadow-sm border border-border p-5 hover:shadow-md transition-all duration-200 group">
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <h3 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors">{officer.name}</h3>
                                    <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10 mt-1">
                                        {officer.rank}
                                    </span>
                                </div>
                                {officer.district && (
                                    <span className="text-xs text-muted-foreground bg-secondary px-2 py-1 rounded">
                                        {officer.district}
                                    </span>
                                )}
                            </div>

                            <div className="space-y-2 text-sm text-foreground/80 mt-4">
                                {officer.office && (
                                    <div className="flex items-start text-xs text-muted-foreground">
                                        <span className="font-semibold w-16">Office:</span>
                                        <span className="flex-1">{officer.office}</span>
                                    </div>
                                )}
                                <div className="flex items-center pt-2 border-t border-dashed border-border mt-3">
                                    <a href={`tel:${officer.mobile}`} className="flex-1 text-center py-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors font-medium text-sm pointer-events-auto">
                                        Call
                                    </a>
                                    <div className="w-px h-4 bg-border mx-2"></div>
                                    <a href={`sms:${officer.mobile}`} className="flex-1 text-center py-2 text-green-600 hover:bg-green-50 rounded-md transition-colors font-medium text-sm pointer-events-auto">
                                        Msg
                                    </a>
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    filteredEmployees.map((emp) => (
                        <div key={emp.id} className="bg-card rounded-lg shadow-sm border border-border p-5 hover:shadow-md transition-all duration-200 group relative overflow-hidden">
                            {/* Blood Group Badge */}
                            {emp.bloodGroup && (
                                <div className="absolute top-0 right-0 bg-red-50 text-red-600 text-[10px] font-bold px-2 py-1 rounded-bl-lg border-l border-b border-red-100">
                                    {emp.bloodGroup}
                                </div>
                            )}

                            <div className="flex items-start space-x-4">
                                {emp.photoUrl ? (
                                    <img src={emp.photoUrl} alt={emp.name} className="h-14 w-14 rounded-full object-cover border-2 border-white shadow-sm" />
                                ) : (
                                    <div className="h-14 w-14 rounded-full bg-secondary flex items-center justify-center text-secondary-foreground font-bold text-lg shadow-inner">
                                        {emp.name.charAt(0)}
                                    </div>
                                )}
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-base font-bold text-foreground truncate group-hover:text-primary transition-colors">{emp.name}</h3>
                                    <p className="text-sm text-primary font-medium truncate">{emp.displayRank || emp.rank}</p>
                                    <p className="text-xs text-muted-foreground truncate mt-0.5">{emp.station || emp.district}</p>
                                </div>
                            </div>

                            <div className="mt-4 pt-3 border-t border-border grid grid-cols-2 gap-2">
                                <a
                                    href={`tel:${emp.mobile1}`}
                                    className="flex items-center justify-center space-x-2 bg-secondary/50 hover:bg-primary/10 hover:text-primary text-foreground/80 py-2 rounded-lg text-xs font-medium transition-colors"
                                >
                                    <span>{emp.mobile1}</span>
                                </a>
                                {emp.mobile2 && (
                                    <a
                                        href={`tel:${emp.mobile2}`}
                                        className="flex items-center justify-center space-x-2 bg-secondary/50 hover:bg-primary/10 hover:text-primary text-foreground/80 py-2 rounded-lg text-xs font-medium transition-colors"
                                    >
                                        <span>{emp.mobile2}</span>
                                    </a>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Empty States */}
            {activeTab === "officers" && filteredOfficers.length === 0 && (
                <div className="text-center py-20 bg-secondary/20 rounded-xl border border-dashed border-border">
                    <p className="text-muted-foreground">No officers found matching your filters.</p>
                </div>
            )}
            {activeTab === "employees" && filteredEmployees.length === 0 && (
                <div className="text-center py-20 bg-secondary/20 rounded-xl border border-dashed border-border">
                    <p className="text-muted-foreground">No employees found matching your filters.</p>
                </div>
            )}

        </div>
    );
}
