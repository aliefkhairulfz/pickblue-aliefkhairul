import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { authService } from '../../../../services/di';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { name, email, password, providerId } = body;

        // Add comment: Delegate logic to AuthService
        const result = await authService.register({
            name,
            email,
            password,
            providerId: providerId || 'credentials'
        });

        return NextResponse.json(result, { status: 201 });
    } catch (error: any) {
        // Add comment: Handle errors gracefully, map common error messages to status codes if needed
        const status = error.message === 'Email is already in use' ? 409 : 400;
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status });
    }
}
