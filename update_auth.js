const fs = require('fs');

let authContent = fs.readFileSync('src/auth.ts', 'utf8');

// Replace the NextAuth options with merging authConfig
authContent = authContent.replace("export const { handlers, signIn, signOut, auth } = NextAuth({", "import { authConfig } from '@/auth.config';\n\nexport const { handlers, signIn, signOut, auth } = NextAuth({\n    ...authConfig,");

// Remove callbacks, pages, session, trustHost from auth.ts
authContent = authContent.replace(/callbacks: \{[\s\S]*?pages: \{/g, 'pages: {');
authContent = authContent.replace(/pages: \{[\s\S]*?trustHost: true,/g, '');

fs.writeFileSync('src/auth.ts', authContent);
