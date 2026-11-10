<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/logo/logo-oscuro.png">
  <img src="docs/logo/logo-claro.png" alt="DV Training" width="440">
</picture>

# DV Training

A training management web app for personal trainers and small gyms. I built it for a physical education trainer who kept his clients' information scattered across Google Drive spreadsheets and WhatsApp chats; it is now in production at **[dvtraining.com.ar](https://dvtraining.com.ar)**, where a read-only demo with fictional data is one click away ("Ver demo gratuita").

Solo project: requirements gathering with the client, database design, backend, frontend, deployment and backups.

**Tech stack:** TypeScript, Node.js, Express, PostgreSQL, Prisma, Zod, React, Vite and `node:test`. No UI component library: components, icons, charts and the dark theme are written from scratch.

## Features

- **Clients:** full profile (personal details, sports profile, health history), accent-insensitive search, deactivation and reactivation, a field-by-field change history, and permanent deletion confirmed with the password.
- **Training notes:** technique corrections, exercise changes, discomfort, etc., filterable by type.
- **Assessments:** configurable catalog of tests (CMJ, IMTP, mobility), results per side (left/right), progress charts and a reminder for the next reassessment based on each client's profile.
- **Attendance:** one-tap check-in, monthly report, clients who stopped coming and the most frequent client of the month and year.
- **Workout plans:** filled in directly on the page over fillable PDF templates, starting from a blank model or a previous plan, then downloaded or sent over WhatsApp.
- **Payments:** memberships with a monthly price, fees that chain month to month (several months can be paid at once, with the total split to the cent), automatic debt calculation, debt cancellation, audited corrections and income reports by period.
- **Dashboard:** active clients, upcoming fees, upcoming assessments, workout plans due for renewal and the week's birthdays, each opening the list of clients behind the number (never amounts).
- **Mobile first:** tables turn into cards, a side menu within thumb reach and confirmation dialogs designed for touch.

## Architecture: one database per gym

The app serves several gyms from a single deployment, and each gym's data must stay sealed off from the others, **including in the backups**.

- A **control database** holds gyms, users and sessions. Each gym has **its own PostgreSQL database** on the same server, created and migrated by a script (`npm run centros`).
- After authentication, the rest of the request runs inside the user's gym through `AsyncLocalStorage`. The `prisma` object the services import is a proxy that always resolves to the current gym's client, so the business code is unaware of tenancy. A query outside a gym context throws instead of falling back to some database.
- **Backups are made per database** and each one is encrypted (AES-256-GCM) with its own key, derived with HKDF from a master key: one gym's backup cannot be opened with another's key. They are uploaded daily to a private Backblaze B2 bucket.
- **Isolation tests** (`src/aislamiento.test.ts`) create throwaway databases, start the app and fire hundreds of concurrent requests from two gyms, checking that no data crosses over.
- **The demo is one more gym**, flagged as read-only: a middleware rejects every non-GET request from the demo user, downloads are blocked, and demo sessions are short and rate-limited by IP.

I chose this over a shared schema with a `gymId` column (a single missed filter leaks data, and backups would mix gyms) and over one deployment per client (N services to maintain and deploy).

## Other technical decisions

- **Amounts stored as `Decimal(12,2)`**, never floats, and accepted in Argentine format ("25.000,50"). Ambiguous input such as "25,000" is rejected instead of being silently read as 25.
- **Dates without time**, stored as `DATE` and handled as `yyyy-mm-dd` strings, so time zones never shift a day. Adding months respects month ends (Jan 31 + 1 month = Feb 28).
- **Custom sessions instead of JWT:** a random token in an `httpOnly` cookie with only its hash stored, so logging out revokes it immediately. Passwords are hashed with bcrypt, and login is locked for 15 minutes after 5 failed attempts.
- **Password reset without leaking accounts:** the same answer whether the email exists or not, a single-use link that expires in 30 minutes, an address taken from configuration (not from the request, so it cannot be spoofed) and every session closed after the reset.
- **Change history in one transaction:** editing a profile saves the data and one history row per modified field, or nothing at all.
- **Workout plans without storing PDFs:** only the field values are saved (as JSON); the PDF is rebuilt on the gym's template when it is opened.
- **Validation on both ends:** every endpoint validates its input with Zod and returns field-level errors that the forms show next to each field.
- **Production hardening:** strict Content Security Policy, security headers, `Secure` cookies and encrypted backups.

## Project structure

```
backend/
  prisma/              gym schema and migrations, seed data
  prisma/control/      control database schema and migrations
  src/
    modulos/<modulo>/  <modulo>.routes.ts, .service.ts, .schemas.ts
    lib/               tenancy, dates, amounts, encryption, errors
    middlewares/       session, read-only demo, Zod validation, errors
    scripts/           migrations, gyms, admin user, backups, sample data
frontend/
  src/
    api/               one file per API resource
    paginas/           one page per route
    componentes/       sections and reusable components
    hooks/             data fetching, short lists, responsive tables
    utils/             formatting and labels
docs/                  deployment, backups, user manual (in Spanish)
```

## Running it locally

Requirements: **Node.js 22 or later** and **PostgreSQL 17 or later**.

```bash
# Backend
cd backend
cp .env.example .env               # set the PostgreSQL user and password
npm install
npm run db:deploy                  # creates the control database and runs all migrations
npm run centros -- crear gimnasio "My gym"   # creates a gym with its own database
npm run plantillas                 # generates the workout plan PDF templates
npm run centros -- plantillas gimnasio       # loads them into the gym
npm run crear-admin                # login user (asks for gym, email, name and password)
npm run dev                        # API at http://localhost:3000

# Frontend (in another terminal)
cd frontend
npm install
npm run dev                        # http://localhost:5173
```

In development, Vite proxies `/api` to the backend, so the frontend and the API share the same origin and the session cookie works without any CORS setup.

To try it with fictional clients, or to run the tests, see [docs/base-de-prueba.md](docs/base-de-prueba.md).

## Backend commands

| Command | Purpose |
|---|---|
| `npm run dev` | API in development mode (restarts on save) |
| `npm test` | Automated tests; the isolation tests need `.env.prueba` |
| `npm run db:deploy` | Create the control database if missing and migrate it and every gym |
| `npm run centros -- <command>` | Manage gyms: `listar`, `crear`, `copiar`, `desactivar`, `activar`, `exportar`, `eliminar` |
| `npm run crear-admin` | Create a gym's user or reset its password |
| `npm run respaldo` | Encrypted backup of every database (`pg_dump`, keeps the last 30 per database) |
| `npm run respaldo:probar` | Restore the latest backup into a temporary database, check it and delete it |
| `npm run build` / `npm start` | Build and run the production version |

Deployment is covered in [docs/publicacion.md](docs/publicacion.md), backups and restores in [docs/respaldos.md](docs/respaldos.md) and day-to-day use in [docs/manual-de-uso.md](docs/manual-de-uso.md).

## Personal data

The databases store clients' personal and health data, so the repository contains no real data: `.env` files, backups, exports and the original spreadsheets are listed in `.gitignore`, and the sample data is generated.
