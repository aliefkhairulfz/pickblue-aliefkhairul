import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { authService } from '../../../../services/di';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { email, password, providerId } = body;

        // Add comment: Extract IP and User-Agent for session tracking
        const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('remote-addr') || 'unknown';
        const userAgent = req.headers.get('user-agent') || 'unknown';

        // Add comment: Delegate logic to AuthService
        const result = await authService.login({
            email,
            password,
            providerId: providerId || 'credentials',
            ipAddress,
            userAgent
        });

        // Add comment: Set HttpOnly cookie for session token
        const cookieStore = await cookies();
        cookieStore.set('sessionToken', result.sessionToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60, // 7 days
            path: '/'
        });

        return NextResponse.json({ email: result.email, success: true }, { status: 200 });
    } catch (error: any) {
        // Add comment: Map known errors to proper HTTP statuses
        let status = 400;
        if (error.message === 'Email not found' || error.message === 'Account not found') status = 404;
        else if (error.message === 'Password does not match') status = 401;

        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status });
    }
}
