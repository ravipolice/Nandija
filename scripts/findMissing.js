const { initializeApp } = require("firebase/app");
const { getFirestore, collection, getDocs } = require("firebase/firestore");
const { getAuth, signInAnonymously } = require("firebase/auth");
const fs = require('fs');

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyB_d5ueTul9vKeNw3pmEtCmbF9w1BVkrAQ",
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "pmd-police-mobile-directory.firebaseapp.com",
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "pmd-police-mobile-directory",
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

async function run() {
    try {
        const cred = await signInAnonymously(auth);
        const uSnap = await getDocs(collection(db, "units"));
        let missingUnits = [];

        uSnap.forEach(u => {
            const data = u.data();
            if (data.mappingType === "subset" || data.mappingType === "single") {
                const areas = [...(data.mappedAreaIds || []), ...(data.mappedDistricts || [])];
                if (!areas.some(a => a.toLowerCase().includes('chikka'))) {
                    missingUnits.push(data.name);
                }
            }
        });

        fs.writeFileSync('missing.json', JSON.stringify({ missingUnits }, null, 2));
        console.log("Done");
    } catch (e) {
        console.error("Error:", e);
    }
}

run();
