import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as authSchema from './schema/auth';

// Add comments for important code: Check if DATABASE_URL is provided, fallback to dummy string for type checking (though will fail at runtime if queried)
const connectionString = process.env.DATABASE_URL || 'postgres://localhost:5432/postgres';

// Disable prefetch as it is not supported for "Transaction" pool mode in Supabase if you are using Supabase transaction pooler.
const client = postgres(connectionString, { prepare: false });

export const db = drizzle(client, { schema: { ...authSchema } });

export type DbConnection = typeof db;
