import { NextRequest } from 'next/server';
import { authService } from '../../../../services/di';
import { createSuccessResponse, createErrorResponse } from '../../../../utils/response';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { email, token } = body;

        // Add comment: Delegate email verification logic to AuthService
        const result = await authService.registerVerification({
            email,
            token
        });

        return createSuccessResponse(result, 200);
    } catch (error: any) {
        // Add comment: Handle appropriate status codes
        let status = 400;
        if (error.message === 'Email not found' || error.message === 'Verification token not found') status = 404;
        else if (error.message === 'Email already verified' || error.message === 'Verification token has expired') status = 400;

        return createErrorResponse(error.message || 'Internal Server Error', status);
    }
}
