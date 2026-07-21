import prisma from './src/lib/db/prisma';
import bcrypt from 'bcryptjs';

async function main() {
  const newPassword = await bcrypt.hash('admin123', 10);
  const user = await prisma.user.update({ 
    where: { email: 'admin@lensflow.kz' },
    data: { password: newPassword }
  });
  console.log('Password updated to admin123');
}
main().catch(console.error).finally(() => process.exit(0));
