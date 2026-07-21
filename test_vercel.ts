import prisma from './src/lib/db/prisma';

async function main() {
  const req = await fetch('https://lensflow-crm.vercel.app/api/organizations/branches', {
    headers: {
      'cookie': 'authjs.session-token=...' // Wait, I can't easily get the session token.
    }
  });
}
