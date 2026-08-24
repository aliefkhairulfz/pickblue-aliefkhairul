import { NextRequest } from 'next/server';
import { getCurrentUser } from '../../../../lib/auth';
import { createSuccessResponse, createErrorResponse } from '../../../../utils/response';

export async function GET(req: NextRequest) {
    try {
        // Add comment: Fetch current authenticated user using session token
        const user = await getCurrentUser();

        if (!user) {
            return createErrorResponse('Unauthorized', 401);
        }

        return createSuccessResponse(user, 200);
    } catch (error: any) {
        return createErrorResponse(error.message || 'Internal Server Error', 500);
    }
}
