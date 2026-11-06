<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/logo/logo-oscuro.png">
  <img src="docs/logo/logo-claro.png" alt="DV Training" width="440">
</picture>

# DV Training

A training management web app I built for a physical education trainer who kept his clients' information scattered across Google Drive spreadsheets and WhatsApp chats. Being prepared for its first production release.

Solo project: requirements gathering with the client, database design, backend and frontend.

It handles client profiles, session notes, attendance, physical assessments with progress charts, workout plans on PDF templates, memberships, monthly fees, debts and income reports. It works on desktop and mobile, with light and dark themes.

**Tech stack:** TypeScript, Node.js, Express, PostgreSQL, Prisma, Zod, React, Vite and `node:test`.

## Features

- **Clients:** full profile (personal details, sports profile, health, recovery and medical history), accent-insensitive search, deactivation and reactivation, a field-by-field change history, and permanent deletion of a client and all their data, confirmed with the password.
- **Training notes:** technique corrections, exercise changes, discomfort, etc., filterable by type.
- **Assessments:** configurable catalog of tests (CMJ, IMTP, mobility), results recorded for left and right sides, progress charts and a reminder for the next reassessment based on each client's profile.
- **Attendance:** one-click check-in, monthly reports, clients who stopped coming and the most frequent client of the month and year.
- **Workout plans:** filled in directly on the page over fillable PDF templates, starting from a blank model or an earlier plan, then downloaded or sent over WhatsApp. Plans can also be made for someone without a client profile.
- **Payments:** memberships with a monthly price, fees that chain month to month (several months can be paid at once, with the total split to the cent), automatic debt calculation, an option to cancel a debt, audited corrections to past payments, WhatsApp reminders with the message already written and income reports by period (cash or bank transfer, by month).
- **Dashboard:** active clients, upcoming fees, upcoming assessments and workout plans due for renewal, each opening the list of clients behind the number, without exposing any amounts.
- **Settings:** name, login email (confirmed with the password), password and dark mode. A forgotten password is reset through an emailed single-use link that expires in 30 minutes.

## Technical decisions

- **Amounts stored as `Decimal(12,2)` instead of float**, to avoid rounding errors. Amounts can also be entered in Argentine format ("25.000,50").
- **Dates without time**, stored as `DATE` and handled as `yyyy-mm-dd` strings, so time zones never shift a date by one day. Adding months respects month ends (Jan 31 + 1 month = Feb 28).
- **Password reset without leaking accounts:** the same answer whether the email exists or not, only a hash of the link token is stored, the link expires in 30 minutes and works once, its address comes from configuration (not from the request, so it cannot be spoofed) and using it closes every session.
- **Custom sessions instead of JWT:** a random token in an `httpOnly` cookie, with only its hash stored in the database. Logging out revokes the session immediately. Passwords are hashed with bcrypt, and accounts are locked for 15 minutes after 5 failed attempts.
- **Change history in a single transaction:** editing a profile saves the data and one history row per modified field. If anything fails, nothing is saved.
- **Workout plans without storing the PDF:** only the field values are saved (as JSON), and the PDF is rebuilt on the template when downloaded.
- **Responsive tables without touching each table:** on small screens, rows become cards, and a single hook copies each column title to its cells.
- **Production hardening:** a strict Content Security Policy and security headers, `Secure` cookies and AES-256-GCM encrypted backups.
- **Automated tests** for the logic with the most edge cases (dates, amounts, debt calculation, attendance and backup encryption), using `node:test` with a mocked clock.

## Project structure

```
backend/
  prisma/              schema.prisma, migrations and seed data
  src/
    modulos/<modulo>/  <modulo>.routes.ts, .service.ts, .schemas.ts
    lib/               dates, amounts, errors, Prisma client
    middlewares/       session, Zod validation, error handling
    scripts/           create admin user, backups
frontend/
  src/
    api/               one file per API resource
    paginas/           one page per route
    componentes/       sections and reusable components
    hooks/             useCarga (data fetching), useListaCorta
    utils/             date and amount formatting, labels
docs/                  data model and design decisions
```

The data model is explained in [docs/propuesta-etapa1.md](docs/propuesta-etapa1.md) (in Spanish).

## Running it locally

Requirements: **Node.js 22 or later** and **PostgreSQL 17**.

```bash
# Backend
cd backend
cp .env.example .env       # set DATABASE_URL with your PostgreSQL user and password
npm install
npx prisma migrate dev     # creates the database and runs the migrations
npm run db:seed            # initial catalog of tests and memberships
npm run crear-admin        # login user (asks for email, name and password)
npm run dev                # API at http://localhost:3000

# Frontend (in another terminal)
cd frontend
npm install
npm run dev                # http://localhost:5173
```

In development, Vite proxies `/api` to the backend, so the frontend and the API share the same origin and the session cookie works without any CORS setup.

The workout plan PDF templates are not included in the repository. Generate them with `npm run plantillas` from `backend` (they are saved in `backend/plantillas`). `PLANTILLA_RUTINA` only points to an older template, used to open plans saved with it.

To try the app without real data, see [docs/base-de-prueba.md](docs/base-de-prueba.md) (fictional clients, in Spanish).

## Backend commands

| Command | Purpose |
|---|---|
| `npm run dev` | API in development mode (restarts on save) |
| `npm test` | Automated tests (`*.test.ts`) |
| `npm run db:studio` | Browse the database in the browser (Prisma Studio) |
| `npm run crear-admin` | Create the admin user or change its password |
| `npm run plantillas` | Generate the fillable workout plan PDFs |
| `npm run datos-ejemplo` | Load fictional data into the test database |
| `npm run respaldo` | Backup with `pg_dump` (keeps the last 30, encrypted with `RESPALDO_CLAVE`) |
| `npm run respaldo:probar` | Restores the latest backup into a temporary database, checks it and deletes it |
| `npm run build` / `npm start` | Build and run the production version |

The daily automatic backup and how to restore it are explained in [docs/respaldos.md](docs/respaldos.md). Deployment is covered in [docs/publicacion.md](docs/publicacion.md) and day-to-day use in [docs/manual-de-uso.md](docs/manual-de-uso.md) (all in Spanish).

## Security and personal data

The database stores clients' personal and health data, so the repository contains no real data. The `.env` files, the backups, the spreadsheets and the workout plan templates are listed in `.gitignore`.
