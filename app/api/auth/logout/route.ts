import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { authService } from '../../../../services/di';

export async function POST(req: NextRequest) {
    try {
        // Add comment: Read session token from cookie
        const cookieStore = await cookies();
        const sessionToken = cookieStore.get('sessionToken')?.value;

        if (sessionToken) {
            // Add comment: Invalidate session in DB
            await authService.logout(sessionToken);
            // Add comment: Clear cookie
            cookieStore.delete('sessionToken');
        }

        return NextResponse.json({ success: true }, { status: 200 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
