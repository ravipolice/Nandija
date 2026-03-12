const { initializeApp } = require("firebase/app");
const { getFirestore, collection, getDocs } = require("firebase/firestore");
const { getAuth, signInAnonymously } = require("firebase/auth");
const fs = require('fs');

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyB_d5ueTul9vKeNw3pmEtCmbF9w1BVkrAQ",
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "pmd-police-mobile-directory",
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

async function run() {
    await signInAnonymously(auth);
    const ranksSnap = await getDocs(collection(db, "rankMaster"));
    const allRanks = [];
    ranksSnap.forEach(doc => {
        const data = doc.data();
        allRanks.push({
            id: doc.id,
            label: data.rank_label,
            requiresMetalNumber: data.requiresMetalNumber
        });
    });

    fs.writeFileSync('allRanksDump.json', JSON.stringify(allRanks, null, 2));
    console.log("Dumped", allRanks.length, "ranks.");
    process.exit(0);
}

run();
