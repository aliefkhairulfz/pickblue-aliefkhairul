import { NextResponse } from 'next/server';
import { authService } from '@/services/di';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { email } = body;

        if (!email) {
            return NextResponse.json({ ok: false, statusCode: 400, message: 'Email is required', errors: null }, { status: 400 });
        }

        const data = await authService.register({ email });

        return NextResponse.json({ ok: true, statusCode: 201, message: 'Register Successful', data }, { status: 201 });
    } catch (error: any) {
        if (error.message === 'User Already Exists') {
            return NextResponse.json({ ok: false, statusCode: 409, message: error.message, errors: null }, { status: 409 });
        }
        return NextResponse.json({ ok: false, statusCode: 500, message: 'Internal Server Error', errors: error.message }, { status: 500 });
    }
}
