import { NextResponse } from 'next/server';
import { authService } from '@/services/di';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { name, email, password, role, token, providerId } = body;

        if (!name || !email || !password || !role || !token || !providerId) {
            return NextResponse.json({ ok: false, statusCode: 400, message: 'Missing required fields', errors: null }, { status: 400 });
        }

        const user = await authService.registerUser({
            name,
            email,
            password,
            role,
            token,
            providerId: providerId
        });

        return NextResponse.json({
            ok: true,
            statusCode: 201,
            message: 'Register User Successful',
            data: {
                name: user.name,
                email: user.email,
                verifiedAt: user.verifiedAt
            }
        }, { status: 201 });
    } catch (error: any) {
        if (error.message === 'Register Verification Not Found') {
            return NextResponse.json({ ok: false, statusCode: 404, message: error.message, errors: null }, { status: 404 });
        }
        if (error.message === 'Verification Token Expired' || error.message === 'Role Not Seeded') {
            return NextResponse.json({ ok: false, statusCode: 401, message: error.message, errors: null }, { status: 401 });
        }
        return NextResponse.json({ ok: false, statusCode: 500, message: 'Internal Server Error', errors: error.message }, { status: 500 });
    }
}
