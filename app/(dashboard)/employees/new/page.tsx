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
} from "@/lib/firebase/firestore";
import { BLOOD_GROUPS } from "@/lib/constants";

export default function NewEmployeePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [districts, setDistricts] = useState<District[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [ranks, setRanks] = useState<Rank[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
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

    // Validate mobile number format
    if (formData.mobile1 && formData.mobile1.length !== 10) {
      alert("Mobile number must be 10 digits");
      return;
    }

    setLoading(true);

    try {
      await createEmployee({
        ...formData,
        mobile2: formData.mobile2,
        landline: formData.landline,
        landline2: formData.landline2,
        unit: formData.unit,
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

          {/* Row 5: KGID, Rank, Metal Number */}
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
                {ranks.map((rank) => (
                  <option key={rank.rank_id} value={rank.equivalent_rank || rank.rank_id}>
                    {rank.rank_id}
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

          {/* Row 6: District */}
          <div>
            <label className="block text-sm font-medium text-slate-400">
              District *
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
              <option value="">Select District</option>
              {districts.map((d) => (
                <option key={d.id} value={d.name}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          {/* Row 7: Station */}
          <div>
            <label className="block text-sm font-medium text-slate-400">
              Station *
            </label>
            <select
              required
              value={formData.station}
              onChange={(e) =>
                setFormData({ ...formData, station: e.target.value })
              }
              disabled={!selectedDistrict}
              className="mt-1 block w-full rounded-md bg-dark-sidebar border border-dark-border px-3 py-2 text-slate-100 placeholder-slate-400 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-400/50 disabled:bg-dark-accent-light disabled:text-slate-500"
            >
              <option value="">
                {selectedDistrict ? "Select Station" : "Select District First"}
              </option>
              {stations.map((s) => (
                <option key={s.id} value={s.name}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Row 8: Unit */}
          <div>
            <label className="block text-sm font-medium text-slate-400">
              Unit (Optional)
            </label>
            <select
              value={formData.unit}
              onChange={(e) =>
                setFormData({ ...formData, unit: e.target.value })
              }
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

          {/* Row 9: Blood Group */}
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
        <div className="mt-6 flex gap-6">
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
      </form>
    </div>
  );
}
