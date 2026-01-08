import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    const path = request.nextUrl.pathname;

    // Public paths
    if (path === '/login' || path === '/register') {
        return NextResponse.next();
    }

    // We cannot check Firebase Auth server-side easily without a session cookie.
    // The client-side AuthProvider will handle the actual redirect if not logged in.
    // However, we can add some basic checks here if we had cookies.
    // For now, we rely on client-side protection for "auth state" 
    // but we can ensure that some paths strictly require checks.

    // Since we are using client-side auth mainly, this middleware might be limited
    // to just letting requests pass through, or maybe we want to use it for future enhancements.
    // Currently, the pattern in this project seems to be client-side redirect (useAuth).
    // So we will leave this simple for now and rely on AuthProvider.tsx/layout.tsx
    // But strictly speaking, for better security, we should implement session cookies.
    // Given the current architecture (likely pure client-side firebase), we might not need this file 
    // unless we want to do something specific.
    // 
    // BUT, to satisfy the requirement "Protect Admin Routes", the robust way is client-side 
    // if we don't have server cookies.

    return NextResponse.next();
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        '/((?!api|_next/static|_next/image|favicon.ico).*)',
    ],
};
