import argon2 from 'argon2';
import { addDays, addMinutes, isPast } from 'date-fns';
import { and, eq, inArray, lt } from 'drizzle-orm';
import { Resend } from 'resend';
import { db, DbConnection } from '../db';
import { accounts, roles, sessions, userRoles, users, verifications } from '../db/schema/auth';
import { HashService } from './hash.service';

export type RegisterSchema = {
    email: string;
};

export type RegisterUserParams = {
    name: string;
    email: string;
    password?: string;
    role: 'user' | 'creator';
    token: string;
    providerId: string;
};

export type LoginParams = {
    email: string;
    password?: string;
    providerId: string;
    ipAddress?: string;
    userAgent?: string;
};

export type AccountVerificationParams = {
    token: string;
    email: string;
};

export type LogoutParams = {
    user: { sessionId: string; [key: string]: any };
};

export type GetAuthenticatedUserParams = {
    sessionToken: string;
};

export class AuthService {
    constructor(
        private readonly db: DbConnection,
        private readonly mail: Resend,
        private readonly hashService: HashService
    ) {}

    public async register(params: RegisterSchema) {
        // Add comment: Check if user already exists
        const [user] = await this.db.select().from(users).where(eq(users.email, params.email));
        if (user) throw new Error('User Already Exists');

        // Add comment: Generate verification token
        const { rawToken, hashedToken } = this.hashService.generateTokenWithHash();

        await this.db.insert(verifications).values({
            type: 'register_verification' as any,
            tokenHash: hashedToken,
            expiredAt: addMinutes(new Date(), 15)
        });

        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        const redirectUrl = `${frontendUrl}/register-verification?e=${params.email}&t=${rawToken}`;

        // Add comment: Send verification email
        const sendEmail = await this.mail.emails.send({
            from: `FT3 <verification@${process.env.APP_MAIL_NAME || 'example.com'}>`,
            to: params.email,
            subject: 'Account Verification',
            html: `<p>Please complete your registration by clicking <a href="${redirectUrl}">here</a>.</p>`
        });

        if (sendEmail.error !== null) throw new Error('Sending Email Failed');

        return { email: params.email };
    }

    public async registerUser(params: RegisterUserParams) {
        return await this.db.transaction(async tx => {
            // find verification token
            const [verification] = await tx
                .select()
                .from(verifications)
                .where(and(eq(verifications.tokenHash, this.hashService.hashToken(params.token)), eq(verifications.type, 'register_verification' as any)));

            if (!verification) throw new Error('Register Verification Not Found');
            if (isPast(verification.expiredAt)) throw new Error('Verification Token Expired');

            // insert user
            const [user] = await tx
                .insert(users)
                .values({
                    name: params.name,
                    email: params.email,
                    verifiedAt: new Date()
                })
                .returning();

            // insert account
            if (params.password) {
                const hashPassword = await argon2.hash(params.password);
                await tx.insert(accounts).values({
                    userId: user.id,
                    accountId: user.id,
                    providerId: params.providerId,
                    password: hashPassword
                });
            }

            // set role
            const [role] = await tx.select().from(roles).where(eq(roles.name, params.role));
            if (!role) throw new Error('Role Not Seeded');

            await tx.insert(userRoles).values({ roleId: role.id, userId: user.id });

            // Note: Omitted creatorBalances since we are explicitly ONLY doing auth/authz
            await tx.delete(verifications).where(eq(verifications.id, verification.id));

            return user;
        });
    }

    public async login(params: LoginParams) {
        return await this.db.transaction(async tx => {
            // find user
            const [user] = await tx.select().from(users).where(eq(users.email, params.email));
            if (!user) throw new Error('User Not Found');

            // find account
            const [account] = await tx
                .select()
                .from(accounts)
                .where(and(eq(accounts.userId, user.id), eq(accounts.providerId, params.providerId)));
            if (!account) throw new Error('Account Not Found');

            // compare password
            if (params.providerId === 'credentials' && params.password) {
                const isPasswordValid = await argon2.verify(account.password as string, params.password);
                if (!isPasswordValid) throw new Error('Invalid Password');
            }

            // fetch user roles
            const userRolesData = await tx.select().from(userRoles).leftJoin(roles, eq(userRoles.roleId, roles.id)).where(eq(userRoles.userId, user.id));

            const userWithRoles = {
                ...user,
                userRoles: userRolesData.map(r => ({ role: r.roles! }))
            };

            // sessions && tokens
            const { rawToken, hashedToken } = this.hashService.generateTokenWithHash();

            await tx.insert(sessions).values({
                token: hashedToken,
                userId: user.id,
                ipAddress: params.ipAddress,
                userAgent: params.userAgent,
                expiredAt: addDays(new Date(), 7)
            });

            return { sessionToken: rawToken, user: userWithRoles };
        });
    }

    public async logout(params: LogoutParams) {
        const [destroyed] = await this.db.delete(sessions).where(eq(sessions.id, params.user.sessionId)).returning();
        if (!destroyed) throw new Error('Session Not Found');
        return destroyed;
    }

    public async accountVerification(params: AccountVerificationParams) {
        const [verification] = await this.db
            .select()
            .from(verifications)
            .where(eq(verifications.tokenHash, this.hashService.hashToken(params.token)));
        if (!verification) throw new Error('Verification Not Found');
        if (isPast(verification.expiredAt)) throw new Error('Verification Token Expired');

        const [user] = await this.db
            .update(users)
            .set({ verifiedAt: new Date() })
            .where(eq(users.id, verification.userId as string))
            .returning();

        return user;
    }

    public async getAuthenticatedUser(params: GetAuthenticatedUserParams) {
        return await this.db.transaction(async tx => {
            const [user] = await tx
                .select({
                    sessionId: sessions.id,
                    userId: users.id,
                    name: users.name,
                    email: users.email,
                    verifiedAt: users.verifiedAt
                })
                .from(sessions)
                .leftJoin(users, eq(sessions.userId, users.id))
                .where(eq(sessions.token, this.hashService.hashToken(params.sessionToken)));

            if (!user || !user.userId || !user.name || !user.email) {
                throw new Error('Session Not Found');
            }

            const usrRoles = await tx.select({ name: roles.name }).from(userRoles).leftJoin(roles, eq(userRoles.roleId, roles.id)).where(eq(userRoles.userId, user.userId));

            return {
                sessionId: user.sessionId,
                userId: user.userId,
                name: user.name,
                email: user.email,
                verifiedAt: user.verifiedAt,
                roles: usrRoles.map(r => r.name)
            };
        });
    }

    public async clearSession() {
        const now = new Date();
        await this.db.delete(sessions).where(lt(sessions.expiredAt, now));
    }
}
