import {
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  User,
  onAuthStateChanged,
  signInAnonymously as firebaseSignInAnonymously,
} from "firebase/auth";
import { auth } from "./config";

const provider = new GoogleAuthProvider();

export const signInWithGoogle = async () => {
  if (typeof window === "undefined" || !auth) {
    throw new Error("Firebase Auth not initialized");
  }
  try {
    const result = await signInWithPopup(auth, provider);
    return result.user;
  } catch (error) {
    console.error("Error signing in:", error);
    throw error;
  }
};

export const signInWithGoogleRedirect = async () => {
  if (typeof window === "undefined" || !auth) {
    throw new Error("Firebase Auth not initialized");
  }
  try {
    await signInWithRedirect(auth, provider);
  } catch (error) {
    console.error("Error starting redirect sign-in:", error);
    throw error;
  }
};

export const getGoogleRedirectResult = async () => {
  if (typeof window === "undefined" || !auth) {
    return null;
  }
  try {
    const result = await getRedirectResult(auth);
    return result?.user || null;
  } catch (error) {
    console.error("Error getting redirect result:", error);
    throw error;
  }
};

export const signOut = async () => {
  if (typeof window === "undefined" || !auth) {
    throw new Error("Firebase Auth not initialized");
  }
  try {
    await firebaseSignOut(auth);
  } catch (error) {
    console.error("Error signing out:", error);
    throw error;
  }
};

export const signInAnonymously = async () => {
  if (typeof window === "undefined" || !auth) {
    throw new Error("Firebase Auth not initialized");
  }
  try {
    return await firebaseSignInAnonymously(auth);
  } catch (error) {
    console.error("Error signing in anonymously:", error);
    throw error;
  }
};

export const getCurrentUser = (): Promise<User | null> => {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !auth) {
      resolve(null);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      resolve(user);
    });
  });
};

export const onAuthChange = (callback: (user: User | null) => void) => {
  if (typeof window === "undefined" || !auth) {
    // Return a no-op unsubscribe function if auth is not available
    callback(null);
    return () => { };
  }
  return onAuthStateChanged(auth, callback);
};

