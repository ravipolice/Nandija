import { NextResponse } from 'next/server';
import Papa from 'papaparse';

const SHEET_ID = '1lQ_tHHXnRVo6QzIT0lTQWKq4GU-YVPhAYud9b0mMq6w';
const GID = '0'; // "All Missions (Master)" tab
const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${GID}`;

export async function GET() {
  try {
    const response = await fetch(CSV_URL, {
      cache: 'no-store', // Disable cache for debugging
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch sheet data: ${response.statusText}`);
    }

    const csvData = await response.text();
    const parsedData = Papa.parse(csvData, {
      skipEmptyLines: true,
    });

    const rows = parsedData.data as string[][];
    let headerRowIndex = -1;
    
    // Look for header row in first 10 rows
    for (let i = 0; i < Math.min(rows.length, 10); i++) {
        const r = rows[i].map(c => c.toLowerCase().trim());
        if (r.includes('country') || r.includes('mission city') || r.includes('mission name')) {
            headerRowIndex = i;
            break;
        }
    }

    let validMissions: any[] = [];
    if (headerRowIndex !== -1) {
        const headers = rows[headerRowIndex].map(h => h.replace(/^\uFEFF/, '').trim().toLowerCase());
        console.log('Found Headers at row', headerRowIndex, headers);
        
        const dataRows = rows.slice(headerRowIndex + 1);
        
        const missions = dataRows.map(row => {
            const getVal = (key: string) => {
                const idx = headers.findIndex(h => h === key.toLowerCase() || h.includes(key.toLowerCase()));
                return idx !== -1 && row[idx] ? row[idx].trim() : '';
            };
            
            // Flexible COLI detection
            const coliVal = getVal('coli') || 
                          getVal('cost of living') || 
                          getVal('col') || 
                          getVal('cost of living index');

            return {
                country: getVal('country'),
                city: getVal('mission city') || getVal('city'),
                type: getVal('mission type') || getVal('type'),
                name: getVal('mission name') || getVal('name'),
                region: getVal('region'),
                status: getVal('status'),
                notes: getVal('notes') || getVal('remarks') || getVal('remark'),
                costOfLiving: coliVal,
            };
        });

        // Clean up missions (must have country)
        const cleanedMissions = missions.filter(m => m.country && m.country.toLowerCase() !== 'country');
        
        // Deduplicate missions by Country + City (Keep first occurrence)
        const seen = new Set();
        validMissions = cleanedMissions.filter(m => {
            const country = (m.country || '').toLowerCase().trim();
            const city = (m.city || '').toLowerCase().trim();
            if (!country || !city) return false;
            
            const key = `${country}|${city}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });

        console.log(`Successfully mapped and de-duplicated ${validMissions.length} missions (from ${cleanedMissions.length} total).`);
    } else {
        console.warn('Could not find header row in CSV');
    }

    console.log(`Successfully mapped ${validMissions.length} valid missions.`);


    return NextResponse.json({
      success: true,
      data: validMissions,
      count: validMissions.length,
      residentCount: validMissions.filter(m => m.status === 'Resident').length,
    });
  } catch (error: any) {
    console.error('Error fetching missions:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
