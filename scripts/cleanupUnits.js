const admin = require("firebase-admin");
const serviceAccountPath = "C:\\Users\\ravip\\AndroidStudioProjects\\PoliceMobileDirectory\\serviceAccountKey.json";

admin.initializeApp({
  credential: admin.credential.cert(require(serviceAccountPath)),
  projectId: "pmd-police-mobile-directory"
});

const db = admin.firestore();

// Names to remove (case-insensitive)
const NAMES_TO_REMOVE = ["s int", "int", "minisrial", "ministrial"];

async function run() {
    try {
        console.log("Fetching all units from Firestore...");
        const uSnap = await db.collection("units").get();
        
        let deleteCount = 0;
        const promises = [];
        
        uSnap.forEach(doc => {
            const name = doc.data().name;
            if (name) {
                const normalized = name.trim().toLowerCase();
                if (NAMES_TO_REMOVE.includes(normalized)) {
                    console.log(`Deleting unit: "${name}" (ID: ${doc.id})`);
                    promises.push(doc.ref.delete());
                    deleteCount++;
                }
            }
        });
        
        if (promises.length > 0) {
            await Promise.all(promises);
            console.log(`Successfully deleted ${deleteCount} units!`);
        } else {
            console.log("No units found matching the cleanup names.");
        }
        
        process.exit(0);
    } catch (e) {
        console.error("Error during execution:", e);
        process.exit(1);
    }
}

run();
