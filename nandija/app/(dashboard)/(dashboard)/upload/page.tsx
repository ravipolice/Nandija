"use client";

import { useState } from "react";
import { createEmployee, createOfficer } from "@/lib/firebase/firestore";
import Papa from "papaparse";
import { Upload, FileText, Users, Shield, Download } from "lucide-react";

interface EmployeeCSVRow {
  kgid: string;
  name: string;
  email?: string;
  mobile1: string;
  mobile2?: string;
  rank?: string;
  metalNumber?: string;
  district: string;
  station: string;
  bloodGroup?: string;
  photoUrl?: string;
  isAdmin?: string;
  isApproved?: string;
  unit?: string;
  landline?: string;
  landline2?: string;
}

interface OfficerCSVRow {
  agid: string;
  name: string;
  mobile: string;
  landline?: string;
  rank?: string;
  station: string;
  district: string;
  email?: string;
  photoUrl?: string;
  unit?: string;
  mobile2?: string;
  landline2?: string;
}

type UploadType = "employee" | "officer";

export default function UploadPage() {
  const [uploadType, setUploadType] = useState<UploadType>("employee");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<{
    success: number;
    failed: number;
    errors: string[];
  } | null>(null);

  const handleEmployeeUpload = async (rows: EmployeeCSVRow[]) => {
    let success = 0;
    let failed = 0;
    const errors: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        const missingFields = [];
        if (!row.kgid) missingFields.push("kgid");
        if (!row.name) missingFields.push("name");
        if (!row.district) missingFields.push("district");
        if (!row.station) missingFields.push("station");

        if (missingFields.length > 0) {
          failed++;
          errors.push(`Row ${i + 2}: Missing required fields: ${missingFields.join(", ")}`);
          continue;
        }

        await createEmployee({
          kgid: row.kgid.trim(),
          name: row.name.trim(),
          email: row.email?.trim() || "",
          mobile1: row.mobile1.trim(),
          mobile2: row.mobile2?.trim() || "",
          rank: row.rank?.trim() || "",
          metalNumber: row.metalNumber?.trim() || "",
          district: row.district.trim(),
          station: row.station.trim(),
          bloodGroup: row.bloodGroup?.trim() || "",
          photoUrl: row.photoUrl?.trim() || "",
          isAdmin: row.isAdmin?.toLowerCase() === "true",
          isApproved: row.isApproved?.toLowerCase() !== "false",
          unit: row.unit?.trim() || "",
          landline: row.landline?.trim() || "",
          landline2: row.landline2?.trim() || "",
        });

        success++;
      } catch (error: any) {
        failed++;
        errors.push(`Row ${i + 2}: ${error.message || "Unknown error"}`);
      }

      setProgress(Math.round(((i + 1) / rows.length) * 100));
    }

    return { success, failed, errors };
  };

  const handleOfficerUpload = async (rows: OfficerCSVRow[]) => {
    let success = 0;
    let failed = 0;
    const errors: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        const missingFields = [];
        if (!row.agid) missingFields.push("agid");
        if (!row.name) missingFields.push("name");
        if (!row.district) missingFields.push("district");
        // Station/Office is optional for officers

        if (missingFields.length > 0) {
          failed++;
          errors.push(`Row ${i + 2}: Missing required fields: ${missingFields.join(", ")}`);
          continue;
        }

        await createOfficer({
          agid: row.agid.trim(), // Correctly passing agid
          rank: row.rank?.trim() || "",
          name: row.name.trim(),
          mobile: row.mobile.trim(),
          email: row.email?.trim() || "",
          district: row.district.trim(),
          office: row.station.trim(),
          unit: row.unit?.trim() || "",
          mobile2: row.mobile2?.trim() || "",
          landline: row.landline?.trim() || "",
          landline2: row.landline2?.trim() || "",
        });

        success++;
      } catch (error: any) {
        failed++;
        errors.push(`Row ${i + 2}: ${error.message || "Unknown error"}`);
      }

      setProgress(Math.round(((i + 1) / rows.length) * 100));
    }

    return { success, failed, errors };
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setProgress(0);
    setResults(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (parseResults) => {
        try {
          console.log("Parsed CSV Data:", parseResults.data[0]); // Debug log
          console.log("Parsed CSV Meta:", parseResults.meta); // Debug log
          let uploadResults;

          // Helper to normalize keys (lowercase, trim, strip BOM) and filter empty rows
          const normalizeData = (data: any[]) => {
            if (!data || data.length === 0) return [];

            // Get headers from first row to create a mapping
            const firstRow = data[0];
            const headerMap: Record<string, string> = {};

            Object.keys(firstRow).forEach(key => {
              // Remove BOM, trim, lower case
              // eslint-disable-next-line no-control-regex
              let cleanKey = key.replace(/^\ufeff/, '').trim().toLowerCase();
              // Handle potential double quotes in headers
              cleanKey = cleanKey.replace(/^"|"$/g, '');
              headerMap[key] = cleanKey;
            });

            console.log("Header Mapping:", headerMap); // Debug log

            return data.map((row) => {
              const normalized: any = {};
              Object.keys(row).forEach(key => {
                const cleanKey = headerMap[key];
                if (cleanKey) {
                  normalized[cleanKey] = row[key]?.trim() || "";
                }
              });
              return normalized;
            }).filter(row => Object.values(row).some(val => val !== "")); // Filter completely empty rows
          };

          if (uploadType === "employee") {
            const rawData = parseResults.data as any[];
            const normalizedData = normalizeData(rawData);
            // Remap keys to match interface if needed, or rely on lowercase check in handleEmployeeUpload
            // Since our interfaces use specific casing (e.g. photoUrl), we might need to map back or adjust handle functions.
            // Let's adjust handle functions to be robust or map here.

            // Map with aliases
            const mappedRows = normalizedData.map((row: any) => ({
              kgid: row.kgid || row.kgid_no || row.id || "",
              name: row.name || row.employee_name || row.emp_name || "",
              email: row.email || row.email_id || "",
              mobile1: row.mobile1 || row.mobile || row.phone || row.phone_number || "",
              mobile2: row.mobile2 || row.alt_mobile || "",
              rank: row.rank || row.designation || "",
              metalNumber: row.metalnumber || row.metal_number || row.badge_number || "",
              district: row.district || row.place || row.unit_name || "",
              station: row.station || row.police_station || row.ps || "",
              bloodGroup: row.bloodgroup || row.blood_group || "",
              photoUrl: row.photourl || row.photo_url || row.photo || "",
              isAdmin: row.isadmin || "false",
              isApproved: row.isapproved || "true",
              unit: row.unit || "",
              landline: row.landline || "",
              landline2: row.landline2 || "",
            })) as EmployeeCSVRow[];

            uploadResults = await handleEmployeeUpload(mappedRows);
          } else {
            const rawData = parseResults.data as any[];
            const normalizedData = normalizeData(rawData);

            // Map with aliases
            const mappedRows = normalizedData.map((row: any) => ({
              agid: row.agid || row.id || row.officer_id || "",
              name: row.name || row.officer_name || "",
              mobile: row.mobile || row.mobile_number || row.phone || "",
              landline: row.landline || row.landline_number || "",
              rank: row.rank || row.designation || "",
              station: row.station || row.office || row.place || "",
              district: row.district || "",
              email: row.email || row.email_id || "",
              photoUrl: row.photourl || row.photo_url || row.photo || "",
              unit: row.unit || "",
              mobile2: row.mobile2 || row.alt_mobile || "",
              landline2: row.landline2 || "",
            })) as OfficerCSVRow[];

            uploadResults = await handleOfficerUpload(mappedRows);
          }

          setResults(uploadResults);
        } catch (error) {
          console.error("Upload error:", error);
          setResults({
            success: 0,
            failed: 0,
            errors: [`Upload failed: ${error}`],
          });
        } finally {
          setLoading(false);
        }
      },
      error: (error) => {
        console.error("CSV parsing error:", error);
        alert("Failed to parse CSV file");
        setLoading(false);
      },
    });
  };

  return (
    <div className="p-6">
      <h1 className="mb-6 text-3xl font-bold text-gray-900">CSV Upload</h1>

      <div className="mb-6 flex gap-4">
        <button
          onClick={() => setUploadType("employee")}
          className={`flex items-center gap-2 rounded-lg px-6 py-3 font-medium transition-colors ${uploadType === "employee"
            ? "bg-primary-600 text-white"
            : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
        >
          <Users className="h-5 w-5" />
          Upload Employees
        </button>
        <button
          onClick={() => setUploadType("officer")}
          className={`flex items-center gap-2 rounded-lg px-6 py-3 font-medium transition-colors ${uploadType === "officer"
            ? "bg-primary-600 text-white"
            : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
        >
          <Shield className="h-5 w-5" />
          Upload Officers
        </button>
      </div>

      <div className="rounded-lg bg-white p-6 shadow-md">
        <div className="mb-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="mb-2 text-xl font-semibold">
                Upload {uploadType === "employee" ? "Employee" : "Officer"} CSV
              </h2>
              <p className="text-sm text-gray-600">
                {uploadType === "employee"
                  ? "Upload a CSV file with employee data. Required columns: kgid, name, mobile1, district, station"
                  : "Upload a CSV file with officer data. Required columns: agid, name, mobile, district, station"}
              </p>
            </div>
            <a
              href={`/templates/${uploadType === "employee" ? "employee_template.csv" : "officer_template.csv"}`}
              download
              className="flex items-center gap-2 rounded-lg border border-primary-600 bg-white px-4 py-2 text-primary-600 transition-colors hover:bg-primary-50"
            >
              <Download className="h-5 w-5" />
              Download Template
            </a>
          </div>
        </div>

        <div className="mb-6">
          <label className="flex cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-gray-300 p-8 transition-colors hover:border-primary-500">
            <div className="text-center">
              <Upload className="mx-auto h-12 w-12 text-gray-400" />
              <span className="mt-2 block text-sm font-medium text-gray-700">
                {loading ? "Uploading..." : "Choose CSV file"}
              </span>
              <span className="mt-1 block text-xs text-gray-500">
                CSV files only
              </span>
            </div>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              disabled={loading}
              className="hidden"
            />
          </label>
        </div>

        {loading && (
          <div className="mb-6">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span>Uploading...</span>
              <span>{progress}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
              <div
                className="h-full bg-primary-600 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {results && (
          <div className="rounded-lg border p-4">
            <h3 className="mb-3 font-semibold">Upload Results</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="font-medium text-green-600">
                  Success: {results.success}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-red-600">
                  Failed: {results.failed}
                </span>
              </div>
              {results.errors.length > 0 && (
                <div className="mt-4">
                  <h4 className="mb-2 font-medium">Errors:</h4>
                  <div className="max-h-48 overflow-y-auto rounded bg-gray-50 p-2">
                    {results.errors.slice(0, 10).map((error, i) => (
                      <div key={i} className="text-xs text-red-600">
                        {error}
                      </div>
                    ))}
                    {results.errors.length > 10 && (
                      <div className="mt-2 text-xs text-gray-500">
                        ... and {results.errors.length - 10} more errors
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="mt-6 rounded-lg bg-gray-50 p-4">
          <h3 className="mb-2 flex items-center gap-2 font-semibold">
            <FileText className="h-5 w-5" />
            CSV Format - {uploadType === "employee" ? "Employees" : "Officers"}
          </h3>
          {uploadType === "employee" ? (
            <>
              <p className="mb-2 text-sm text-gray-600">
                Required columns: <code className="rounded bg-white px-1">kgid</code>,{" "}
                <code className="rounded bg-white px-1">name</code>,{" "}
                <code className="rounded bg-white px-1">district</code>,{" "}
                <code className="rounded bg-white px-1">station</code>
              </p>
              <p className="text-sm text-gray-600">
                Optional columns: email, mobile1, mobile2, rank, metalNumber, bloodGroup,
                photoUrl, isAdmin, isApproved, unit, landline, landline2
              </p>
            </>
          ) : (
            <>
              <p className="mb-2 text-sm text-gray-600">
                Required columns: <code className="rounded bg-white px-1">agid</code>,{" "}
                <code className="rounded bg-white px-1">name</code>,{" "}
                <code className="rounded bg-white px-1">district</code>,{" "}
                <code className="rounded bg-white px-1">station</code>
              </p>
              <p className="text-sm text-gray-600">
                Optional columns: mobile, landline, rank, email, photoUrl, unit, mobile2, landline2
              </p>
              <div className="mt-3 rounded bg-blue-50 p-3 text-xs text-blue-800">
                <strong>Note:</strong> The <code>station</code> column will be saved as the officer&apos;s <code>office</code> field.
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

