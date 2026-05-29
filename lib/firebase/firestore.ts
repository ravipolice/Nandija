import { collection, doc, getDoc, getDocs, addDoc, setDoc, updateDoc, deleteDoc, query, where, orderBy, Timestamp, QueryConstraint } from "firebase/firestore";
import { ref, deleteObject } from "firebase/storage";
import { db, storage } from "./config";

// Types
export interface Employee {
  id?: string;
  kgid: string;
  name: string;
  email?: string;
  mobile1: string;
  mobile2?: string;
  rank?: string;
  metalNumber?: string;
  displayRank?: string; // Computed: rank + " " + metalNumber (if metalNumber exists)
  district: string;
  station: string;
  bloodGroup?: string;
  photoUrl?: string;
  photoUrlFromGoogle?: string;
  fcmToken?: string;
  firebaseUid?: string;
  isAdmin?: boolean;
  isApproved?: boolean;
  pin?: string;
  landline?: string;
  landline2?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  unit?: string;
  isHidden?: boolean;
  gender?: string;
  dateOfBirth?: any;
  serviceStartDate?: any;
  dutyRole?: string; // New: Unit-scoped duty role
}

export interface AdminEmployee {
  id?: string;
  kgid: string;
  name: string;
  email?: string;
  mobile1?: string;
  mobile2?: string;
  rank?: string;
  metalNumber?: string;
  displayRank?: string;
  district?: string;
  station?: string;
  bloodGroup?: string;
  photoUrl?: string;
  photoUrlFromGoogle?: string;
  isAdmin?: boolean;
  isApproved?: boolean;
  unit?: string;
  landline?: string;
  landline2?: string;
  gender?: string;
  subSection?: string;
  dutyRole?: string;
  isManualStation?: boolean;
  isManualSubSection?: boolean;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}


export interface Officer {
  id?: string;
  agid?: string; // Auto-generated ID (from cfd field)
  cfd?: string; // Source field for agid
  rank: string;
  name: string;
  mobile: string;
  mobile2?: string;
  email?: string;
  landline?: string;
  landline2?: string;
  photoUrl?: string;
  district: string;
  office?: string;
  unit?: string;
  dutyRole?: string; // New: Unit-scoped duty role
  bloodGroup?: string;
  createdAt?: Timestamp;
  isHidden?: boolean;
}

export interface District {
  id?: string;
  name: string;
  value?: string; // For reserved values like __UNIT_HQ__
  range?: string;
  shortCode?: string; // 3-digit short code (e.g., "BLR", "MYS")
  isActive?: boolean;
  createdAt?: Timestamp;
}

export interface Station {
  id?: string;
  name: string;
  district: string;
  stdCode?: string;
  isActive?: boolean;
  createdAt?: Timestamp;
}

export interface Unit {
  id?: string;
  name: string;
  isActive?: boolean;
  // New fields for Hybrid Unit-District Mapping
  mappingType?: "all" | "state" | "single" | "subset" | "none" | "commissionerate";
  scopes?: string[]; // Multi-scope selection
  mappedDistricts?: string[]; // Legacy field
  mappedAreaType?: "BATTALION" | "DISTRICT" | "CITY" | "RANGE" | "HQ";
  mappedAreaIds?: string[];
  applicableRanks?: string[]; // List of rank_ids allowed for this unit
  dutyRoles?: string[]; // New: List of duty roles allowed for this unit
  isDistrictLevel?: boolean; // New: If true, unit exists at District HQ (no station required)
  isHqLevel?: boolean; // New: If true, unit exists at HQ level
  stationKeyword?: string; // New: For dynamic filtering (e.g. "DCRB", "ESCOM")
  hideFromRegistration?: boolean; // New: If true, unit is hidden from registration form
  hiddenFields?: string[]; // New: List of fields to hide for this unit (e.g. "dateOfAppointment", "gender")
  createdAt?: Timestamp;
}

export interface Rank {
  rank_id: string; // Document ID (IMMUTABLE, e.g., "DG_IGP", "DSP", "PSI")
  rank_label: string; // Display name (e.g., "Director General & Inspector General of Police")
  staffType: "POLICE" | "MINISTERIAL"; // Cadre type
  category: string; // DISTRICT | COMMISSIONERATE | BOTH
  equivalent_rank: string; // Normalization (ACP → DSP)
  seniority_order: number; // Hierarchy order (1 = highest)
  aliases: string[]; // Text variants (DYSP, PSIW, WPSI)
  requiresMetalNumber: boolean; // True if metal number mandatory
  isActive: boolean; // Soft enable/disable
  remarks?: string; // Optional admin notes
  createdAt?: Timestamp; // serverTimestamp()
  updatedAt?: Timestamp; // serverTimestamp()
}

export interface PendingRegistration {
  id?: string;
  kgid: string;
  email: string;
  name: string;
  mobile1: string;
  mobile2?: string;
  rank?: string;
  district: string;
  unit?: string;
  station: string;
  pin: string;
  metalNumber?: string;
  bloodGroup?: string;
  landline?: string;
  landline2?: string;
  photoUrl?: string;
  photoUrlFromGoogle?: string;
  firebaseUid?: string;
  status?: "pending" | "approved" | "rejected";
  gender?: string;
  dateOfBirth?: any;
  serviceStartDate?: any;
  dutyRole?: string; // New: Selected duty role
  createdAt?: Timestamp;
  viewedByAdmin?: boolean;
  isAdmin?: boolean;
}

export interface NotificationQueue {
  id?: string;
  title: string;
  body: string;
  targetType: "SINGLE" | "STATION" | "DISTRICT" | "ADMIN" | "ALL";
  targetKgid?: string;
  targetDistrict?: string;
  targetStation?: string;
  status?: string;
  sentCount?: number;
  failedCount?: number;
  createdAt?: Timestamp;
}

export interface Document {
  id?: string;
  // Support both field name formats (admin panel and mobile app)
  name?: string;
  title?: string; // Mobile app format
  url: string;
  URL?: string; // Mobile app format
  type?: string;
  fileType?: string; // Mobile app format
  category?: string; // Mobile app format
  description?: string; // Mobile app format
  uploadedBy?: string; // Mobile app format
  uploadedDate?: string; // Mobile app format
  fileId?: string; // Mobile app format
  size?: number;
  createdAt?: Timestamp;
  // Helper to get the display name
  getDisplayName?: () => string;
  // Helper to get the display URL
  getDisplayUrl?: () => string;
  // Helper to get the display type
  getDisplayType?: () => string;
}

export interface GalleryImage {
  id?: string;
  imageUrl: string;
  title?: string;
  createdAt?: Timestamp;
  source?: 'firebase' | 'gdrive';
  storagePath?: string;
}

