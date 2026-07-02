# QueueFlow

A full-stack queue management application for service desks, clinics, counters, and any
walk-in line that needs an orderly, trackable queue. Managers log in, create queues, add
people to them, call the next person for service, and track analytics like wait time and
throughput.

## Tech Stack

- **Frontend:** React + Vite + TypeScript, Tailwind CSS, React Router, Recharts, Axios
- **Backend:** Node.js + Express + TypeScript
- **Database:** SQLite via Prisma ORM
- **Auth:** JWT-based login for Queue Managers, passwords hashed with bcrypt

## Project Structure

```
QueueFlow/
├── client/          # React + Vite frontend
├── server/          # Express + TypeScript backend
│   └── prisma/      # Prisma schema, migrations, seed script
└── README.md
```

## Prerequisites

- Node.js 18+ and npm

## Setup

### 1. Backend

```bash
cd server
npm install
cp .env.example .env      # then edit JWT_SECRET to a long random string
npm run prisma:migrate    # creates the SQLite db and applies migrations
npm run seed               # creates a demo manager + sample queues with tokens
npm run dev                 # starts the API on http://localhost:4000
```

### 2. Frontend

In a second terminal:

```bash
cd client
npm install
cp .env.example .env      # defaults to http://localhost:4000, adjust if needed
npm run dev                 # starts the app on http://localhost:5173
```

### 3. Log in

Open http://localhost:5173 and sign in with the seeded demo account:

- **Email:** `demo@queueflow.dev`
- **Password:** `password123`

Or register a new Queue Manager account from the login screen.

## Environment Variables

### server/.env

| Variable | Description | Example |
|---|---|---|
| `DATABASE_URL` | SQLite connection string used by Prisma | `file:./dev.db` |
| `JWT_SECRET` | Secret used to sign auth tokens — use a long random string | `openssl rand -hex 32` |
| `JWT_EXPIRES_IN` | JWT expiry | `7d` |
| `PORT` | API port | `4000` |
| `CLIENT_ORIGIN` | Allowed CORS origin for the frontend | `http://localhost:5173` |

### client/.env

| Variable | Description | Example |
|---|---|---|
| `VITE_API_URL` | Base URL of the backend API | `http://localhost:4000` |

## Useful Scripts

**server/**

| Script | Description |
|---|---|
| `npm run dev` | Start the API with hot reload |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run the compiled server |
| `npm run prisma:migrate` | Create/apply a dev migration |
| `npm run prisma:deploy` | Apply migrations in production |
| `npm run seed` | Reset the DB and load demo data |

**client/**

| Script | Description |
|---|---|
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Type-check and build for production |
| `npm run preview` | Preview the production build |

## Data Model

- **Manager** — id, email, passwordHash, name, createdAt
- **Queue** — id, name, managerId, createdAt
- **Token** — id, queueId, tokenNumber, personName, position, status
  (`WAITING | SERVING | SERVED | CANCELLED`), createdAt, servedAt, cancelledAt

`servedAt` is recorded the moment a token is promoted to `SERVING` (i.e. when the person
is called), so `servedAt - createdAt` represents time spent waiting — this is what the
analytics endpoints use to compute average wait time.

## API Documentation

All routes except `/auth/*` and `/health` require a `Authorization: Bearer <token>`
header. Ownership is enforced — a manager can only see/modify their own queues and tokens.

### Auth

| Method | Route | Body | Notes |
|---|---|---|---|
| POST | `/auth/register` | `{ email, password, name }` | Creates a manager, returns `{ token, manager }`. `409` if email is taken. |
| POST | `/auth/login` | `{ email, password }` | Returns `{ token, manager }`. `401` on bad credentials. |

### Queues

| Method | Route | Body | Notes |
|---|---|---|---|
| GET | `/queues` | — | List queues owned by the manager, with current waiting count. |
| POST | `/queues` | `{ name }` | Create a queue. |
| GET | `/queues/:id` | — | Queue details: `{ ...queue, serving, waiting[] }`. |
| POST | `/queues/:id/tokens` | `{ personName? }` | Add a token to the bottom of the queue. |
| POST | `/queues/:id/serve-next` | — | Promote the top `WAITING` token to `SERVING`; the previous `SERVING` token (if any) becomes `SERVED`. `400` if the queue has no waiting tokens. |
| GET | `/queues/:id/analytics` | — | Analytics scoped to one queue. |

### Tokens

| Method | Route | Body | Notes |
|---|---|---|---|
| PATCH | `/tokens/:id/move` | `{ direction: "up" \| "down" }` | Swaps position with the adjacent waiting token. `400` if already at the top/bottom, or if the token isn't `WAITING`. |
| PATCH | `/tokens/:id/cancel` | — | Cancels a `WAITING` or `SERVING` token; remaining waiting positions are reflowed to close any gap. |

### Analytics

| Method | Route | Notes |
|---|---|---|
| GET | `/analytics` | Aggregate analytics across all of the manager's queues, plus a `perQueue` breakdown. |
| GET | `/queues/:id/analytics` | Same shape, scoped to a single queue. |

Analytics response shape:

```json
{
  "currentWaiting": 6,
  "avgWaitTimeMinutes": 11.4,
  "servedToday": 3,
  "cancelledToday": 1,
  "totalServed": 21,
  "totalCancelled": 3,
  "queueLengthTrend": [{ "date": "2026-06-26", "waiting": 4 }],
  "avgWaitTimeTrend": [{ "date": "2026-06-26", "avgWaitMinutes": 9.2 }],
  "servedVsCancelled": [{ "name": "Served", "value": 21 }, { "name": "Cancelled", "value": 3 }]
}
```

## Design Notes & Edge Cases

- Position reordering is always kept contiguous (0..n-1) for `WAITING` tokens — cancelling
  or serving a token reflows the remaining positions so there are never gaps or duplicates.
- Moving the top token up, or the bottom token down, is disabled in the UI and rejected
  (`400`) by the API.
- Serving from an empty queue is disabled in the UI and rejected (`400`) by the API.
- Cancelling the currently `SERVING` token is allowed (e.g. a no-show).
- All inputs are validated on the backend with `zod`; invalid input returns `400` with a
  descriptive error message.
- The frontend wraps the app in a React error boundary and shows toast notifications,
  loading states, and empty states throughout.

## Screenshots

_Add screenshots of the running app here, e.g.:_

- `docs/screenshots/login.png` — Login screen
- `docs/screenshots/queues.png` — Queues list
- `docs/screenshots/queue-detail.png` — Queue detail with Now Serving + waiting list
- `docs/screenshots/dashboard.png` — Analytics dashboard

## Git Hygiene

A root `.gitignore` excludes `.claude/`, `node_modules/`, `dist/`, `build/`, `.env`,
`*.db`/`*.sqlite`, and Prisma's local dev database. Never commit `.env` files or the
`.claude/` directory — use the provided `.env.example` files as a template.
