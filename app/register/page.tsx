"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/common/Logo";
import {
    createPendingRegistration,
    getRanks,
    getDistricts,
    getStations,
    Rank,
    District,
    Station
} from "@/lib/firebase/firestore";

export default function RegisterPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    // Data options
    const [ranks, setRanks] = useState<Rank[]>([]);
    const [selectedRank, setSelectedRank] = useState<Rank | null>(null);
    const [districts, setDistricts] = useState<District[]>([]);
    const [stations, setStations] = useState<Station[]>([]);

    // Loading states for data
    const [loadingData, setLoadingData] = useState(true);

    const [formData, setFormData] = useState({
        kgid: "",
        name: "",
        email: "",
        mobile1: "",
        mobile2: "",
        rank: "",
        metalNumber: "",
        unit: "",
        district: "",
        station: "",
        pin: "",
        bloodGroup: "",
    });

    useEffect(() => {
        async function fetchInitialData() {
            try {
                const [ranksData, districtsData] = await Promise.all([
                    getRanks(),
                    getDistricts()
                ]);
                setRanks(ranksData);
                setDistricts(districtsData);
            } catch (err) {
                console.error("Failed to load form data", err);
            } finally {
                setLoadingData(false);
            }
        }
        fetchInitialData();
    }, []);

    // Fetch stations when unit changes
    useEffect(() => {
        async function fetchStations() {
            if (formData.unit) {
                try {
                    const stationsData = await getStations(formData.unit);
                    setStations(stationsData);
                } catch (err) {
                    console.error("Failed to load stations", err);
                }
            } else {
                setStations([]);
            }
        }
        fetchStations();
    }, [formData.unit]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;

        if (name === "rank") {
            const rankObj = ranks.find(r => r.rank_label === value) || null;
            setSelectedRank(rankObj);
        }

        setFormData((prev) => {
            // Reset station if unit changes
            if (name === "unit" && value !== prev.unit) {
                // Set district same as unit by default as requested/implied
                return { ...prev, [name]: value, district: value, station: "" };
            }
            return { ...prev, [name]: value };
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            if (!formData.kgid || !formData.name || !formData.email || !formData.mobile1 || !formData.rank || !formData.district || !formData.station || !formData.pin) {
                throw new Error("Please fill in all required fields.");
            }

            if (formData.pin.length < 4) {
                throw new Error("PIN must be at least 4 digits.");
            }

            await createPendingRegistration({
                kgid: formData.kgid,
                name: formData.name,
                email: formData.email,
                mobile1: formData.mobile1,
                mobile2: formData.mobile2 || undefined,
                rank: formData.rank,
                metalNumber: formData.metalNumber || undefined,
                district: formData.district,
                station: formData.station,
                pin: formData.pin, // In a real app we might hash this, but for now we follow android implementation
                bloodGroup: formData.bloodGroup || undefined,
            });

            setSuccess(true);
        } catch (err: any) {
            setError(err.message || "Failed to register");
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
                <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-lg text-center">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                        <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Registration Submitted!</h2>
                    <p className="text-gray-600 mb-6">
                        Your request has been sent for approval. You will be notified once an administrator reviews your details.
                    </p>
                    <button
                        onClick={() => router.push("/login")}
                        className="w-full rounded-lg bg-primary-600 px-4 py-2 font-medium text-white transition-colors hover:bg-primary-700"
                    >
                        Back to Login
                    </button>
                </div>
            </div>
        );
    }

    if (loadingData) {
        return <div className="min-h-screen flex items-center justify-center bg-gray-50">Loading form data...</div>;
    }

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-md overflow-hidden p-8">
                <div className="text-center mb-8">
                    <div className="mx-auto flex h-20 w-20 items-center justify-center mb-4">
                        <Logo size="lg" />
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900">User Registration</h1>
                    <p className="mt-2 text-gray-600">Enter your details to request access to the Police Mobile Directory</p>
                </div>

                {error && (
                    <div className="mb-6 rounded-lg bg-red-50 p-4 text-sm text-red-600 border border-red-200">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">

                        {/* Identity */}
                        <div className="sm:col-span-2">
                            <h3 className="text-lg font-medium text-gray-900 border-b pb-2 mb-4">Identity</h3>
                        </div>

                        <div>
                            <label htmlFor="kgid" className="block text-sm font-medium text-gray-700">KGID / Officer ID *</label>
                            <input
                                type="text"
                                name="kgid"
                                id="kgid"
                                required
                                value={formData.kgid}
                                onChange={handleChange}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm border p-2"
                                placeholder="e.g. 2005001"
                            />
                        </div>

                        <div>
                            <label htmlFor="name" className="block text-sm font-medium text-gray-700">Full Name *</label>
                            <input
                                type="text"
                                name="name"
                                id="name"
                                required
                                value={formData.name}
                                onChange={handleChange}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm border p-2"
                                placeholder="Name as per records"
                            />
                        </div>

                        <div>
                            <label htmlFor="rank" className="block text-sm font-medium text-gray-700">Rank *</label>
                            <select
                                name="rank"
                                id="rank"
                                required
                                value={formData.rank}
                                onChange={handleChange}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm border p-2 bg-white"
                            >
                                <option value="">Select Rank</option>
                                {ranks.map((rank) => (
                                    <option key={rank.rank_id} value={rank.rank_label}>
                                        {rank.rank_label} {rank.rank_id !== rank.rank_label ? `(${rank.rank_id})` : ''}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Conditional Metal Number */}
                        {selectedRank?.requiresMetalNumber && (
                            <div>
                                <label htmlFor="metalNumber" className="block text-sm font-medium text-gray-700">Metal Number</label>
                                <input
                                    type="text"
                                    name="metalNumber"
                                    id="metalNumber"
                                    required
                                    value={formData.metalNumber}
                                    onChange={handleChange}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm border p-2"
                                    placeholder="Required for this rank"
                                />
                            </div>
                        )}

                        {/* Contact */}
                        <div className="sm:col-span-2 mt-2">
                            <h3 className="text-lg font-medium text-gray-900 border-b pb-2 mb-4">Contact Info</h3>
                        </div>

                        <div className="sm:col-span-2">
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email Address *</label>
                            <input
                                type="email"
                                name="email"
                                id="email"
                                required
                                value={formData.email}
                                onChange={handleChange}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm border p-2"
                                placeholder="official@ksp.gov.in"
                            />
                        </div>

                        <div>
                            <label htmlFor="mobile1" className="block text-sm font-medium text-gray-700">Mobile Number 1 *</label>
                            <input
                                type="tel"
                                name="mobile1"
                                id="mobile1"
                                required
                                value={formData.mobile1}
                                onChange={handleChange}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm border p-2"
                                placeholder="Primary Contact"
                            />
                        </div>

                        <div>
                            <label htmlFor="mobile2" className="block text-sm font-medium text-gray-700">Mobile Number 2</label>
                            <input
                                type="tel"
                                name="mobile2"
                                id="mobile2"
                                value={formData.mobile2}
                                onChange={handleChange}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm border p-2"
                                placeholder="Optional"
                            />
                        </div>

                        {/* Location */}
                        <div className="sm:col-span-2 mt-2">
                            <h3 className="text-lg font-medium text-gray-900 border-b pb-2 mb-4">Posting Details</h3>
                        </div>

                        <div>
                            <label htmlFor="district" className="block text-sm font-medium text-gray-700">District *</label>
                            <select
                                name="district"
                                id="district"
                                required
                                value={formData.district}
                                onChange={handleChange}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm border p-2 bg-white"
                            >
                                <option value="">Select District</option>
                                {districts.map((d) => (
                                    <option key={d.id} value={d.name}>{d.name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label htmlFor="unit" className="block text-sm font-medium text-gray-700">Unit</label>
                            <select
                                name="unit"
                                id="unit"
                                value={formData.unit}
                                onChange={handleChange}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm border p-2 bg-white"
                            >
                                <option value="">Select Unit</option>
                                {districts.map((d) => (
                                    <option key={d.id} value={d.name}>{d.name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label htmlFor="station" className="block text-sm font-medium text-gray-700">Station / Office *</label>
                            <select
                                name="station"
                                id="station"
                                required
                                value={formData.station}
                                onChange={handleChange}
                                disabled={!formData.district}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm border p-2 bg-white disabled:bg-gray-100 disabled:text-gray-500"
                            >
                                <option value="">{formData.district ? "Select Station" : "Select District First"}</option>
                                {stations.map((s) => (
                                    <option key={s.id} value={s.name}>{s.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Security */}
                        <div className="sm:col-span-2 mt-2">
                            <h3 className="text-lg font-medium text-gray-900 border-b pb-2 mb-4">Security</h3>
                        </div>

                        <div>
                            <label htmlFor="pin" className="block text-sm font-medium text-gray-700">Set Login PIN *</label>
                            <input
                                type="password"
                                name="pin"
                                id="pin"
                                required
                                minLength={4}
                                value={formData.pin}
                                onChange={handleChange}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm border p-2"
                                placeholder="Min 4 digits"
                            />
                            <p className="mt-1 text-xs text-gray-500">Remember this PIN for future login.</p>
                        </div>

                        <div>
                            <label htmlFor="bloodGroup" className="block text-sm font-medium text-gray-700">Blood Group</label>
                            <select
                                name="bloodGroup"
                                id="bloodGroup"
                                value={formData.bloodGroup}
                                onChange={handleChange}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm border p-2 bg-white"
                            >
                                <option value="">Select Blood Group</option>
                                {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((bg) => (
                                    <option key={bg} value={bg}>{bg}</option>
                                ))}
                            </select>
                        </div>

                    </div>

                    <div className="pt-4">
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
                        >
                            {loading ? "Submitting Request..." : "Submit Registration"}
                        </button>
                    </div>

                    <div className="text-center mt-4">
                        <p className="text-sm text-gray-600">
                            Already registered? <a href="/login" className="font-medium text-primary-600 hover:text-primary-500">Log in here</a>
                        </p>
                    </div>

                </form>
            </div>
        </div>
    );
}