export interface UsefulLink {
  id?: string;
  name: string;
  playStoreUrl?: string;
  apkUrl?: string;
  iconUrl?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface AppConfig {
  id?: string;
  playStoreUrl?: string;
  apkUrl?: string;
  apkSize?: string;
  apkVersion?: string;
  updatedAt?: Timestamp;
}

// Generic CRUD functions
const sanitizeData = (data: any) => {
  const payload = { ...data };
  Object.keys(payload).forEach((key) => {
    if (payload[key] === undefined) {
      delete payload[key];
    }
  });
  return payload;
};

const createDoc = async <T>(
  collectionName: string,
  data: Omit<T, "id">
): Promise<string> => {
  if (typeof window === "undefined" || !db) {
    throw new Error("Firestore not initialized (server-side or not available)");
  }
  const cleanData = sanitizeData({
    ...data,
    createdAt: Timestamp.now(),
  });
  try {
    const docRef = await addDoc(collection(db, collectionName), cleanData);
    return docRef.id;
  } catch (error: any) {
    console.error(`❌ Firestore CREATE error in [${collectionName}]:`, error.message);
    throw error;
  }
};

export const getDocument = async <T>(
  collectionName: string,
  id: string
): Promise<T | null> => {
  if (typeof window === "undefined" || !db) {
    console.warn("Firestore not initialized (server-side or not available)");
    return null;
  }
  const docRef = doc(db, collectionName, id);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as T;
  }
  return null;
};

export const getDocuments = async <T>(
  collectionName: string,
  constraints: QueryConstraint[] = []
): Promise<T[]> => {
  if (typeof window === "undefined" || !db) {
    console.warn("Firestore not initialized (server-side or not available)");
    return [];
  }
  const q = query(collection(db, collectionName), ...constraints);
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(
    (doc) => ({ id: doc.id, ...doc.data() } as T)
  );
};

export const updateDocument = async <T>(
  collectionName: string,
  id: string,
  data: Partial<T>
): Promise<void> => {
  if (typeof window === "undefined" || !db) {
    throw new Error("Firestore not initialized (server-side or not available)");
  }
  try {
    const docRef = doc(db, collectionName, id);
    const cleanData = sanitizeData({
      ...data,
      updatedAt: Timestamp.now(),
    });
    await updateDoc(docRef, cleanData);
  } catch (error: any) {
    console.error(`❌ Firestore UPDATE error in [${collectionName}] for ID [${id}]:`, error.message);
    throw error;
  }
};

export const deleteDocument = async (
  collectionName: string,
  id: string
): Promise<void> => {
  if (typeof window === "undefined" || !db) {
    throw new Error("Firestore not initialized (server-side or not available)");
  }
  const docRef = doc(db, collectionName, id);
  await deleteDoc(docRef);
};

// Helpers
const sanitizeRankPayload = (data: Partial<Rank>) => {
  const payload: any = { ...data };
  // Firestore does not allow undefined
  Object.keys(payload).forEach((key) => {
    if (payload[key] === undefined) {
      delete payload[key];
    }
  });
  // Normalize aliases
  if (!payload.aliases) {
    payload.aliases = [];
  }
  // Default staffType
  if (!payload.staffType) {
    payload.staffType = "POLICE";
  }
  // If ministerial, force no equivalent_rank requirement and no metal number
  if (payload.staffType === "MINISTERIAL") {
    payload.equivalent_rank = payload.equivalent_rank ?? "";
    payload.requiresMetalNumber = false;
  }
  // Normalize remarks: remove empty string -> null
  if (payload.remarks === "") {
    payload.remarks = null;
  }
  return payload;
};

// Employee functions
export const getEmployees = async (): Promise<Employee[]> => {
  const employees = await getDocuments<Employee>("employees", [orderBy("name")]);

  // Remove duplicates based on kgid (primary key)
  // Keep the first occurrence of each kgid
  const uniqueEmployees = new Map<string, Employee>();
  employees.forEach(employee => {
    const kgid = employee.kgid?.trim().toLowerCase();
    if (kgid && !uniqueEmployees.has(kgid)) {
      uniqueEmployees.set(kgid, employee);
    } else if (kgid) {
      console.warn(`Duplicate employee found with kgid: ${employee.kgid}. Keeping first occurrence.`);
    }
  });

  const deduplicatedEmployees = Array.from(uniqueEmployees.values());

  // Normalize photo URLs for better image loading
  return deduplicatedEmployees.map(employee => {
    if (employee.photoUrl || employee.photoUrlFromGoogle) {
      const photoUrl = employee.photoUrl || employee.photoUrlFromGoogle || "";
      // Normalize Google Drive URLs to use CDN for better performance
      if (photoUrl.includes("drive.google.com")) {
        let fileId: string | null = null;

        // Extract file ID from various URL formats
        const match1 = photoUrl.match(/[?&]id=([-\w]{25,})/);
        if (match1) fileId = match1[1];

        if (!fileId) {
          const match2 = photoUrl.match(/\/file\/d\/([-\w]{25,})/);
          if (match2) fileId = match2[1];
        }

        // Convert to Google Image CDN if we found a file ID
        if (fileId && !photoUrl.includes("lh3.googleusercontent.com")) {
          return {
            ...employee,
            photoUrl: `https://lh3.googleusercontent.com/d/${fileId}`,
            photoUrlFromGoogle: employee.photoUrlFromGoogle ? `https://lh3.googleusercontent.com/d/${fileId}` : undefined,
          };
        }
      }
    }
    return employee;
  });
};

export const getEmployee = async (id: string): Promise<Employee | null> => {
  return getDocument<Employee>("employees", id);
};

export const createEmployee = async (data: Omit<Employee, "id">): Promise<string> => {
  if (typeof window === "undefined" || !db) {
    throw new Error("Firestore not initialized (server-side or not available)");
  }

  // Use provided KGID or empty string (disable auto-generation per user request)
  const kgid = data.kgid?.trim() || "";

  // 1. Check if employee with same KGID already exists
  let existingDocs: any = { empty: true };
  if (kgid) {
    const existingQuery = query(
      collection(db, "employees"),
      where("kgid", "==", kgid)
    );
    existingDocs = await getDocs(existingQuery);
  }

  // 2. Secondary Check: If no KGID match (or KGID is empty) and we have a valid mobile number (not "NM"), check by mobile
  const mobile1 = data.mobile1?.trim().toUpperCase();
  if (existingDocs.empty && mobile1 && mobile1 !== "NM") {
    const mobileQuery = query(
      collection(db, "employees"),
      where("mobile1", "==", mobile1)
    );
    existingDocs = await getDocs(mobileQuery);
  }

  // Compute displayRank: rank + " " + metalNumber (if both exist)
  const displayRank = data.rank && data.metalNumber
    ? `${data.rank} ${data.metalNumber}`
    : data.rank || undefined;

  const payload = {
    ...data,
    kgid,
    displayRank,
    updatedAt: Timestamp.now(),
  };

  if (!existingDocs.empty) {
    // Upsert: Update existing document
    const docId = existingDocs.docs[0].id;
    const existingData = existingDocs.docs[0].data() as Employee;

    console.log(`Upserting employee matching ${existingData.kgid === kgid ? 'KGID' : 'Mobile'}: ${kgid} (ID: ${docId})`);

    // Use existing KGID if we matched by mobile and the new one is missing or auto-generated
    if (existingData.kgid && (!kgid || kgid.startsWith("TEMP_"))) {
      payload.kgid = existingData.kgid;
    }

    await updateDoc(doc(db, "employees", docId), sanitizeData(payload));
    return docId;
  }

  // Create new document
  return createDoc<Employee>("employees", payload);
};

