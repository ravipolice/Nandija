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
import { generateSmartSearchBlob } from "@/lib/searchUtils";
import { getRankColorClass } from "@/lib/rankUtils";
import { useAuth } from "@/components/providers/AuthProvider";

// Extended types for search optimization
type SearchableOfficer = Officer & { searchBlob: string };
type SearchableEmployee = Employee & { searchBlob: string };

export default function DirectoryPage() {
    const [activeTab, setActiveTab] = useState<"officers" | "employees">("officers");
    const [searchTerm, setSearchTerm] = useState("");
    const [officers, setOfficers] = useState<SearchableOfficer[]>([]);
    const [employees, setEmployees] = useState<SearchableEmployee[]>([]);

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
    const { user, loading: authLoading, employeeData } = useAuth();

    // Context / Constants (Sync with Android)
    const UNIT_HQ_VALUE = "UNIT_HQ";
    const STATE_INT_SECTIONS = [
        "Special Branch",
        "EOW",
        "Cyber Cell",
        "Administration",
        "Technical Cell"
    ];

    // Derived Logic for Special Units
    const selectedUnitObj = units.find(u => u.name === selectedUnit);
    const isSpecialUnit = selectedUnitObj?.mappingType === "none";
    const isDistrictLevelUnit = selectedUnitObj?.isDistrictLevel || false;

    // Visibility Logic
    const [unitSections, setUnitSections] = useState<string[]>([]);
    const hasSections = unitSections.length > 0;
    const showDistrict = !isSpecialUnit;
    const showStation = (!isDistrictLevelUnit || hasSections) && (showDistrict ? !!selectedDistrict : true);

    // Initial Data Fetch
    useEffect(() => {
        async function fetchData() {
            if (authLoading || !user) return;

            console.log("Fetching directory data for user:", user.email);
            try {
                const [officersData, employeesData, unitsData, ranksData, districtsData] = await Promise.all([
                    getOfficers(),
                    getEmployees(),
                    getUnits(),
                    getRanks(),
                    getDistricts()
                ]);

                // Process Officers with Smart Search Blob
                const processedOfficers = officersData
                    .filter(o => !o.isHidden)
                    .map(o => ({
                        ...o,
                        searchBlob: generateSmartSearchBlob(
                            o.name,
                            o.agid,
                            o.rank,
                            o.mobile,
                            o.district,
                            o.office || (o as any).station, // handle both fields 
                            o.unit,
                            o.bloodGroup,
                            o.email
                        )
                    }));
                setOfficers(processedOfficers);

                // Process Employees with Smart Search Blob
                const processedEmployees = employeesData
                    .filter(e => !e.isHidden)
                    .map(e => ({
                        ...e,
                        searchBlob: generateSmartSearchBlob(
                            e.name,
                            e.kgid,
                            e.rank,
                            e.mobile1,
                            e.mobile2,
                            e.district,
                            e.station,
                            e.unit,
                            e.bloodGroup,
                            e.email
                        )
                    }));
                setEmployees(processedEmployees);

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

    // 1. Determine Available Districts for UI
    const getAvailableDistricts = () => {
        if (!selectedUnit) return districts;
        const mappingType = selectedUnitObj?.mappingType || "all";
        const mappedIds = selectedUnitObj?.mappedAreaIds || selectedUnitObj?.mappedDistricts || [];
        const isBattalion = selectedUnitObj?.mappedAreaType === "BATTALION";
        const isStateScope = selectedUnitObj?.scopes?.includes("state") ||
            selectedUnitObj?.scopes?.includes("hq") ||
            selectedUnitObj?.isHqLevel || false;

        let filtered: District[] = [];
        if (mappingType === "single" || mappingType === "subset" || mappingType === "commissionerate") {
            if (mappedIds.length > 0) {
                if (isBattalion) {
                    filtered = mappedIds.map(name => ({ id: name, name } as District));
                } else {
                    filtered = districts.filter(d => mappedIds.includes(d.name));
                }
            } else {
                filtered = [...districts];
            }
        } else {
            filtered = [...districts];
        }

        // Add "HQ" if state scope or sections exist
        if (isStateScope || unitSections.length > 0 || (selectedUnit === "State INT" && STATE_INT_SECTIONS.length > 0)) {
            if (!filtered.some(d => (d.name || "").match(/^(HQ|UNIT_HQ)$/i) || d.id === "UNIT_HQ")) {
                filtered = [{ id: "UNIT_HQ", name: "HQ", value: UNIT_HQ_VALUE } as District, ...filtered];
            }
        }

        return filtered.sort((a, b) => {
            const isHqA = (a.name || "").match(/^(HQ|UNIT_HQ)$/i) || a.id === "UNIT_HQ";
            const isHqB = (b.name || "").match(/^(HQ|UNIT_HQ)$/i) || b.id === "UNIT_HQ";
            if (isHqA && !isHqB) return -1;
            if (!isHqA && isHqB) return 1;
            return (a.name || "").localeCompare(b.name || "");
        });
    };

    const availableDistricts = getAvailableDistricts();

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
    }, [selectedUnit, loading, selectedUnitObj]);

    // Effect: Reset Station when District changes
    useEffect(() => {
        if (!loading && showDistrict) {
            setSelectedStation("");
        }
    }, [selectedDistrict, loading, showDistrict]);

    // Effect: Fetch Stations/Sections logic
    useEffect(() => {
        async function fetchStationsOrSections() {
            if (!selectedUnit) {
                setStations([]);
                setUnitSections([]);
                return;
            }

            try {
                // Priority: UnitSections from Firestore
                const sections = await getUnitSections(selectedUnit);
                setUnitSections(sections);

                const hasDistrictScope = selectedUnitObj?.scopes?.includes("district") ||
                    selectedUnitObj?.scopes?.includes("district_stations") ||
                    selectedUnitObj?.isDistrictLevel || false;

                if (sections.length > 0) {
                    setStations(sections.map(s => ({ id: s, name: s, district: selectedUnit } as Station)));
                } else if (selectedDistrict || isSpecialUnit) {
                    // Fetch stations for selected district
                    const stnData = selectedDistrict === UNIT_HQ_VALUE || isSpecialUnit ? [] : await getStations(selectedDistrict);

                    // Apply Keyword Filtering
                    const keyword = selectedUnitObj?.stationKeyword;
                    if (keyword && keyword.trim() && !hasDistrictScope) {
                        setStations(stnData.filter(s => s.name.toUpperCase().includes(keyword.toUpperCase())));
                    } else {
                        setStations(stnData);
                    }
                } else {
                    setStations([]);
                }
            } catch (e) {
                console.error("Error fetching sections/stations:", e);
            }
        }

        fetchStationsOrSections();
    }, [selectedDistrict, selectedUnit, selectedUnitObj]); // Added selectedUnitObj dependency


    // Filtering Logic
    const filterData = <T extends SearchableOfficer | SearchableEmployee>(data: T[]) => {
        const terms = searchTerm.toLowerCase().split(/\s+/).filter(t => t.length > 0);

        // Helper to calculate relevance score
        const calculateScore = (item: T) => {
            let score = 0;
            const name = item.name.toLowerCase();
            const id = ((item as any).kgid || (item as any).agid || "").toLowerCase();
            const rank = (item.rank || "").toLowerCase();

            // 1. Text Search Relevance
            if (terms.length > 0) {
                terms.forEach(term => {
                    // Name priority
                    if (name === term) score += 100;
                    else if (name.startsWith(term)) score += 75;
                    else if (name.includes(term)) score += 50;

                    // ID priority
                    if (id === term) score += 95;
                    else if (id.startsWith(term)) score += 85;
                    else if (id.includes(term)) score += 60;

                    // Rank priority
                    if (rank === term) score += 40;
                    else if (rank.startsWith(term)) score += 30;
                });
            }

            // 2. Unit/District/Station Relevance (User Context - Proximity Sort)
            if (employeeData) {
                // Priority 3: Same Unit (+1000)
                if (item.unit === employeeData.unit) score += 1000;

                // Priority 2: Same District/HQ (+2000)
                if (item.district === employeeData.district) score += 2000;

                // Priority 1: Same Station/Section (+4000)
                const itemStation = (item as any).station || (item as any).office;
                if (itemStation && employeeData.station && itemStation === employeeData.station) {
                    score += 4000;
                }
            }

            return score;
        };

        const filtered = data.filter(item => {
            if (!searchTerm.trim()) {
                // If no search term, we still want to filter by dropdowns if they are selected
                const matchesUnit = selectedUnit ? item.unit === selectedUnit : true;
                const matchesDistrict = (showDistrict && selectedDistrict) ? item.district === selectedDistrict : true;
                const itemStation = (item as any).station || (item as any).office;
                const matchesStation = (showStation && selectedStation) ? itemStation === selectedStation : true;
                const matchesRank = selectedRank ? (item.rank === selectedRank || (item.rank && item.rank.includes(selectedRank))) : true;

                return matchesUnit && matchesDistrict && matchesStation && matchesRank;
            }

            // 1. Use the pre-calculated Smart Search Blob
            const matchesSearch = terms.every(term => item.searchBlob.includes(term));

            if (!matchesSearch) return false;

            // 2. Apply standard Dropdown Filters
            const isSearching = searchTerm.trim().length > 0;
            const matchesUnit = isSearching || (selectedUnit ? item.unit === selectedUnit : true);
            const matchesDistrict = isSearching || ((showDistrict && selectedDistrict) ? item.district === selectedDistrict : true);
            const itemStation = (item as any).station || (item as any).office;
            const matchesStation = isSearching || ((showStation && selectedStation) ? itemStation === selectedStation : true);
            const matchesRank = isSearching || (selectedRank ? (item.rank === selectedRank || (item.rank && item.rank.includes(selectedRank))) : true);

            return matchesUnit && matchesDistrict && matchesStation && matchesRank;
        });

        // Return sorted results
        return filtered.sort((a, b) => {
            const scoreA = calculateScore(a);
            const scoreB = calculateScore(b);
            if (scoreA !== scoreB) return scoreB - scoreA;
            return a.name.localeCompare(b.name);
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
                            <label className="text-xs font-medium text-muted-foreground ml-1">
                                {selectedUnitObj?.mappedAreaType === "BATTALION" ? "Battalion" : "District / HQ"}
                            </label>
                            <select
                                value={selectedDistrict}
                                onChange={(e) => setSelectedDistrict(e.target.value)}
                                className="block w-full px-3 py-2 border border-input rounded-lg bg-background text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                            >
                                <option value="">All Districts / HQs</option>
                                {availableDistricts.map((d) => (
                                    <option key={d.id} value={d.name}>{d.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Station/Section Dropdown (Conditional) */}
                    {showStation && (
                        <div className="space-y-1 animate-fade-in">
                            <label className="text-xs font-medium text-muted-foreground ml-1">
                                {isSpecialUnit || unitSections.length > 0 ? "Section" : "Station / Section"}
                            </label>
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
                        placeholder="Search by Name, KGID/AGID, Mobile, Rank, Station, Blood Group..."
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
                    filteredOfficers.map((officer) => {
                        
                        
                        // Unified Subtitle logic (similar to Android)
                        const subtitleParts = [];
                        if (officer.dutyRole && officer.dutyRole !== "Others") subtitleParts.push(officer.dutyRole);
                        if (officer.unit && officer.unit !== officer.district) subtitleParts.push(officer.unit);
                        if (officer.office) subtitleParts.push(officer.office);
                        if (officer.district) subtitleParts.push(officer.district);
                        const finalSubtitle = Array.from(new Set(subtitleParts)).join(", ");

                        return (
                            <div key={officer.id || officer.agid} className="bg-card rounded-lg shadow-sm border border-border p-5 hover:shadow-md transition-all duration-200 group relative overflow-hidden flex flex-col h-full">
                                {/* Blood Group Badge (Round) */}
                                {officer.bloodGroup && (
                                    <div className={`absolute top-2 right-2 flex items-center justify-center w-6 h-6 rounded-full text-[9px] font-bold text-white ${
                                        officer.bloodGroup.startsWith('A') ? 'bg-red-500' :
                                        officer.bloodGroup.startsWith('B') ? 'bg-blue-500' :
                                        officer.bloodGroup.startsWith('O') ? 'bg-orange-500' : 'bg-slate-500'
                                    }`}>
                                        {officer.bloodGroup}
                                    </div>
                                )}

                                <div className="flex-1">
                                    <div className="flex flex-col mb-1 pr-8">
                                        <h3 className="text-xl font-bold text-foreground group-hover:text-primary transition-colors leading-tight">{officer.name}</h3>
                                        <div className={`text-sm mt-0.5 ${getRankColorClass(officer.rank)}`}>
                                            {officer.rank}
                                        </div>
                                    </div>

                                    {finalSubtitle && (
                                        <div className="text-xs text-muted-foreground/80 mt-1 line-clamp-2">
                                            {finalSubtitle}
                                        </div>
                                    )}
                                    
                                </div>

                                <div className="mt-4 pt-3 border-t border-dashed border-border">
                                    {officer.mobile ? (
                                        <div className="flex items-center">
                                            <a href={`tel:${officer.mobile}`} className="flex-1 text-center py-1 text-cyan-500 hover:text-cyan-400 font-bold text-lg transition-colors">
                                                {officer.mobile}
                                            </a>
                                            <div className="w-px h-4 bg-border mx-2"></div>
                                            <a href={`sms:${officer.mobile}`} className="flex-1 text-center py-1 text-emerald-500 hover:text-emerald-400 font-medium text-sm transition-colors">
                                                Msg
                                            </a>
                                        </div>
                                    ) : (
                                        <div className="text-center text-muted-foreground text-xs italic py-1">
                                            No contact number
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })
                ) : (
                    filteredEmployees.map((emp) => {
                        
                        
                        // Unified Subtitle logic
                        const subtitleParts = [];
                        if (emp.dutyRole && emp.dutyRole !== "Others") subtitleParts.push(emp.dutyRole);
                        if (emp.unit && emp.unit !== emp.district) subtitleParts.push(emp.unit);
                        if (emp.station) subtitleParts.push(emp.station);
                        if (emp.district) subtitleParts.push(emp.district);
                        const finalSubtitle = Array.from(new Set(subtitleParts)).join(", ");

                        return (
                            <div key={emp.id} className="bg-card rounded-lg shadow-sm border border-border p-5 hover:shadow-md transition-all duration-200 group relative overflow-hidden flex flex-col h-full">
                                {/* Blood Group Badge (Round) */}
                                {emp.bloodGroup && (
                                    <div className={`absolute top-2 right-2 flex items-center justify-center w-6 h-6 rounded-full text-[9px] font-bold text-white ${
                                        emp.bloodGroup.startsWith('A') ? 'bg-red-500' :
                                        emp.bloodGroup.startsWith('B') ? 'bg-blue-500' :
                                        emp.bloodGroup.startsWith('O') ? 'bg-orange-500' : 'bg-slate-500'
                                    }`}>
                                        {emp.bloodGroup}
                                    </div>
                                )}

                                <div className="flex-1">
                                    <div className="flex items-start space-x-4 mb-4 pr-8">
                                        {emp.photoUrl ? (
                                            <img src={emp.photoUrl} alt={emp.name} className="h-14 w-14 rounded-full object-cover border-2 border-white shadow-sm shrink-0" />
                                        ) : (
                                            <div className="h-14 w-14 rounded-full bg-secondary flex items-center justify-center text-secondary-foreground font-bold text-lg shadow-inner shrink-0">
                                                {emp.name.charAt(0)}
                                            </div>
                                        )}
                                        <div className="min-w-0">
                                            <h3 className="text-xl font-bold text-foreground truncate group-hover:text-primary transition-colors leading-tight">{emp.name}</h3>
                                            <div className={`text-sm mt-0.5 ${getRankColorClass(emp.displayRank || emp.rank)}`}>
                                                {emp.displayRank || emp.rank}
                                            </div>
                                            {finalSubtitle && (
                                                <div className="text-xs text-muted-foreground/80 mt-1 line-clamp-1">
                                                    {finalSubtitle}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                </div>

                                <div className="mt-2 pt-3 border-t border-border grid grid-cols-2 gap-2">
                                    {emp.mobile1 && (
                                        <a
                                            href={`tel:${emp.mobile1}`}
                                            className="col-span-1 flex items-center justify-center bg-secondary/30 hover:bg-cyan-50 text-foreground/80 hover:text-cyan-600 py-1.5 rounded-lg text-sm font-bold transition-all border border-transparent hover:border-cyan-200"
                                        >
                                            {emp.mobile1}
                                        </a>
                                    )}
                                    {emp.mobile2 && (
                                        <a
                                            href={`tel:${emp.mobile2}`}
                                            className="col-span-1 flex items-center justify-center bg-secondary/30 hover:bg-emerald-50 text-foreground/80 hover:text-emerald-600 py-1.5 rounded-lg text-sm font-bold transition-all border border-transparent hover:border-emerald-200"
                                        >
                                            {emp.mobile2}
                                        </a>
                                    )}
                                    {(!emp.mobile1 && !emp.mobile2) && (
                                        <div className="col-span-2 text-center text-muted-foreground text-xs italic py-1">
                                            No contact number
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })
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
