import {
    collection,
    query,
    getDocs,
    updateDoc,
    doc,
    deleteDoc,
    addDoc,
    Timestamp,
    orderBy,
} from "firebase/firestore";
import { lm_db as db } from "./config";

export interface LeaveManagerUser {
    id: string; // kgid
    kgid: string;
    name: string;
    email: string;
    phone: string;
    department: string;
    district: string;
    placeOfWorking: string;
    status: "pending" | "approved" | "rejected";
    app: "leave-manager";
    createdAt: number;
    lastActive?: number;
}

export interface LeaveManagerDepartment {
    id?: string;
    name: string;
    createdAt: Timestamp;
}

// User Approvals
export const getPendingLeaveManagerUsers = async (): Promise<LeaveManagerUser[]> => {
    if (!db) return [];
    try {
        const q = query(collection(db, "users"));
        const snapshot = await getDocs(q);

        return snapshot.docs
            .map(doc => {
                const data = doc.data();
                return {
                    ...data,
                    id: doc.id,
                    kgid: data.kgid || doc.id,
                    app: doc.get("app") || "leave-manager",
                    status: doc.get("status") || "pending"
                } as LeaveManagerUser;
            })
            .filter(user =>
                (user.app === "leave-manager") &&
                (user.status === "pending")
            )
            .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    } catch (error) {
        console.error("Error in getPendingLeaveManagerUsers:", error);
        throw error;
    }
};

export const getAllLeaveManagerUsers = async (): Promise<LeaveManagerUser[]> => {
    if (!db) return [];
    try {
        const q = query(collection(db, "users"));
        const snapshot = await getDocs(q);

        return snapshot.docs
            .map(doc => {
                const data = doc.data();
                return {
                    ...data,
                    id: doc.id,
                    kgid: data.kgid || doc.id,
                    app: doc.get("app") || "leave-manager",
                    status: doc.get("status") || "pending"
                } as LeaveManagerUser;
            })
            .filter(user => user.app === "leave-manager" || user.status === "pending" || user.status === "approved" || user.status === "rejected")
            .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    } catch (error) {
        console.error("Error in getAllLeaveManagerUsers:", error);
        throw error;
    }
};

export const updateLeaveManagerUserStatus = async (kgid: string, status: "approved" | "rejected"): Promise<void> => {
    if (!db) return;
    const docRef = doc(db, "users", kgid);
    await updateDoc(docRef, { status });
};

// Department Management
export const getLeaveManagerDepartments = async (): Promise<LeaveManagerDepartment[]> => {
    if (!db) return [];
    try {
        const q = query(collection(db, "leave_manager_departments"), orderBy("name"));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as LeaveManagerDepartment));
    } catch (error) {
        console.error("Error in getLeaveManagerDepartments:", error);
        // Retry without orderBy in case of missing index
        const q2 = query(collection(db, "leave_manager_departments"));
        const snapshot2 = await getDocs(q2);
        return snapshot2.docs.map(doc => ({ ...doc.data(), id: doc.id } as LeaveManagerDepartment));
    }
};

export const addLeaveManagerDepartment = async (name: string): Promise<string> => {
    if (!db) return "";
    const docRef = await addDoc(collection(db, "leave_manager_departments"), {
        name,
        createdAt: Timestamp.now(),
    });
    return docRef.id;
};

export const deleteLeaveManagerDepartment = async (id: string): Promise<void> => {
    if (!db) return;
    await deleteDoc(doc(db, "leave_manager_departments", id));
};
