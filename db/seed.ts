import * as dotenv from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { roles } from './schema/auth';

dotenv.config();

const connectionString = process.env.DATABASE_URL || '';

if (!connectionString) {
    throw new Error('DATABASE_URL is not set');
}

const client = postgres(connectionString, { prepare: false });
const db = drizzle(client);

async function seed() {
    console.log('Seeding roles...');

    // Add comment: Map the required roles into an array of insertable objects
    const rolesData = ['user', 'creator', 'admin'].map(name => ({
        name: name as 'user' | 'creator' | 'admin'
    }));

    try {
        // Add comment: Insert roles into the database, ignoring if they already exist
        await db.insert(roles).values(rolesData).onConflictDoNothing();
        console.log('All tables seeded successfully');
    } catch (e) {
        console.error('Error seeding roles:', e);
    }

    process.exit(0);
}

void seed();
