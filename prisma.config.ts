import path from 'node:path';
import { defineConfig } from 'prisma/config';
import dotenv from 'dotenv';
import fs from 'node:fs';

const root = __dirname;

// Try loading all possible env files
for (const name of ['.env.local', '.env']) {
    const p = path.join(root, name);
    if (fs.existsSync(p)) {
        dotenv.config({ path: p, override: false });
    }
}

const dbUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;

export default defineConfig({
    schema: path.join(root, 'prisma', 'schema.prisma'),
    datasource: {
        url: dbUrl!,
    },
    migrations: {
        seed: 'npx ts-node --compiler-options {"module":"commonjs"} prisma/seed.ts',
    },
});
