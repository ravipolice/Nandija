const { initializeApp } = require("firebase/app");
const { getFirestore, collection, getDocs } = require("firebase/firestore");
const { getAuth, signInAnonymously } = require("firebase/auth");

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
        const uSnap = await getDocs(collection(db, "units"));
        console.log("Total units in DB:", uSnap.size);
        uSnap.forEach(u => {
            const data = u.data();
            console.log(`Unit: ${data.name}`);
            console.log(`  scopes:`, data.scopes);
            console.log(`  mappedAreaIds:`, data.mappedAreaIds);
            console.log(`  mappedDistricts:`, data.mappedDistricts);
            console.log(`  applicableRanks:`, data.applicableRanks);
        });
    } catch (e) {
        console.error("Error:", e);
    }
}

run();
