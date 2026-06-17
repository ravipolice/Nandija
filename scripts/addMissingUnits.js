const { initializeApp } = require("firebase/app");
const { getFirestore, collection, getDocs, addDoc } = require("firebase/firestore");
const { getAuth, signInAnonymously } = require("firebase/auth");

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyB_d5ueTul9vKeNw3pmEtCmbF9w1BVkrAQ",
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "pmd-police-mobile-directory.firebaseapp.com",
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "pmd-police-mobile-directory",
};

const DEFAULT_UNITS = [
  "Admin", "ASC Team", "BDDS", "C Room", "CAR", "CCB", "CCRB", "CDR", "CEN", "CID",
  "Coast Guard", "Computer", "Court", "CSB", "CSP", "DAR", "DCIB", "DCRB", "DCRE",
  "Dog Squad", "DSB", "ERSS", "ESCOM", "Excise", "Fire", "Forest", "FPB", "FRRO",
  "FSL", "Guest House", "Health", "Home Guard", "INT", "IPS", "ISD", "KSRP", "Lokayukta", "L&O",
  "Ministrial", "Minisrial", "Others", "Prison", "PTS", "Railway", "RTO",
  "S INT", "SCRB", "Social Media", "State INT", "Toll", "Traffic", "VVIP", "Wireless"
];

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

async function run() {
    try {
        console.log("Signing in anonymously...");
        await signInAnonymously(auth);
        
        console.log("Fetching existing units from Firestore...");
        const uSnap = await getDocs(collection(db, "units"));
        const existingNames = new Set();
        uSnap.forEach(doc => {
            const name = doc.data().name;
            if (name) {
                existingNames.add(name.trim().toLowerCase());
            }
        });
        
        console.log(`Found ${existingNames.size} existing units in Firestore.`);
        
        let addedCount = 0;
        for (const unitName of DEFAULT_UNITS) {
            const normalized = unitName.trim().toLowerCase();
            if (!existingNames.has(normalized)) {
                console.log(`Adding missing unit: ${unitName}`);
                await addDoc(collection(db, "units"), {
                    name: unitName.trim(),
                    isActive: true,
                    mappingType: "all",
                    scopes: [],
                    mappedAreaIds: [],
                    mappedDistricts: [],
                    applicableRanks: [],
                    dutyRoles: [],
                    stationKeyword: "",
                    hideFromRegistration: false,
                    hiddenFields: [],
                    isDistrictLevel: false,
                    isHqLevel: false
                });
                addedCount++;
            }
        }
        
        console.log(`Successfully added ${addedCount} missing units to Firestore!`);
        process.exit(0);
    } catch (e) {
        console.error("Error during execution:", e);
        process.exit(1);
    }
}

run();