export const updateEmployee = async (
  id: string,
  data: Partial<Employee>
): Promise<void> => {
  // Recompute displayRank if rank or metalNumber is being updated
  let updateData = { ...data };
  if (data.rank !== undefined || data.metalNumber !== undefined) {
    // Get current employee data to compute displayRank correctly
    const current = await getEmployee(id);
    const rank = data.rank ?? current?.rank;
    const metalNumber = data.metalNumber ?? current?.metalNumber;

    updateData.displayRank = rank && metalNumber
      ? `${rank} ${metalNumber}`
      : rank || undefined;
  }

  return updateDocument<Employee>("employees", id, updateData);
};

export const deleteEmployee = async (id: string): Promise<void> => {
  return deleteDocument("employees", id);
};

// Admin Employee functions
export const getAdminEmployees = async (): Promise<AdminEmployee[]> => {
  return getDocuments<AdminEmployee>("admin_employees", [orderBy("name")]);
};

export const getAdminEmployee = async (id: string): Promise<AdminEmployee | null> => {
  return getDocument<AdminEmployee>("admin_employees", id);
};

export const createAdminEmployee = async (data: Omit<AdminEmployee, "id">): Promise<string> => {
  if (typeof window === "undefined" || !db) {
    throw new Error("Firestore not initialized (server-side or not available)");
  }

  const kgid = data.kgid?.trim() || "";

  // 1. Check if admin employee with same KGID already exists
  let existingDocs: any = { empty: true };
  if (kgid) {
    const existingQuery = query(
      collection(db, "admin_employees"),
      where("kgid", "==", kgid)
    );
    existingDocs = await getDocs(existingQuery);
  }

  // 2. Secondary Check: If no KGID match (or KGID is empty) and we have a valid mobile number (not "NM"), check by mobile
  const mobile1 = data.mobile1?.trim().toUpperCase();
  if (existingDocs.empty && mobile1 && mobile1 !== "NM") {
    const mobileQuery = query(
      collection(db, "admin_employees"),
      where("mobile1", "==", mobile1)
    );
    existingDocs = await getDocs(mobileQuery);
  }

  // Compute displayRank: rank + " " + metalNumber (if both exist)
  const displayRank = data.rank && data.metalNumber
    ? `${data.rank} ${data.metalNumber}`
    : data.rank || undefined;

  const payload = {
    ...data,
    kgid,
    displayRank,
    updatedAt: Timestamp.now(),
  };

  if (!existingDocs.empty) {
    // Upsert: Update existing document
    const docId = existingDocs.docs[0].id;
    const existingData = existingDocs.docs[0].data() as AdminEmployee;

    console.log(`Upserting admin employee matching ${existingData.kgid === kgid ? 'KGID' : 'Mobile'}: ${kgid} (ID: ${docId})`);

    if (existingData.kgid && !kgid) {
      payload.kgid = existingData.kgid;
    }

    await updateDoc(doc(db, "admin_employees", docId), sanitizeData(payload));
    return docId;
  }

  // Create new document. If kgid is provided, use it as the document ID!
  if (kgid) {
    const cleanData = sanitizeData({
      ...payload,
      createdAt: Timestamp.now(),
    });
    await setDoc(doc(db, "admin_employees", kgid), cleanData);
    return kgid;
  } else {
    return createDoc<AdminEmployee>("admin_employees", payload);
  }
};

export const updateAdminEmployee = async (
  id: string,
  data: Partial<AdminEmployee>
): Promise<void> => {
  let updateData = { ...data };
  if (data.rank !== undefined || data.metalNumber !== undefined) {
    const current = await getAdminEmployee(id);
    const rank = data.rank ?? current?.rank;
    const metalNumber = data.metalNumber ?? current?.metalNumber;

    updateData.displayRank = rank && metalNumber
      ? `${rank} ${metalNumber}`
      : rank || undefined;
  }

  return updateDocument<AdminEmployee>("admin_employees", id, updateData);
};

export const deleteAdminEmployee = async (id: string): Promise<void> => {
  return deleteDocument("admin_employees", id);
};

// Officer functions
export const getOfficers = async (): Promise<Officer[]> => {
  const officers = await getDocuments<Officer>("officers", [orderBy("name")]);
  // Map cfd field to agid if cfd exists and agid doesn't
  // Map station field to office for backward compatibility
  return officers.map(officer => ({
    ...officer,
    agid: officer.agid || officer.cfd || undefined,
    office: (officer as any).station || officer.office,
  }));
};

export const getOfficer = async (id: string): Promise<Officer | null> => {
  const officer = await getDocument<Officer>("officers", id);
  if (!officer) return null;
  // Map station field to office for backward compatibility
  return {
    ...officer,
    office: (officer as any).station || officer.office,
  };
};

export const createOfficer = async (data: Omit<Officer, "id">): Promise<string> => {
  if (typeof window === "undefined" || !db) {
    throw new Error("Firestore not initialized (server-side or not available)");
  }

  // Auto-generate AGID if missing
  const agid = data.agid?.trim() || `OFF_${Math.random().toString(36).substring(2, 11).toUpperCase()}`;

  // 1. Check if officer with same AGID already exists
  const existingQuery = query(
    collection(db, "officers"),
    where("agid", "==", agid)
  );
  let existingDocs = await getDocs(existingQuery);

  // 2. Secondary Check: If no AGID match and we have a valid mobile number (not "NM"), check by mobile
  const mobile = data.mobile?.trim().toUpperCase();
  if (existingDocs.empty && mobile && mobile !== "NM") {
    const mobileQuery = query(
      collection(db, "officers"),
      where("mobile", "==", mobile)
    );
    existingDocs = await getDocs(mobileQuery);
  }

  if (!existingDocs.empty) {
    // Upsert: Update existing document
    const docId = existingDocs.docs[0].id;
    const existingData = existingDocs.docs[0].data() as Officer;

    console.log(`Upserting officer matching ${existingData.agid === agid ? 'AGID' : 'Mobile'}: ${agid} (ID: ${docId})`);

    // Use existing AGID if we matched by mobile and the new one was auto-generated
    let finalAgid = agid;
    if (existingData.agid && agid.startsWith("OFF_")) {
      finalAgid = existingData.agid;
    }

    // Update fields
    await updateDoc(doc(db, "officers", docId), sanitizeData({
      ...data,
      agid: finalAgid,
      updatedAt: Timestamp.now(),
    }));
    return docId;
  }

  return createDoc<Officer>("officers", {
    ...data,
    agid,
  });
};

export const updateOfficer = async (
  id: string,
  data: Partial<Officer>
): Promise<void> => {
  return updateDocument<Officer>("officers", id, data);
};

export const deleteOfficer = async (id: string): Promise<void> => {
  return deleteDocument("officers", id);
};

// District functions
export const getDistricts = async (): Promise<District[]> => {
  try {
    // Get all districts and sort client-side to avoid composite index requirement
    const allDistricts = await getDocuments<District>("districts", []);

    // Filter active districts and sort by name
    const activeDistricts = allDistricts
      .filter((d) => d.isActive !== false) // Include districts where isActive is true or undefined
      .sort((a, b) => (a.name || "").localeCompare(b.name || ""));

    // Helper to sort: HQ/Unit HQ first, then alphabetical
    const sortDistricts = (list: District[]) => {
      const hqItems = list.filter(d =>
        (d.name || "").match(/^(HQ|UNIT_HQ)$/i) || (d.value || "").match(/^(HQ|UNIT_HQ)$/i)
      );
      const otherItems = list.filter(d =>
        !((d.name || "").match(/^(HQ|UNIT_HQ)$/i) || (d.value || "").match(/^(HQ|UNIT_HQ)$/i))
      ).sort((a, b) => (a.name || "").localeCompare(b.name || ""));
      return [...hqItems, ...otherItems];
    };

    return activeDistricts.length > 0 ? sortDistricts(activeDistricts) : sortDistricts(allDistricts);
  } catch (error) {
    console.error("Error fetching districts:", error);
    // Return empty array on error to prevent crashes
    return [];
  }
};

