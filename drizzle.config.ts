import { defineConfig } from 'drizzle-kit';

export default defineConfig({
    dialect: 'postgresql',
    schema: './db/schema/auth.ts',
    dbCredentials: {
        url: process.env.DATABASE_URL || 'postgres://localhost:5432/postgres'
    }
});
