import {
    collection,
    query,
    where,
    getDocs,
    limit,
    doc,
    updateDoc
} from "firebase/firestore";
import { signInAnonymously } from "firebase/auth";
import { db, auth, functions } from "@/lib/firebase/config"; // Assuming config is here, adjust if needed
import { Employee } from "./firebase/firestore";
import { httpsCallable } from "firebase/functions";

// Constants matching Android's PinHasher.kt
const ITERATIONS = 10000;
const KEY_LENGTH = 256;
const SALT_SIZE = 16;
const HASH_ALGO = "SHA-1"; // Web Crypto uses SHA-1 for PBKDF2 to match Android's PBKDF2WithHmacSHA1

/**
 * Converts a hex string to a Uint8Array
 */
function fromHex(hex: string): Uint8Array {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
        bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
    }
    return bytes;
}

/**
 * Converts a Uint8Array to a hex string
 */
function toHex(bytes: Uint8Array): string {
    return Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
}

/**
 * Verifies a PIN against a stored hash (salt:hash format)
 * Matches Android's PinHasher.verifyPin logic
 */
export async function verifyPin(pin: string, storedHash: string): Promise<boolean> {
    try {
        const parts = storedHash.split(":");
        if (parts.length !== 2) return false;

        const salt = fromHex(parts[0]);
        const originalHash = fromHex(parts[1]);

        const enc = new TextEncoder();
        const pinKey = await window.crypto.subtle.importKey(
            "raw",
            enc.encode(pin) as any,
            { name: "PBKDF2" },
            false,
            ["deriveBits", "deriveKey"]
        );

        const derivedKey = await window.crypto.subtle.deriveBits(
            {
                name: "PBKDF2",
                salt: salt as any,
                iterations: ITERATIONS,
                hash: HASH_ALGO,
            },
            pinKey,
            KEY_LENGTH
        );

        // Compare the derived key (array buffer) with original hash (uint8array)
        const derivedBytes = new Uint8Array(derivedKey);

        if (derivedBytes.length !== originalHash.length) return false;

        for (let i = 0; i < derivedBytes.length; i++) {
            if (derivedBytes[i] !== originalHash[i]) return false;
        }

        return true;
    } catch (e) {
        console.error("PIN key verification error:", e);
        return false;
    }
}

/**
 * Hashes a PIN for storage (salt:hash)
 * Useful for registration or resetting PIN from web
 */
export async function hashPin(pin: string): Promise<string> {
    const salt = window.crypto.getRandomValues(new Uint8Array(SALT_SIZE) as any);

    const enc = new TextEncoder();
    const pinKey = await window.crypto.subtle.importKey(
        "raw",
        enc.encode(pin),
        { name: "PBKDF2" },
        false,
        ["deriveBits", "deriveKey"]
    );

    const derivedKey = await window.crypto.subtle.deriveBits(
        {
            name: "PBKDF2",
            salt: salt,
            iterations: ITERATIONS,
            hash: HASH_ALGO,
        },
        pinKey,
        KEY_LENGTH
    );

    return `${toHex(salt)}:${toHex(new Uint8Array(derivedKey))}`;
}

export interface LoginResult {
    success: boolean;
    employee?: Employee;
    error?: string;
}

/**
 * Login with Email and PIN
 * 1. Checks Firestore for employee by email
 * 2. Verifies PIN
 * 3. Signs in anonymously to Firebase
 */
export async function loginWithPin(email: string, pin: string): Promise<LoginResult> {
    try {
        if (!db || !auth) {
            throw new Error("Firebase not initialized");
        }

        const normalizedEmail = email.trim().toLowerCase();

        // 1. Query Employee
        const employeesRef = collection(db, "employees");
        const q = query(employeesRef, where("email", "==", normalizedEmail), limit(1));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            return { success: false, error: "Invalid email or PIN" };
        }

        const employeeDoc = querySnapshot.docs[0];
        const employeeData = employeeDoc.data() as Employee;
        const storedHash = employeeData.pin || "";

        if (!storedHash) {
            return { success: false, error: "PIN not set for this user." };
        }

        // 2. Verify PIN
        const isValid = await verifyPin(pin, storedHash);
        if (!isValid) {
            return { success: false, error: "Invalid email or PIN" };
        }

        // 3. Anonymous Sign In
        // We need this to satisfy security rules that likely require an auth object
        const authResult = await signInAnonymously(auth);
        const firebaseUid = authResult.user.uid;

        // Optional: Update firebaseUid in Firestore if it's different/missing, 
        // effectively linking this anonymous session to the employee record if needed.
        // The Android app does this:
        if (employeeData.firebaseUid !== firebaseUid) {
            await updateDoc(doc(db, "employees", employeeDoc.id), {
                firebaseUid: firebaseUid
            });
        }

        // Return success with employee data (merged with ID)
        return {
            success: true,
            employee: { id: employeeDoc.id, ...employeeData, firebaseUid }
        };

    } catch (error: any) {
        console.error("Login error:", error);
        return { success: false, error: error.message || "Login failed" };
    }
}

/**
 * Request OTP via Cloud Function
 */
export async function requestOtp(email: string): Promise<{ success: boolean; message: string }> {
    try {
        if (!functions) throw new Error("Firebase Functions not initialized");
        const normalizedEmail = email.trim().toLowerCase();
        const requestOtpFn = httpsCallable(functions, 'requestOtp');
        const result = await requestOtpFn({ email: normalizedEmail });
        const data = result.data as any;

        if (data.success) {
            return { success: true, message: data.message || "OTP sent successfully" };
        } else {
            return { success: false, message: data.message || "Failed to send OTP" };
        }
    } catch (error: any) {
        console.error("requestOtp error:", error);
        return { success: false, message: error.message || "Error sending OTP" };
    }
}

/**
 * Verify OTP Code via Cloud Function
 */
export async function verifyOtpCode(email: string, code: string): Promise<{ success: boolean; message?: string }> {
    try {
        if (!functions) throw new Error("Firebase Functions not initialized");
        const normalizedEmail = email.trim().toLowerCase();
        const verifyOtpFn = httpsCallable(functions, 'verifyOtpEmail');
        const result = await verifyOtpFn({ email: normalizedEmail, code });
        const data = result.data as any;

        if (data.success && data.employee) {
            // If verification successful, ensure anonymous auth for subsequent Firestore updates
            if (auth) {
                await signInAnonymously(auth);
            }
            return { success: true };
        } else {
            return { success: false, message: data.message || "Invalid OTP" };
        }
    } catch (error: any) {
        console.error("verifyOtpCode error:", error);
        return { success: false, message: error.message || "Error verifying OTP" };
    }
}

/**
 * Reset PIN for a user
 * 1. Hashes new PIN
 * 2. Updates Firestore document
 */
export async function resetPin(email: string, newPin: string): Promise<{ success: boolean; message?: string }> {
    try {
        if (!db) throw new Error("Firestore not initialized");

        const normalizedEmail = email.trim().toLowerCase();
        const hashedPin = await hashPin(newPin);

        // Find user doc by email
        const employeesRef = collection(db, "employees");
        const q = query(employeesRef, where("email", "==", normalizedEmail), limit(1));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            return { success: false, message: "User not found" };
        }

        const userDoc = querySnapshot.docs[0];
        await updateDoc(doc(db, "employees", userDoc.id), {
            pin: hashedPin
        });

        return { success: true, message: "PIN reset successfully" };
    } catch (error: any) {
        console.error("resetPin error:", error);
        return { success: false, message: error.message || "Failed to reset PIN" };
    }
}
