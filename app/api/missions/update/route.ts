import { NextResponse } from 'next/server';

const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_MISSIONS_UPDATE_URL;
const SECRET_TOKEN = process.env.APPS_SCRIPT_SECRET_TOKEN || "Ravi@PMD_2025_Secure_Token";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { mission } = body;

        if (!mission) {
            return NextResponse.json({ success: false, error: "Missing mission data" }, { status: 400 });
        }

        if (!APPS_SCRIPT_URL) {
            console.error("APPS_SCRIPT_MISSIONS_UPDATE_URL is not configured");
            return NextResponse.json({ 
                success: false, 
                error: "Backend not configured for updates. Please set APPS_SCRIPT_MISSIONS_UPDATE_URL in Vercel settings." 
            }, { status: 500 });
        }

        const response = await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                token: SECRET_TOKEN,
                mission: mission
            }),
        });

        if (!response.ok) {
            throw new Error(`Apps Script responded with status: ${response.status}`);
        }

        const result = await response.json();

        return NextResponse.json(result);

    } catch (error: any) {
        console.error('Error updating mission:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}
