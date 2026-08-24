import { cookies } from 'next/headers';
import { authService } from '../services/di';

/**
 * Retrieves the currently authenticated user based on the sessionToken cookie.
 * This can be used safely in Next.js Server Components and Server Actions.
 */
export async function getCurrentUser() {
    try {
        // Add comment: Retrieve session cookie from headers
        const cookieStore = await cookies();
        const sessionToken = cookieStore.get('sessionToken')?.value;

        if (!sessionToken) {
            return null;
        }

        // Add comment: Get user from DB via AuthService using the token
        const user = await authService.getAuthenticatedUser(sessionToken);
        return user;
    } catch (error) {
        // Add comment: Return null if session is invalid/expired
        return null;
    }
}
