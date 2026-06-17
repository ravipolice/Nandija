const { initializeApp } = require("firebase/app");
const { getFirestore, collection, getDocs } = require("firebase/firestore");
const { getAuth, signInAnonymously } = require("firebase/auth");
const fs = require("fs");
const path = require("path");

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
        await signInAnonymously(auth);
        const dSnap = await getDocs(collection(db, "districts"));
        console.log("Total districts in DB:", dSnap.size);
        const districts = [];
        dSnap.forEach(d => {
            const data = d.data();
            districts.push({ id: d.id, name: data.name, range: data.range, isActive: data.isActive });
        });
        fs.writeFileSync(path.join(__dirname, "..", "allDistrictsDump.json"), JSON.stringify(districts, null, 2));
        console.log("Wrote allDistrictsDump.json successfully!");
    } catch (e) {
        console.error("Error:", e);
    }
}

run();