export const createDistrict = async (data: Omit<District, "id">): Promise<string> => {
  return createDoc<District>("districts", { ...data, isActive: true });
};

export const updateDistrict = async (
  id: string,
  data: Partial<District>
): Promise<void> => {
  return updateDocument<District>("districts", id, data);
};

export const deleteDistrict = async (id: string): Promise<void> => {
  return deleteDocument("districts", id);
};

// Station functions
export const getStations = async (district?: string): Promise<Station[]> => {
  try {
    if (district) {
      // Try to get stations filtered by district with ordering
      try {
        const filteredStations = await getDocuments<Station>("stations", [
          where("district", "==", district),
          orderBy("name"),
        ]);
        return filteredStations;
      } catch (error) {
        // If composite index is missing, get all and filter client-side
        console.warn("Error with filtered query, trying client-side filter:", error);
        const allStations = await getDocuments<Station>("stations", []);
        return allStations
          .filter((s) => s.district === district)
          .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
      }
    } else {
      // Get all stations
      try {
        return await getDocuments<Station>("stations", [orderBy("name")]);
      } catch (error) {
        console.warn("Error with ordered query, trying without order:", error);
        const allStations = await getDocuments<Station>("stations", []);
        return allStations.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
      }
    }
  } catch (error) {
    console.error("Error fetching stations:", error);
    return [];
  }
};

export const createStation = async (data: Omit<Station, "id">): Promise<string> => {
  return createDoc<Station>("stations", { ...data, isActive: true });
};

export const updateStation = async (
  id: string,
  data: Partial<Station>
): Promise<void> => {
  return updateDocument<Station>("stations", id, data);
};

export const deleteStation = async (id: string): Promise<void> => {
  return deleteDocument("stations", id);
};

// Unit functions
export const getUnits = async (): Promise<Unit[]> => {
  try {
    const allUnits = await getDocuments<Unit>("units", []);
    return allUnits
      .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  } catch (error: unknown) {
    const err = error as { code?: string; message?: string };
    console.error("Error fetching units:", err?.code ?? err?.message ?? error);
    return [];
  }
};

export const createUnit = async (data: Omit<Unit, "id">): Promise<string> => {
  return createDoc<Unit>("units", { ...data, isActive: true });
};

export const updateUnit = async (
  id: string,
  data: Partial<Unit>
): Promise<void> => {
  return updateDocument<Unit>("units", id, data);
};

export const deleteUnit = async (id: string): Promise<void> => {
  return deleteDocument("units", id);
};

// Unit Section functions
export interface UnitSections {
  id?: string; // unit name
  sections: string[];
  updatedAt?: Timestamp;
}

/** @deprecated Use Unit.dutyRoles instead */
export const getUnitSections = async (unitName: string): Promise<string[]> => {
  try {
    const docSnap = await getDocument<UnitSections>("unit_sections", unitName);
    return docSnap?.sections || [];
  } catch (error) {
    console.error("Error fetching unit sections:", error);
    return [];
  }
};

/** @deprecated No longer used. Consolidation into Duty Roles. */
export const updateUnitSections = async (
  unitName: string, sections: string[]): Promise<void> => {
  if (typeof window === "undefined" || !db) {
    throw new Error("Firestore not initialized");
  }
  const docRef = doc(db, "unit_sections", unitName);
  await setDoc(docRef, {
    sections,
    updatedAt: Timestamp.now(),
  }, { merge: true });
};

// Stored in app_config/station_sub_sections as a list of strings in 'items' field
export const getSubSections = async (): Promise<string[]> => {
  try {
    const docSnap = await getDocument<{ items: string[] }>("app_config", "station_sub_sections");
    return docSnap?.items || [];
  } catch (error) {
    console.error("Error fetching duty roles:", error);
    return [];
  }
};

export const updateSubSections = async (list: string[]): Promise<void> => {
  if (typeof window === "undefined" || !db) {
    throw new Error("Firestore not initialized");
  }
  const docRef = doc(db, "app_config", "station_sub_sections");
  await setDoc(docRef, {
    items: list.sort(),
    updatedAt: Timestamp.now(),
  }, { merge: true });
};

// Unit Scope functions
export interface UnitScope {
  id?: string;
  label: string;
  value: string; // The mappingType string stored in Unit
  behavior: "single" | "subset" | "all" | "none"; // How it behaves logically
  isSystem?: boolean; // If true, cannot be deleted
  createdAt?: Timestamp;
}

export const getUnitScopes = async (): Promise<UnitScope[]> => {
  try {
    const scopes = await getDocuments<UnitScope>("unit_scopes", [orderBy("label")]);
    return scopes;
  } catch (error) {
    console.error("Error fetching unit scopes:", error);
    return [];
  }
};

export const createUnitScope = async (data: Omit<UnitScope, "id">): Promise<string> => {
  return createDoc<UnitScope>("unit_scopes", { ...data, isSystem: false }); // Always custom
};

export const updateUnitScope = async (id: string, data: Partial<UnitScope>): Promise<void> => {
  return updateDocument<UnitScope>("unit_scopes", id, data);
};

export const deleteUnitScope = async (id: string): Promise<void> => {
  return deleteDocument("unit_scopes", id);
};

// Initialize default scopes if not present
export const initializeDefaultScopes = async () => {
  const defaults: UnitScope[] = [
    { label: "All Districts", value: "all", behavior: "all", isSystem: true },
    { label: "State Level", value: "state", behavior: "none", isSystem: true }, // State behaves like None (no mapped district) usually, or specific? Android treats "state" as explicit check in fallback, but in mapping it falls to default unless mapped. Wait, Android sets "none" -> "No District Required". "state" -> fallback or specific logic.
    // In Android: mappingType "none" -> "No District Required". "all" -> All. "subset"/"single" -> list.
    // So "State Level" usually means NO district selection. So behavior="none".
    { label: "District Specific", value: "single", behavior: "single", isSystem: true },
    { label: "Multi-District / Battalion", value: "subset", behavior: "subset", isSystem: true },
    { label: "Commissionerate", value: "commissionerate", behavior: "subset", isSystem: true }, // We added this recently
    { label: "No District Required", value: "none", behavior: "none", isSystem: true },
  ];

  const existing = await getUnitScopes();
  if (existing.length === 0) {
    console.log("Initializing default unit scopes...");
    for (const scope of defaults) {
      await createDoc("unit_scopes", { ...scope, createdAt: Timestamp.now() });
    }
  }
};


