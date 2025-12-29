import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { storage } from "./config";

export const uploadFile = async (
  path: string,
  file: File
): Promise<string> => {
  if (!storage) {
    throw new Error("Firebase Storage is not initialized");
  }
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
};

export const deleteFile = async (path: string): Promise<void> => {
  if (!storage) {
    throw new Error("Firebase Storage is not initialized");
  }
  const storageRef = ref(storage, path);
  await deleteObject(storageRef);
};



