import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { authService } from '@/services/di';

export async function POST(req: Request) {
    try {
        const cookieStore = await cookies();
        const sessionToken = cookieStore.get('sessionToken')?.value;
        
        if (!sessionToken) {
            return NextResponse.json({ ok: false, statusCode: 401, message: 'Unauthorized', errors: null }, { status: 401 });
        }

        const currentUser = await authService.getAuthenticatedUser({ sessionToken });
        await authService.logout({ user: currentUser });
        
        cookieStore.delete('sessionToken');

        return NextResponse.json({ ok: true, statusCode: 200, message: 'Logout Sucessful', data: { email: currentUser.email } }, { status: 200 });
    } catch (error: any) {
        return NextResponse.json({ ok: false, statusCode: 500, message: 'Internal Server Error', errors: error.message }, { status: 500 });
    }
}
