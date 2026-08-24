import { defineConfig } from 'drizzle-kit';
import { config } from 'dotenv';

config({ path: '.env' });

export default defineConfig({
    dialect: 'postgresql',
    schema: './db/schema/auth.ts',
    out: './migrations',
    dbCredentials: {
        url: process.env.DATABASE_URL!
    }
});
