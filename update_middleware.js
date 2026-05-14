const fs = require('fs');
let mw = fs.readFileSync('middleware.ts', 'utf8');
mw = mw.replace("import { auth } from '@/auth';", "import NextAuth from 'next-auth';\nimport { authConfig } from '@/auth.config';\nconst { auth } = NextAuth(authConfig);");
fs.writeFileSync('middleware.ts', mw);
