import { NextResponse } from "next/server";

// Minimal test route to verify API routes work on Vercel
export const dynamic = "force-dynamic";
export const runtime = 'nodejs';

export async function GET() {
  return NextResponse.json({ 
    message: 'Hello from Vercel API!',
    timestamp: new Date().toISOString(),
    path: '/api/hello',
    working: true
  });
}




