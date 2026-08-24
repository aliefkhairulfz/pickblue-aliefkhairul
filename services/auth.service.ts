import argon2 from 'argon2';
import { addDays, isPast } from 'date-fns';
import { and, eq, inArray } from 'drizzle-orm';
import { Resend } from 'resend';
import { db, DbConnection } from '../db';
import { accounts, roles, sessions, userRoles, users, verifications } from '../db/schema/auth';
import { HashService } from './hash.service';

export type RegisterArgs = {
    name: string;
    email: string;
    password?: string;
    providerId: 'credentials' | 'google';
};

export type LoginArgs = {
    email: string;
    password?: string;
    providerId: string;
    ipAddress?: string;
    userAgent?: string;
};

export type RegisterVerificationArgs = {
    email: string;
    token: string;
};

export class AuthService {
    constructor(
        private readonly db: DbConnection,
        private readonly mail: Resend,
        private readonly hashService: HashService,
    ) {}

    /** Register a new user with credentials provider — inserts user + account, sends verification email. */
    public async register(args: RegisterArgs) {
        if (args.providerId === 'credentials') {
            if (!args.password) throw new Error('Password is required for credentials provider');

            const [existingUser] = await this.db.select().from(users).where(eq(users.email, args.email));
            // Add comment: Check if user already exists
            if (existingUser) throw new Error('Email is already in use');

            // Add comment: Insert new user
            const [user] = await this.db
                .insert(users)
                .values({
                    name: args.name,
                    email: args.email,
                })
                .returning();

            // Add comment: Hash the password and create account
            const hashedPassword = await argon2.hash(args.password);
            const [account] = await this.db
                .insert(accounts)
                .values({
                    userId: user.id,
                    accountId: user.id, // for credentials, accountId is userId
                    providerId: args.providerId,
                    password: hashedPassword,
                })
                .returning();

            await this.defineUserRoles(user.email, user.id);

            // Add comment: Generate and store verification token
            const { rawToken, hashedToken } = this.hashService.generateTokenWithHash();
            await this.db.insert(verifications).values({
                userId: user.id,
                type: 'email_verification',
                tokenHash: hashedToken,
                expiredAt: addDays(new Date(), 1),
            });

            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
            const redirectUrl = `${frontendUrl}/register-verification?e=${args.email}&t=${rawToken}`;
            
            // Add comment: Send verification email
            const sendEmail = await this.mail.emails.send({
                from: `FT3 <verification@${process.env.APP_MAIL_NAME || 'example.com'}>`,
                to: args.email,
                subject: 'Email Verification',
                html: `<p>Please verify your email by clicking <a href="${redirectUrl}">here</a>.</p>`, // Simplified template
            });
            if (sendEmail.error !== null) throw new Error('Sending email failed');

            return {
                name: user.name,
                email: user.email,
                account: { userId: account.userId, providerId: account.providerId },
                verificationUrl: redirectUrl,
            };
        } else {
            throw new Error('Social login not implemented');
        }
    }

    /** Authenticate user with credentials — validates password, creates session, returns raw session token. */
    public async login(args: LoginArgs) {
        if (args.providerId === 'credentials') {
            if (!args.password) throw new Error('Password is required for credentials provider');

            // Add comment: Find user by email
            const [user] = await this.db.select().from(users).where(eq(users.email, args.email));
            if (!user) throw new Error('Email not found');

            // Add comment: Find account linked to user
            const [account] = await this.db
                .select()
                .from(accounts)
                .where(and(eq(accounts.userId, user.id)));
            if (!account || !account.password) throw new Error('Account not found');

            // Add comment: Verify password using argon2
            const isPasswordValid = await argon2.verify(account.password, args.password);
            if (!isPasswordValid) throw new Error('Password does not match');

            // Add comment: Generate session token and store in DB
            const { rawToken, hashedToken } = this.hashService.generateTokenWithHash();
            await this.db.insert(sessions).values({
                userId: user.id,
                token: hashedToken,
                expiredAt: addDays(new Date(), 7),
                ipAddress: args.ipAddress,
                userAgent: args.userAgent,
            });

            return { email: args.email, sessionToken: rawToken };
        } else {
             throw new Error('Social login not implemented');
        }
    }

    /** Verify a user's email address using the verification token sent at registration. */
    public async registerVerification(args: RegisterVerificationArgs) {
        // Add comment: Look up user by email
        const [user] = await this.db.select().from(users).where(eq(users.email, args.email));
        if (!user) throw new Error('Email not found');
        if (user.verifiedAt) throw new Error('Email already verified');

        // Add comment: Verify token hash matches DB record
        const hashedToken = this.hashService.hashToken(args.token);
        const [verification] = await this.db
            .select()
            .from(verifications)
            .where(and(eq(verifications.userId, user.id), eq(verifications.tokenHash, hashedToken), eq(verifications.type, 'email_verification')));
        if (!verification) throw new Error('Verification token not found');
        if (isPast(verification.expiredAt)) throw new Error('Verification token has expired');

        // Add comment: Mark user as verified and delete token
        await this.db.update(users).set({ verifiedAt: new Date() }).where(eq(users.id, user.id));
        await this.db.delete(verifications).where(eq(verifications.id, verification.id));

        return { email: user.email, verified: true };
    }

    /** Delete a session by its raw token (hashed before query). */
    public async logout(sessionToken: string) {
        const hashedToken = this.hashService.hashToken(sessionToken);
        // Add comment: Delete session from DB
        await this.db.delete(sessions).where(eq(sessions.token, hashedToken));
    }

    /** Resolve authenticated user from raw session token — validates session, fetches user + roles. (Caching removed per user request) */
    public async getAuthenticatedUser(sessionToken: string) {
        const hashedToken = this.hashService.hashToken(sessionToken);
        
        // Add comment: Look up active session
        const [session] = await this.db.select({ expiresAt: sessions.expiredAt, userId: sessions.userId }).from(sessions).where(eq(sessions.token, hashedToken));
        if (!session) throw new Error('Unauthorized, session not found');
        if (isPast(session.expiresAt)) throw new Error('Unauthorized, session expired');

        // Add comment: Fetch user info
        const [user] = await this.db
            .select({
                id: users.id,
                name: users.name,
                email: users.email,
                verifiedAt: users.verifiedAt,
                image: users.image,
            })
            .from(users)
            .where(eq(users.id, session.userId));
        if (!user) throw new Error('Unauthorized, user not found');

        // Add comment: Fetch user roles
        const userRolesData = await this.db.select().from(userRoles).leftJoin(roles, eq(userRoles.roleId, roles.id)).where(eq(userRoles.userId, user.id));
        const userWithRoles = { ...user, roles: userRolesData.map(userRole => userRole.roles?.name).filter(r => r !== undefined) };

        return userWithRoles;
    }

    /** Define User Roles. */
    private async defineUserRoles(email: string, userId: string) {
        // Add comment: Get role IDs from DB
        const getRoles = await this.db
            .select({ id: roles.id, name: roles.name })
            .from(roles)
            .where(inArray(roles.name, ['user', 'admin']));

        // Add comment: Assign admin role to specific email, otherwise default to user role
        if (email === 'admin@ft3.id') {
            await this.db.insert(userRoles).values(getRoles.filter(r => r.name !== 'user').map(r => ({ userId: userId, roleId: r.id })));
        } else {
            await this.db.insert(userRoles).values(getRoles.filter(r => r.name === 'user').map(r => ({ userId: userId, roleId: r.id })));
        }
    }
}
