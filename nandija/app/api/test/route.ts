import { NextResponse } from "next/server";

// Force dynamic rendering (MANDATORY for Next.js 15 API routes on Vercel)
export const dynamic = "force-dynamic";

export const runtime = 'nodejs';

export async function GET() {
  return NextResponse.json({ 
    message: 'API route works!',
    timestamp: new Date().toISOString(),
    path: '/api/test'
  });
}

