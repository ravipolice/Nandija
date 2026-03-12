// Same pattern as the original fixRanks.js that succeeded (no explicit auth)
const { initializeApp } = require("firebase/app");
const { getFirestore, doc, updateDoc } = require("firebase/firestore");

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyB_d5ueTul9vKeNw3pmEtCmbF9w1BVkrAQ",
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "pmd-police-mobile-directory",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Rank display order: PC group → HC group → ASI group → PSI → PI → Officers → Support
const RANK_ORDER = [
    // PC Group
    "PC", "APC", "WPC", "PCW", "CPC", "S.RPC",
    // HC Group
    "HC", "AHC", "WHC", "CHC", "HCW", "S.RHC",
    // ASI Group
    "ASI", "WASI", "ARSI", "ASIW", "S.ARSI",
    // RSI / PSI Group
    "RSI", "S.RSI", "PSI", "PSIW", "WPSI",
    // PI Group
    "PI", "PIW", "RPI", "S.RPI", "CPI", "WPI",
    // Officers
    "ACP", "DSP", "ADDL_SP", "SP", "ASST.CMDT", "DEPT.CMDT", "CMDT",
    "DCP", "DIG", "IGP", "ADGP", "DG", "DG_IGP",
    // Ministerial / Support
    "FDA", "SDA", "SS", "STENO", "TYPIST", "PA", "FOLLOWER",
    // Intelligence / Others
    "IA", "AIO", "IO", "SIA", "CIO", "AAO", "AD", "DD", "AO", "ALL"
];

async function run() {
    let order = 1;
    for (const rankId of RANK_ORDER) {
        const ref = doc(db, "rankMaster", rankId);
        try {
            await updateDoc(ref, { seniority_order: order });
            console.log(`✅ ${rankId} -> seniority_order: ${order}`);
            order++;
        } catch (e) {
            console.warn(`⚠️  Skipped ${rankId}: ${e.message}`);
        }
    }
    console.log(`\nDone. Updated ${order - 1} ranks.`);
    process.exit(0);
}

run();