// Rank functions
export const getRanks = async (): Promise<Rank[]> => {
  try {
    // Get all ranks from rankMaster collection
    const allRanks = await getDocuments<Rank>("rankMaster", []);

    // Add rank_id from document ID if not present
    const ranksWithId = allRanks.map(rank => ({
      ...rank,
      rank_id: rank.rank_id || (rank as any).id || "",
    }));

    // Filter active ranks and sort by seniority_order
    const activeRanks = ranksWithId
      .filter((r) => r.isActive !== false) // Include ranks where isActive is true or undefined
      .sort((a, b) => {
        // Sort by seniority_order (1 = highest, lower numbers first)
        if (a.seniority_order !== undefined && b.seniority_order !== undefined) {
          return a.seniority_order - b.seniority_order;
        }
        if (a.seniority_order !== undefined) return -1;
        if (b.seniority_order !== undefined) return 1;
        // Otherwise sort by rank_label
        return (a.rank_label || "").localeCompare(b.rank_label || "");
      });

    return activeRanks.length > 0 ? activeRanks : ranksWithId.sort((a, b) => {
      if (a.seniority_order !== undefined && b.seniority_order !== undefined) {
        return a.seniority_order - b.seniority_order;
      }
      return (a.rank_label || "").localeCompare(b.rank_label || "");
    });
  } catch (error) {
    console.error("Error fetching ranks:", error);
    // Return empty array on error to prevent crashes
    return [];
  }
};

