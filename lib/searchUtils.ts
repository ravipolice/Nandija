
/**
 * Smart Search Utility for generating a rich search blob.
 * This mirrors the Android 'SearchUtils.generateSearchBlob' logic to ensure
 * consistent fuzzy search capabilities across platforms.
 * 
 * Features:
 * - Case insensitive (lowercase)
 * - Space removal ("Ravi Kumar" -> "ravikumar")
 * - Dot removal ("B.M. Ravi" -> "bmravi")
 * - Special character removal
 * - Mobile number normalization (matches without +91)
 */
export function generateSmartSearchBlob(...args: (string | null | undefined)[]): string {
    // Filter out null/undefined/empty strings first
    const validArgs = args.filter((arg): arg is string => arg !== null && arg !== undefined && String(arg).trim() !== "");

    if (validArgs.length === 0) return "";

    const uniqueParts = new Set<string>();

    validArgs.forEach(arg => {
        const raw = String(arg).toLowerCase().trim();
        uniqueParts.add(raw);

        // 1. Remove dots (e.g. "b.m. ravi" -> "bm ravi")
        const noDots = raw.replace(/\./g, "");
        if (noDots !== raw) uniqueParts.add(noDots);

        // 2. Remove spaces (e.g. "ravi kumar" -> "ravikumar")
        const noSpaces = raw.replace(/\s+/g, "");
        if (noSpaces !== raw) uniqueParts.add(noSpaces);

        // 3. Remove dots AND spaces (e.g. "b.m. ravi" -> "bmravi")
        const noDotsNoSpaces = noDots.replace(/\s+/g, "");
        if (noDotsNoSpaces !== noSpaces && noDotsNoSpaces !== raw) uniqueParts.add(noDotsNoSpaces);

        // 4. Alpha-numeric only (aggressive cleaning)
        const alphaNumeric = raw.replace(/[^a-z0-9]/g, "");
        if (alphaNumeric !== raw && alphaNumeric !== noSpaces && alphaNumeric !== noDotsNoSpaces) uniqueParts.add(alphaNumeric);

        // 5. Mobile Number Handling
        // If it looks like a phone number (digits, +, -, spaces)
        if (/^[\d+\-\s]+$/.test(raw)) {
            const digits = raw.replace(/\D/g, ""); // extract just digits

            // If starts with 91 and length is > 10 (e.g. 919980...), add version without 91
            if (digits.length > 10 && digits.startsWith("91")) {
                uniqueParts.add(digits.substring(2));
            }

            // Also add pure digits if different from raw
            if (digits !== raw && digits !== alphaNumeric) uniqueParts.add(digits);
        }
    });

    return Array.from(uniqueParts).join(" ");
}
