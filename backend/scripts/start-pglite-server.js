const { PGlite } = require('@electric-sql/pglite');
const { PGLiteSocketServer } = require('@electric-sql/pglite-socket');
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const PORT = 5432;
const HOST = '127.0.0.1';
const BACKEND_DIR = path.join(__dirname, '..');
const dataDir =
  process.env.PGLITE_DATA_DIR ||
  path.join(process.env.LOCALAPPDATA || path.join(require('os').homedir(), 'AppData', 'Local'), 'Linkchat', 'pglite');

async function applySchemaDirect(db) {
  const sql = execSync(
    'npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script',
    { encoding: 'utf-8', cwd: BACKEND_DIR },
  );

  try {
    await db.exec(sql);
    console.log('Database schema applied.');
  } catch (error) {
    if (error.code === '42710' || error.message?.includes('already exists')) {
      console.log('Database schema already present.');
      await ensureSchemaPatches(db);
    } else {
      throw error;
    }
  }
}

async function ensureSchemaPatches(db) {
  await ensureChatConnectorsTable(db);
  await ensureTelegramLiveSchema(db);
  await ensureServiceTripsTable(db);
  await ensureChatFeaturesSchema(db);
  await ensureContactsTable(db);
}

async function ensureContactsTable(db) {
  const res = await db.query(`
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'contacts'
  `);
  if (res.rows.length > 0) return;

  await db.exec(`
    CREATE TABLE "contacts" (
      "id" TEXT NOT NULL,
      "userId" TEXT NOT NULL,
      "contactUserId" TEXT NOT NULL,
      "savedName" TEXT NOT NULL,
      "phone" TEXT NOT NULL,
      "notes" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL,
      CONSTRAINT "contacts_pkey" PRIMARY KEY ("id")
    );
    CREATE UNIQUE INDEX "contacts_userId_contactUserId_key" ON "contacts"("userId", "contactUserId");
    CREATE INDEX "contacts_userId_idx" ON "contacts"("userId");
    ALTER TABLE "contacts" ADD CONSTRAINT "contacts_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    ALTER TABLE "contacts" ADD CONSTRAINT "contacts_contactUserId_fkey"
      FOREIGN KEY ("contactUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  `);
  console.log('Applied contacts schema patch.');
}

async function ensureChatFeaturesSchema(db) {
  const archivedCol = await db.query(`
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'chat_members' AND column_name = 'archivedAt'
  `);
  if (archivedCol.rows.length === 0) {
    await db.exec(`ALTER TABLE "chat_members" ADD COLUMN "archivedAt" TIMESTAMP(3);`);
    console.log('Added chat_members.archivedAt column.');
  }

  const pinnedMsgCol = await db.query(`
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'chats' AND column_name = 'pinnedMessageId'
  `);
  if (pinnedMsgCol.rows.length === 0) {
    await db.exec(`ALTER TABLE "chats" ADD COLUMN "pinnedMessageId" TEXT;`);
    console.log('Added chats.pinnedMessageId column.');
  }

  const blockedTable = await db.query(`
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'blocked_users'
  `);
  if (blockedTable.rows.length > 0) return;

  await db.exec(`
    CREATE TABLE "blocked_users" (
      "id" TEXT NOT NULL,
      "userId" TEXT NOT NULL,
      "blockedUserId" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "blocked_users_pkey" PRIMARY KEY ("id")
    );
    CREATE UNIQUE INDEX "blocked_users_userId_blockedUserId_key" ON "blocked_users"("userId", "blockedUserId");
    ALTER TABLE "blocked_users" ADD CONSTRAINT "blocked_users_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    ALTER TABLE "blocked_users" ADD CONSTRAINT "blocked_users_blockedUserId_fkey"
      FOREIGN KEY ("blockedUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  `);
  console.log('Applied blocked_users schema patch.');
}

async function ensureServiceTripsTable(db) {
  const res = await db.query(`
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'services_trips'
  `);
  if (res.rows.length > 0) return;

  await db.exec(`
    CREATE TABLE "services_trips" (
      "id" TEXT NOT NULL,
      "userId" TEXT NOT NULL,
      "title" TEXT NOT NULL,
      "destination" TEXT NOT NULL,
      "fromCity" TEXT,
      "toCity" TEXT,
      "departDate" TEXT,
      "returnDate" TEXT,
      "checkIn" TEXT,
      "checkOut" TEXT,
      "travelers" INTEGER NOT NULL DEFAULT 1,
      "notes" TEXT,
      "status" TEXT NOT NULL DEFAULT 'planned',
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL,
      CONSTRAINT "services_trips_pkey" PRIMARY KEY ("id")
    );
    CREATE INDEX "services_trips_userId_idx" ON "services_trips"("userId");
  `);
  console.log('Applied services_trips schema patch.');
}

