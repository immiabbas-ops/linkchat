import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient, Prisma } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

let pgPool: Pool | null = null;

function isConnectionError(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return (
      ['P1001', 'P1017', 'P1008', 'P1011'].includes(error.code) ||
      /server has closed|connection terminated/i.test(error.message)
    );
  }

  return (
    error instanceof Error &&
    /connection terminated|server has closed|ECONNRESET|ECONNREFUSED|socket hang up/i.test(
      error.message,
    )
  );
}

function createPrismaClient() {
  const databaseUrl =
    process.env.DATABASE_URL || 'postgresql://postgres@127.0.0.1:5432/postgres';

  pgPool = new Pool({
    connectionString: databaseUrl,
    max: process.env.NODE_ENV === 'development' ? 1 : 10,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 10_000,
  });

  const client = new PrismaClient({ adapter: new PrismaPg(pgPool) });
  const logger = new Logger('PrismaService');

  return client.$extends({
    query: {
      async $allOperations({ args, query }) {
        const run = () => query(args);

        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            return await run();
          } catch (error) {
            if (!isConnectionError(error) || attempt === 2) {
              throw error;
            }

            logger.warn(`Database connection lost — retrying (${attempt + 1}/3)…`);
            await client.$disconnect().catch(() => {});
            await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
            await client.$connect();
          }
        }
      },
    },
  });
}

const ExtendedPrismaClient = class {
  constructor() {
    return createPrismaClient();
  }
} as new () => ReturnType<typeof createPrismaClient>;

@Injectable()
export class PrismaService
  extends ExtendedPrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    for (let attempt = 0; attempt < 10; attempt++) {
      try {
        await this.$connect();
        return;
      } catch {
        await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
      }
    }

    this.logger.error('Could not connect to database after multiple attempts');
    throw new Error('Database unavailable');
  }

  async onModuleDestroy() {
    await this.$disconnect();
    await pgPool?.end();
    pgPool = null;
  }
}
