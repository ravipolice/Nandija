const admin = require("firebase-admin");
const path = require("path");

// Path to the service account key in the PoliceMobileDirectory project
const serviceAccountPath = "C:\\Users\\ravip\\AndroidStudioProjects\\PoliceMobileDirectory\\serviceAccountKey.json";

admin.initializeApp({
  credential: admin.credential.cert(require(serviceAccountPath)),
  projectId: "pmd-police-mobile-directory"
});

const db = admin.firestore();

const DEFAULT_UNITS = [
  "Admin", "ASC Team", "BDDS", "C Room", "CAR", "CCB", "CCRB", "CDR", "CEN", "CID",
  "Coast Guard", "Computer", "Court", "CSB", "CSP", "DAR", "DCIB", "DCRB", "DCRE",
  "Dog Squad", "DSB", "ERSS", "ESCOM", "Excise", "Fire", "Forest", "FPB", "FRRO",
  "FSL", "Guest House", "Health", "Home Guard", "INT", "IPS", "ISD", "KSRP", "Lokayukta", "L&O",
  "Ministrial", "Minisrial", "Others", "Prison", "PTS", "Railway", "RTO",
  "S INT", "SCRB", "Social Media", "State INT", "Toll", "Traffic", "VVIP", "Wireless"
];

async function run() {
    try {
        console.log("Fetching existing units from Firestore...");
        const uSnap = await db.collection("units").get();
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
                await db.collection("units").add({
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
