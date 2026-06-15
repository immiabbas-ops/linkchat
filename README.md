# Link-Chat

Production-grade real-time communication + services super app.

## Architecture

```
Linkchat/
├── backend/          # NestJS API + Socket.IO gateway
├── frontend/         # Next.js 14 App Router
├── docker-compose.yml
└── README.md
```

| Layer | Stack |
|-------|-------|
| Frontend | Next.js 14, TypeScript, Tailwind, Zustand, Framer Motion |
| Backend | NestJS, Socket.IO, JWT, Redis |
| Database | PostgreSQL + Prisma ORM |
| Storage | S3-compatible (MinIO in dev) |

## Quick Start

### 1. Start infrastructure

```bash
docker compose up -d
```

Starts PostgreSQL (5432), Redis (6379), and MinIO (9000/9001).

### 2. Backend

```bash
cd backend
cp .env.example .env
npm install
npx prisma db push
npm run start:dev
```

API: `http://localhost:4000/api/v1`  
Swagger: `http://localhost:4000/docs`  
Socket.IO: `http://localhost:4000/chat`

### 3. Frontend

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

App: `http://localhost:3000`

## Auth (Phase 1)

- Email-only login with OTP verification
- JWT access + refresh tokens
- Device-based sessions
- Logout / logout all devices

**Dev mode:** OTP codes are printed to the backend console when SMTP is not configured.

## Real-time Events

| Event | Description |
|-------|-------------|
| `message:send` | Send message |
| `message:read` | Mark messages read |
| `user:typing` | Typing indicator |
| `user:online` | Presence updates |
| `message:edit` | Edit message |
| `message:delete` | Delete message |
| `message:react` | Emoji reactions |

Redis pub/sub enables horizontal scaling of Socket.IO.

## Release Phases

- **Phase 1 (MVP):** Auth, chat, media, online status, core UI
- **Phase 2:** Services tab, translation, voice notes, family system
- **Phase 3:** QR desktop sync, mini apps, scaling hardening

## Environment Variables

See `backend/.env.example` and `frontend/.env.example`.

## License

Private — All rights reserved.
