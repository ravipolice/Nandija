"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  createAdminEmployee,
  getDistricts,
  getStations,
  getRanks,
  getUnits,
  District,
  Station,
  Rank,
  Unit,
  getSubSections,
} from "@/lib/firebase/firestore";
import {
  BLOOD_GROUPS,
  HIGH_RANKING_OFFICERS,
  MINISTERIAL_RANKS,
  POLICE_STATION_RANKS,
  UNIT_HQ_VALUE,
} from "@/lib/constants";

export default function NewAdminEmployeePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [districts, setDistricts] = useState<District[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [ranks, setRanks] = useState<Rank[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [allDutyRoles, setAllDutyRoles] = useState<string[]>([]);
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
    gender: "",
    subSection: "",
    dutyRole: "",
  });

  const [manualSection, setManualSection] = useState("");
  const [manualDutyRole, setManualDutyRole] = useState("");

  useEffect(() => {
    loadDistricts();
    loadRanks();
    loadUnits();
    loadDutyRoles();
  }, []);

  const loadDutyRoles = async () => {
    try {
      const roles = await getSubSections();
      setAllDutyRoles(roles);
    } catch (error) {
      console.error("Error loading duty roles:", error);
    }
  };

  useEffect(() => {
    if (selectedDistrict) {
      loadStations(selectedDistrict);
    } else {
      setStations([]);
    }
  }, [selectedDistrict]);

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
      setUnits(data.filter(u => !u.hideFromRegistration));
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
  const selectedUnitObj = units.find(u => u.name === formData.unit);
  const isSpecialUnit = selectedUnitObj?.mappingType === "none";
  const isDistrictLevel = selectedUnitObj?.isDistrictLevel || false;
  const hasSections = false;

  const isMinisterial = MINISTERIAL_RANKS.includes(formData.rank.toUpperCase());
  const applicableRanks = selectedUnitObj?.applicableRanks || [];

  const filteredRanks = ranks.filter(rank => {
    if (applicableRanks.length > 0) {
      return applicableRanks.includes(rank.rank_id);
    }
    return true;
  });

  const filteredStations = stations.filter((s) => {
    const stationName = s.name.toUpperCase();
    if (POLICE_STATION_RANKS.includes(formData.rank.toUpperCase())) {
      if (!stationName.includes("PS")) return false;
    }
    const stationKeyword = selectedUnitObj?.stationKeyword;
    if (stationKeyword) {
      if (!stationName.includes(stationKeyword.toUpperCase())) return false;
    }
    return true;
  });

  const filteredDutyRoles = useMemo(() => {
    let roles = allDutyRoles;
    const unitObj = units.find(u => u.name === formData.unit);
    if (unitObj && unitObj.dutyRoles && unitObj.dutyRoles.length > 0) {
      roles = unitObj.dutyRoles;
    }
    if (!roles.includes("Others")) {
      return [...roles, "Others"];
    }
    return roles;
  }, [formData.unit, units, allDutyRoles]);

  const handleUnitChange = (unitName: string) => {
    setFormData({ ...formData, unit: unitName, district: "", station: "", dutyRole: "" });
    setSelectedDistrict("");
  };

  useEffect(() => {
    if (formData.station !== "Others") {
      setManualSection("");
    }
  }, [formData.station]);

  useEffect(() => {
    if (formData.dutyRole !== "Others") {
      setManualDutyRole("");
    }
  }, [formData.dutyRole]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

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

    if (formData.dutyRole === "Others" && !manualDutyRole) {
      alert("Please specify the duty role");
      return;
    }

    if (formData.mobile1 && formData.mobile1.length !== 10) {
      alert("Mobile number must be 10 digits");
      return;
    }

    setLoading(true);

    try {
      const isIPS = formData.unit === "IPS";
      const finalKgid = (isIPS && !formData.kgid) ? `IPS-${Date.now()}` : formData.kgid;

      await createAdminEmployee({
        ...formData,
        kgid: finalKgid,
        email: formData.email.trim().toLowerCase(),
        mobile2: formData.mobile2,
        landline: formData.landline,
        landline2: formData.landline2,
        unit: formData.unit,
        district: (isSpecialUnit || isHighRanking) ? "" : formData.district,
        station: (isSpecialUnit || isHighRanking || isKSRP || isMinisterial || (isDistrictLevel && !hasSections)) ? "" : (formData.station === "Others" ? manualSection : formData.station),
        dutyRole: formData.dutyRole === "Others" ? manualDutyRole : formData.dutyRole,
      });
      router.push("/admin-employees");
    } catch (error) {
      console.error("Error creating admin employee:", error);
      alert("Failed to create admin employee");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <h1 className="mb-6 text-3xl font-bold text-slate-100">Add New Admin Employee</h1>

      <form
        onSubmit={handleSubmit}
        className="rounded-lg bg-dark-card border border-dark-border p-6 shadow-lg"
      >
        <h2 className="mb-4 text-xl font-semibold text-slate-100">
          Admin Employee Details
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {/* Name */}
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

          {/* Email */}
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

          {/* Mobile 1 */}
          <div>
            <label className="block text-sm font-medium text-slate-400">
              Mobile 1 *
            </label>
            <input
              type="tel"
              required
              value={formData.mobile1}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, "").slice(0, 10);
                setFormData({ ...formData, mobile1: value });
              }}
              className="mt-1 block w-full rounded-md bg-dark-sidebar border border-dark-border px-3 py-2 text-slate-100 placeholder-slate-400 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-400/50"
            />
          </div>

          {/* Mobile 2 */}
          <div>
            <label className="block text-sm font-medium text-slate-400">
              Mobile 2 (Optional)
            </label>
            <input
              type="tel"
              value={formData.mobile2}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, "").slice(0, 10);
                setFormData({ ...formData, mobile2: value });
              }}
              className="mt-1 block w-full rounded-md bg-dark-sidebar border border-dark-border px-3 py-2 text-slate-100 placeholder-slate-400 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-400/50"
            />
          </div>

          {/* Landline */}
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

          {/* Landline 2 */}
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

          {/* Unit */}
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

          {/* Duty Role */}
          <div>
            <label className="block text-sm font-medium text-slate-400">
              Duty Role (e.g. Writer, Court)
            </label>
            <select
              value={formData.dutyRole}
              onChange={(e) =>
                setFormData({ ...formData, dutyRole: e.target.value })
              }
              className="mt-1 block w-full rounded-md bg-dark-sidebar border border-dark-border px-3 py-2 text-slate-100 placeholder-slate-400 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-400/50"
            >
              <option value="">Select Duty Role (Optional)</option>
              {filteredDutyRoles.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </div>

          {formData.dutyRole === "Others" && (
            <div>
              <label className="block text-sm font-medium text-slate-400">
                Specify Duty Role *
              </label>
              <input
                type="text"
                required
                value={manualDutyRole}
                onChange={(e) => setManualDutyRole(e.target.value)}
                className="mt-1 block w-full rounded-md bg-dark-sidebar border border-dark-border px-3 py-2 text-slate-100 placeholder-slate-400 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-400/50 font-bold"
                placeholder="Enter duty role"
              />
            </div>
          )}

          {/* KGID, Rank, Metal Number */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3 col-span-1 md:col-span-2 lg:grid-cols-3">
            {formData.unit !== "IPS" && (
              <div className="md:col-span-1">
                <label className="block text-sm font-medium text-slate-400">
                  KGID *
                </label>
                <input
                  type="text"
                  required
                  value={formData.kgid}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, "");
                    setFormData({ ...formData, kgid: value });
                  }}
                  className="mt-1 block w-full rounded-md bg-dark-sidebar border border-dark-border px-3 py-2 text-slate-100 placeholder-slate-400 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-400/50"
                />
              </div>
            )}

            <div className="md:col-span-1">
              <label className="block text-sm font-medium text-slate-400">
                Rank *
              </label>
              <select
                required
                value={formData.rank}
                onChange={(e) => {
                  const newRank = e.target.value;
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
              </div>
            )}
          </div>

          {/* District Selector */}
          {(() => {
            const selectedUnit = units.find(u => u.name === formData.unit);
            const mappingType = selectedUnit?.mappingType || "all";
            const hideDistrict = mappingType === "state" || mappingType === "none" || isSpecialUnit;
            const isBattalion = selectedUnit?.mappedAreaType === "BATTALION";
            const isStateScope = selectedUnit?.scopes?.includes("state") || selectedUnit?.scopes?.includes("hq") || false;

            if (isHighRanking || hideDistrict) return null;

            let availableDistricts = [...districts];
            const mappedIds = selectedUnit?.mappedAreaIds || selectedUnit?.mappedDistricts || [];

            if (mappingType === "single" || mappingType === "subset" || mappingType === "commissionerate") {
              if (mappedIds.length > 0) {
                if (isBattalion) {
                  availableDistricts = mappedIds.map(name => ({ id: name, name } as District));
                } else {
                  availableDistricts = districts.filter(d => mappedIds.includes(d.name));
                }
              }
            }

            const isHqLevel = selectedUnit?.isHqLevel || false;
            const isDistrictLevelVal = selectedUnit?.isDistrictLevel || false;
            const showUnitHq = (isStateScope) || (hasSections) || isHqLevel || (isDistrictLevelVal);

            if (showUnitHq) {
              const alreadyHasHq = availableDistricts.some(d =>
                (d.name || "").match(/^(HQ|UNIT_HQ)$/i) || (d.value || "").match(/^(HQ|UNIT_HQ)$/i)
              );
              if (!alreadyHasHq) {
                availableDistricts = [{ id: "UNIT_HQ", name: "HQ", value: UNIT_HQ_VALUE } as District, ...availableDistricts];
              }
            }

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
                  {formData.district === UNIT_HQ_VALUE ? "HQ" : (isBattalion || isKSRP ? "Battalion *" : "District / HQ *")}
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
                  <option value="">{isBattalion || isKSRP ? "Select Battalion" : "Select District / HQ"}</option>
                  {availableDistricts.map((d) => (
                    <option key={d.id} value={d.value || d.name}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
            );
          })()}

          {/* Station Selector */}
          {(() => {
            const selectedUnit = units.find(u => u.name === formData.unit);
            const mappingType = selectedUnit?.mappingType || "all";
            const isDistrictLevel = selectedUnit?.isDistrictLevel || false;
            const hideStation = isHighRanking || isKSRP || isMinisterial || (isDistrictLevel && !hasSections) || mappingType === "state" || mappingType === "none" || isSpecialUnit;

            if (hideStation) return null;

            return (
              <div>
                <label className="block text-sm font-medium text-slate-400"> Station / Section * </label>
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
                    {(hasSections && (formData.district === UNIT_HQ_VALUE)) ? "Select Station / Section" : (selectedDistrict ? "Select Station / Section" : "Select District First")}
                  </option>
                  {(hasSections && (formData.district === UNIT_HQ_VALUE)) ? (
                    ["Others"].map((section) => (
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

          {/* Blood Group */}
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

          {/* Photo URL */}
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

          {/* Gender */}
          <div>
            <label className="block text-sm font-medium text-slate-400">
              Gender
            </label>
            <select
              value={formData.gender}
              onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
              className="mt-1 block w-full rounded-md bg-dark-sidebar border border-dark-border px-3 py-2 text-slate-100 placeholder-slate-400 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-400/50"
            >
              <option value="">Select Gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {/* Subsection */}
          <div>
            <label className="block text-sm font-medium text-slate-400">
              Subsection (Optional)
            </label>
            <input
              type="text"
              value={formData.subSection}
              onChange={(e) => setFormData({ ...formData, subSection: e.target.value })}
              className="mt-1 block w-full rounded-md bg-dark-sidebar border border-dark-border px-3 py-2 text-slate-100 placeholder-slate-400 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-400/50"
              placeholder="e.g. Accounts, Admin"
            />
          </div>
        </div>

        {/* Checkboxes */}
        <div className="mt-6 flex gap-6" >
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
        </div>

        <div className="mt-6 flex gap-4">
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-primary-600 px-6 py-2 text-white transition-colors hover:bg-primary-700 disabled:opacity-50"
          >
            {loading ? "Saving..." : "Create Admin Employee"}
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
