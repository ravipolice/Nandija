import { NextResponse } from 'next/server';
import { getDistricts, getUnits } from '@/lib/firebase/firestore';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const districts = await getDistricts();
        const units = await getUnits();

        // Find Chikkaballapura in districts
        const chikkaDist = districts.find(d => d.name?.toLowerCase().includes('chikka'));

        // Find units missing Chikkaballapura that probably should have it
        const missingInUnits = units.filter(u => {
            if (u.mappingType !== 'subset' && u.mappingType !== 'single') return false;
            if (!u.mappedAreaIds && !u.mappedDistricts) return false;

            const areas = [...(u.mappedAreaIds || []), ...(u.mappedDistricts || [])];
            return !areas.some(a => a.toLowerCase().includes('chikka'));
        }).map(u => ({ name: u.name, type: u.mappingType }));

        return NextResponse.json({
            success: true,
            chikkaInDistricts: chikkaDist,
            allDistricts: districts.map(d => d.name),
            unitsMissingChikka: missingInUnits
        });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
