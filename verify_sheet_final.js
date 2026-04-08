const https = require('https');

const SHEET_ID = '1lQ_tHHXnRVo6QzIT0lTQWKq4GU-YVPhAYud9b0mMq6w';
const GID = '610933366';
const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${GID}`;

console.log('Checking URL:', CSV_URL);

https.get(CSV_URL, (res) => {
    let data = '';
    
    // Check for redirect (Google does this)
    if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        console.log('Redirecting to:', res.headers.location);
        https.get(res.headers.location, (res2) => {
            let data2 = '';
            res2.on('data', (chunk) => data2 += chunk);
            res2.on('end', () => verify(data2));
        }).on('error', (err) => console.error('Error on redirect:', err.message));
        return;
    }

    res.on('data', (chunk) => data += chunk);
    res.on('end', () => verify(data));
}).on('error', (err) => console.error('Error fetching CSV:', err.message));

function verify(csvData) {
    if (!csvData) {
        console.log('No data received');
        return;
    }
    
    // Split into lines
    const lines = csvData.split('\n').filter(l => l.trim().length > 0);
    console.log('Total Lines detected:', lines.length);
    
    // Search for header row
    let headerIdx = -1;
    for (let i = 0; i < Math.min(lines.length, 50); i++) {
        const row = lines[i].toLowerCase();
        if (row.includes('country') && (row.includes('mission city') || row.includes('city'))) {
            headerIdx = i;
            break;
        }
    }
    
    if (headerIdx !== -1) {
        const headers = lines[headerIdx].split(',').map(h => h.trim());
        console.log('\n✅ Headers found at line', headerIdx + 1);
        console.log('--- Headers ---');
        headers.forEach((h, i) => console.log(`[${i}] ${h}`));
        
        const colIdx = headers.findIndex(h => h.toLowerCase().includes('cost of living') || h.toLowerCase().includes('coli'));
        if (colIdx !== -1) {
            console.log(`\n✅ "Cost of Living" (Title: "${headers[colIdx]}") found at index ${colIdx}`);
            const dataRow = (lines[headerIdx + 1] || '').split(',');
            console.log(`Sample value: ${dataRow[colIdx] || '(empty)'}`);
        } else {
            console.log('\n❌ "Cost of Living" or "COLI" NOT found.');
        }
    } else {
        console.log('\n❌ Could not find header row. Sample of first 3 lines:');
        lines.slice(0, 3).forEach(l => console.log('>', l));
    }
}
