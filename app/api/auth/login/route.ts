import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { authService } from '@/services/di';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { email, password, providerId } = body;
        
        const ipAddress = req.headers.get('x-forwarded-for') || '127.0.0.1';
        const userAgent = req.headers.get('user-agent') || 'Unknown';

        const { sessionToken, user } = await authService.login({
            email,
            password,
            providerId: providerId || 'credentials',
            ipAddress,
            userAgent
        });

        // Set session cookie
        const cookieStore = await cookies();
        cookieStore.set('sessionToken', sessionToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60, // 7 days
            path: '/'
        });

        return NextResponse.json({
            ok: true,
            statusCode: 200,
            message: 'Login Successful',
            data: {
                name: user.name,
                email: user.email,
                verifiedAt: user.verifiedAt,
                roles: user.userRoles.map(r => r.role.name)
            }
        }, { status: 200 });

    } catch (error: any) {
        if (error.message === 'User Not Found' || error.message === 'Account Not Found') {
            return NextResponse.json({ ok: false, statusCode: 404, message: error.message, errors: null }, { status: 404 });
        }
        if (error.message === 'Invalid Password') {
            return NextResponse.json({ ok: false, statusCode: 401, message: error.message, errors: null }, { status: 401 });
        }
        return NextResponse.json({ ok: false, statusCode: 500, message: 'Internal Server Error', errors: error.message }, { status: 500 });
    }
}
