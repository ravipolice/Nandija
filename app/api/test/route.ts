import { NextResponse } from "next/server";

export const runtime = 'nodejs';

export async function GET() {
  return NextResponse.json({ 
    message: 'API route works!',
    timestamp: new Date().toISOString(),
    path: '/api/test'
  });
}

