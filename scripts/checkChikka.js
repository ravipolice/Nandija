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
        const cred = await signInAnonymously(auth);
        console.log("Signed in anonymously:", cred.user.uid);
        const dSnap = await getDocs(collection(db, "districts"));
        console.log("Total districts:", dSnap.size);
        let hasChikka = false;
        dSnap.forEach(d => {
            const data = d.data();
            if (data.name && data.name.toLowerCase().includes('chikka')) {
                hasChikka = true;
                console.log("Found District:", data.name, "- isActive:", data.isActive);
            }
        });
        if (!hasChikka) console.log("NO CHIKKABALLAPURA IN DISTRICTS");

        const uSnap = await getDocs(collection(db, "units"));
        console.log("Total units:", uSnap.size);
        let missingCount = 0;
        uSnap.forEach(u => {
            const data = u.data();
            if (data.mappingType === "subset" || data.mappingType === "single") {
                const areas = [...(data.mappedAreaIds || []), ...(data.mappedDistricts || [])];
                if (!areas.some(a => a.toLowerCase().includes('chikka'))) {
                    console.log("Unit", data.name, "is missing Chikkaballapura in its mapping!");
                    missingCount++;
                }
            }
        });
        console.log("Total units missing Chikkaballapura in mapping:", missingCount);

    } catch (e) {
        console.error("Error:", e);
    }
}

run();
