"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { User } from "firebase/auth";
import { onAuthChange } from "@/lib/firebase/auth";
import { db } from "@/lib/firebase/config";
import { Employee } from "@/lib/firebase/firestore";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  employeeData: Employee | null;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isAdmin: false,
  employeeData: null,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [employeeData, setEmployeeData] = useState<Employee | null>(null);

  useEffect(() => {
    // Only run on client side
    if (typeof window === "undefined") {
      setLoading(false);
      return;
    }

    try {
      const unsubscribe = onAuthChange(async (user) => {
        setUser(user);

        if (user) {
          // Fetch employee data to check role
          try {
            // We need to find the employee by email
            // Since we can't query easily without potentially missing indexes or permission issues if not admin,
            // ideally we should store uid in employee doc, but currently we rely on email mapping?
            // Actually, `query` for plain users might fail if security rules are strict.
            // BUT, let's assume valid users can read their own doc if we query by email?
            // Or better, let's check `firestore.ts` getEmployees logic.
            // Wait, for efficiency, we really should have `firebaseUid` in the employee doc.
            // But existing data might not have it.
            // Let's rely on email search for now.

            // Wait, we can't import `query`, `collection`, `where` inside `useEffect` easily without making it messy?
            // No, we can.

            // Dynamic import of firestore functions to avoid "window undefined" issues if any
            const { collection, query, where, getDocs } = await import("firebase/firestore");

            if (!db) {
              console.warn("Firestore not initialized for auth check");
              setLoading(false);
              return;
            }

            try {
              const q = query(collection(db, "employees"), where("email", "==", user.email));
              const snapshot = await getDocs(q);

              if (!snapshot.empty) {
                const emp = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Employee;
                setEmployeeData(emp);
                setIsAdmin(!!emp.isAdmin);
              } else {
                setEmployeeData(null);
                setIsAdmin(false);
              }
            } catch (queryErr) {
              console.warn("Permission check failed or no employee record:", queryErr);
              // If permission is denied, it likely means user is not allowed to query employees 
              // (e.g. not in the 'employees' collection and rules restrict list access?)
              // Default to false.
              setEmployeeData(null);
              setIsAdmin(false);
            }
          } catch (err) {
            console.error("Error fetching user role:", err);
            setIsAdmin(false);
          }
        } else {
          setEmployeeData(null);
          setIsAdmin(false);
        }

        setLoading(false);
      });

      return () => unsubscribe();
    } catch (error) {
      console.error("Error initializing auth:", error);
      setLoading(false);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, isAdmin, employeeData }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

