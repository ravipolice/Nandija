const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

// Initialize Firebase Admin (assuming a service account key is available in the project for admin tasks or we can use the default config if running within the same environment, but we might need to use the web SDK if we don't have the service account key locally)

// Instead of admin SDK, I will use the established module in the project to fetch data as it's already configured to talk to the project's Firebase instance.
// But wait, it's a Next.js app, I can just create a temporary API route.

const fs = require('fs');

const code = `
import { NextResponse } from 'next/server';
import { getDistricts } from '@/lib/firebase/firestore';

export async function GET() {
  try {
    const districts = await getDistricts();
    const chikka = districts.find(d => d.name?.toLowerCase().includes('chikka'));
    const allNames = districts.map(d => d.name);
    return NextResponse.json({ found: !!chikka, chikka, allNames });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
`;

fs.writeFileSync('C:/Users/ravip/AndroidStudioProjects/nandija/app/api/check-districts/route.ts', code);
console.log('Created temporary API route for checking districts.');
