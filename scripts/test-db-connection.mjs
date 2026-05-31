import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('DATABASE_URL=', process.env.DATABASE_URL?.slice(0, 60) + (process.env.DATABASE_URL && process.env.DATABASE_URL.length > 60 ? '...' : ''));
    await prisma.$connect();
    console.log('Prisma connected successfully');
    const res = await prisma.$queryRaw`SELECT 1 as val`;
    console.log('Query result:', res);
  } catch (err) {
    console.error('Prisma connection error:');
    console.error(err);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();
