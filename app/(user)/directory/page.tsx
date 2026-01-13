"use client";

import { useEffect, useState } from "react";
import { Officer, getOfficers, Employee, getEmployees } from "@/lib/firebase/firestore";
import { Search } from "lucide-react";

export default function DirectoryPage() {
    const [activeTab, setActiveTab] = useState<"officers" | "employees">("officers");
    const [searchTerm, setSearchTerm] = useState("");
    const [officers, setOfficers] = useState<Officer[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchData() {
            try {
                const [officersData, employeesData] = await Promise.all([
                    getOfficers(),
                    getEmployees(),
                ]);
                setOfficers(officersData.filter(o => !o.isHidden));
                setEmployees(employeesData.filter(e => !e.isHidden));
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

    const filteredOfficers = officers.filter((officer) => {
        const term = searchTerm.toLowerCase();
        return (
            officer.name.toLowerCase().includes(term) ||
            officer.rank?.toLowerCase().includes(term) ||
            officer.office?.toLowerCase().includes(term) ||
            officer.district?.toLowerCase().includes(term) ||
            officer.mobile?.includes(term)
        );
    });

    const filteredEmployees = employees.filter((employee) => {
        const term = searchTerm.toLowerCase();
        return (
            employee.name.toLowerCase().includes(term) ||
            employee.rank?.toLowerCase().includes(term) ||
            employee.station?.toLowerCase().includes(term) ||
            employee.district?.toLowerCase().includes(term) ||
            employee.mobile1?.includes(term)
        );
    });

    // Sort by rank logic is complex without backend sort, for now simple name sort or rely on default order
    // officers is name sorted, employees is name sorted.

    if (loading) {
        return <div className="text-center py-10">Loading directory...</div>;
    }

    return (
        <div className="space-y-6">

            {/* Search Bar */}
            <div className="relative max-w-lg mx-auto">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-muted-foreground" />
                </div>
                <input
                    type="text"
                    className="block w-full pl-10 pr-3 py-3 border border-border rounded-lg leading-5 bg-card text-foreground placeholder-muted-foreground focus:outline-none focus:placeholder-muted-foreground focus:ring-1 focus:ring-primary focus:border-primary sm:text-sm"
                    placeholder="Search by name, rank, station, mobile..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {/* Tabs */}
            <div className="flex justify-center space-x-4 border-b border-border pb-4">
                <button
                    onClick={() => setActiveTab("officers")}
                    className={`px-4 py-2 font-medium text-sm rounded-md transition-colors ${activeTab === "officers"
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:text-foreground"
                        }`}
                >
                    Officers ({filteredOfficers.length})
                </button>
                <button
                    onClick={() => setActiveTab("employees")}
                    className={`px-4 py-2 font-medium text-sm rounded-md transition-colors ${activeTab === "employees"
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:text-foreground"
                        }`}
                >
                    Employees ({filteredEmployees.length})
                </button>
            </div>

            {/* List / Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {activeTab === "officers" ? (
                    filteredOfficers.map((officer) => (
                        <div key={officer.id || officer.agid} className="bg-card rounded-lg shadow-sm border border-border p-6 hover:shadow-md transition-shadow">
                            <div className="flex items-start justify-between">
                                <div>
                                    <h3 className="text-lg font-bold text-foreground">{officer.name}</h3>
                                    <p className="text-sm font-medium text-primary">{officer.rank}</p>
                                </div>
                            </div>
                            <div className="mt-4 space-y-2 text-sm text-foreground/80">
                                <div className="flex items-center">
                                    <span className="font-medium mr-2 text-muted-foreground">Mobile:</span>
                                    <a href={`tel:${officer.mobile}`} className="text-blue-600 hover:underline">{officer.mobile}</a>
                                </div>
                                {officer.mobile2 && (
                                    <div className="flex items-center">
                                        <span className="font-medium mr-2 text-muted-foreground">Mobile 2:</span>
                                        <a href={`tel:${officer.mobile2}`} className="text-blue-600 hover:underline">{officer.mobile2}</a>
                                    </div>
                                )}
                                {officer.email && (
                                    <div className="flex items-center">
                                        <span className="font-medium mr-2 text-muted-foreground">Email:</span>
                                        <a href={`mailto:${officer.email}`} className="text-blue-600 hover:underline">{officer.email}</a>
                                    </div>
                                )}
                                {officer.landline && (
                                    <div className="flex items-center">
                                        <span className="font-medium mr-2 text-muted-foreground">Landline:</span>
                                        <a href={`tel:${officer.landline}`} className="text-blue-600 hover:underline">{officer.landline}</a>
                                    </div>
                                )}
                                {officer.office && (
                                    <div className="flex items-start">
                                        <span className="font-medium mr-2 text-muted-foreground">Office:</span>
                                        <span>{officer.office}</span>
                                    </div>
                                )}
                                <div className="flex items-start">
                                    <span className="font-medium mr-2 text-muted-foreground">District:</span>
                                    <span>{officer.district}</span>
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    filteredEmployees.map((emp) => (
                        <div key={emp.id} className="bg-card rounded-lg shadow-sm border border-border p-6 hover:shadow-md transition-shadow relative">
                            {emp.bloodGroup && (
                                <div className="absolute top-4 right-4 flex h-10 w-10 items-center justify-center rounded-full bg-red-100 text-xs font-bold text-red-600 border border-red-200" title="Blood Group">
                                    {emp.bloodGroup}
                                </div>
                            )}
                            <div className="flex items-start space-x-4">
                                {emp.photoUrl ? (
                                    <img src={emp.photoUrl} alt={emp.name} className="h-20 w-20 rounded-full object-cover border border-gray-200" />
                                ) : (
                                    <div className="h-20 w-20 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 font-bold text-2xl">
                                        {emp.name.charAt(0)}
                                    </div>
                                )}
                                <div>
                                    <h3 className="text-lg font-bold text-foreground">{emp.name}</h3>
                                    <p className="text-sm font-medium text-primary">{emp.displayRank || emp.rank}</p>
                                </div>
                            </div>
                            <div className="mt-4 space-y-2 text-sm text-foreground/80">
                                <div className="flex items-center">
                                    <span className="font-medium mr-2">Mobile:</span>
                                    <a href={`tel:${emp.mobile1}`} className="text-blue-600 hover:underline">{emp.mobile1}</a>
                                </div>
                                {emp.mobile2 && (
                                    <div className="flex items-center">
                                        <span className="font-medium mr-2">Mobile 2:</span>
                                        <a href={`tel:${emp.mobile2}`} className="text-blue-600 hover:underline">{emp.mobile2}</a>
                                    </div>
                                )}
                                {emp.email && (
                                    <div className="flex items-center">
                                        <span className="font-medium mr-2">Email:</span>
                                        <a href={`mailto:${emp.email}`} className="text-blue-600 hover:underline">{emp.email}</a>
                                    </div>
                                )}
                                <div className="flex items-start">
                                    <span className="font-medium mr-2">Station:</span>
                                    <span>{emp.station}</span>
                                </div>
                                <div className="flex items-start">
                                    <span className="font-medium mr-2">District:</span>
                                    <span>{emp.district}</span>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {activeTab === "officers" && filteredOfficers.length === 0 && (
                <p className="text-center text-muted-foreground py-10">No officers found matching your search.</p>
            )}
            {activeTab === "employees" && filteredEmployees.length === 0 && (
                <p className="text-center text-muted-foreground py-10">No employees found matching your search.</p>
            )}

        </div>
    );
}
