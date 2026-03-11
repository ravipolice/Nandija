import { initializeApp, getApps, FirebaseApp, getApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";
import { getStorage, FirebaseStorage } from "firebase/storage";
import { getFunctions, Functions } from "firebase/functions";

// 1. Primary Project Configuration (PMD)
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyB_d5ueTul9vKeNw3pmEtCmbF9w1BVkrAQ",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "pmd-police-mobile-directory.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "pmd-police-mobile-directory",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "pmd-police-mobile-directory.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "603972083927",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:603972083927:web:e4f268aabf3bf3d9f29092",
};

// 2. Secondary Project Configuration (Leave Manager)
const lmFirebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_LM_FIREBASE_API_KEY || "AIzaSyBA9lPOVihCFgCnIGL-YeUwY-TA54iBFh4",
  authDomain: process.env.NEXT_PUBLIC_LM_FIREBASE_AUTH_DOMAIN || "leave-manager-e457e.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_LM_FIREBASE_PROJECT_ID || "leave-manager-e457e",
  storageBucket: process.env.NEXT_PUBLIC_LM_FIREBASE_STORAGE_BUCKET || "leave-manager-e457e.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_LM_FIREBASE_MESSAGING_SENDER_ID || "24036396436",
  appId: process.env.NEXT_PUBLIC_LM_FIREBASE_APP_ID || "1:24036396436:web:a20e7d6091ab67cc511381",
};

let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let db: Firestore | undefined;
let storage: FirebaseStorage | undefined;
let functions: Functions | undefined;

// Second App for Leave Manager
let lm_app: FirebaseApp | undefined;
let lm_db: Firestore | undefined;

// Initialize Firebase only on client side
if (typeof window !== "undefined") {
  // Initialize Default App (PMD)
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApp();
  }
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);
  functions = getFunctions(app, "asia-south1");

  // Initialize Leave Manager App (uses secondary project for auth/users)
  if (lmFirebaseConfig.projectId) {
    const existingLMApp = getApps().find(a => a.name === "leave-manager");
    if (!existingLMApp) {
      lm_app = initializeApp(lmFirebaseConfig, "leave-manager");
    } else {
      lm_app = existingLMApp;
    }
    lm_db = getFirestore(lm_app);
  } else {
    // Fallback to primary if no Leave Manager config
    lm_app = app;
    lm_db = db;
  }
}

export { app, auth, db, storage, functions, lm_app, lm_db };
