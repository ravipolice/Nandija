"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  createEmployee,
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
  MINISTERIAL_RANKS,
  POLICE_STATION_RANKS,
  UNIT_HQ_VALUE,
  STATE_INT_SECTIONS
} from "@/lib/constants";

export default function NewEmployeePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
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
    landline: "",
    landline2: "",
    rank: "",
    metalNumber: "",
    district: "",
    station: "",
    unit: "",
    bloodGroup: "",
    photoUrl: "",
    isAdmin: false,
    isApproved: true,
  });

  const [manualSection, setManualSection] = useState("");

  useEffect(() => {
    loadDistricts();
    loadRanks();
    loadUnits();
  }, []);

  useEffect(() => {
    if (selectedDistrict) {
      loadStations(selectedDistrict);
    } else {
      setStations([]);
    }
  }, [selectedDistrict]);

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

  const getSelectedRank = (rankName: string): Rank | undefined => {
    return ranks.find(
      (r) =>
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
  const isSpecialUnit = ["ISD", "CCB", "CID"].includes(formData.unit);
  const isMinisterial = MINISTERIAL_RANKS.includes(formData.rank.toUpperCase());
  const hasSections = unitSections.length > 0 || formData.unit === "State INT" || formData.district === UNIT_HQ_VALUE;

  // Rank filtering logic based on Unit
  const selectedUnitObj = units.find(u => u.name === formData.unit);
  const applicableRanks = selectedUnitObj?.applicableRanks || [];

  const filteredRanks = ranks.filter(rank => {
    // If unit has strict ranks configured, filter by them
    if (applicableRanks.length > 0) {
      return applicableRanks.includes(rank.rank_id);
    }
    // Otherwise show all (or could implement legacy filtering here if needed)
    return true;
  });

  // Station filtering logic
  const filteredStations = stations.filter((s) => {
    const stationName = s.name.toUpperCase();

    // 1. Rank-based filtering (Police Station Ranks see only PS)
    if (POLICE_STATION_RANKS.includes(formData.rank.toUpperCase())) {
      if (!stationName.includes("PS")) return false;
    }

    // 2. Unit-based filtering (Dynamic)
    // Fallback for DCRB/ESCOM until DB is updated
    const stationKeyword = selectedUnitObj?.stationKeyword ||
      (formData.unit === "DCRB" ? "DCRB" : (formData.unit === "ESCOM" ? "ESCOM" : ""));

    if (stationKeyword) {
      if (!stationName.includes(stationKeyword.toUpperCase())) return false;
    }

    return true;
  });

  const handleUnitChange = (unitName: string) => {
    // Reset district/station to ensure clean state
    setFormData({ ...formData, unit: unitName, district: "", station: "" });
    setSelectedDistrict("");
  };

  // Reset manual section if station selection changes away from "Others"
  useEffect(() => {
    if (formData.station !== "Others") {
      setManualSection("");
    }
  }, [formData.station]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

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

    setLoading(true);

    try {
      await createEmployee({
        ...formData,
        email: formData.email.trim().toLowerCase(),
        mobile2: formData.mobile2,
        landline: formData.landline,
        landline2: formData.landline2,
        unit: formData.unit,
        district: (isSpecialUnit || isHighRanking) ? "" : formData.district,
        station: (isSpecialUnit || isHighRanking || isKSRP || isMinisterial) ? "" : (formData.station === "Others" ? manualSection : formData.station),
      });
      router.push("/employees");
    } catch (error) {
      console.error("Error creating employee:", error);
      alert("Failed to create employee");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <h1 className="mb-6 text-3xl font-bold text-slate-100">Add New Employee</h1>

      <form
        onSubmit={handleSubmit}
        className="rounded-lg bg-dark-card border border-dark-border p-6 shadow-lg"
      >
        <h2 className="mb-4 text-xl font-semibold text-slate-100">
          Employee Details
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {/* Row 1: Name */}
          <div>
            <label className="block text-sm font-medium text-slate-400">
              Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
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
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
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
                const value = e.target.value.replace(/\D/g, "").slice(0, 10);
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
                const value = e.target.value.replace(/\D/g, "").slice(0, 10);
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
              onChange={(e) =>
                setFormData({ ...formData, landline: e.target.value })
              }
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
              onChange={(e) =>
                setFormData({ ...formData, landline2: e.target.value })
              }
              className="mt-1 block w-full rounded-md bg-dark-sidebar border border-dark-border px-3 py-2 text-slate-100 placeholder-slate-400 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-400/50"
              placeholder="Alternate landline"
            />
          </div>

          {/* Row 5: Unit (Moved up) */}
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

          {/* Row 6: KGID, Rank, Metal Number */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3 col-span-1 md:col-span-2 lg:col-span-3">
            <div className="md:col-span-1">
              <label className="block text-sm font-medium text-slate-400">
                KGID *
              </label>
              <input
                type="text"
                required
                value={formData.kgid}
                onChange={(e) => {
                  // Only allow digits
                  const value = e.target.value.replace(/\D/g, "");
                  setFormData({ ...formData, kgid: value });
                }}
                className="mt-1 block w-full rounded-md bg-dark-sidebar border border-dark-border px-3 py-2 text-slate-100 placeholder-slate-400 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-400/50"
              />
            </div>

            <div className="md:col-span-1">
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
                {filteredRanks.map((rank) => (
                  <option key={rank.rank_id} value={rank.equivalent_rank || rank.rank_id}>
                    {rank.rank_id} - {rank.rank_label}
                  </option>
                ))}
              </select>
            </div>

            {formData.rank && requiresMetalNumber(formData.rank) && (
              <div className="md:col-span-1">
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
                <p
                  className={`mt-1 text-xs font-medium ${formData.metalNumber?.trim()
                    ? "text-slate-500"
                    : "text-amber-600"
                    }`}
                >
                  {formData.metalNumber?.trim()
                    ? "✓ Metal number provided"
                    : "⚠ Required for this rank"}
                </p>
              </div>
            )}
          </div>

          {/* Unit was here */}

          {/* Row 6: District */}
          {(() => {
            const selectedUnit = units.find(u => u.name === formData.unit);
            const mappingType = selectedUnit?.mappingType || "all";
            const hideDistrict = mappingType === "none";
            const isBattalion = selectedUnit?.mappedAreaType === "BATTALION";
            const isStateScope = selectedUnit?.scopes?.includes("state") || selectedUnit?.scopes?.includes("hq") || false;

            if (isHighRanking || hideDistrict) return null;

            let availableDistricts = [...districts];
            const mappedIds = selectedUnit?.mappedAreaIds || selectedUnit?.mappedDistricts || [];

            if (mappingType === "single" || mappingType === "subset" || mappingType === "commissionerate") {
              if (mappedIds.length > 0) {
                if (isBattalion) {
                  availableDistricts = mappedIds.map(name => ({ id: name, name }));
                } else {
                  availableDistricts = districts.filter(d => mappedIds.includes(d.name));
                }
              }
            }

            // A. If it's a State-level unit (HQ scope), ensure "HQ" is included
            const isHqLevel = selectedUnit?.isHqLevel || false;
            const showUnitHq = isStateScope || (hasSections) || isHqLevel;

            if (showUnitHq) {
              const alreadyHasHq = availableDistricts.some(d =>
                (d.name || "").match(/^(HQ|UNIT_HQ)$/i) || (d.value || "").match(/^(HQ|UNIT_HQ)$/i)
              );
              if (!alreadyHasHq) {
                availableDistricts = [{ id: "UNIT_HQ", name: "HQ", value: UNIT_HQ_VALUE } as District, ...availableDistricts];
              }
            }

            // Sort Mapped Districts with HQ First
            availableDistricts = availableDistricts.sort((a, b) => {
              const isHqA = (a.name || "").match(/^(HQ|UNIT_HQ)$/i) || (a.value || "").match(/^(HQ|UNIT_HQ)$/i);
              const isHqB = (b.name || "").match(/^(HQ|UNIT_HQ)$/i) || (b.value || "").match(/^(HQ|UNIT_HQ)$/i);
              if (isHqA && !isHqB) return -1;
              if (!isHqA && isHqB) return 1;
              return (a.name || "").localeCompare(b.name || "");
            });

            return (
              <div>
                <label className="block text-sm font-medium text-slate-400">
                  {formData.district === UNIT_HQ_VALUE ? "HQ" : (isBattalion || isKSRP ? "Battalion *" : "District *")}
                </label>
                <select
                  required
                  value={selectedDistrict}
                  onChange={(e) => {
                    setSelectedDistrict(e.target.value);
                    setFormData({
                      ...formData,
                      district: e.target.value,
                      station: "",
                    });
                  }}
                  className="mt-1 block w-full rounded-md bg-dark-sidebar border border-dark-border px-3 py-2 text-slate-100 placeholder-slate-400 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-400/50"
                >
                  <option value="">{isBattalion || isKSRP ? "Select Battalion" : "Select Area / District"}</option>
                  {availableDistricts.map((d) => (
                    <option key={d.id} value={d.value || d.name}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
            );
          })()}

          {/* Row 7: Station */}
          {(() => {
            const selectedUnit = units.find(u => u.name === formData.unit);
            const mappingType = selectedUnit?.mappingType || "all";
            const isDistrictLevel = selectedUnit?.isDistrictLevel || false;
            const hideStation = isHighRanking || isKSRP || isMinisterial || (isDistrictLevel && !hasSections) || mappingType === "state" || mappingType === "none";

            if (hideStation) return null;

            return (
              <div>
                <label className="block text-sm font-medium text-slate-400">
                  {unitSections.length > 0 ? "Section *" : "Station *"}
                </label>
                <select
                  required
                  value={formData.station}
                  onChange={(e) =>
                    setFormData({ ...formData, station: e.target.value })
                  }
                  disabled={!selectedDistrict && !hasSections}
                  className="mt-1 block w-full rounded-md bg-dark-sidebar border border-dark-border px-3 py-2 text-slate-100 placeholder-slate-400 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-400/50 disabled:bg-dark-accent-light disabled:text-slate-500 font-bold"
                >
                  <option value="">
                    {(hasSections && (formData.district === UNIT_HQ_VALUE)) ? "Select Section" : (selectedDistrict ? "Select Station" : "Select District First")}
                  </option>
                  {(hasSections && (formData.district === UNIT_HQ_VALUE)) ? (
                    [
                      ...(unitSections.length > 0 ? unitSections : (formData.unit === "State INT" ? STATE_INT_SECTIONS : [])),
                      "Others"
                    ].map((section) => (
                      <option key={section} value={section}>{section}</option>
                    ))
                  ) : (
                    filteredStations.map((s) => (
                      <option key={s.id} value={s.name}>
                        {s.name}
                      </option>
                    ))
                  )}
                </select>
              </div>
            );
          })()}

          {formData.station === "Others" && (
            <div>
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
              onChange={(e) =>
                setFormData({ ...formData, bloodGroup: e.target.value })
              }
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

          {/* Row 10: Photo URL */}
          <div>
            <label className="block text-sm font-medium text-slate-400">
              Photo URL
            </label>
            <input
              type="url"
              value={formData.photoUrl}
              onChange={(e) =>
                setFormData({ ...formData, photoUrl: e.target.value })
              }
              className="mt-1 block w-full rounded-md bg-dark-sidebar border border-dark-border px-3 py-2 text-slate-100 placeholder-slate-400 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-400/50"
              placeholder="https://..."
            />
          </div>
        </div>

        {/* Checkboxes */}
        < div className="mt-6 flex gap-6" >
          <div className="flex items-center">
            <input
              type="checkbox"
              id="isAdmin"
              checked={formData.isAdmin}
              onChange={(e) =>
                setFormData({ ...formData, isAdmin: e.target.checked })
              }
              className="h-4 w-4 rounded border-dark-border bg-dark-sidebar text-primary-600 focus:ring-primary-500"
            />
            <label
              htmlFor="isAdmin"
              className="ml-2 text-sm font-medium text-slate-400"
            >
              Is Admin
            </label>
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              id="isApproved"
              checked={formData.isApproved}
              onChange={(e) =>
                setFormData({ ...formData, isApproved: e.target.checked })
              }
              className="h-4 w-4 rounded border-dark-border bg-dark-sidebar text-primary-600 focus:ring-primary-500"
            />
            <label
              htmlFor="isApproved"
              className="ml-2 text-sm font-medium text-slate-400"
            >
              Is Approved
            </label>
          </div>
        </div >

        <div className="mt-6 flex gap-4">
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-primary-600 px-6 py-2 text-white transition-colors hover:bg-primary-700 disabled:opacity-50"
          >
            {loading ? "Saving..." : "Create Employee"}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-lg border border-dark-border px-6 py-2 text-slate-400 transition-colors hover:bg-dark-sidebar hover:text-slate-100"
          >
            Cancel
          </button>
        </div>
      </form >
    </div >
  );
}
