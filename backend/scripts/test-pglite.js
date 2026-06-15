const { PGlite } = require('@electric-sql/pglite');
const { PrismaPGlite } = require('pglite-prisma-adapter');
const { PrismaClient } = require('@prisma/client');
const path = require('path');

(async () => {
  const pglite = new PGlite(path.join(process.cwd(), '.pglite'));
  const prisma = new PrismaClient({ adapter: new PrismaPGlite(pglite) });
  await prisma.$connect();
  try {
    const result = await prisma.otpCode.create({
      data: {
        email: 't@test.com',
        code: '123456',
        expiresAt: new Date(Date.now() + 600000),
      },
    });
    console.log('OK', result.id);
  } catch (e) {
    console.error('ERR', e.message);
    console.error('CODE', e.code);
  }
  await prisma.$disconnect();
  await pglite.close();
})();
