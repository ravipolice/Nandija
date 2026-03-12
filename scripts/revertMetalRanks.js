/**
 * Reverts the incorrectly set requiresMetalNumber: true for PC, HC, HCW, PCW
 * Uses Firestore REST API directly (no Firebase SDK needed).
 */
const https = require("https");

const API_KEY = "AIzaSyB_d5ueTul9vKeNw3pmEtCmbF9w1BVkrAQ";
const PROJECT_ID = "pmd-police-mobile-directory";
const RANKS_TO_REVERT = ["PC", "HC", "PCW", "HCW"];

function patchRank(rankId) {
    return new Promise((resolve, reject) => {
        const body = JSON.stringify({
            fields: {
                requiresMetalNumber: { booleanValue: false }
            }
        });

        const options = {
            hostname: "firestore.googleapis.com",
            path: `/v1/projects/${PROJECT_ID}/databases/(default)/documents/rankMaster/${rankId}?updateMask.fieldPaths=requiresMetalNumber&key=${API_KEY}`,
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                "Content-Length": Buffer.byteLength(body)
            }
        };

        const req = https.request(options, (res) => {
            let data = "";
            res.on("data", chunk => data += chunk);
            res.on("end", () => {
                if (res.statusCode === 200) {
                    console.log(`✅ Reverted ${rankId} -> requiresMetalNumber: false`);
                    resolve();
                } else {
                    console.error(`❌ Failed ${rankId}: HTTP ${res.statusCode}`, data);
                    resolve(); // don't reject - try all
                }
            });
        });

        req.on("error", err => {
            console.error(`❌ Request error for ${rankId}:`, err.message);
            resolve();
        });

        req.write(body);
        req.end();
    });
}

async function run() {
    for (const rank of RANKS_TO_REVERT) {
        await patchRank(rank);
    }
    console.log("Done.");
}

run();
