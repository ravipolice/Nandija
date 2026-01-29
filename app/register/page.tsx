"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Logo } from "@/components/common/Logo";
import {
    createPendingRegistration,
    getDistricts,
    District,
    getUnits,
    Unit,
    getStations,
    Station,
    getUnitSections,
} from "@/lib/firebase/firestore";
import { uploadFile } from "@/lib/firebase/storage";
import { hashPin } from "@/lib/auth-helpers";
import { Camera } from "lucide-react";
import {
    BLOOD_GROUPS,
    RANKS_LIST,
    RANKS_REQUIRING_METAL_NUMBER,
    DISTRICTS,
    KSRP_BATTALIONS,
    HIGH_RANKING_OFFICERS,
    MINISTERIAL_RANKS,
    POLICE_STATION_RANKS,
    UNIT_HQ_VALUE,
} from "@/lib/constants";

import { Suspense } from "react";

function RegisterPageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    // Data options
    const [districts, setDistricts] = useState<District[]>([]);
    const [units, setUnits] = useState<Unit[]>([]);
    const [stations, setStations] = useState<Station[]>([]);
    const [unitSections, setUnitSections] = useState<string[]>([]);

    // Loading states for data
    const [loadingData, setLoadingData] = useState(true);

    // Form Data
    const [formData, setFormData] = useState({
        kgid: "",
        name: "",
        email: "",
        mobile1: "",
        mobile2: "",
        landline: "",
        landline2: "",
        rank: "",
        metalNumber: "",
        unit: "",
        district: "",
        station: "",
        pin: "",
        confirmPin: "", // UI only
        bloodGroup: "",
    });

    const [acceptedTerms, setAcceptedTerms] = useState(false);

    // Photo State
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Check if metal number is required for the selected rank
    const isMetalNumberRequired = RANKS_REQUIRING_METAL_NUMBER.includes(formData.rank);
    const isSpecialUnit = ["ISD", "CCB", "CID"].includes(formData.unit);
    const isKSRP = formData.unit === "KSRP";

    useEffect(() => {
        async function fetchInitialData() {
            try {
                console.log("Fetching data from Firestore...");
                const [districtsData, unitsData] = await Promise.all([
                    getDistricts(),
                    getUnits()
                ]);
                console.log("Fetched data:", { districtsData, unitsData });

                if (districtsData && districtsData.length > 0) {
                    setDistricts(districtsData);
                } else {
                    console.warn("No districts found in Firestore, falling back to local constants");
                    setDistricts(DISTRICTS.map(d => ({ id: d, name: d })));
                }

                if (unitsData && unitsData.length > 0) {
                    setUnits(unitsData);
                }
            } catch (err) {
                console.error("Failed to load form data, falling back to constants", err);
                setDistricts(DISTRICTS.map(d => ({ id: d, name: d })));
            } finally {
                setLoadingData(false);
            }
        }
        fetchInitialData();
    }, []);

    // Fetch stations when district changes
    useEffect(() => {
        async function fetchStations() {
            if (formData.district) {
                try {
                    const stationsData = await getStations(formData.district);
                    setStations(stationsData);
                } catch (error) {
                    console.error("Error fetching stations:", error);
                    setStations([]);
                }
            } else {
                setStations([]);
            }
        }

        fetchStations();
    }, [formData.district]);

    // Fetch Unit Sections
    useEffect(() => {
        async function fetchUnitSectionsData() {
            if (formData.unit) {
                try {
                    const sections = await getUnitSections(formData.unit);
                    setUnitSections(sections);
                } catch (error) {
                    console.error("Error fetching unit sections:", error);
                    setUnitSections([]);
                }
            } else {
                setUnitSections([]);
            }
        }
        fetchUnitSectionsData();
    }, [formData.unit]);

    // Prefill Email & Name
    useEffect(() => {
        const emailParam = searchParams?.get("email");
        const nameParam = searchParams?.get("name");

        if (emailParam || nameParam) {
            setFormData(prev => ({
                ...prev,
                email: emailParam || prev.email,
                name: nameParam || prev.name
            }));
        }
    }, [searchParams]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;

        if (name === "rank") {
            // Check if new rank requires metal number
            const requiresMetal = RANKS_REQUIRING_METAL_NUMBER.includes(value);
            // Clear metal number if not required
            if (!requiresMetal) {
                setFormData(prev => ({ ...prev, [name]: value, metalNumber: "" }));
                return;
            }
        }

        if (name === "district") {
            setFormData(prev => ({ ...prev, [name]: value, station: "" }));
            return;
        }

        if (name === "unit") {
            if (value === "SCRB") {
                setFormData(prev => ({ ...prev, [name]: value, district: "Bengaluru City", station: "" }));
                return;
            }
        }

        // Numeric filtering for numbers
        if (["mobile1", "mobile2", "kgid", "metalNumber", "pin", "confirmPin"].includes(name)) {
            if (value && !/^\d*$/.test(value)) return; // Only allow digits
        }

        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setPhotoFile(file);
            const reader = new FileReader();
            reader.onload = (ev) => {
                if (ev.target?.result) {
                    setPhotoPreview(ev.target.result as string);
                }
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            // Basic Validation
            if (!formData.kgid) throw new Error("KGID is required");
            if (!formData.name) throw new Error("Name is required");
            if (!formData.email) throw new Error("Email is required");
            if (!formData.mobile1 || formData.mobile1.length !== 10) throw new Error("Valid Mobile 1 is required");
            if (!formData.rank) throw new Error("Rank is required");

            const selectedUnit = units.find(u => u.name === formData.unit);
            const mappingType = selectedUnit?.mappingType || "all";
            const isDistrictLevelUnit = selectedUnit?.isDistrictLevel || false;
            const isHighRanking = HIGH_RANKING_OFFICERS.includes(formData.rank);
            const isMinisterial = MINISTERIAL_RANKS.includes(formData.rank.toUpperCase());
            const hideDistrict = mappingType === "state" || mappingType === "none";
            const hideStation = isDistrictLevelUnit || hideDistrict || isKSRP || isMinisterial;

            if (!isHighRanking && !hideDistrict) {
                if (!formData.district) throw new Error(selectedUnit?.mappedAreaType === "BATTALION" || isKSRP ? "Battalion is required" : "District is required");
                if (!hideStation && !formData.station) {
                    throw new Error(unitSections.length > 0 ? "Section is required" : "Station is required");
                }
            }
            if (!formData.pin) throw new Error("PIN is required");
            if (formData.pin.length !== 6) throw new Error("PIN must be 6 digits");
            if (formData.pin !== formData.confirmPin) throw new Error("PINs do not match");
            if (!acceptedTerms) throw new Error("You must accept the Terms & Conditions");

            // Conditional Validation
            if (isMetalNumberRequired && !formData.metalNumber) {
                throw new Error("Metal Number is required for this rank");
            }

            // 1. Upload Photo if exists
            let photoUrl = "";
            if (photoFile) {
                try {
                    // Path: officer_photos/{kgid}_{timestamp}
                    const path = `officer_photos/${formData.kgid}_${Date.now()}`;
                    photoUrl = await uploadFile(path, photoFile);
                } catch (uploadError: any) {
                    console.error("Photo upload failed", uploadError);
                    throw new Error("Failed to upload photo: " + uploadError.message);
                }
            }

            // 2. Hash PIN
            const hashedPin = await hashPin(formData.pin);

            // 3. Create Pending Registration
            await createPendingRegistration({
                kgid: formData.kgid,
                name: formData.name,
                email: formData.email.trim().toLowerCase(),
                mobile1: formData.mobile1,
                mobile2: formData.mobile2 || undefined,
                landline: formData.landline || undefined,
                landline2: formData.landline2 || undefined,
                rank: formData.rank,
                metalNumber: formData.metalNumber || undefined,
                district: (isSpecialUnit || isHighRanking) ? "" : formData.district,
                station: (isSpecialUnit || isHighRanking || isKSRP || isMinisterial) ? "" : formData.station,
                unit: formData.unit || undefined,
                pin: hashedPin,
                bloodGroup: formData.bloodGroup || undefined,
                photoUrl: photoUrl || undefined,
            });

            setSuccess(true);
        } catch (err: any) {
            setError(err.message || "Failed to register");
            window.scrollTo(0, 0);
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

                    {/* PHOTO UPLOAD */}
                    <div className="flex flex-col items-center justify-center space-y-4">
                        <div
                            className="relative h-32 w-32 cursor-pointer overflow-hidden rounded-full bg-gray-200 shadow-md hover:bg-gray-300 transition-colors"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            {photoPreview ? (
                                <Image src={photoPreview} alt="Profile Preview" fill className="object-cover" />
                            ) : (
                                <div className="flex h-full w-full flex-col items-center justify-center text-gray-500">
                                    <Camera className="h-8 w-8 mb-1" />
                                    <span className="text-xs">Tap to select</span>
                                </div>
                            )}
                        </div>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handlePhotoSelect}
                            accept="image/*"
                            className="hidden"
                        />
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="text-sm font-medium text-primary-600 hover:text-primary-500"
                        >
                            {photoPreview ? "Change Photo" : "Upload Photo"}
                        </button>
                    </div>

                    {/* PERSONAL & CONTACT */}
                    {/* PERSONAL - Name & Email */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                            <label htmlFor="name" className="block text-sm font-medium text-gray-700">Name *</label>
                            <input
                                type="text"
                                name="name"
                                id="name"
                                required
                                value={formData.name}
                                onChange={handleChange}
                                className="mt-1 block w-full rounded-md border border-gray-300 p-2 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm text-gray-900"
                                placeholder="Name as per records"
                            />
                        </div>

                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email *</label>
                            <input
                                type="email"
                                name="email"
                                id="email"
                                required
                                readOnly={!!searchParams?.get("email")}
                                value={formData.email}
                                onChange={handleChange}
                                className={`mt-1 block w-full rounded-md border border-gray-300 p-2 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm text-gray-900 ${searchParams?.get("email") ? 'bg-gray-100 text-gray-500' : ''}`}
                            />
                        </div>
                    </div>

                    {/* CONTACT - Mobiles */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                            <label htmlFor="mobile1" className="block text-sm font-medium text-gray-700">Mobile 1 *</label>
                            <input
                                type="tel"
                                name="mobile1"
                                id="mobile1"
                                required
                                value={formData.mobile1}
                                onChange={handleChange}
                                className="mt-1 block w-full rounded-md border border-gray-300 p-2 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm text-gray-900"
                                placeholder="Primary Contact"
                            />
                        </div>

                        <div>
                            <label htmlFor="mobile2" className="block text-sm font-medium text-gray-700">Mobile 2 (Optional)</label>
                            <input
                                type="tel"
                                name="mobile2"
                                id="mobile2"
                                value={formData.mobile2}
                                onChange={handleChange}
                                className="mt-1 block w-full rounded-md border border-gray-300 p-2 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm text-gray-900"
                            />
                        </div>
                    </div>

                    {/* CONTACT - Landlines */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                            <label htmlFor="landline" className="block text-sm font-medium text-gray-700">Landline (Optional)</label>
                            <input
                                type="tel"
                                name="landline"
                                id="landline"
                                value={formData.landline}
                                onChange={handleChange}
                                className="mt-1 block w-full rounded-md border border-gray-300 p-2 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm text-gray-900"
                            />
                        </div>

                        <div>
                            <label htmlFor="landline2" className="block text-sm font-medium text-gray-700">Landline 2 (Optional)</label>
                            <input
                                type="tel"
                                name="landline2"
                                id="landline2"
                                value={formData.landline2}
                                onChange={handleChange}
                                className="mt-1 block w-full rounded-md border border-gray-300 p-2 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm text-gray-900"
                            />
                        </div>
                    </div>

                    {/* IDENTITY - KGID, Rank, Metal No */}
                    <div className={`grid grid-cols-1 gap-4 ${isMetalNumberRequired ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
                        <div>
                            <label htmlFor="kgid" className="block text-sm font-medium text-gray-700">KGID *</label>
                            <input
                                type="text"
                                name="kgid"
                                id="kgid"
                                required
                                value={formData.kgid}
                                onChange={handleChange}
                                className="mt-1 block w-full rounded-md border border-gray-300 p-2 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm text-gray-900"
                                placeholder="e.g. 2005001"
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
                                className="mt-1 block w-full rounded-md border border-gray-300 p-2 bg-white shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm text-gray-900"
                            >
                                <option value="" className="text-gray-500">Select Rank</option>
                                {RANKS_LIST.map((rank) => (
                                    <option key={rank} value={rank} className="text-gray-900">
                                        {rank}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {isMetalNumberRequired && (
                            <div>
                                <label htmlFor="metalNumber" className="block text-sm font-medium text-gray-700">Metal No. *</label>
                                <input
                                    type="text"
                                    name="metalNumber"
                                    id="metalNumber"
                                    required
                                    value={formData.metalNumber}
                                    onChange={handleChange}
                                    className="mt-1 block w-full rounded-md border border-gray-300 p-2 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm text-gray-900"
                                />
                            </div>
                        )}
                    </div>

                    {/* POSTING - Unit, District, Station */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <div className="sm:col-span-3">
                            <label htmlFor="unit" className="block text-sm font-medium text-gray-700">Unit (Optional)</label>
                            <select
                                name="unit"
                                id="unit"
                                value={formData.unit}
                                onChange={handleChange}
                                className="mt-1 block w-full rounded-md border border-gray-300 p-2 bg-white shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm text-gray-900"
                            >
                                <option value="" className="text-gray-500">Select Unit</option>
                                {units.map((u) => (
                                    <option key={u.id} value={u.name} className="text-gray-900">{u.name}</option>
                                ))}
                            </select>
                        </div>

                        {(() => {
                            const selectedUnit = units.find(u => u.name === formData.unit);
                            const mappingType = selectedUnit?.mappingType || "all";
                            const hideDistrict = mappingType === "state" || mappingType === "none";
                            const isBattalion = selectedUnit?.mappedAreaType === "BATTALION";
                            const isDistrictLevel = selectedUnit?.isDistrictLevel || false;
                            const isHighRanking = HIGH_RANKING_OFFICERS.includes(formData.rank);
                            const isMinisterial = MINISTERIAL_RANKS.includes(formData.rank.toUpperCase());

                            if (isHighRanking || hideDistrict) return null;

                            let availableDistricts = districts;
                            if (mappingType === "single" || mappingType === "subset" || mappingType === "commissionerate") {
                                const mappedIds = selectedUnit?.mappedAreaIds || selectedUnit?.mappedDistricts || [];
                                if (mappedIds.length > 0) {
                                    if (isBattalion) {
                                        availableDistricts = mappedIds.map(name => ({ id: name, name }));
                                    } else {
                                        availableDistricts = districts.filter(d => mappedIds.includes(d.name));
                                    }
                                }
                            } else if (isKSRP) {
                                availableDistricts = KSRP_BATTALIONS.map(b => ({ id: b, name: b }));
                            }

                            if (unitSections.length > 0) {
                                availableDistricts = [{ id: "UNIT_HQ", name: "Unit HQ", value: UNIT_HQ_VALUE }, ...availableDistricts];
                            }

                            return (
                                <>
                                    <div className={mappingType === "single" ? "sm:col-span-2" : ""}>
                                        <label htmlFor="district" className="block text-sm font-medium text-gray-700">
                                            {formData.district === UNIT_HQ_VALUE ? "Unit HQ" : (isBattalion || isKSRP ? "Battalion *" : "District *")}
                                        </label>
                                        <select
                                            name="district"
                                            id="district"
                                            required
                                            value={formData.district}
                                            onChange={handleChange}
                                            className="mt-1 block w-full rounded-md border border-gray-300 p-2 bg-white shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm text-gray-900"
                                        >
                                            <option value="" className="text-gray-500">{isBattalion || isKSRP ? "Select Battalion" : "Select Area / District"}</option>
                                            {availableDistricts.map((d) => (
                                                <option key={d.id} value={d.value || d.name} className="text-gray-900">{d.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {!(isKSRP || isMinisterial || (isDistrictLevel && unitSections.length === 0)) && (
                                        <div>
                                            <label htmlFor="station" className="block text-sm font-medium text-gray-700">
                                                {unitSections.length > 0 ? "Section *" : "Station *"}
                                            </label>
                                            <select
                                                name="station"
                                                id="station"
                                                required
                                                value={formData.station}
                                                onChange={handleChange}
                                                disabled={!formData.district && unitSections.length === 0}
                                                className="mt-1 block w-full rounded-md border border-gray-300 p-2 bg-white shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm disabled:bg-gray-100 text-gray-900"
                                            >
                                                <option value="" className="text-gray-500">
                                                    {(unitSections.length > 0 && (isDistrictLevel || formData.district === UNIT_HQ_VALUE)) ? "Select Section" : (formData.district ? "Select Station" : "Select District First")}
                                                </option>
                                                {(unitSections.length > 0 && (isDistrictLevel || formData.district === UNIT_HQ_VALUE)) ? (
                                                    unitSections.map((section) => (
                                                        <option key={section} value={section} className="text-gray-900">{section}</option>
                                                    ))
                                                ) : (
                                                    stations.filter((s) => {
                                                        const stationName = s.name.toUpperCase();
                                                        if (POLICE_STATION_RANKS.includes(formData.rank.toUpperCase())) {
                                                            if (!stationName.includes("PS")) return false;
                                                        }
                                                        if (formData.unit === "DCRB") {
                                                            if (!stationName.includes("DCRB")) return false;
                                                        } else if (formData.unit === "ESCOM") {
                                                            if (!stationName.includes("ESCOM")) return false;
                                                        }
                                                        return true;
                                                    }).map((s) => (
                                                        <option key={s.id || s.name} value={s.name} className="text-gray-900">{s.name}</option>
                                                    ))
                                                )}
                                            </select>
                                        </div>
                                    )}
                                </>
                            );
                        })()}
                    </div>

                    {/* SECURITY & BLOOD - Blood, PIN, Confirm PIN */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <div>
                            <label htmlFor="bloodGroup" className="block text-sm font-medium text-gray-700">Blood Group</label>
                            <select
                                name="bloodGroup"
                                id="bloodGroup"
                                value={formData.bloodGroup}
                                onChange={handleChange}
                                className="mt-1 block w-full rounded-md border border-gray-300 p-2 bg-white shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm text-gray-900"
                            >
                                <option value="" className="text-gray-500">Select Blood Group</option>
                                {BLOOD_GROUPS.map((bg) => (
                                    <option key={bg} value={bg} className="text-gray-900">{bg}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label htmlFor="pin" className="block text-sm font-medium text-gray-700">Create PIN (6 digits) *</label>
                            <input
                                type="password"
                                name="pin"
                                id="pin"
                                required
                                maxLength={6}
                                value={formData.pin}
                                onChange={handleChange}
                                className="mt-1 block w-full rounded-md border border-gray-300 p-2 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm text-gray-900"
                                placeholder="******"
                            />
                        </div>

                        <div>
                            <label htmlFor="confirmPin" className="block text-sm font-medium text-gray-700">Confirm PIN *</label>
                            <input
                                type="password"
                                name="confirmPin"
                                id="confirmPin"
                                required
                                maxLength={6}
                                value={formData.confirmPin}
                                onChange={handleChange}
                                className="mt-1 block w-full rounded-md border border-gray-300 p-2 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm text-gray-900"
                                placeholder="******"
                            />
                        </div>
                    </div>

                    {/* TERMS */}
                    <div className="flex items-start">
                        <div className="flex h-5 items-center">
                            <input
                                id="terms"
                                name="terms"
                                type="checkbox"
                                required
                                checked={acceptedTerms}
                                onChange={(e) => setAcceptedTerms(e.target.checked)}
                                className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                            />
                        </div>
                        <div className="ml-3 text-sm">
                            <label htmlFor="terms" className="font-medium text-gray-700">I accept </label>
                            <Link href="/terms" className="font-medium text-primary-600 hover:text-primary-500">
                                Terms & Conditions
                            </Link>
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

export default function RegisterPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <RegisterPageContent />
        </Suspense>
    );
}
