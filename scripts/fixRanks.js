const { initializeApp } = require("firebase/app");
const { getFirestore, updateDoc, doc } = require("firebase/firestore");

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyB_d5ueTul9vKeNw3pmEtCmbF9w1BVkrAQ",
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "pmd-police-mobile-directory",
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
    const ranksToUpdate = ["PC", "HC", "PCW", "HCW"];

    for (const r of ranksToUpdate) {
        const ref = doc(db, "rankMaster", r);
        try {
            await updateDoc(ref, { requiresMetalNumber: true });
            console.log("Updated", r, "to requiresMetalNumber: true");
        } catch (e) {
            console.error("Failed to update", r, e);
        }
    }
}

run();
