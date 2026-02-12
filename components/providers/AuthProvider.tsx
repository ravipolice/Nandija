"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { User } from "firebase/auth";
import { onAuthChange } from "@/lib/firebase/auth";
import { db } from "@/lib/firebase/config";
import { Employee } from "@/lib/firebase/firestore";
import { collection, query, where, getDocs } from "firebase/firestore";

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

            if (!db) {
              console.warn("Firestore not initialized for auth check");
              setLoading(false);
              return;
            }

            let foundEmployee = null;
            let foundAdmin = false;

            // 1. Check Employees Collection
            try {
              const q = query(collection(db, "employees"), where("email", "==", user.email));
              const snapshot = await getDocs(q);

              if (!snapshot.empty) {
                foundEmployee = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Employee;
                if (foundEmployee.isAdmin) foundAdmin = true;
              }
            } catch (queryErr) {
              console.warn("Error checking employee record:", queryErr);
            }

            // 2. Check Admins Collection (Override/Augment)
            try {
              const qAdmin = query(collection(db, "admins"), where("email", "==", user.email));
              const snapshotAdmin = await getDocs(qAdmin);

              if (!snapshotAdmin.empty) {
                const adminData = snapshotAdmin.docs[0].data();
                if (adminData.isActive) {
                  foundAdmin = true;
                }
              }
            } catch (queryErr) {
              console.warn("Error checking admins collection:", queryErr);
            }

            setEmployeeData(foundEmployee);
            setIsAdmin(foundAdmin);

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

