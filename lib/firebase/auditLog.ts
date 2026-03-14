import { addDoc, collection, Timestamp } from "firebase/firestore";
import { db } from "./config";

export type AuditAction =
  | "approve_registration"
  | "reject_registration"
  | "add_employee"
  | "edit_employee"
  | "delete_employee"
  | "approve_leave"
  | "reject_leave"
  | "send_notification";

export interface AuditEntry {
  action: AuditAction;
  targetType: string;
  targetId?: string;
  targetName?: string;
  performedBy: string;
  performedByEmail?: string;
  performedAt: Timestamp;
  details?: string;
}

const AUDIT_COLLECTION = "audit_log";

/**
 * Log an admin action for audit trail.
 * Firestore rules should restrict writes to authenticated admins.
 */
export async function logAudit(entry: Omit<AuditEntry, "performedAt">): Promise<void> {
  try {
    await addDoc(collection(db, AUDIT_COLLECTION), {
      ...entry,
      performedAt: Timestamp.now(),
    });
  } catch (err) {
    console.error("Audit log failed:", err);
    // Don't throw - audit failure should not break the main operation
  }
}
