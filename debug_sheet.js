const Papa = require('papaparse');

const SHEET_ID = '1lQ_tHHXnRVo6QzIT0lTQWKq4GU-YVPhAYud9b0mMq6w';
const GID = '0';
const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${GID}`;

async function checkSheet() {
    try {
        console.log('Fetching CSV from:', CSV_URL);
        const response = await fetch(CSV_URL);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const csvData = await response.text();
        
        const parsed = Papa.parse(csvData, {
            skipEmptyLines: true,
        });

        const records = parsed.data;
        console.log('Total Rows:', records.length);
        
        let headerIdx = -1;
        for (let i = 0; i < Math.min(records.length, 50); i++) {
            const row = records[i].map(c => c.toLowerCase().trim());
            if (row.includes('country') && (row.includes('mission city') || row.includes('city'))) {
                headerIdx = i;
                break;
            }
        }

        if (headerIdx !== -1) {
            const headers = records[headerIdx];
            console.log('Headers found at row', headerIdx);
            
            const dataRows = records.slice(headerIdx + 1);
            const counts = new Map();
            const duplicates = [];

            dataRows.forEach((row, i) => {
                const country = (row[0] || '').trim();
                const city = (row[1] || '').trim();
                if (!country || country.toLowerCase() === 'country') return;
                
                const key = `${country} | ${city}`;
                if (counts.has(key)) {
                    duplicates.push({ key, row: headerIdx + i + 2 });
                }
                counts.set(key, (counts.get(key) || 0) + 1);
            });

            if (duplicates.length > 0) {
                console.log(`\n❌ Found ${duplicates.length} duplicate missions in raw data.`);
                duplicates.slice(0, 5).forEach(d => console.log(` - ${d.key} at Row ${d.row}`));
                
                // Simulate deduplication
                const uniqueMissions = Array.from(counts.keys());
                console.log(`\n✅ AFTER DEDUPLICATION: ${uniqueMissions.length} unique missions will be shown.`);
            } else {
                console.log('\n✅ No duplicates found in raw data.');
            }

            const colIdx = headers.findIndex(h => {
                const low = h.toLowerCase();
                return low.includes('cost of living') || low.includes('coli') || low.includes('col');
            });
            // ... (rest of the script)

            if (colIdx !== -1) {
                console.log(`\n✅ "Cost of Living" column found at index ${colIdx} (Title: "${headers[colIdx]}")`);
                
                // Print sample data
                const range = 5;
                console.log(`\nSample values (Row ${headerIdx + 1} to ${headerIdx + range}):`);
                for (let i = 1; i <= range && (headerIdx + i) < records.length; i++) {
                    const row = records[headerIdx + i];
                    console.log(`Row ${headerIdx + i}: ${row[colIdx] || '(empty)'} [Country: ${row[0]}, City: ${row[1]}]`);
                }
            } else {
                console.log('\n❌ "Cost of Living" column NOT found in the headers.');
                console.log('Available Headers:', headers.map((h, i) => `${i}:[${h}]`).join(' | '));
            }

            console.log('\nFirst Data Row (Sample):');
            const sampleRow = records[headerIdx + 1];
            if (sampleRow) {
                console.log(sampleRow.map((v, i) => `${i}:[${v}]`).join(' | '));
            }
        } else {
            console.log('\n❌ Could not find a valid header row in the first 50 lines.');
            console.log('First 5 rows (Raw):');
            records.slice(0, 5).forEach((r, i) => console.log(`Row ${i}:`, r.join(' | ')));
        }

    } catch (error) {
        console.error('Error:', error.message);
    }
}

checkSheet();
