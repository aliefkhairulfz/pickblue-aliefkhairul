import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import { authService } from '../../../../services/di';
import { createSuccessResponse, createErrorResponse } from '../../../../utils/response';

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

        return createSuccessResponse(null, 200);
    } catch (error: any) {
        return createErrorResponse(error.message || 'Internal Server Error', 500);
    }
}
