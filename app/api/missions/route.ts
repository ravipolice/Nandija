import { NextResponse } from 'next/server';
import Papa from 'papaparse';

const SHEET_ID = '1lQ_tHHXnRVo6QzIT0lTQWKq4GU-YVPhAYud9b0mMq6w';
const GID = '610933366'; // specific tab requested by user
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
    console.log(`CSV Data Sample (Hex): ${Buffer.from(csvData.substring(0, 10)).toString('hex')}`);
    
    const parsedData = Papa.parse(csvData, {
      skipEmptyLines: true,
    });

    const rows = parsedData.data as string[][];
    let headerRowIndex = -1;
    
    for (let i = 0; i < Math.min(rows.length, 50); i++) {
        const r = rows[i].map(c => c.toLowerCase().trim());
        if (r.includes('country') && (r.includes('mission city') || r.includes('city'))) {
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
                const idx = headers.findIndex(h => h === key.toLowerCase());
                return idx !== -1 && row[idx] ? row[idx].trim() : '';
            };
            return {
                country: getVal('Country'),
                city: getVal('Mission City') || getVal('City'),
                type: getVal('Mission Type') || getVal('Type'),
                name: getVal('Mission Name') || getVal('Name'),
                region: getVal('Region'),
                status: getVal('Status'),
                notes: getVal('Notes'),
                costOfLiving: getVal('Cost of Living') || getVal('COL') || getVal('COLI'),
            };
        });

        validMissions = missions.filter(m => m.country && m.country.toLowerCase() !== 'country');
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
