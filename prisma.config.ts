import path from 'node:path';
import { defineConfig } from 'prisma/config';
import dotenv from 'dotenv';

// Explicitly load .env from project root (fixes Windows path issues)
dotenv.config({ path: path.join(__dirname, '.env') });

export default defineConfig({
    schema: path.join(__dirname, 'prisma', 'schema.prisma'),
    datasource: {
        url: process.env.DIRECT_URL || process.env.DATABASE_URL!,
    },
    migrations: {
        seed: 'npx ts-node --compiler-options {"module":"commonjs"} prisma/seed.ts',
    },
});