export const createRank = async (data: Rank): Promise<string> => {
  if (typeof window === "undefined" || !db) {
    throw new Error("Firestore not initialized (server-side or not available)");
  }
  if (!data.rank_id) {
    throw new Error("rank_id is required");
  }
  const payload = sanitizeRankPayload(data);
  // Use rank_id as document ID
  const docRef = doc(db, "rankMaster", data.rank_id);
  await setDoc(docRef, {
    ...payload,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
  return data.rank_id;
};

export const updateRank = async (
  rank_id: string,
  data: Partial<Omit<Rank, "rank_id" | "createdAt">>
): Promise<void> => {
  if (typeof window === "undefined" || !db) {
    throw new Error("Firestore not initialized (server-side or not available)");
  }
  const docRef = doc(db, "rankMaster", rank_id);
  const payload = sanitizeRankPayload(data);
  await updateDoc(docRef, {
    ...payload,
    updatedAt: Timestamp.now(),
  });
};

export const deleteRank = async (rank_id: string): Promise<void> => {
  return deleteDocument("rankMaster", rank_id);
};

// Helper function to get rank by name (checks equivalent_rank and aliases)
export const getRankByName = async (rankName: string): Promise<Rank | null> => {
  try {
    const ranks = await getRanks();
    return ranks.find(r =>
      r.equivalent_rank === rankName ||
      r.aliases?.includes(rankName) ||
      r.rank_id === rankName
    ) || null;
  } catch (error) {
    console.error("Error finding rank by name:", error);
    return null;
  }
};

// Pending Registrations
export const getPendingRegistrations = async (): Promise<PendingRegistration[]> => {
  try {
    const rawRegistrations = await getDocuments<PendingRegistration>("pending_registrations", [
      orderBy("createdAt", "desc"),
    ]);

    // Keep only the most recent registration for each identifier (kgid or email)
    const uniqueRegistrations = new Map<string, PendingRegistration>();
    rawRegistrations.forEach(reg => {
      const identifier = (reg.kgid?.trim() || reg.email?.trim() || "").toLowerCase();
      // Only include if status is pending or undefined (legacy)
      const isPending = !reg.status || reg.status.toLowerCase() === "pending";

      if (identifier && isPending && !uniqueRegistrations.has(identifier)) {
        uniqueRegistrations.set(identifier, reg);
      }
    });

    if (uniqueRegistrations.size === 0) return [];

    // Cross-check: fetch approved employees and remove any whose kgid, email, or mobile already exists
    // This handles cases where approval happened via Android app without cleaning up pending docs
    try {
      const approvedEmployees = await getDocuments<Employee>("employees", [
        where("isApproved", "==", true),
      ]);

      const approvedKgids = new Set(
        approvedEmployees.map(e => e.kgid?.trim().toLowerCase()).filter(Boolean)
      );
      const approvedEmails = new Set(
        approvedEmployees.map(e => e.email?.trim().toLowerCase()).filter(Boolean)
      );
      // Also match by mobile number — catches cases where KGID/email differ between pending doc and employee record
      const approvedMobiles = new Set(
        approvedEmployees.flatMap(e => [e.mobile1?.trim(), (e as any).mobile2?.trim()]).filter(Boolean)
      );

      // Filter out already-approved users and clean up their stale pending docs
      const staleIds: string[] = [];
      for (const [key, reg] of uniqueRegistrations) {
        const kgid  = reg.kgid?.trim().toLowerCase();
        const email = reg.email?.trim().toLowerCase();
        const mob   = reg.mobile1?.trim();
        const isAlreadyApproved =
          (kgid  && approvedKgids.has(kgid))   ||
          (email && approvedEmails.has(email))  ||
          (mob   && approvedMobiles.has(mob));

        if (isAlreadyApproved) {
          if (reg.id) staleIds.push(reg.id);
          uniqueRegistrations.delete(key);
        }
      }

      // Silently clean up stale pending docs in the background
      if (staleIds.length > 0 && typeof window !== "undefined" && db) {
        Promise.all(staleIds.map(id => deleteDoc(doc(db!, "pending_registrations", id))))
          .catch(err => console.warn("Failed to clean up stale pending registrations:", err));
      }
    } catch (crossCheckError) {
      // Don't fail the whole function if cross-check fails — just show all pending
      console.warn("Could not cross-check approved employees:", crossCheckError);
    }

    return Array.from(uniqueRegistrations.values());
  } catch (error: any) {
    if (error?.code === "failed-precondition") {
      console.warn("Firestore index missing for pending_registrations, fetching without orderBy");
      try {
        const rawRegistrations = await getDocuments<PendingRegistration>("pending_registrations", []);

        // Manual sort by createdAt desc
        rawRegistrations.sort((a, b) => {
          const aTime = a.createdAt?.toMillis() || 0;
          const bTime = b.createdAt?.toMillis() || 0;
          return bTime - aTime;
        });

        const uniqueRegistrations = new Map<string, PendingRegistration>();
        rawRegistrations.forEach(reg => {
          const kgid = reg.kgid?.trim();
          // Only include if status is pending or undefined (legacy)
          const isPending = !reg.status || reg.status === "pending";

          if (kgid && isPending && !uniqueRegistrations.has(kgid)) {
            uniqueRegistrations.set(kgid, reg);
          }
        });

        return Array.from(uniqueRegistrations.values());
      } catch (fallbackError) {
        console.error("Error fetching pending registrations (fallback):", fallbackError);
        return [];
      }
    }
    console.error("Error fetching pending registrations:", error);
    return [];
  }
};

export const approveRegistration = async (
  _registrationId: string,
  registration: PendingRegistration
): Promise<void> => {
  if (typeof window === "undefined" || !db) {
    throw new Error("Firestore not initialized");
  }

  // Normalize KGID
  const kgid = registration.kgid.trim();

  // Dynamically map all fields from registration to employee, excluding internal fields
  const { 
    id: _id, 
    status: _status, 
    createdAt: _createdAt, 
    viewedByAdmin: _viewedByAdmin, 
    ...passThroughData 
  } = registration;

  // Create or update employee from registration (using upsert logic)
  await createEmployee({
    ...passThroughData,
    kgid: kgid, // Ensure trimmed KGID is used
    isApproved: true,
    isAdmin: registration.isAdmin || false,
  });

  // CRITICAL: Delete ALL pending registrations for this KGID to clear duplicates
  const q = query(
    collection(db, "pending_registrations"),
    where("kgid", "==", kgid)
  );

  const snapshot = await getDocs(q);
  const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
  await Promise.all(deletePromises);
};

export const rejectRegistration = async (registrationId: string): Promise<void> => {
  await deleteDocument("pending_registrations", registrationId);
};

export const updatePendingRegistration = async (
  id: string,
  data: Partial<PendingRegistration>
): Promise<void> => {
  return updateDocument<PendingRegistration>("pending_registrations", id, data);
};

export const markPendingRegistrationAsViewed = async (registrationId: string): Promise<void> => {
  // Check if we are in a window context before trying to update (though updateDocument handles it)
  if (typeof window !== "undefined") {
    try {
      await updateDocument("pending_registrations", registrationId, {
        viewedByAdmin: true
      });
    } catch (e) {
      console.warn("Failed to mark registration as viewed", e);
    }
  }
};

// Notifications
export const createNotification = async (
  data: Omit<NotificationQueue, "id">,
  _isAdmin: boolean = false
): Promise<string> => {
  // Use a single collection for all notifications to ensure Cloud Function processing
  const collectionName = "notifications_queue";
  return createDoc<NotificationQueue>(collectionName, {
    ...data,
    status: "pending",
    createdAt: Timestamp.now(),
  });
};

// Documents
export const getDocumentsList = async (): Promise<Document[]> => {
  try {
    console.log("Fetching documents from Firestore + Apps Script...");

    // Fetch Firestore docs first (Firebase path)
    let firestoreDocs: Document[] = [];
    try {
      // Try with orderBy first
      try {
        console.log("🔍 Fetching documents from Firestore with orderBy('createdAt', 'desc')...");
        firestoreDocs = await getDocuments<Document>("documents", [orderBy("createdAt", "desc")]);
        if (firestoreDocs.length > 0) {
          console.log(`✅ Found ${firestoreDocs.length} documents in Firestore (with orderBy)`);
          console.log("✅ Firestore documents sample:", JSON.stringify(firestoreDocs[0], null, 2));
        } else {
          console.log("ℹ️ No documents found in Firestore collection 'documents' (with orderBy)");
          // Try without orderBy as fallback (in case there are docs but index is missing)
          console.log("🔍 Trying without orderBy as fallback...");
          try {
            firestoreDocs = await getDocuments<Document>("documents", []);
            // Sort manually
            firestoreDocs.sort((a, b) => {
              const aDate = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : (a.createdAt instanceof Timestamp ? a.createdAt.toMillis() : 0);
              const bDate = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : (b.createdAt instanceof Timestamp ? b.createdAt.toMillis() : 0);
              return bDate - aDate;
            });
            if (firestoreDocs.length > 0) {
              console.log(`✅ Found ${firestoreDocs.length} documents in Firestore (without orderBy)`);
              console.log("✅ Firestore documents sample:", JSON.stringify(firestoreDocs[0], null, 2));
            } else {
              console.log("ℹ️ No documents found in Firestore collection 'documents' (without orderBy either)");
            }
          } catch (fallbackError: any) {
            console.error("❌ Error fetching without orderBy:", fallbackError?.message);
          }
        }
      } catch (orderByError: any) {
        // If orderBy fails (missing index), try without it
        if (orderByError?.code === "failed-precondition") {
          console.warn("⚠️ Firestore index missing for 'createdAt', fetching without orderBy...");
          firestoreDocs = await getDocuments<Document>("documents", []);
          // Sort manually
          firestoreDocs.sort((a, b) => {
            const aDate = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : (a.createdAt instanceof Timestamp ? a.createdAt.toMillis() : 0);
            const bDate = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : (b.createdAt instanceof Timestamp ? b.createdAt.toMillis() : 0);
            return bDate - aDate;
          });
          if (firestoreDocs.length > 0) {
            console.log(`✅ Found ${firestoreDocs.length} documents in Firestore (without orderBy)`);
            console.log("✅ Firestore documents sample:", JSON.stringify(firestoreDocs[0], null, 2));
          } else {
            console.log("ℹ️ No documents found in Firestore collection 'documents' (without orderBy)");
          }
        } else {
          throw orderByError; // Re-throw if it's not an index error
        }
      }
    } catch (error: any) {
      console.error("❌ Error fetching from Firestore:", error?.message || "Unknown");
      console.error("❌ Error code:", error?.code);
      console.error("❌ Error details:", error);
    }

    // Fetch from Apps Script API via Next.js proxy (Drive/Sheet path)
    let apiDocs: any[] = [];
    try {
      console.log("Fetching from Apps Script API via proxy...");
      const response = await fetch("/api/documents", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const body = await response.json();
      console.log("API response type:", Array.isArray(body) ? "array" : typeof body);
      console.log("API response length:", Array.isArray(body) ? body.length : "not an array");

      if (Array.isArray(body)) {
        apiDocs = body;
      } else if (body && typeof body === "object") {
        if (body.error) {
          console.error("API returned error:", body.error);
        }
        const data = body.data || body.documents || body.items || [];
        if (Array.isArray(data)) {
          apiDocs = data;
        }
      }
    } catch (apiError: any) {
      console.warn("Error fetching from Apps Script API:", apiError?.message || apiError);
    }

    // Deduplicate, preferring Firestore entries (Firebase uploads)
    const combinedMap = new Map<string, Document>();
    // Use a more specific key that includes source to avoid conflicts
    const keyFor = (doc: any, isFirestore: boolean = false) => {
      // For Firestore docs, prefer fileId or id
      if (isFirestore && (doc.fileId || doc.id)) {
        return `firestore_${doc.fileId || doc.id}`;
      }
      // For API docs, use fileId or URL
      if (!isFirestore && doc.fileId) {
        return `gdrive_${doc.fileId}`;
      }
      // Fallback to URL-based key
      const url = doc.url || doc.URL;
      if (url) {
        const source = url.includes("storage.googleapis.com") || url.includes("firebasestorage.app") ? "firebase" : "gdrive";
        return `${source}_${url}`;
      }
      // Last resort: title + source
      return `${isFirestore ? "firestore" : "gdrive"}_${doc.title || doc.name || doc.id || Math.random().toString(36).slice(2)}`;
    };

    // Add Firestore docs first (they take precedence)
    firestoreDocs.forEach((doc) => {
      const key = keyFor(doc, true);
      combinedMap.set(key, doc);
      console.log(`📦 Added Firestore doc: ${doc.title} (key: ${key})`);
    });

    // Add API docs only if they don't conflict
    apiDocs.forEach((doc) => {
      const key = keyFor(doc, false);
      if (!combinedMap.has(key)) {
        combinedMap.set(key, doc as Document);
        console.log(`📦 Added API doc: ${doc.title || doc.Title} (key: ${key})`);
      } else {
        console.log(`⚠️ Skipped duplicate API doc: ${doc.title || doc.Title} (key: ${key})`);
      }
    });

    const merged = Array.from(combinedMap.values());

    // Normalize field names
    const normalized = merged
      .map((doc: any) => {
        if (doc.Delete && doc.Delete.toString().toLowerCase() === "deleted") {
          return null;
        }
        const normalized: Document = {
          ...doc,
          name: doc.name || doc.Title || doc.title || "Untitled Document",
          url: doc.url || doc.URL || "",
          type: doc.type || doc.fileType || doc.Category || doc.category || "",
          title: doc.Title || doc.title || doc.name,
          URL: doc.URL || doc.url,
          fileType: doc.fileType,
          category: doc.Category || doc.category,
          description: doc.Description || doc.description,
          uploadedBy: doc.UploadedBy || doc.uploadedBy,
          uploadedDate: doc.UploadedDate || doc.uploadedDate,
          fileId: doc.fileId,
          createdAt:
            doc.createdAt ||
            (doc.UploadedDate
              ? typeof doc.UploadedDate === "string"
                ? Timestamp.fromDate(new Date(doc.UploadedDate))
                : doc.UploadedDate instanceof Date
                  ? Timestamp.fromDate(doc.UploadedDate)
                  : doc.UploadedDate
              : undefined),
        };
        return normalized;
      })
      .filter((doc): doc is Document => !!doc);

    normalized.sort((a, b) => {
      const aDate = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : a.createdAt instanceof Timestamp ? a.createdAt.toMillis() : 0;
      const bDate = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : b.createdAt instanceof Timestamp ? b.createdAt.toMillis() : 0;
      return bDate - aDate;
    });

    console.log(`Returning ${normalized.length} normalized documents (merged Firestore + Apps Script)`);
    return normalized;
  } catch (error: any) {
    console.error("Error fetching documents:", error);
    console.error("Error details:", {
      message: error?.message,
      code: error?.code,
      stack: error?.stack
    });
    return [];
  }
};

export const createDocument = async (data: Omit<Document, "id">): Promise<string> => {
  return createDoc<Document>("documents", data);
};

// Gallery: merge Firebase (Storage metadata in Firestore) + Apps Script
export const getGalleryImages = async (): Promise<GalleryImage[]> => {
  try {
    console.log("Fetching gallery images (Firebase + Apps Script)...");

    // Fetch Firebase (Firestore) entries first
    let firestoreImages: GalleryImage[] = [];
    try {
      firestoreImages = await getDocuments<GalleryImage>("gallery", []);
      if (firestoreImages.length > 0) {
        console.log(`Found ${firestoreImages.length} images in Firestore`);
      }
    } catch (err: any) {
      console.warn("Error fetching gallery images from Firestore:", err?.message || err);
    }

    // Fetch Apps Script images
    let normalizedApi: GalleryImage[] = [];
    try {
      console.log("Fetching from Apps Script API via proxy...");
      const response = await fetch("/api/gallery", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        cache: "no-store",
      });

      if (response.ok) {
        const apiImages = await response.json();
        console.log("Gallery API response type:", Array.isArray(apiImages) ? "array" : typeof apiImages);
        console.log("Gallery API response length:", Array.isArray(apiImages) ? apiImages.length : "not an array");

        if (apiImages && typeof apiImages === 'object' && !Array.isArray(apiImages)) {
          if (apiImages.error) {
            console.error("Gallery API returned error:", apiImages.error);
          } else {
            const data = apiImages.data || apiImages.images || apiImages.items || [];
            if (Array.isArray(data) && data.length > 0) {
              normalizedApi = normalizeGalleryImages(data);
            }
          }
        } else if (Array.isArray(apiImages)) {
          normalizedApi = normalizeGalleryImages(apiImages);
        } else {
          console.warn("Gallery API response is not an array or object with data");
        }
      } else {
        console.error("Gallery API HTTP error:", response.status);
      }
    } catch (err: any) {
      console.warn("Error fetching gallery images from Apps Script:", err?.message || err);
    }

    // Combine Firestore + API, preferring Firestore for duplicates by imageUrl
    const combinedMap = new Map<string, GalleryImage>();
    firestoreImages.forEach((img) => {
      if (img.imageUrl) combinedMap.set(img.imageUrl, img);
    });
    normalizedApi.forEach((img) => {
      if (img.imageUrl && !combinedMap.has(img.imageUrl)) {
        combinedMap.set(img.imageUrl, img);
      }
    });

    const combined = Array.from(combinedMap.values());
    combined.sort((a, b) => {
      const aDate = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
      const bDate = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
      return bDate - aDate;
    });

    console.log(`Returning ${combined.length} gallery images (merged)`);
    return combined;
  } catch (error: any) {
    console.error("Error fetching gallery images:", error);
    return [];
  }
}
// Helper to convert Google Drive sharing URLs to direct image links
export const convertDriveUrlToDirectImageUrl = (driveUrl: string | null): string => {
  if (!driveUrl) return "";
  
  // If it's already a thumbnail or direct link or Firebase Storage, return as is
  if (driveUrl.includes("drive.google.com/thumbnail") ||
      driveUrl.includes("drive.google.com/uc") || 
      driveUrl.includes("lh3.googleusercontent.com") ||
      driveUrl.includes("firebasestorage.googleapis.com") || 
      driveUrl.includes("firebasestorage.app") ||
      driveUrl.includes("storage.googleapis.com")) {
    return driveUrl;
  }
  
  try {
    let fileId = "";
    
    if (driveUrl.includes("/file/d/")) {
      const match = driveUrl.match(/\/file\/d\/([-\w]{25,})/);
      if (match) fileId = match[1];
    } else if (driveUrl.includes("id=")) {
      const match = driveUrl.match(/[?&]id=([-\w]{25,})/);
      if (match) fileId = match[1];
    } else {
      // Try to find any sequence that looks like a Drive File ID
      const match = driveUrl.match(/\/([-\w]{25,})/);
      if (match) fileId = match[1];
    }
    
    if (fileId) {
      // Use the thumbnail API which is generally more reliable for web display than direct export
      return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`;
    }
  } catch (e) {
    console.error("Error converting Drive URL:", e);
  }
  
  return driveUrl;
};

// Helper function to normalize gallery images from Apps Script format
function normalizeGalleryImages(images: any[]): GalleryImage[] {
  if (!images || images.length === 0) {
    return [];
  }

  console.log(`Processing ${images.length} gallery images...`);
  if (images.length > 0) {
    console.log("First raw image before normalization:", JSON.stringify(images[0], null, 2));
  }

  // Map images to normalize field names from Apps Script format
  // Apps Script returns dynamic headers from sheet (Title, URL, UploadedBy, UploadedDate, Description, Delete, etc.)
  // GalleryImage expects: id, imageUrl, createdAt
  const normalized = images.map((img: any) => {
    // Filter out deleted images (check all possible delete column names/positions)
    const deleteValue = img.Delete || img.delete || img["Delete"] || (img[6] !== undefined ? img[6] : null);
    if (deleteValue && deleteValue.toString().toLowerCase() === "deleted") {
      return null; // Will filter these out
    }

    // Get image URL from various possible field names
    // Gallery API already returns imageUrl field, but check all variations
    let imageUrl = img.imageUrl || img.URL || img.url || img["URL"] || img.image || "";

    // Skip if no valid image URL
    if (!imageUrl || imageUrl.trim() === "") {
      console.warn("Skipping image with no URL:", img);
      return null;
    }

    // Determine source
    const isFirebase = imageUrl.includes("storage.googleapis.com") || 
                      imageUrl.includes("firebasestorage.app") || 
                      !!img.storagePath;

    // For Drive images, convert URL to a more stable format like thumbnail API
    if (!isFirebase) {
      imageUrl = convertDriveUrlToDirectImageUrl(imageUrl);
    }

    // Get date from various possible field names (Gallery API uses uploadedDate)
    const dateValue = img.uploadedDate || img.UploadedDate || img["Uploaded Date"] || img.createdAt || img["UploadedDate"] || img.date;
    let createdAt: Timestamp | undefined = undefined;

    if (dateValue) {
      try {
        if (dateValue instanceof Date) {
          createdAt = Timestamp.fromDate(dateValue);
        } else if (typeof dateValue === 'string') {
          // Try parsing the date string
          const parsedDate = new Date(dateValue);
          if (!isNaN(parsedDate.getTime())) {
            createdAt = Timestamp.fromDate(parsedDate);
          }
        } else if (dateValue.toDate) {
          // Already a Firestore Timestamp
          createdAt = dateValue;
        }
      } catch (e) {
        console.warn("Could not parse date:", dateValue, e);
      }
    }

    // Normalize field names - support both admin panel and mobile app formats
    // Gallery API returns dynamic headers from sheet (Title, URL, UploadedBy, UploadedDate, Description, Delete)
    const title = img.title || img.Title || img["Title"] || img["title"] || img.name || img.Name || "";
    
    const normalized: GalleryImage = {
      // Ensure imageUrl is set (check all possible field names)
      imageUrl: imageUrl,
      // Preserve title if available
      title: title,
      // Use title as ID if no id exists, or generate one
      // For Drive images, we MUST have a title for deletion to work
      id: img.id || img.fileId || title || `img-${Date.now()}-${Math.random()}`,
      createdAt: createdAt,
      // Add source for easier handling in UI
      source: isFirebase ? "firebase" : "gdrive",
      storagePath: img.storagePath
    };

    // Log for debugging
    if (!normalized.imageUrl) {
      console.warn("Normalized image missing imageUrl:", normalized);
    }

    return normalized;
  }).filter((img): img is GalleryImage => !!(img && img.imageUrl && img.imageUrl.trim() !== "")); // Remove null entries and images without URLs

  // Sort by date (newest first)
  normalized.sort((a, b) => {
    const aDate = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
    const bDate = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
    return bDate - aDate;
  });

  console.log(`Returning ${normalized.length} normalized gallery images`);
  return normalized;
}

export const createGalleryImage = async (
  data: Omit<GalleryImage, "id">
): Promise<string> => {
  return createDoc<GalleryImage>("gallery", data);
};

// Delete gallery image from Firestore and Firebase Storage
export const deleteGalleryImageFromFirestore = async (id: string, storagePath?: string): Promise<void> => {
  try {
    // 1. Delete from Firestore
    await deleteDocument("gallery", id);

    // 2. Delete from Firebase Storage if path is provided
    if (storagePath && storage) {
      const storageRef = ref(storage, storagePath);
      await deleteObject(storageRef);
      console.log(`Successfully deleted file from storage: ${storagePath}`);
    }
  } catch (error: any) {
    console.error("Error deleting gallery image from Firestore/Storage:", error);
    throw new Error(`Failed to delete Firebase gallery image: ${error?.message || "Unknown error"}`);
  }
};

// Delete gallery image via Apps Script API (Drive/Sheet)
export const deleteGalleryImage = async (title: string, userEmail: string): Promise<void> => {
  try {
    const response = await fetch("/api/gallery/delete", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: title,
        userEmail: userEmail,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
      throw new Error(errorData.error || `Failed to delete image: ${response.status}`);
    }

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || "Failed to delete image");
    }
  } catch (error: any) {
    console.error("Error deleting gallery image:", error);
    throw new Error(`Failed to delete gallery image: ${error?.message || "Unknown error"}`);
  }
};

// Useful Links
export const getUsefulLinks = async (): Promise<UsefulLink[]> => {
  return getDocuments<UsefulLink>("useful_links", [orderBy("name")]);
};

export const createUsefulLink = async (
  data: Omit<UsefulLink, "id">
): Promise<string> => {
  return createDoc<UsefulLink>("useful_links", data);
};

export const deleteUsefulLink = async (id: string): Promise<void> => {
  return deleteDocument("useful_links", id);
};

// Statistics
export const getEmployeeStats = async () => {
  const [employees, officers, districts, stations, pendingRegistrations] = await Promise.all([
    getEmployees(),
    getOfficers(),
    getDistricts(),
    getStations(),
    getPendingRegistrations()
  ]);
  
  const pendingCount = pendingRegistrations.length;

  const byDistrict: Record<string, number> = {};
  const byStation: Record<string, number> = {};
  const byRank: Record<string, number> = {};

  // Employee Stats
  employees.forEach((emp) => {
    if (emp.district) {
      byDistrict[emp.district] = (byDistrict[emp.district] || 0) + 1;
    }
    if (emp.station) {
      byStation[emp.station] = (byStation[emp.station] || 0) + 1;
    }
    if (emp.rank) {
      byRank[emp.rank] = (byRank[emp.rank] || 0) + 1;
    }
  });

  // Officer Stats
  const officersByDistrict: Record<string, number> = {};
  const officersByRank: Record<string, number> = {};

  officers.forEach((off) => {
    if (off.district) {
      officersByDistrict[off.district] = (officersByDistrict[off.district] || 0) + 1;
    }
    if (off.rank) {
      officersByRank[off.rank] = (officersByRank[off.rank] || 0) + 1;
    }
  });

  return {
    total: employees.length,
    officersCount: officers.length,
    approved: employees.filter((e) => e.isApproved !== false).length,
    pending: pendingCount,
    byDistrict,
    byStation,
    byRank,
    officersByDistrict,
    officersByRank,
    districtsCount: districts.length,
    stationsCount: stations.length,
  };
};

// Helper to get pending registration by KGID
export const getPendingRegistrationByKgid = async (kgid: string): Promise<PendingRegistration | null> => {
  if (typeof window === "undefined" || !db) {
    console.warn("Firestore not initialized (server-side or not available)");
    return null;
  }
  try {
    const q = query(
      collection(db, "pending_registrations"),
      where("kgid", "==", kgid),
      where("status", "==", "pending")
    );
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as PendingRegistration;
    }
    return null;
  } catch (error) {
    console.error("Error fetching pending registration:", error);
    return null;
  }
};

export const createPendingRegistration = async (data: Omit<PendingRegistration, "id" | "createdAt" | "status">): Promise<string> => {
  if (typeof window === "undefined" || !db) {
    throw new Error("Firestore not initialized (server-side or not available)");
  }

  // Normalize KGID for consistency
  const normalizedKgid = data.kgid.trim();

  // Check if already exists
  const existing = await getPendingRegistrationByKgid(normalizedKgid);
  if (existing) {
    throw new Error("A pending registration with this KGID already exists.");
  }

  return createDoc<PendingRegistration>("pending_registrations", {
    ...data,
    kgid: normalizedKgid, // Use normalized KGID
    status: "pending",
    createdAt: Timestamp.now(),
  });
};