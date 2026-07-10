<div align="center">

# 📘 LifeLedger

**AI-powered Digital Life Management Platform**

_Securely store, organize, search, and manage all your important life records in one place._

[![CI](https://github.com/kumarchandan001/Lifeledger/actions/workflows/ci.yml/badge.svg)](https://github.com/kumarchandan001/Lifeledger/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/license-UNLICENSED-red.svg)]()
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15-black.svg)](https://nextjs.org/)
[![NestJS](https://img.shields.io/badge/NestJS-11-red.svg)](https://nestjs.com/)

</div>

---

## 🏗️ Architecture

LifeLedger is built as a **Turborepo monorepo** with clear separation of concerns:

```
lifeledger/
├── apps/
│   ├── web/          → Next.js 15 (React 19 + Tailwind + shadcn/ui)
│   └── api/          → NestJS 11 (REST API + Swagger)
├── packages/
│   ├── config/       → Shared ESLint, TypeScript & Tailwind configs
│   ├── shared/       → Types, constants & utilities
│   ├── validators/   → Zod schemas (shared validation)
│   └── database/     → Prisma ORM schema, client & migrations
├── docker/           → Dockerfiles for production builds
├── .github/          → CI/CD workflows
└── docker-compose.yml → Local development services
```

## 🛠️ Tech Stack

| Layer       | Technology                                    |
| ----------- | --------------------------------------------- |
| Frontend    | Next.js 15, React 19, Tailwind CSS, shadcn/ui |
| Backend     | NestJS 11, Swagger, Helmet, Throttler         |
| Database    | PostgreSQL 16, Prisma ORM 6                   |
| Cache/Queue | Redis 7 (ioredis)                             |
| Validation  | Zod (shared between frontend & backend)       |
| State       | Zustand, TanStack React Query                 |
| Animations  | Framer Motion                                 |
| CI/CD       | GitHub Actions                                |
| Containers  | Docker multi-stage builds                     |

## 🚀 Getting Started

### Prerequisites

- **Node.js** >= 20
- **pnpm** >= 9 (`corepack enable && corepack prepare pnpm@latest --activate`)
- **Docker** & **Docker Compose** (for PostgreSQL + Redis)

### Setup

```bash
# 1. Clone the repository
git clone https://github.com/kumarchandan001/Lifeledger.git
cd Lifeledger

# 2. Install dependencies
pnpm install

# 3. Start infrastructure services
docker compose up -d

# 4. Generate Prisma client
pnpm db:generate

# 5. Push schema to database
pnpm db:push

# 6. Seed the database
pnpm db:seed

# 7. Start development servers
pnpm dev
```

The services will be available at:

| Service            | URL                            |
| ------------------ | ------------------------------ |
| 🌐 Web App         | http://localhost:3000          |
| 🔌 API Server      | http://localhost:4000          |
| 📚 Swagger Docs    | http://localhost:4000/api/docs |
| 🔍 Prisma Studio   | `pnpm db:studio`               |
| 📧 MailHog (Email) | http://localhost:8025          |

## 📝 Available Scripts

| Command            | Description                        |
| ------------------ | ---------------------------------- |
| `pnpm dev`         | Start all apps in development mode |
| `pnpm dev:web`     | Start only the web app             |
| `pnpm dev:api`     | Start only the API server          |
| `pnpm build`       | Build all apps for production      |
| `pnpm lint`        | Lint all packages                  |
| `pnpm format`      | Format all files with Prettier     |
| `pnpm typecheck`   | Type-check all packages            |
| `pnpm test`        | Run all unit tests                 |
| `pnpm db:generate` | Generate Prisma client             |
| `pnpm db:push`     | Push schema to database            |
| `pnpm db:migrate`  | Create and run migrations          |
| `pnpm db:seed`     | Seed database with initial data    |
| `pnpm db:studio`   | Open Prisma Studio                 |
| `pnpm docker:up`   | Start Docker services              |
| `pnpm docker:down` | Stop Docker services               |
| `pnpm clean`       | Clean all build artifacts          |

## 📂 Document Categories

LifeLedger supports **11 life categories** with 50+ sub-categories:

| Category              | Examples                                        |
| --------------------- | ----------------------------------------------- |
| 🪪 Identity Documents | Aadhaar, PAN, Passport, Driving License         |
| 🏥 Medical Records    | Prescriptions, Lab Reports, Vaccination Records |
| 🎓 Education          | Marksheets, Degrees, Course Certificates        |
| 💼 Career             | Offer Letters, Payslips, Experience Letters     |
| 💰 Financial          | Bank Statements, ITR, Form 16, Investments      |
| 🛡️ Insurance          | Health, Life, Vehicle, Home Insurance           |
| 🏠 Property           | Sale Deeds, Rent Agreements, Property Tax       |
| ⚖️ Legal              | Wills, Power of Attorney, Contracts             |
| 👨‍👩‍👧‍👦 Family Records     | Birth, Marriage, Death Certificates             |
| 🚨 Emergency          | Emergency Contacts, Medical Alerts              |
| 📜 Digital Legacy     | Digital Wills, Asset Inventory, Nominees        |

## 🔒 Security

- JWT authentication with RS256 signing
- Refresh token rotation (httpOnly cookies)
- MFA (TOTP) for sensitive operations
- RBAC with fine-grained permissions
- Rate limiting (multi-tier)
- Helmet security headers
- CORS protection
- Input validation (Zod + class-validator)

## 📋 Sprint Roadmap

- [x] **Sprint 1** — Foundation (Monorepo, Docker, Prisma, Shared Packages)
- [ ] **Sprint 2** — Authentication (JWT, OAuth, MFA, RBAC)
- [ ] **Sprint 3** — Document Management (Upload, OCR, Categories)
- [ ] **Sprint 4** — Dashboard, Search, Notifications
- [ ] **Sprint 5** — Family Vault, Emergency Access
- [ ] **Sprint 6** — AI Assistant, Digital Legacy, Billing

All rights reserved.
