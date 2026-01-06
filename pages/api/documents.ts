import type { NextApiRequest, NextApiResponse } from 'next';

// Allow overriding the Apps Script URL via env so we can switch deployments without code changes
const DOCUMENTS_API_URL =
    process.env.NEXT_PUBLIC_DOCUMENTS_API ||
    "https://script.google.com/macros/s/AKfycby-7jOc_naI1_XDVzG1qAGvNc9w3tIU4ZwmCFGUUCLdg0_DEJh7oouF8a9iy5E93-p9zg/exec";

// Default action for fetching documents
const DOCUMENTS_GET_ACTION =
    process.env.NEXT_PUBLIC_DOCUMENTS_GET_ACTION || "getDocuments";

// Get token from environment variable
const getSecretToken = (): string => {
    const envToken = process.env.APPS_SCRIPT_SECRET_TOKEN || process.env.NEXT_PUBLIC_APPS_SCRIPT_SECRET_TOKEN;
    if (envToken && envToken !== "CHANGE_THIS_IN_PRODUCTION") {
        return envToken;
    }
    return "Ravi@PMD_2025_Secure_Token";
};

export const config = {
    api: {
        bodyParser: {
            sizeLimit: '4mb',
        },
        externalResolver: true,
    },
};

// Configure the API route
export const config = {
    maxDuration: 60, // 60 seconds (max for Hobby plan)
    api: {
        externalResolver: true,
    },
};

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method === 'GET') {
        try {
            const token = getSecretToken();
            console.log("📄 Pages API: Fetching documents...");

            const url = `${DOCUMENTS_API_URL}?action=${DOCUMENTS_GET_ACTION}${token && token !== "CHANGE_THIS_IN_PRODUCTION"
                ? `&token=${encodeURIComponent(token)}`
                : ""
                }`;

            const response = await fetch(url, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                },
                cache: "no-store",
                redirect: "follow",
            });

            if (!response.ok) {
                throw new Error(`Apps Script returned ${response.status}`);
            }

            const text = await response.text();
            let data;
            try {
                data = JSON.parse(text);
            } catch (e) {
                console.error("📄 Pages API: JSON parse error", e);
                return res.status(200).json([]);
            }

            // Ensure we return an array
            let documents = [];
            if (Array.isArray(data)) {
                documents = data;
            } else if (data && typeof data === 'object') {
                documents = (data as any).data || (data as any).documents || (data as any).items || [];
                if (!Array.isArray(documents)) {
                    documents = [data];
                }
            }

            return res.status(200).json(documents);
        } catch (error: any) {
            console.error("📄 Pages API: Error:", error);
            return res.status(200).json([]);
        }
    }

    if (req.method === 'POST') {
        try {
            const { action, title, userEmail, fileId, fileBase64, mimeType, category, description, externalUrl } = req.body;

            // Handle DELETE
            if (action === "delete" || action === "deleteDocument") {
                if (!title || !fileId) {
                    return res.status(400).json({ success: false, error: "Missing required fields: title, fileId" });
                }

                const token = getSecretToken();
                const url = `${DOCUMENTS_API_URL}?action=delete${token ? `&token=${encodeURIComponent(token)}` : ''}`;

                const response = await fetch(url, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        action: "delete",
                        title,
                        fileId,
                        userEmail: userEmail || "admin@pmd.com",
                        token,
                    }),
                });

                if (!response.ok) {
                    const errText = await response.text();
                    throw new Error(`Apps Script delete failed: ${response.status} ${errText}`);
                }

                const text = await response.text();
                let data;
                try {
                    data = JSON.parse(text);
                } catch (e) {
                    data = { success: true, message: "Deleted (parse fail fallback)" };
                }

                return res.status(200).json(data);
            }

            // Handle UPLOAD
            if (action === "upload") {
                const token = getSecretToken();
                const url = `${DOCUMENTS_API_URL}?action=upload${token ? `&token=${encodeURIComponent(token)}` : ''}`;

                const payload: any = {
                    action: "upload",
                    title,
                    userEmail: userEmail || "admin@pmd.com",
                    token,
                    category,
                    description
                };

                if (externalUrl) {
                    payload.externalUrl = externalUrl;
                } else if (fileBase64) {
                    payload.fileBase64 = fileBase64;
                    payload.mimeType = mimeType;
                } else {
                    return res.status(400).json({ success: false, error: "Missing file content or external URL" });
                }

                const response = await fetch(url, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload)
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`Upload failed: ${response.status} ${errorText}`);
                }

                const text = await response.text();
                let data;
                try {
                    data = JSON.parse(text);
                } catch (e) {
                    data = { success: true, message: "Uploaded (parse fail fallback)" };
                }

                return res.status(200).json(data);
            }

            return res.status(400).json({ success: false, error: "Invalid action" });

        } catch (error: any) {
            console.error("📄 Pages API: POST Error:", error);
            return res.status(500).json({ success: false, error: error.message });
        }
    }

    res.status(405).json({ error: "Method not allowed" });
}
