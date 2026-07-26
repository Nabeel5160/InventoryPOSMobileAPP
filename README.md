# IQ Computers — Inventory & POS

Hybrid monorepo for wholesale inventory and point-of-sale:

| Layer | Path | Role |
|-------|------|------|
| **C — Mock API** | `apps/mobile` (`EXPO_PUBLIC_API_MODE=mock`) | Offline-capable UI development |
| **B — NestJS + PostgreSQL** | `apps/api` | Source of truth for products, stock, sales, sync |
| **A — Firebase** | Auth / FCM / Storage stubs | Tokens, push, future invoice PDFs |

## Prerequisites

- Node.js 20+
- [pnpm](https://pnpm.io) 10+
- Docker (recommended) **or** a local PostgreSQL 16 instance
- Expo Go / Android emulator / iOS simulator for the mobile app

## Quick start

```bash
# 1. Install
pnpm install

# 2. Shared types
pnpm --filter @iq/shared build

# 3. Database
docker compose up -d
# If Docker is unavailable, set DATABASE_URL in apps/api/.env to your Postgres instance

cp .env.example apps/api/.env   # already seeded with defaults in apps/api/.env
pnpm db:generate
pnpm --filter @iq/api prisma:push
pnpm db:seed

# 4. API
pnpm dev:api
# → http://localhost:3000/api/health

# 5. Mobile (mock mode by default)
pnpm dev:mobile
```

### Live API mode (mobile → Nest)

In `apps/mobile/.env`:

```
EXPO_PUBLIC_API_MODE=live
EXPO_PUBLIC_API_URL=http://localhost:3000/api
```

On a physical device, use your machine LAN IP instead of `localhost`.

### Demo users (password: `password123`)

- `admin@iqcomputers.local` — Admin
- `sales@iqcomputers.local` — Sales
- `warehouse@iqcomputers.local` — Warehouse (cannot complete sales)

### Firebase (optional)

Set `EXPO_PUBLIC_FIREBASE_*` in `apps/mobile/.env` and `FIREBASE_PROJECT_ID` + service account credentials for the API. Without them, email/password JWT login still works.

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev:api` | NestJS watch mode |
| `pnpm dev:mobile` | Expo start |
| `pnpm test` | Jest (shared + api) |
| `pnpm lint` | Typecheck packages |
| `pnpm db:seed` | Seed IQ wholesale catalog |

## MVP features

- Login + role-gated POS
- Dashboard (revenue, low stock)
- Inventory search / product detail
- Barcode scan + cart + checkout (cash/terminal)
- Purchase orders: list, create, receive goods (stock increments)
- Offline outbox → `POST /api/sync` (LWW conflicts)
- Mock and live API adapters

## Deferred (v1+)

Multi-warehouse transfers, returns, multi-currency, accounting integrations, serial/lot/BOM.
