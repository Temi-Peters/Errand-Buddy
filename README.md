# Errand Buddy MVP

Errand Buddy is a React + Tailwind frontend with a Node.js + Express backend, PostgreSQL database, Prisma ORM, JWT authentication, and a Stripe Connect-ready payment shape. Payments are currently test-mode stubs only.

## Project Structure

```text
.
├── src/                  # React frontend
│   ├── api/client.js     # API client with local fallback support in AppContext
│   ├── context/
│   ├── pages/
│   └── components/
└── server/               # Express + Prisma backend
    ├── prisma/
    │   ├── schema.prisma
    │   └── seed.js
    └── src/
        ├── app.js
        ├── server.js
        ├── config/
        ├── controllers/
        ├── middleware/
        ├── routes/
        ├── services/
        └── utils/
```

## Requirements

- Node.js 20+
- Docker Desktop or another Docker Compose-compatible runtime
- npm

## Database Setup

Start the local PostgreSQL container from the project root:

```sh
docker compose up -d
```

The Compose file creates:

- PostgreSQL 16
- database: `errand_buddy`
- username: `postgres`
- password: `postgres`
- host port: `5432`
- named volume: `errand_buddy_postgres_data`
- healthcheck using `pg_isready`

The backend development `DATABASE_URL` already points at this container through localhost:

```text
postgresql://postgres:postgres@localhost:5432/errand_buddy?schema=public
```

To override the database name, user, password, or host port, copy the root Compose env example:

```sh
cp .env.example .env
```

Then edit the root `.env` values:

```text
POSTGRES_DB=errand_buddy
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_PORT=5432
```

If you change those values, also update `server/.env` so `DATABASE_URL` matches.

## Local Development Setup

Start the database:

```sh
docker compose up -d
```

Create the backend environment file and install backend dependencies:

```sh
cd server
cp .env.example .env
npm install
```

Edit `server/.env` only if your local PostgreSQL username, password, host, or port differ from the defaults.

Run Prisma migrations and seed local development data:

```sh
npx prisma migrate dev
npx prisma db seed
```

Start the backend:

```sh
npm run dev
```

The API runs at `http://localhost:4000`.

Backend environment variables live in `server/.env`:

```text
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/errand_buddy?schema=public
NODE_ENV=development
PORT=4000
CLIENT_URL=http://localhost:5173
JWT_SECRET=replace-this-with-a-long-random-secret
JWT_EXPIRES_IN=7d
STRIPE_SECRET_KEY=sk_test_stubbed_not_used_yet
STRIPE_WEBHOOK_SECRET=whsec_stubbed_not_used_yet
PLATFORM_FEE_PERCENT=10
```

`CLIENT_URL` is used by CORS. For production, set it to the hosted frontend URL. Multiple allowed origins can be comma-separated if needed.

Seeded local development users all use this password:

```text
password123
```

Useful local accounts:

```text
admin@example.com
aisha@example.com
tom@example.com
sam@example.com
leah@example.com
```

## Frontend Setup

From the project root:

```sh
npm install
npm run dev
```

The frontend runs at `http://localhost:5173`.

By default the frontend calls `http://localhost:4000/api`. To override that:

```sh
VITE_API_URL=http://localhost:4000/api npm run dev
```

Frontend environment variables live in the frontend project root, usually in `.env.local` for local development or in the hosting provider dashboard for production:

```text
VITE_API_URL=http://localhost:4000/api
```

For production, `VITE_API_URL` must point to the hosted backend API URL, including `/api`.

The frontend depends on the backend API. If the API is unavailable, the app shows a service unavailable state rather than falling back to local mock data.

## Prisma Commands

From `server/`:

```sh
npm run prisma:validate
npm run prisma:migrate
npm run prisma:seed
npm run prisma:generate
```

## Docker Compose Commands

From the project root:

```sh
docker compose up -d
docker compose ps
docker compose logs postgres
docker compose down
```

To remove the persistent database volume and reset all local data:

```sh
docker compose down -v
```

## Payments

Payments are still in test-mode architecture. `POST /api/payments/mock-intent` creates or returns a test payment intent shape and stores platform fee and runner payout amounts, but does not call Stripe or take live money yet.

## Production Build Commands

Frontend:

```sh
npm install
npm run build
```

Backend:

```sh
cd server
npm install
npm run build
npm run deploy:migrate
npm start
```

`server/npm run build` currently runs `prisma generate`. The backend is plain Node.js, so there is no transpilation step.

## Hosted PostgreSQL

Use a hosted PostgreSQL database from Render, Railway, Neon, Supabase, or another managed provider.

1. Create a PostgreSQL database in the provider dashboard.
2. Copy the external connection string.
3. Set it as `DATABASE_URL` in the backend hosting environment.
4. Run migrations during deploy with `npm run deploy:migrate`.
5. Seed demo data only for demo/staging environments with `npm run prisma:seed`.

The connection string should look like:

```text
postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public
```

## Vercel Frontend Deployment

Use the project root as the Vercel project directory.

Recommended settings:

```text
Framework Preset: Vite
Build Command: npm run build
Output Directory: dist
Install Command: npm install
```

Set this Vercel environment variable:

```text
VITE_API_URL=https://your-backend.example.com/api
```

After Vercel gives you a frontend URL, add that URL to the backend `CLIENT_URL` environment variable so CORS allows browser requests.

## Render Backend Deployment

Use `server/` as the service root directory.

Recommended settings:

```text
Environment: Node
Build Command: npm install && npm run build
Start Command: npm start
```

Set these backend environment variables:

```text
NODE_ENV=production
DATABASE_URL=postgresql://...
CLIENT_URL=https://your-frontend.vercel.app
JWT_SECRET=use-a-long-random-production-secret
JWT_EXPIRES_IN=7d
STRIPE_SECRET_KEY=sk_test_replace_later
STRIPE_WEBHOOK_SECRET=whsec_replace_later
PLATFORM_FEE_PERCENT=10
```

Run database migrations after the database is attached:

```sh
npm run deploy:migrate
```

For a demo environment, seed once:

```sh
npm run prisma:seed
```

## Railway Backend Deployment

Use `server/` as the app root if Railway asks for a root directory.

Recommended settings:

```text
Build Command: npm install && npm run build
Start Command: npm start
```

Add a Railway PostgreSQL service, then set or reference its connection string as `DATABASE_URL`.

Required backend variables are the same as Render:

```text
NODE_ENV=production
DATABASE_URL=postgresql://...
CLIENT_URL=https://your-frontend.vercel.app
JWT_SECRET=use-a-long-random-production-secret
STRIPE_SECRET_KEY=sk_test_replace_later
```

Run `npm run deploy:migrate` after provisioning the database. Seed only if this is a demo/staging deployment.

## Deployment Checklist

- Frontend has `VITE_API_URL=https://hosted-backend/api`.
- Backend has `CLIENT_URL=https://hosted-frontend`.
- Backend has `DATABASE_URL` from hosted PostgreSQL.
- Backend has a strong `JWT_SECRET`.
- Backend has `STRIPE_SECRET_KEY` set to a test key or placeholder while payments remain stubbed.
- Migrations have run with `npm run deploy:migrate`.
- Demo seed has only run in environments where demo data is intended.
