"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  getEmployee,
  updateEmployee,
  getDistricts,
  getStations,
  getRanks,
  getUnits,
  District,
  Station,
  Rank,
  Unit,
  getUnitSections,
} from "@/lib/firebase/firestore";
import {
  BLOOD_GROUPS,
  HIGH_RANKING_OFFICERS,
  KSRP_BATTALIONS,
  MINISTERIAL_RANKS,
  POLICE_STATION_RANKS,
  UNIT_HQ_VALUE,
  STATE_INT_SECTIONS
} from "@/lib/constants";

export default function EditEmployeePage() {
  const router = useRouter();
  const [employeeId, setEmployeeId] = useState<string>("");
  const [mounted, setMounted] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [districts, setDistricts] = useState<District[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [ranks, setRanks] = useState<Rank[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [unitSections, setUnitSections] = useState<string[]>([]);
  const [selectedDistrict, setSelectedDistrict] = useState("");

  const [formData, setFormData] = useState({
    kgid: "",
    name: "",
    email: "",
    mobile1: "",
    mobile2: "",
    rank: "",
    metalNumber: "",
    district: "",
    station: "",
    unit: "",
    bloodGroup: "",
    photoUrl: "",
    isAdmin: false,
    isApproved: true,
    landline: "",
    landline2: "",
  });

  const [manualSection, setManualSection] = useState("");

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
      setRanks(data);
    } catch (error) {
      console.error("Error loading ranks:", error);
    }
  };

  const loadUnits = async () => {
    try {
      const data = await getUnits();
      setUnits(data);
    } catch (error) {
      console.error("Error loading units:", error);
    }
  };

  const loadStations = async (district: string) => {
    try {
      const data = await getStations(district);
      setStations(data);
    } catch (error) {
      console.error("Error loading stations:", error);
    }
  };

  const loadEmployee = async () => {
    if (!employeeId) return;
    try {
      const employee = await getEmployee(employeeId);
      if (!employee) {
        alert("Employee not found");
        router.push("/employees");
        return;
      }

      // Preserve exact values as they are stored in the database
      const employeeStation = employee.station ?? "";
      const employeeUnit = employee.unit ?? "";
      const employeeDistrict = employee.district ?? "";
      const employeeBloodGroup = employee.bloodGroup ?? "";

      // Load stations first if district exists, then set form data
      if (employeeDistrict) {
        // Load stations for the district before setting form data
        const districtStations = await getStations(employeeDistrict);

        // Normalize station names for comparison (trim and case-insensitive)
        const normalizedEmployeeStation = employeeStation.trim();
        const stationExists = districtStations.some(s =>
          s.name.trim().toLowerCase() === normalizedEmployeeStation.toLowerCase()
        );

        // If the employee's station doesn't exist in the stations list, add it
        // This ensures the station value is always displayed, even if it was removed from the list
        if (normalizedEmployeeStation && !stationExists) {
          districtStations.push({
            id: "current",
            name: normalizedEmployeeStation,
            district: employeeDistrict
          });
        }

        // Set stations first, then set selectedDistrict
        setStations(districtStations);
        setSelectedDistrict(employeeDistrict);
      }

      // Now set form data with all values exactly as stored
      // Preserve exact values - don't convert undefined/null to empty string for optional fields
      setFormData({
        kgid: employee.kgid ?? "",
        name: employee.name ?? "",
        email: employee.email ?? "",
        mobile1: employee.mobile1 ?? "",
        mobile2: employee.mobile2 ?? "",
        landline: employee.landline ?? "",
        landline2: employee.landline2 ?? "",
        rank: employee.rank ?? "",
        metalNumber: employee.metalNumber ?? "",
        district: employeeDistrict,
        station: employeeStation,
        unit: employeeUnit,
        bloodGroup: employeeBloodGroup, // Preserve "??" exactly as stored
        photoUrl: employee.photoUrl ?? "",
        isAdmin: employee.isAdmin ?? false,
        isApproved: employee.isApproved !== undefined ? employee.isApproved : true,
      });
    } catch (error) {
      console.error("Error loading employee:", error);
      alert("Failed to load employee");
      router.push("/employees");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Mark as mounted (client-side only)
    setMounted(true);

    // Get ID from URL query parameter
    const params = new URLSearchParams(window.location.search);
    const id = params.get("id") || "";
    if (!id) {
      alert("No employee ID provided");
      router.push("/employees");
      return;
    }
    setEmployeeId(id);
  }, [router]);

  useEffect(() => {
    if (!employeeId) return;
    loadDistricts();
    loadRanks();
    loadUnits();
    loadEmployee();
  }, [employeeId]);

  useEffect(() => {
    // Only auto-load stations when district changes via user interaction
    if (selectedDistrict && !loading) {
      const currentStationDistrict = stations[0]?.district;
      if (stations.length === 0 || (currentStationDistrict && currentStationDistrict !== selectedDistrict)) {
        loadStations(selectedDistrict);
      }
    } else if (!selectedDistrict && !loading) {
      setStations([]);
    }
  }, [selectedDistrict, loading]);

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

  const selectedUnit = units.find(u => u.name === formData.unit);
  const isSpecialUnit = ["ISD", "CCB", "CID", "State INT", "S INT", "IPS"].includes(formData.unit);
  const isDistrictLevel = selectedUnit?.isDistrictLevel || false;
  const hasSections = (unitSections.length > 0 || formData.unit === "State INT" || formData.district === UNIT_HQ_VALUE) || (isDistrictLevel && unitSections.length > 0);

  // Ensure station value is preserved when stations are loaded
  useEffect(() => {
    if (stations.length > 0 && formData.station) {
      // Check if the current station exists in the stations list
      const stationExists = stations.some(s => s.name === formData.station);
      if (!stationExists && formData.station) {
        // If station doesn't exist, add it to the list
        setStations(prev => {
          // Check if it's already been added
          if (!prev.some(s => s.name === formData.station)) {
            return [...prev, {
              id: "current",
              name: formData.station,
              district: (selectedDistrict || formData.district) || ""
            }];
          }
          return prev;
        });
      }
    }
  }, [stations, formData.station, selectedDistrict, formData.district]);

  const getSelectedRank = (rankName: string): Rank | undefined => {
    return ranks.find(r =>
      r.equivalent_rank === rankName ||
      r.aliases?.includes(rankName) ||
      r.rank_id === rankName
    );
  };

  const requiresMetalNumber = (rankName: string): boolean => {
    const rank = getSelectedRank(rankName);
    return rank?.requiresMetalNumber || false;
  };

  const isHighRanking = HIGH_RANKING_OFFICERS.includes(formData.rank);
  const isKSRP = formData.unit === "KSRP";
  const isMinisterial = MINISTERIAL_RANKS.includes(formData.rank.toUpperCase());

  // Station filtering logic
  const filteredStations = stations.filter((s) => {
    const stationName = s.name.toUpperCase();

    // 1. Rank-based filtering (Police Station Ranks see only PS)
    if (POLICE_STATION_RANKS.includes(formData.rank.toUpperCase())) {
      if (!stationName.includes("PS")) return false;
    }

    // 2. Unit-based filtering (Dynamic)
    // Fallback for DCRB/ESCOM until DB is updated
    const stationKeyword = selectedUnit?.stationKeyword ||
      (formData.unit === "DCRB" ? "DCRB" : (formData.unit === "ESCOM" ? "ESCOM" : ""));

    if (stationKeyword) {
      if (!stationName.includes(stationKeyword.toUpperCase())) return false;
    }

    return true;
  });

  const handleUnitChange = (unitName: string) => {
    // Reset district/station to ensure clean state
    setFormData({
      ...formData,
      unit: unitName,
      district: "",
      station: "",
    });
    setSelectedDistrict("");
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!employeeId) {
      alert("No employee ID provided");
      return;
    }

    // Validate metal number for ranks that require it
    if (
      formData.rank &&
      requiresMetalNumber(formData.rank) &&
      !formData.metalNumber?.trim()
    ) {
      alert(`Metal number is required for rank: ${formData.rank}`);
      return;
    }

    if (formData.station === "Others" && !manualSection) {
      alert("Please specify the section name");
      return;
    }

    // Validate mobile number format
    if (formData.mobile1 && formData.mobile1.length !== 10) {
      alert("Mobile number must be 10 digits");
      return;
    }

    setSaving(true);

    try {
      const isIPS = formData.unit === "IPS";

      const updateData: any = {
        ...formData,
        kgid: (isIPS && !formData.kgid) ? `IPS-${Date.now()}` : formData.kgid,
        email: formData.email.trim().toLowerCase(),
        mobile2: formData.mobile2,
        landline: formData.landline,
        landline2: formData.landline2,
        unit: formData.unit,
        district: (isSpecialUnit || isHighRanking) ? "" : formData.district,
        station: (isSpecialUnit || isHighRanking || isKSRP || isMinisterial || (isDistrictLevel && !hasSections)) ? "" : (formData.station === "Others" ? manualSection : formData.station),
      };

      await updateEmployee(employeeId, updateData);
      router.push("/employees");
    } catch (error) {
      console.error("Error updating employee:", error);
      alert("Failed to update employee");
    } finally {
      setSaving(false);
    }
  };

  if (!mounted || loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-lg text-slate-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="mb-6 text-3xl font-bold text-slate-100">Edit Employee</h1>

      <form onSubmit={handleSubmit} className="rounded-lg bg-dark-card border border-dark-border p-6 shadow-lg" style={{ overflow: 'visible' }}>
        <h2 className="mb-4 text-xl font-semibold text-slate-100">Employee Details</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3" style={{ overflow: 'visible' }}>
          {/* Row 1: Name */}
          <div>
            <label className="block text-sm font-medium text-slate-400">
              Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="mt-1 block w-full rounded-md bg-dark-sidebar border border-dark-border px-3 py-2 text-slate-100 placeholder-slate-400 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-400/50"
            />
          </div>

          {/* Row 2: Email */}
          <div>
            <label className="block text-sm font-medium text-slate-400">
              Email *
            </label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="mt-1 block w-full rounded-md bg-dark-sidebar border border-dark-border px-3 py-2 text-slate-100 placeholder-slate-400 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-400/50"
            />
          </div>

          {/* Row 3: Mobile 1 */}
          <div>
            <label className="block text-sm font-medium text-slate-400">
              Mobile 1 *
            </label>
            <input
              type="tel"
              required
              value={formData.mobile1}
              onChange={(e) => {
                // Only allow digits, max 10
                const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                setFormData({ ...formData, mobile1: value });
              }}
              className="mt-1 block w-full rounded-md bg-dark-sidebar border border-dark-border px-3 py-2 text-slate-100 placeholder-slate-400 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-400/50"
            />
          </div>

          {/* Row 4: Mobile 2 */}
          <div>
            <label className="block text-sm font-medium text-slate-400">
              Mobile 2 (Optional)
            </label>
            <input
              type="tel"
              value={formData.mobile2}
              onChange={(e) => {
                // Only allow digits, max 10
                const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                setFormData({ ...formData, mobile2: value });
              }}
              className="mt-1 block w-full rounded-md bg-dark-sidebar border border-dark-border px-3 py-2 text-slate-100 placeholder-slate-400 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-400/50"
            />
          </div>

          {/* Row 4b: Landline */}
          <div>
            <label className="block text-sm font-medium text-slate-400">
              Landline (Optional)
            </label>
            <input
              type="tel"
              value={formData.landline}
              onChange={(e) => setFormData({ ...formData, landline: e.target.value })}
              className="mt-1 block w-full rounded-md bg-dark-sidebar border border-dark-border px-3 py-2 text-slate-100 placeholder-slate-400 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-400/50"
              placeholder="e.g. 080-12345678"
            />
          </div>

          {/* Row 4c: Landline 2 */}
          <div>
            <label className="block text-sm font-medium text-slate-400">
              Landline 2 (Optional)
            </label>
            <input
              type="tel"
              value={formData.landline2}
              onChange={(e) => setFormData({ ...formData, landline2: e.target.value })}
              className="mt-1 block w-full rounded-md bg-dark-sidebar border border-dark-border px-3 py-2 text-slate-100 placeholder-slate-400 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-400/50"
              placeholder="Alternate landline"
            />
          </div>

          {/* Row 5: KGID, Rank, Metal Number (all in same row) */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {formData.unit !== "IPS" && (
              <div>
                <label className="block text-sm font-medium text-slate-400">
                  KGID *
                </label>
                <input
                  type="text"
                  required
                  value={formData.kgid}
                  onChange={(e) => {
                    // Only allow digits
                    const value = e.target.value.replace(/\D/g, '');
                    setFormData({ ...formData, kgid: value });
                  }}
                  className="mt-1 block w-full rounded-md bg-dark-sidebar border border-dark-border px-3 py-2 text-slate-100 placeholder-slate-400 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-400/50"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-400">
                Rank *
              </label>
              <select
                required
                value={formData.rank}
                onChange={(e) => {
                  const newRank = e.target.value;
                  // Clear metal number if rank changes to one that doesn't require it
                  const shouldClearMetal =
                    formData.metalNumber &&
                    (!newRank || !requiresMetalNumber(newRank));
                  setFormData({
                    ...formData,
                    rank: newRank,
                    metalNumber: shouldClearMetal ? "" : formData.metalNumber,
                  });
                }}
                className="mt-1 block w-full rounded-md bg-dark-sidebar border border-dark-border px-3 py-2 text-slate-100 placeholder-slate-400 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-400/50"
              >
                <option value="">Select Rank</option>
                {ranks.map((rank) => (
                  <option key={rank.rank_id} value={rank.equivalent_rank || rank.rank_id}>
                    {rank.rank_id}
                  </option>
                ))}
              </select>
            </div>

            {formData.rank &&
              requiresMetalNumber(formData.rank) && (
                <div>
                  <label className="block text-sm font-medium text-slate-400">
                    Metal Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.metalNumber}
                    onChange={(e) =>
                      setFormData({ ...formData, metalNumber: e.target.value })
                    }
                    className={`mt-1 block w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-2 bg-dark-sidebar text-slate-100 placeholder-slate-400 ${formData.metalNumber?.trim()
                      ? "border-dark-border focus:border-primary-400 focus:ring-primary-400/50"
                      : "border-amber-300 focus:border-amber-500 focus:ring-amber-500"
                      }`}
                  />
                  <p className={`mt-1 text-xs font-medium ${formData.metalNumber?.trim()
                    ? "text-slate-500"
                    : "text-amber-600"
                    }`}>
                    {formData.metalNumber?.trim()
                      ? "✓ Metal number provided"
                      : "⚠ Required for this rank"}
                  </p>
                </div>
              )}
          </div>

          {/* Row 5b: Unit */}
          <div>
            <label className="block text-sm font-medium text-slate-400">
              Unit (Optional)
            </label>
            <select
              value={formData.unit}
              onChange={(e) => handleUnitChange(e.target.value)}
              className="mt-1 block w-full rounded-md bg-dark-sidebar border border-dark-border px-3 py-2 text-slate-100 placeholder-slate-400 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-400/50"
            >
              <option value="">Select Unit (Optional)</option>
              {units.map((unit) => (
                <option key={unit.id} value={unit.name}>
                  {unit.name}
                </option>
              ))}
            </select>
          </div>

          {/* Row 6: District */}
          {(() => {
            const selectedUnit = units.find(u => u.name === formData.unit);
            const mappingType = selectedUnit?.mappingType || "all";
            const hideDistrict = mappingType === "state" || mappingType === "none" || isSpecialUnit;
            const isBattalion = selectedUnit?.mappedAreaType === "BATTALION";

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

            const isHqLevel = selectedUnit?.isHqLevel || false;
            const isDistrictLevelVal = selectedUnit?.isDistrictLevel || false;
            const showUnitHq = (unitSections.length > 0) || isHqLevel || formData.unit === "State INT" || (isDistrictLevelVal && unitSections.length > 0);

            if (showUnitHq) {
              availableDistricts = [{ id: "UNIT_HQ", name: "HQ", value: UNIT_HQ_VALUE } as District, ...availableDistricts];
            }

            return (
              <div className="relative" style={{ zIndex: 10 }}>
                <label className="block text-sm font-medium text-slate-400">
                  {formData.district === UNIT_HQ_VALUE ? "HQ" : (isBattalion || isKSRP ? "Battalion *" : "District *")}
                </label>
                <select
                  required
                  value={selectedDistrict}
                  onChange={(e) => {
                    setSelectedDistrict(e.target.value);
                    setFormData({ ...formData, district: e.target.value, station: "" });
                  }}
                  className="mt-1 block w-full rounded-md bg-dark-sidebar border border-dark-border px-3 py-2 text-slate-100 placeholder-slate-400 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-400/50"
                  style={{ zIndex: 1000, position: 'relative' }}
                >
                  <option value="">{isBattalion || isKSRP ? "Select Battalion" : "Select Area / District"}</option>
                  {availableDistricts.map((d) => (
                    <option key={d.id} value={d.value || d.name} style={{ backgroundColor: 'white', color: 'black' }}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
            );
          })()}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* Station Row */}
            {(() => {
              const selectedUnit = units.find(u => u.name === formData.unit);
              const mappingType = selectedUnit?.mappingType || "all";
              const isDistrictLevel = selectedUnit?.isDistrictLevel || false;
              const hideStation = isHighRanking || isKSRP || isMinisterial || (isDistrictLevel && !hasSections) || mappingType === "state" || mappingType === "none" || isSpecialUnit;

              if (hideStation) return null;

              return (
                <div className="relative" style={{ zIndex: 10 }}>
                  <label className="block text-sm font-medium text-slate-400">
                    {unitSections.length > 0 ? "Section *" : "Station *"}
                  </label>
                  <select
                    required
                    key={`station-${stations.length}-${formData.station}`}
                    value={formData.station}
                    onChange={(e) => setFormData({ ...formData, station: e.target.value })}
                    disabled={!selectedDistrict && !hasSections}
                    className="mt-1 block w-full rounded-md bg-dark-sidebar border border-dark-border px-3 py-2 text-slate-100 placeholder-slate-400 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-400/50 disabled:bg-dark-accent-light disabled:text-slate-500 font-bold"
                    style={{ zIndex: 1000, position: 'relative' }}
                  >
                    <option value="">
                      {(hasSections && (formData.district === UNIT_HQ_VALUE)) ? "Select Section" : (selectedDistrict ? "Select Station" : "Select District First")}
                    </option>
                    {(hasSections && (formData.district === UNIT_HQ_VALUE)) ? (
                      [
                        ...(unitSections.length > 0 ? unitSections : (formData.unit === "State INT" ? STATE_INT_SECTIONS : [])),
                        "Others"
                      ].map((section) => (
                        <option key={section} value={section} style={{ backgroundColor: 'white', color: 'black' }}>{section}</option>
                      ))
                    ) : (
                      filteredStations.map((s) => (
                        <option key={s.id || s.name} value={s.name} style={{ backgroundColor: 'white', color: 'black' }}>
                          {s.name}
                        </option>
                      ))
                    )}
                  </select>
                </div>
              );
            })()}

            {formData.station === "Others" && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-400">
                  Specify Section Name *
                </label>
                <input
                  type="text"
                  required
                  value={manualSection}
                  onChange={(e) => setManualSection(e.target.value)}
                  className="mt-1 block w-full rounded-md bg-dark-sidebar border border-dark-border px-3 py-2 text-slate-100 placeholder-slate-400 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-400/50 font-bold"
                  placeholder="Enter section name"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-400">
                Blood Group
              </label>
              <select
                value={formData.bloodGroup}
                onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })}
                className="mt-1 block w-full rounded-md bg-dark-sidebar border border-dark-border px-3 py-2 text-slate-100 placeholder-slate-400 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-400/50"
              >
                <option value="">Select Blood Group</option>
                {BLOOD_GROUPS.map((bg) => (
                  <option key={bg} value={bg}>
                    {bg}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 8: Photo URL */}
          <div>
            <label className="block text-sm font-medium text-slate-400">
              Photo URL
            </label>
            <input
              type="url"
              value={formData.photoUrl}
              onChange={(e) => setFormData({ ...formData, photoUrl: e.target.value })}
              className="mt-1 block w-full rounded-md bg-dark-sidebar border border-dark-border px-3 py-2 text-slate-100 placeholder-slate-400 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-400/50"
            />
          </div>
        </div>

        <div className="mt-6 flex items-center gap-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.isAdmin}
              onChange={(e) => setFormData({ ...formData, isAdmin: e.target.checked })}
              className="mr-2 rounded border-dark-border bg-dark-sidebar text-primary-600 focus:ring-primary-500"
            />
            <span className="text-sm text-slate-400">Is Admin</span>
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.isApproved}
              onChange={(e) => setFormData({ ...formData, isApproved: e.target.checked })}
              className="mr-2 rounded border-dark-border bg-dark-sidebar text-primary-600 focus:ring-primary-500"
            />
            <span className="text-sm text-slate-400">Is Approved</span>
          </label>
        </div>

        <div className="mt-6 flex gap-4">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-primary-600 px-6 py-2 text-white transition-colors hover:bg-primary-700 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Update Employee"}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-lg border border-dark-border px-6 py-2 text-slate-400 transition-colors hover:bg-dark-sidebar hover:text-slate-100"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
