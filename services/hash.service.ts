import crypto from 'crypto';

export class HashService {
    // Generate a secure random token and its HMAC-SHA256 hash using crypto
    public generateTokenWithHash() {
        const rawToken = crypto.randomBytes(32).toString('hex');
        const hashedToken = this.hashToken(rawToken);
        return { rawToken, hashedToken };
    }

    // Hashes a token using HMAC-SHA256
    public hashToken(token: string): string {
        return crypto
            .createHmac('sha256', process.env.AUTH_SECRET || 'fallback-secret-key-do-not-use-in-prod')
            .update(token)
            .digest('hex');
    }
}