async function ensureTelegramLiveSchema(db) {
  const configCol = await db.query(`
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'chat_connectors' AND column_name = 'config'
  `);
  if (configCol.rows.length === 0) {
    await db.exec(`ALTER TABLE "chat_connectors" ADD COLUMN "config" JSONB;`);
    console.log('Added chat_connectors.config column.');
  }

  const bridgeTable = await db.query(`
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'telegram_bridges'
  `);
  if (bridgeTable.rows.length > 0) return;

  await db.exec(`
    CREATE TABLE "telegram_bridges" (
      "id" TEXT NOT NULL,
      "connectorId" TEXT NOT NULL,
      "ownerUserId" TEXT NOT NULL,
      "linkchatChatId" TEXT NOT NULL,
      "externalTelegramChatId" TEXT NOT NULL,
      "externalUserId" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL,
      CONSTRAINT "telegram_bridges_pkey" PRIMARY KEY ("id")
    );

    CREATE UNIQUE INDEX "telegram_bridges_linkchatChatId_key" ON "telegram_bridges"("linkchatChatId");
    CREATE UNIQUE INDEX "telegram_bridges_connectorId_externalTelegramChatId_key"
      ON "telegram_bridges"("connectorId", "externalTelegramChatId");
    CREATE INDEX "telegram_bridges_ownerUserId_idx" ON "telegram_bridges"("ownerUserId");

    ALTER TABLE "telegram_bridges"
      ADD CONSTRAINT "telegram_bridges_connectorId_fkey"
      FOREIGN KEY ("connectorId") REFERENCES "chat_connectors"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    ALTER TABLE "telegram_bridges"
      ADD CONSTRAINT "telegram_bridges_ownerUserId_fkey"
      FOREIGN KEY ("ownerUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    ALTER TABLE "telegram_bridges"
      ADD CONSTRAINT "telegram_bridges_linkchatChatId_fkey"
      FOREIGN KEY ("linkchatChatId") REFERENCES "chats"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    ALTER TABLE "telegram_bridges"
      ADD CONSTRAINT "telegram_bridges_externalUserId_fkey"
      FOREIGN KEY ("externalUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  `);
  console.log('Applied telegram_bridges schema patch.');
}

async function ensureChatConnectorsTable(db) {
  const res = await db.query(`
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'chat_connectors'
  `);
  if (res.rows.length > 0) return;

  await db.exec(`
    DO $$ BEGIN
      CREATE TYPE "ConnectorType" AS ENUM ('TELEGRAM', 'EMAIL', 'DISCORD', 'MATRIX');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;

    CREATE TABLE "chat_connectors" (
      "id" TEXT NOT NULL,
      "userId" TEXT NOT NULL,
      "type" "ConnectorType" NOT NULL,
      "label" TEXT NOT NULL,
      "identifier" TEXT NOT NULL,
      "enabled" BOOLEAN NOT NULL DEFAULT true,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL,
      CONSTRAINT "chat_connectors_pkey" PRIMARY KEY ("id")
    );

    CREATE UNIQUE INDEX "chat_connectors_userId_type_identifier_key"
      ON "chat_connectors"("userId", "type", "identifier");
    CREATE INDEX "chat_connectors_userId_idx" ON "chat_connectors"("userId");

    ALTER TABLE "chat_connectors"
      ADD CONSTRAINT "chat_connectors_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  `);
  console.log('Applied chat_connectors schema patch.');
}

async function waitForTcp(databaseUrl) {
  const { Client } = require('pg');

  for (let i = 0; i < 15; i++) {
    const client = new Client({
      connectionString: databaseUrl,
      connectionTimeoutMillis: 3000,
    });

    try {
      await client.connect();
      await client.query('SELECT 1');
      await client.end();
      return true;
    } catch {
      await client.end().catch(() => {});
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  return false;
}

async function main() {
  fs.mkdirSync(dataDir, { recursive: true });

  const db = new PGlite(dataDir);

  console.log('Applying database schema...');
  await applySchemaDirect(db);

  const server = new PGLiteSocketServer({ db, port: PORT, host: HOST });

  server.addEventListener('listening', () => {
    console.log(`PGlite socket listening on ${HOST}:${PORT}`);
  });

  await server.start();

  const databaseUrl = `postgresql://postgres@${HOST}:${PORT}/postgres`;
  const dbReady = await waitForTcp(databaseUrl);

  if (!dbReady) {
    console.error(
      'PGlite TCP readiness check failed — connections are being reset.\n' +
        'Stop this process, kill anything on port 5432, then run `npm run dev:db` again.\n' +
        `If it keeps failing, delete the data dir and retry: ${dataDir}`,
    );
    await server.stop();
    await db.close();
    process.exit(1);
  }

  console.log('Dev database server running. Press Ctrl+C to stop.');

  const shutdown = async () => {
    await server.stop();
    await db.close();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
