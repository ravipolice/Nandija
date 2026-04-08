const axios = require('axios');
const csv = require('csv-parse/sync');

const SHEET_ID = '1lQ_tHHXnRVo6QzIT0lTQWKq4GU-YVPhAYud9b0mMq6w';
const GID = '610933366';
const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${GID}`;

async function checkSheet() {
    try {
        console.log('Fetching CSV...');
        const response = await axios.get(CSV_URL);
        const csvData = response.data;
        
        const records = csv.parse(csvData, {
            skip_empty_lines: true,
        });

        console.log('Total Rows:', records.length);
        
        // Find header row (dynamically like our API does)
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
            console.log('Headers:', headers.join(' | '));
            
            const firstDataRow = records[headerIdx + 1];
            if (firstDataRow) {
                console.log('First data row samples:');
                headers.forEach((h, i) => {
                    console.log(`  ${h}: ${firstDataRow[i]}`);
                });
            }
            
            const colIdx = headers.findIndex(h => h.toLowerCase().includes('cost of living') || h.toLowerCase().includes('coli'));
            if (colIdx !== -1) {
                console.log(`\n✅ "Cost of Living" column found at index ${colIdx} (Title: "${headers[colIdx]}")`);
            } else {
                console.log('\n❌ "Cost of Living" column NOT found in the headers.');
            }
        } else {
            console.log('\n❌ Could not find a valid header row in the first 50 lines.');
        }

    } catch (error) {
        console.error('Error fetching or parsing CSV:', error.message);
    }
}

checkSheet();
