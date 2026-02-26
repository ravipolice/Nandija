import { doc, setDoc, Timestamp } from "firebase/firestore";
import { db } from "./config";
import { getDocument } from "./firestore";

export interface AppConfig {
    id?: string;
    playStoreUrl?: string;
    apkUrl?: string;
    apkSize?: string;
    apkVersion?: string;
    nudiApkUrl?: string;
    nudiApkSize?: string;
    nudiApkVersion?: string;
    updatedAt?: Timestamp;
    showLogo?: boolean;
    hiddenFields?: string[]; // Global list of hidden fields (e.g. "dateOfBirth", "dateOfAppointment")
}

export const getAppConfig = async (): Promise<AppConfig | null> => {
    return getDocument<AppConfig>("app_config", "main_app");
};

export const updateAppConfig = async (data: Partial<AppConfig>): Promise<void> => {
    if (typeof window === "undefined" || !db) {
        throw new Error("Firestore not initialized");
    }
    const docRef = doc(db, "app_config", "main_app");
    await setDoc(docRef, {
        ...data,
        updatedAt: Timestamp.now(),
    }, { merge: true });
};
