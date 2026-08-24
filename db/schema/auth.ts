import { pgTable, text, timestamp, unique, index, uuid } from 'drizzle-orm/pg-core';

/** Registered users of the platform. */
export const users = pgTable('users', {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    email: text('email').notNull().unique(),
    image: text('image'),
    /** Timestamp when email was verified (null = not verified). */
    verifiedAt: timestamp('verified_at', { mode: 'date' }),
    /** Soft-delete timestamp (null = active). */
    deletedAt: timestamp('deleted_at', { mode: 'date' }),
    createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
});

/** Authentication provider accounts linked to a user (supports multiple providers per user). */
export const accounts = pgTable('accounts', {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    /** Unique identifier from the provider (same as userId for credentials). */
    accountId: text('account_id').notNull(),
    /** Provider type: 'credentials' for email/password, 'google' for social. */
    providerId: text('provider_id').notNull(),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    accessTokenExpiredAt: timestamp('access_token_expired_at', { mode: 'date' }),
    refreshTokenExpiredAt: timestamp('refresh_token_expired_at', { mode: 'date' }),
    scope: text('scope'),
    idToken: text('id_token'),
    /** Argon2-hashed password (only for credentials provider). */
    password: text('password'),
    createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
}, (table) => [
    unique().on(table.userId, table.providerId)
]);

/** Active login sessions — token is stored as HMAC-SHA256 hash. */
export const sessions = pgTable('sessions', {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    /** HMAC-SHA256 hash of the raw session token. */
    token: text('token').notNull(),
    /** Session expiry timestamp (default 7 days from creation). */
    expiredAt: timestamp('expired_at', { mode: 'date' }).notNull(),
    /** Client IP at time of login. */
    ipAddress: text('ip_address'),
    /** User-agent header at time of login. */
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
}, (table) => [
    index('session_token_idx').on(table.token)
]);

/** Verification tokens for email verification, password resets, and order confirmations. */
export const verifications = pgTable('verifications', {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
    /** Token type: email_verification, password_reset, or order_confirmation. */
    type: text('type').$type<'email_verification' | 'password_reset' | 'order_confirmation'>().notNull(),
    /** HMAC-SHA256 hash of the raw verification token. */
    tokenHash: text('token_hash').notNull(),
    /** Optional numeric code for alternative verification. */
    code: text('code'),
    /** Token expiry timestamp. */
    expiredAt: timestamp('expired_at', { mode: 'date' }).notNull(),
    createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
});

/** Predefined roles for RBAC: user, creator, admin. Seeded via pnpm run seed:db. */
export const roles = pgTable('roles', {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').$type<'user' | 'creator' | 'admin'>().notNull().unique(),
    isActive: text('is_active').notNull().default('true'),
    createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
});

/** Many-to-many join table linking users to roles. */
export const userRoles = pgTable('user_roles', {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    roleId: uuid('role_id').notNull().references(() => roles.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
}, (table) => [
    unique().on(table.userId, table.roleId)
]);
