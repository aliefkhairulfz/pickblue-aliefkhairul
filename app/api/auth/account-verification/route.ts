import { NextResponse } from 'next/server';
import { authService } from '@/services/di';

export async function GET(req: Request) {
    try {
        const url = new URL(req.url);
        const token = url.searchParams.get('token');
        const email = url.searchParams.get('email');

        if (!token || !email) {
            return NextResponse.json({ ok: false, statusCode: 400, message: 'Missing token or email', errors: null }, { status: 400 });
        }

        const user = await authService.accountVerification({ token, email });

        return NextResponse.json({
            ok: true,
            statusCode: 200,
            message: 'Account-Verification Successful',
            data: {
                name: user.name,
                email: user.email,
                verifiedAt: user.verifiedAt
            }
        }, { status: 200 });
    } catch (error: any) {
        if (error.message === 'Verification Not Found') {
            return NextResponse.json({ ok: false, statusCode: 404, message: error.message, errors: null }, { status: 404 });
        }
        if (error.message === 'Verification Token Expired') {
            return NextResponse.json({ ok: false, statusCode: 401, message: error.message, errors: null }, { status: 401 });
        }
        return NextResponse.json({ ok: false, statusCode: 500, message: 'Internal Server Error', errors: error.message }, { status: 500 });
    }
}
