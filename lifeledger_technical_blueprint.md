# LifeLedger — Phase 1 Technical Blueprint

> **Version:** 1.0  
> **Date:** June 5, 2026  
> **Classification:** Confidential — Engineering  
> **Stack:** Next.js 15 · NestJS 11 · PostgreSQL 16 · Prisma 6 · Redis 7 · S3/Cloudinary · Gemini AI  
> **Reference:** [LifeLedger SRS & Product Planning v1.0](file:///C:/Users/Chandan%20Kumar/.gemini/antigravity-ide/brain/fa593ea2-5ef6-4814-aa0b-27570a0bdc9b/lifeledger_srs_planning.md)

---

## Table of Contents

1. [Monorepo Architecture](#1-monorepo-architecture)
2. [Complete Folder Structure](#2-complete-folder-structure)
3. [Database Schema (Prisma)](#3-database-schema-prisma)
4. [API Architecture](#4-api-architecture)
5. [Authentication Flow](#5-authentication-flow)
6. [RBAC Design](#6-rbac-design)
7. [Document Management Architecture](#7-document-management-architecture)
8. [Storage Architecture](#8-storage-architecture)
9. [Search Architecture](#9-search-architecture)
10. [Notification Architecture](#10-notification-architecture)
11. [Admin Architecture](#11-admin-architecture)
12. [Frontend Screen Map](#12-frontend-screen-map)
13. [Backend Module Map](#13-backend-module-map)
14. [Development Milestones](#14-development-milestones)
15. [Production Deployment Architecture](#15-production-deployment-architecture)

---

# 1. Monorepo Architecture

## 1.1 Why Monorepo?

| Benefit            | Impact                                                               |
| ------------------ | -------------------------------------------------------------------- |
| **Shared Types**   | TypeScript interfaces shared between frontend & backend — zero drift |
| **Atomic Commits** | API contract changes + frontend updates in a single commit           |
| **Unified CI/CD**  | One pipeline builds, tests, and deploys both apps                    |
| **Code Reuse**     | Shared validation schemas (Zod), constants, utilities                |
| **Simplified DX**  | One repo clone, one `npm install`, one dev command                   |

## 1.2 Monorepo Tooling

| Tool                       | Purpose                                                             |
| -------------------------- | ------------------------------------------------------------------- |
| **Turborepo**              | Build orchestration, caching, task dependencies, parallel execution |
| **pnpm**                   | Fast, disk-efficient package manager with workspace support         |
| **TypeScript 5.5+**        | Project references for incremental compilation across packages      |
| **ESLint 9 (Flat Config)** | Unified linting across all packages                                 |
| **Prettier 3**             | Consistent formatting                                               |
| **Husky + lint-staged**    | Pre-commit hooks for quality gates                                  |
| **Commitlint**             | Conventional commit enforcement                                     |
| **Changesets**             | Versioning and changelog management                                 |

## 1.3 Workspace Topology

```mermaid
graph TB
    subgraph "Monorepo: lifeledger"
        subgraph "apps/"
            WEB["apps/web<br/>Next.js 15 Frontend"]
            API["apps/api<br/>NestJS 11 Backend"]
            ADMIN["apps/admin<br/>Next.js 15 Admin Portal"]
        end

        subgraph "packages/"
            SHARED["packages/shared<br/>Types, Constants, Utils"]
            UI["packages/ui<br/>Shared UI Components"]
            CONFIG["packages/config<br/>ESLint, TS, Tailwind configs"]
            DB["packages/database<br/>Prisma Schema + Client"]
            VALIDATORS["packages/validators<br/>Zod Schemas"]
        end

        TURBO["turbo.json<br/>Build orchestration"]
    end

    WEB --> SHARED & UI & VALIDATORS & CONFIG
    API --> SHARED & DB & VALIDATORS & CONFIG
    ADMIN --> SHARED & UI & VALIDATORS & CONFIG
    DB --> SHARED
```

## 1.4 Package Dependency Rules

```
┌─────────────────────────────────────────────────────┐
│                   DEPENDENCY RULES                   │
├─────────────────────────────────────────────────────┤
│                                                      │
│  apps/web ──────► packages/shared                    │
│       │────────► packages/ui                         │
│       │────────► packages/validators                 │
│       └────────► packages/config                     │
│                                                      │
│  apps/api ─────► packages/shared                     │
│       │────────► packages/database                   │
│       │────────► packages/validators                 │
│       └────────► packages/config                     │
│                                                      │
│  apps/admin ───► packages/shared                     │
│       │────────► packages/ui                         │
│       │────────► packages/validators                 │
│       └────────► packages/config                     │
│                                                      │
│  ❌ apps/* NEVER imports from another apps/*         │
│  ❌ packages/* NEVER imports from apps/*             │
│  ❌ packages/shared NEVER imports from other pkgs    │
│                                                      │
└─────────────────────────────────────────────────────┘
```

---

# 2. Complete Folder Structure

```
lifeledger/
├── .github/
│   ├── workflows/
│   │   ├── ci.yml                     # Lint + Test + Build on PR
│   │   ├── deploy-staging.yml         # Deploy to staging on merge to develop
│   │   └── deploy-production.yml      # Deploy to prod on merge to main
│   ├── PULL_REQUEST_TEMPLATE.md
│   └── ISSUE_TEMPLATE/
│       ├── bug_report.md
│       └── feature_request.md
│
├── .husky/
│   ├── pre-commit                     # lint-staged
│   └── commit-msg                     # commitlint
│
├── apps/
│   ├── web/                           # ─── NEXT.JS 15 FRONTEND ───
│   │   ├── public/
│   │   │   ├── favicon.ico
│   │   │   ├── logo.svg
│   │   │   ├── og-image.png
│   │   │   └── manifest.json          # PWA manifest
│   │   │
│   │   ├── src/
│   │   │   ├── app/                   # App Router
│   │   │   │   ├── (marketing)/       # Public pages
│   │   │   │   │   ├── page.tsx                # Landing page
│   │   │   │   │   ├── pricing/page.tsx        # Pricing page
│   │   │   │   │   ├── about/page.tsx          # About page
│   │   │   │   │   ├── contact/page.tsx        # Contact page
│   │   │   │   │   └── layout.tsx              # Marketing layout
│   │   │   │   │
│   │   │   │   ├── (auth)/            # Auth pages (no sidebar)
│   │   │   │   │   ├── login/page.tsx
│   │   │   │   │   ├── register/page.tsx
│   │   │   │   │   ├── verify-email/page.tsx
│   │   │   │   │   ├── forgot-password/page.tsx
│   │   │   │   │   ├── reset-password/page.tsx
│   │   │   │   │   ├── verify-otp/page.tsx
│   │   │   │   │   └── layout.tsx              # Auth layout (centered card)
│   │   │   │   │
│   │   │   │   ├── (dashboard)/       # Protected dashboard (with sidebar)
│   │   │   │   │   ├── layout.tsx              # Dashboard shell (sidebar + topbar)
│   │   │   │   │   ├── page.tsx                # Dashboard home / overview
│   │   │   │   │   │
│   │   │   │   │   ├── documents/
│   │   │   │   │   │   ├── page.tsx            # All documents (grid/list view)
│   │   │   │   │   │   ├── upload/page.tsx     # Upload flow
│   │   │   │   │   │   ├── [id]/page.tsx       # Document detail view
│   │   │   │   │   │   └── [id]/edit/page.tsx  # Edit metadata
│   │   │   │   │   │
│   │   │   │   │   ├── categories/
│   │   │   │   │   │   ├── page.tsx            # Category overview
│   │   │   │   │   │   └── [slug]/page.tsx     # Documents in category
│   │   │   │   │   │
│   │   │   │   │   ├── search/
│   │   │   │   │   │   └── page.tsx            # Search results
│   │   │   │   │   │
│   │   │   │   │   ├── ai/
│   │   │   │   │   │   └── page.tsx            # AI Assistant chat
│   │   │   │   │   │
│   │   │   │   │   ├── family/
│   │   │   │   │   │   ├── page.tsx            # Family vault overview
│   │   │   │   │   │   ├── members/page.tsx    # Manage members
│   │   │   │   │   │   └── invite/page.tsx     # Invite member
│   │   │   │   │   │
│   │   │   │   │   ├── emergency/
│   │   │   │   │   │   ├── page.tsx            # Emergency settings
│   │   │   │   │   │   └── card/page.tsx       # Emergency card preview
│   │   │   │   │   │
│   │   │   │   │   ├── legacy/
│   │   │   │   │   │   ├── page.tsx            # Digital legacy overview
│   │   │   │   │   │   ├── nominees/page.tsx   # Manage nominees
│   │   │   │   │   │   └── directives/page.tsx # Written directives
│   │   │   │   │   │
│   │   │   │   │   ├── notifications/
│   │   │   │   │   │   └── page.tsx            # Notification center
│   │   │   │   │   │
│   │   │   │   │   ├── settings/
│   │   │   │   │   │   ├── page.tsx            # General settings
│   │   │   │   │   │   ├── profile/page.tsx    # Profile settings
│   │   │   │   │   │   ├── security/page.tsx   # Security & MFA
│   │   │   │   │   │   ├── billing/page.tsx    # Subscription & billing
│   │   │   │   │   │   └── preferences/page.tsx # Notification prefs
│   │   │   │   │   │
│   │   │   │   │   └── onboarding/
│   │   │   │   │       └── page.tsx            # Post-signup onboarding wizard
│   │   │   │   │
│   │   │   │   ├── share/
│   │   │   │   │   └── [token]/page.tsx        # Public shared document view
│   │   │   │   │
│   │   │   │   ├── emergency-access/
│   │   │   │   │   └── [token]/page.tsx        # Emergency contact access view
│   │   │   │   │
│   │   │   │   ├── layout.tsx                  # Root layout (providers, fonts, metadata)
│   │   │   │   ├── not-found.tsx               # 404 page
│   │   │   │   ├── error.tsx                   # Error boundary
│   │   │   │   └── globals.css                 # Global styles + Tailwind directives
│   │   │   │
│   │   │   ├── components/
│   │   │   │   ├── ui/                # shadcn/ui primitives (auto-generated)
│   │   │   │   │   ├── button.tsx
│   │   │   │   │   ├── card.tsx
│   │   │   │   │   ├── dialog.tsx
│   │   │   │   │   ├── dropdown-menu.tsx
│   │   │   │   │   ├── input.tsx
│   │   │   │   │   ├── select.tsx
│   │   │   │   │   ├── toast.tsx
│   │   │   │   │   ├── data-table.tsx
│   │   │   │   │   └── ... (40+ components)
│   │   │   │   │
│   │   │   │   ├── layouts/
│   │   │   │   │   ├── sidebar.tsx             # Dashboard sidebar nav
│   │   │   │   │   ├── topbar.tsx              # Top navigation bar
│   │   │   │   │   ├── mobile-nav.tsx          # Mobile bottom nav
│   │   │   │   │   └── breadcrumbs.tsx         # Breadcrumb navigation
│   │   │   │   │
│   │   │   │   ├── features/
│   │   │   │   │   ├── auth/
│   │   │   │   │   │   ├── login-form.tsx
│   │   │   │   │   │   ├── register-form.tsx
│   │   │   │   │   │   ├── otp-form.tsx
│   │   │   │   │   │   ├── mfa-setup.tsx
│   │   │   │   │   │   └── social-login-buttons.tsx
│   │   │   │   │   │
│   │   │   │   │   ├── documents/
│   │   │   │   │   │   ├── document-card.tsx
│   │   │   │   │   │   ├── document-grid.tsx
│   │   │   │   │   │   ├── document-list.tsx
│   │   │   │   │   │   ├── document-preview.tsx
│   │   │   │   │   │   ├── document-upload-zone.tsx
│   │   │   │   │   │   ├── document-metadata-form.tsx
│   │   │   │   │   │   ├── category-card.tsx
│   │   │   │   │   │   ├── expiry-badge.tsx
│   │   │   │   │   │   └── document-filters.tsx
│   │   │   │   │   │
│   │   │   │   │   ├── search/
│   │   │   │   │   │   ├── search-bar.tsx
│   │   │   │   │   │   ├── search-results.tsx
│   │   │   │   │   │   ├── search-filters.tsx
│   │   │   │   │   │   └── ai-search-input.tsx
│   │   │   │   │   │
│   │   │   │   │   ├── dashboard/
│   │   │   │   │   │   ├── stats-cards.tsx
│   │   │   │   │   │   ├── recent-documents.tsx
│   │   │   │   │   │   ├── expiry-timeline.tsx
│   │   │   │   │   │   ├── quick-actions.tsx
│   │   │   │   │   │   └── storage-usage.tsx
│   │   │   │   │   │
│   │   │   │   │   ├── family/
│   │   │   │   │   │   ├── family-member-card.tsx
│   │   │   │   │   │   ├── invite-member-dialog.tsx
│   │   │   │   │   │   └── family-activity-feed.tsx
│   │   │   │   │   │
│   │   │   │   │   ├── emergency/
│   │   │   │   │   │   ├── emergency-contact-form.tsx
│   │   │   │   │   │   ├── emergency-card-preview.tsx
│   │   │   │   │   │   └── document-set-selector.tsx
│   │   │   │   │   │
│   │   │   │   │   ├── notifications/
│   │   │   │   │   │   ├── notification-bell.tsx
│   │   │   │   │   │   ├── notification-list.tsx
│   │   │   │   │   │   └── notification-item.tsx
│   │   │   │   │   │
│   │   │   │   │   └── settings/
│   │   │   │   │       ├── profile-form.tsx
│   │   │   │   │       ├── security-settings.tsx
│   │   │   │   │       ├── billing-card.tsx
│   │   │   │   │       └── notification-preferences.tsx
│   │   │   │   │
│   │   │   │   └── shared/
│   │   │   │       ├── loading-skeleton.tsx
│   │   │   │       ├── empty-state.tsx
│   │   │   │       ├── error-boundary.tsx
│   │   │   │       ├── confirm-dialog.tsx
│   │   │   │       ├── file-icon.tsx
│   │   │   │       └── avatar-with-fallback.tsx
│   │   │   │
│   │   │   ├── hooks/
│   │   │   │   ├── use-auth.ts                 # Auth state & actions
│   │   │   │   ├── use-documents.ts            # Document CRUD queries
│   │   │   │   ├── use-search.ts               # Search with debounce
│   │   │   │   ├── use-upload.ts               # File upload with progress
│   │   │   │   ├── use-notifications.ts        # Real-time notifications
│   │   │   │   ├── use-family.ts               # Family vault queries
│   │   │   │   ├── use-media-query.ts          # Responsive breakpoints
│   │   │   │   └── use-debounce.ts             # Generic debounce
│   │   │   │
│   │   │   ├── lib/
│   │   │   │   ├── api-client.ts               # Axios/fetch wrapper with interceptors
│   │   │   │   ├── auth.ts                     # NextAuth.js / auth utilities
│   │   │   │   ├── utils.ts                    # cn() and general utilities
│   │   │   │   └── constants.ts                # App-level constants
│   │   │   │
│   │   │   ├── stores/
│   │   │   │   ├── auth-store.ts               # Zustand: auth state
│   │   │   │   ├── ui-store.ts                 # Zustand: sidebar, theme, modals
│   │   │   │   └── upload-store.ts             # Zustand: upload queue & progress
│   │   │   │
│   │   │   ├── providers/
│   │   │   │   ├── query-provider.tsx          # TanStack Query provider
│   │   │   │   ├── theme-provider.tsx          # Dark/light mode
│   │   │   │   ├── auth-provider.tsx           # Auth context
│   │   │   │   └── toast-provider.tsx          # Toast notifications
│   │   │   │
│   │   │   └── types/
│   │   │       └── index.ts                    # Frontend-only types (re-exports shared)
│   │   │
│   │   ├── next.config.ts
│   │   ├── tailwind.config.ts
│   │   ├── postcss.config.js
│   │   ├── tsconfig.json
│   │   ├── components.json                     # shadcn/ui config
│   │   └── package.json
│   │
│   ├── api/                           # ─── NESTJS 11 BACKEND ───
│   │   ├── src/
│   │   │   ├── modules/
│   │   │   │   ├── auth/
│   │   │   │   │   ├── auth.module.ts
│   │   │   │   │   ├── auth.controller.ts
│   │   │   │   │   ├── auth.service.ts
│   │   │   │   │   ├── auth.guard.ts           # JWT auth guard
│   │   │   │   │   ├── strategies/
│   │   │   │   │   │   ├── jwt.strategy.ts
│   │   │   │   │   │   ├── jwt-refresh.strategy.ts
│   │   │   │   │   │   ├── local.strategy.ts
│   │   │   │   │   │   └── google.strategy.ts
│   │   │   │   │   ├── dto/
│   │   │   │   │   │   ├── register.dto.ts
│   │   │   │   │   │   ├── login.dto.ts
│   │   │   │   │   │   ├── verify-otp.dto.ts
│   │   │   │   │   │   ├── refresh-token.dto.ts
│   │   │   │   │   │   ├── forgot-password.dto.ts
│   │   │   │   │   │   ├── reset-password.dto.ts
│   │   │   │   │   │   └── setup-mfa.dto.ts
│   │   │   │   │   ├── decorators/
│   │   │   │   │   │   ├── current-user.decorator.ts
│   │   │   │   │   │   └── public.decorator.ts
│   │   │   │   │   └── __tests__/
│   │   │   │   │       ├── auth.controller.spec.ts
│   │   │   │   │       └── auth.service.spec.ts
│   │   │   │   │
│   │   │   │   ├── users/
│   │   │   │   │   ├── users.module.ts
│   │   │   │   │   ├── users.controller.ts
│   │   │   │   │   ├── users.service.ts
│   │   │   │   │   ├── dto/
│   │   │   │   │   │   ├── update-profile.dto.ts
│   │   │   │   │   │   └── update-settings.dto.ts
│   │   │   │   │   └── __tests__/
│   │   │   │   │       └── users.service.spec.ts
│   │   │   │   │
│   │   │   │   ├── documents/
│   │   │   │   │   ├── documents.module.ts
│   │   │   │   │   ├── documents.controller.ts
│   │   │   │   │   ├── documents.service.ts
│   │   │   │   │   ├── dto/
│   │   │   │   │   │   ├── create-document.dto.ts
│   │   │   │   │   │   ├── update-document.dto.ts
│   │   │   │   │   │   ├── query-documents.dto.ts
│   │   │   │   │   │   └── share-document.dto.ts
│   │   │   │   │   ├── processors/
│   │   │   │   │   │   ├── ocr.processor.ts
│   │   │   │   │   │   ├── thumbnail.processor.ts
│   │   │   │   │   │   └── classification.processor.ts
│   │   │   │   │   └── __tests__/
│   │   │   │   │       └── documents.service.spec.ts
│   │   │   │   │
│   │   │   │   ├── categories/
│   │   │   │   │   ├── categories.module.ts
│   │   │   │   │   ├── categories.controller.ts
│   │   │   │   │   └── categories.service.ts
│   │   │   │   │
│   │   │   │   ├── search/
│   │   │   │   │   ├── search.module.ts
│   │   │   │   │   ├── search.controller.ts
│   │   │   │   │   ├── search.service.ts
│   │   │   │   │   └── elasticsearch.service.ts
│   │   │   │   │
│   │   │   │   ├── ai/
│   │   │   │   │   ├── ai.module.ts
│   │   │   │   │   ├── ai.controller.ts
│   │   │   │   │   ├── ai.service.ts
│   │   │   │   │   ├── gemini.service.ts
│   │   │   │   │   ├── embeddings.service.ts
│   │   │   │   │   └── processors/
│   │   │   │   │       ├── document-qa.processor.ts
│   │   │   │   │       └── summary.processor.ts
│   │   │   │   │
│   │   │   │   ├── notifications/
│   │   │   │   │   ├── notifications.module.ts
│   │   │   │   │   ├── notifications.controller.ts
│   │   │   │   │   ├── notifications.service.ts
│   │   │   │   │   ├── channels/
│   │   │   │   │   │   ├── email.channel.ts
│   │   │   │   │   │   ├── push.channel.ts
│   │   │   │   │   │   ├── sms.channel.ts
│   │   │   │   │   │   └── in-app.channel.ts
│   │   │   │   │   ├── templates/
│   │   │   │   │   │   ├── expiry-warning.hbs
│   │   │   │   │   │   ├── welcome.hbs
│   │   │   │   │   │   ├── security-alert.hbs
│   │   │   │   │   │   └── emergency-access.hbs
│   │   │   │   │   └── processors/
│   │   │   │   │       ├── notification.processor.ts
│   │   │   │   │       └── expiry-cron.processor.ts
│   │   │   │   │
│   │   │   │   ├── family/
│   │   │   │   │   ├── family.module.ts
│   │   │   │   │   ├── family.controller.ts
│   │   │   │   │   ├── family.service.ts
│   │   │   │   │   └── dto/
│   │   │   │   │       ├── create-family.dto.ts
│   │   │   │   │       ├── invite-member.dto.ts
│   │   │   │   │       └── update-member-role.dto.ts
│   │   │   │   │
│   │   │   │   ├── emergency/
│   │   │   │   │   ├── emergency.module.ts
│   │   │   │   │   ├── emergency.controller.ts
│   │   │   │   │   ├── emergency.service.ts
│   │   │   │   │   └── dto/
│   │   │   │   │       ├── create-emergency-contact.dto.ts
│   │   │   │   │       └── request-access.dto.ts
│   │   │   │   │
│   │   │   │   ├── billing/
│   │   │   │   │   ├── billing.module.ts
│   │   │   │   │   ├── billing.controller.ts
│   │   │   │   │   ├── billing.service.ts
│   │   │   │   │   ├── razorpay.service.ts
│   │   │   │   │   └── webhooks/
│   │   │   │   │       └── razorpay.webhook.ts
│   │   │   │   │
│   │   │   │   ├── storage/
│   │   │   │   │   ├── storage.module.ts
│   │   │   │   │   ├── storage.service.ts         # Abstract storage interface
│   │   │   │   │   ├── s3.service.ts              # AWS S3 implementation
│   │   │   │   │   └── cloudinary.service.ts      # Cloudinary implementation
│   │   │   │   │
│   │   │   │   ├── health/
│   │   │   │   │   ├── health.module.ts
│   │   │   │   │   └── health.controller.ts       # /health, /health/db, /health/redis
│   │   │   │   │
│   │   │   │   └── admin/
│   │   │   │       ├── admin.module.ts
│   │   │   │       ├── admin.controller.ts
│   │   │   │       ├── admin.service.ts
│   │   │   │       └── admin.guard.ts             # Admin-only access guard
│   │   │   │
│   │   │   ├── common/
│   │   │   │   ├── decorators/
│   │   │   │   │   ├── roles.decorator.ts
│   │   │   │   │   ├── api-paginated.decorator.ts
│   │   │   │   │   └── idempotency-key.decorator.ts
│   │   │   │   ├── filters/
│   │   │   │   │   ├── all-exceptions.filter.ts
│   │   │   │   │   └── prisma-exception.filter.ts
│   │   │   │   ├── guards/
│   │   │   │   │   ├── roles.guard.ts
│   │   │   │   │   └── throttle.guard.ts
│   │   │   │   ├── interceptors/
│   │   │   │   │   ├── logging.interceptor.ts
│   │   │   │   │   ├── transform.interceptor.ts
│   │   │   │   │   └── timeout.interceptor.ts
│   │   │   │   ├── pipes/
│   │   │   │   │   └── validation.pipe.ts
│   │   │   │   ├── middleware/
│   │   │   │   │   ├── correlation-id.middleware.ts
│   │   │   │   │   └── request-logger.middleware.ts
│   │   │   │   └── utils/
│   │   │   │       ├── pagination.util.ts
│   │   │   │       ├── hashing.util.ts
│   │   │   │       └── crypto.util.ts
│   │   │   │
│   │   │   ├── config/
│   │   │   │   ├── app.config.ts
│   │   │   │   ├── database.config.ts
│   │   │   │   ├── redis.config.ts
│   │   │   │   ├── storage.config.ts
│   │   │   │   ├── auth.config.ts
│   │   │   │   ├── mail.config.ts
│   │   │   │   └── queue.config.ts
│   │   │   │
│   │   │   ├── app.module.ts                     # Root module
│   │   │   └── main.ts                           # Bootstrap
│   │   │
│   │   ├── test/
│   │   │   ├── app.e2e-spec.ts
│   │   │   └── jest-e2e.json
│   │   │
│   │   ├── nest-cli.json
│   │   ├── tsconfig.json
│   │   ├── tsconfig.build.json
│   │   └── package.json
│   │
│   └── admin/                         # ─── ADMIN PORTAL (Next.js) ───
│       ├── src/
│       │   └── app/
│       │       ├── (auth)/login/page.tsx
│       │       ├── (dashboard)/
│       │       │   ├── page.tsx                   # Admin dashboard
│       │       │   ├── users/page.tsx              # User management
│       │       │   ├── users/[id]/page.tsx         # User detail
│       │       │   ├── documents/page.tsx          # Document analytics
│       │       │   ├── moderation/page.tsx         # Content moderation
│       │       │   ├── billing/page.tsx            # Subscription overview
│       │       │   ├── system/page.tsx             # System health
│       │       │   ├── audit/page.tsx              # Audit logs
│       │       │   ├── feature-flags/page.tsx      # Feature toggles
│       │       │   └── announcements/page.tsx      # System announcements
│       │       └── layout.tsx
│       ├── tsconfig.json
│       └── package.json
│
├── packages/
│   ├── shared/                        # ─── SHARED TYPES & UTILS ───
│   │   ├── src/
│   │   │   ├── types/
│   │   │   │   ├── user.types.ts
│   │   │   │   ├── document.types.ts
│   │   │   │   ├── category.types.ts
│   │   │   │   ├── family.types.ts
│   │   │   │   ├── emergency.types.ts
│   │   │   │   ├── notification.types.ts
│   │   │   │   ├── billing.types.ts
│   │   │   │   ├── search.types.ts
│   │   │   │   ├── auth.types.ts
│   │   │   │   └── api.types.ts                   # ApiResponse<T>, PaginatedResponse<T>
│   │   │   ├── constants/
│   │   │   │   ├── categories.ts                  # Category definitions & slugs
│   │   │   │   ├── roles.ts                       # Role & permission constants
│   │   │   │   ├── document-status.ts             # Status enums
│   │   │   │   └── limits.ts                      # Plan limits, file size limits
│   │   │   ├── utils/
│   │   │   │   ├── date.utils.ts                  # Date formatting, expiry calculations
│   │   │   │   ├── file.utils.ts                  # File type checks, size formatting
│   │   │   │   └── string.utils.ts                # Slugify, truncate, mask PII
│   │   │   └── index.ts                           # Barrel export
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   ├── validators/                    # ─── ZOD VALIDATION SCHEMAS ───
│   │   ├── src/
│   │   │   ├── auth.schema.ts
│   │   │   ├── document.schema.ts
│   │   │   ├── user.schema.ts
│   │   │   ├── family.schema.ts
│   │   │   ├── emergency.schema.ts
│   │   │   ├── search.schema.ts
│   │   │   └── index.ts
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   ├── database/                      # ─── PRISMA SCHEMA & CLIENT ───
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   ├── migrations/
│   │   │   └── seed.ts                            # Seed categories, plans, admin user
│   │   ├── src/
│   │   │   ├── client.ts                          # PrismaClient singleton
│   │   │   └── index.ts
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   ├── ui/                            # ─── SHARED UI COMPONENTS ───
│   │   ├── src/
│   │   │   ├── primitives/                        # Base design tokens
│   │   │   └── index.ts
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   └── config/                        # ─── SHARED CONFIGS ───
│       ├── eslint/
│       │   ├── base.js
│       │   ├── next.js
│       │   └── nest.js
│       ├── typescript/
│       │   ├── base.json
│       │   ├── next.json
│       │   └── nest.json
│       └── tailwind/
│           └── base.ts                            # Shared Tailwind preset
│
├── docker/
│   ├── Dockerfile.api                             # NestJS production Dockerfile
│   ├── Dockerfile.web                             # Next.js production Dockerfile
│   ├── Dockerfile.admin                           # Admin portal Dockerfile
│   └── nginx/
│       └── nginx.conf                             # Reverse proxy config
│
├── scripts/
│   ├── setup.sh                                   # Initial setup script
│   ├── seed-db.ts                                 # Database seeding
│   └── generate-keys.sh                           # JWT key pair generation
│
├── docs/
│   ├── adr/                                       # Architecture Decision Records
│   │   ├── 001-monorepo-with-turborepo.md
│   │   ├── 002-nestjs-modular-monolith.md
│   │   └── 003-presigned-url-uploads.md
│   ├── api/                                       # API documentation
│   │   └── openapi.yaml                           # Generated OpenAPI spec
│   └── runbook/                                   # Operations runbooks
│       ├── deployment.md
│       └── incident-response.md
│
├── .env.example                                   # Environment variable template
├── .gitignore
├── .prettierrc
├── .eslintrc.js
├── docker-compose.yml                             # Local dev (PostgreSQL, Redis, Elasticsearch)
├── docker-compose.prod.yml                        # Production compose
├── turbo.json                                     # Turborepo configuration
├── pnpm-workspace.yaml                            # pnpm workspace definition
├── package.json                                   # Root package.json
├── tsconfig.json                                  # Root TypeScript config
├── commitlint.config.js
├── lint-staged.config.js
└── README.md
```

---

# 3. Database Schema (Prisma)

## 3.1 Schema Overview

> [!NOTE]
> The Prisma schema lives in `packages/database/prisma/schema.prisma` and is shared across all backend services. We use PostgreSQL with the `pgvector` extension for embeddings and `uuid-ossp` for UUID generation.

```prisma
// ─── packages/database/prisma/schema.prisma ───

generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["postgresqlExtensions", "fullTextSearch"]
}

datasource db {
  provider   = "postgresql"
  url        = env("DATABASE_URL")
  extensions = [pgvector(map: "vector"), uuidOssp(map: "uuid-ossp")]
}

// ═══════════════════════════════════════════════════
// ENUMS
// ═══════════════════════════════════════════════════

enum UserStatus {
  ACTIVE
  SUSPENDED
  DEACTIVATED
  DELETED
}

enum Gender {
  MALE
  FEMALE
  OTHER
  PREFER_NOT_TO_SAY
}

enum DocumentStatus {
  ACTIVE
  EXPIRING_SOON
  EXPIRED
  ARCHIVED
}

enum OcrStatus {
  PENDING
  PROCESSING
  COMPLETED
  FAILED
  SKIPPED
}

enum FamilyRole {
  ADMIN
  MEMBER
  CHILD
  VIEWER
}

enum FamilyMemberStatus {
  ACTIVE
  INVITED
  REMOVED
}

enum EmergencyAccessStatus {
  REQUESTED
  WAITING
  GRANTED
  DENIED
  EXPIRED
  REVOKED
}

enum EmergencyResolvedBy {
  OWNER
  TIMEOUT
  ADMIN
}

enum LegacyDirectiveType {
  WILL
  INSTRUCTION
  LETTER
  CUSTOM
}

enum DigitalAssetType {
  EMAIL
  SOCIAL_MEDIA
  BANKING
  CRYPTO
  SUBSCRIPTION
  DOMAIN
  OTHER
}

enum SubscriptionStatus {
  ACTIVE
  TRIAL
  PAST_DUE
  CANCELLED
  EXPIRED
}

enum BillingCycle {
  MONTHLY
  YEARLY
}

enum PaymentStatus {
  PENDING
  COMPLETED
  FAILED
  REFUNDED
}

enum PaymentMethod {
  CARD
  UPI
  NETBANKING
  WALLET
}

enum NotificationType {
  EXPIRY_WARNING
  SECURITY_ALERT
  ACTIVITY
  SYSTEM
  EMERGENCY
  FAMILY
  BILLING
}

enum TagSource {
  MANUAL
  AI_GENERATED
}

enum AuditAction {
  // Auth
  AUTH_REGISTER
  AUTH_LOGIN
  AUTH_LOGOUT
  AUTH_PASSWORD_CHANGE
  AUTH_MFA_ENABLE
  AUTH_MFA_DISABLE
  // Documents
  DOCUMENT_UPLOAD
  DOCUMENT_VIEW
  DOCUMENT_UPDATE
  DOCUMENT_DELETE
  DOCUMENT_SHARE
  DOCUMENT_DOWNLOAD
  // Family
  FAMILY_CREATE
  FAMILY_INVITE
  FAMILY_REMOVE
  FAMILY_ROLE_CHANGE
  // Emergency
  EMERGENCY_CONTACT_ADD
  EMERGENCY_ACCESS_REQUEST
  EMERGENCY_ACCESS_GRANT
  EMERGENCY_ACCESS_DENY
  // Admin
  ADMIN_USER_SUSPEND
  ADMIN_USER_DELETE
  ADMIN_FEATURE_TOGGLE
}

// ═══════════════════════════════════════════════════
// USER & AUTH
// ═══════════════════════════════════════════════════

model User {
  id                   String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  email                String    @unique @db.VarChar(255)
  emailVerified        Boolean   @default(false) @map("email_verified")
  phone                String?   @unique @db.VarChar(20)
  phoneVerified        Boolean   @default(false) @map("phone_verified")
  passwordHash         String    @map("password_hash") @db.VarChar(255)
  fullName             String    @map("full_name") @db.VarChar(255)
  avatarUrl            String?   @map("avatar_url") @db.VarChar(500)
  dateOfBirth          DateTime? @map("date_of_birth") @db.Date
  gender               Gender?
  mfaEnabled           Boolean   @default(false) @map("mfa_enabled")
  mfaSecret            String?   @map("mfa_secret") @db.VarChar(255)
  status               UserStatus @default(ACTIVE)
  onboardingCompleted  Boolean   @default(false) @map("onboarding_completed")
  preferredLanguage    String    @default("en") @map("preferred_language") @db.VarChar(10)
  timezone             String    @default("Asia/Kolkata") @db.VarChar(50)
  isAdmin              Boolean   @default(false) @map("is_admin")
  lastLoginAt          DateTime? @map("last_login_at")
  createdAt            DateTime  @default(now()) @map("created_at")
  updatedAt            DateTime  @updatedAt @map("updated_at")
  deletedAt            DateTime? @map("deleted_at")

  // Relations
  documents            Document[]
  sessions             UserSession[]
  familyMemberships    FamilyMembership[]
  emergencyContacts    EmergencyContact[]
  notifications        Notification[]
  subscription         Subscription?
  legacyVault          LegacyVault?
  auditLogs            AuditLog[]
  createdFamilies      Family[]           @relation("FamilyCreator")
  invitedMembers       FamilyMembership[] @relation("InvitedBy")
  documentTags         DocumentTag[]
  shareLinks           ShareLink[]

  @@map("users")
}

model UserSession {
  id                String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId            String   @map("user_id") @db.Uuid
  refreshTokenHash  String   @map("refresh_token_hash") @db.VarChar(255)
  deviceName        String?  @map("device_name") @db.VarChar(255)
  deviceFingerprint String?  @map("device_fingerprint") @db.VarChar(255)
  ipAddress         String   @map("ip_address") @db.VarChar(45)
  isTrusted         Boolean  @default(false) @map("is_trusted")
  lastActiveAt      DateTime @default(now()) @map("last_active_at")
  expiresAt         DateTime @map("expires_at")
  createdAt         DateTime @default(now()) @map("created_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@map("user_sessions")
}

// ═══════════════════════════════════════════════════
// DOCUMENTS
// ═══════════════════════════════════════════════════

model Category {
  id           String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  name         String   @unique @db.VarChar(100)
  slug         String   @unique @db.VarChar(100)
  icon         String   @db.VarChar(50)
  color        String   @db.VarChar(7)
  displayOrder Int      @map("display_order")
  isActive     Boolean  @default(true) @map("is_active")

  subCategories SubCategory[]
  documents     Document[]

  @@map("categories")
}

model SubCategory {
  id             String  @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  categoryId     String  @map("category_id") @db.Uuid
  name           String  @db.VarChar(100)
  slug           String  @db.VarChar(100)
  metadataSchema Json?   @map("metadata_schema") @db.JsonB
  displayOrder   Int     @map("display_order")

  category  Category   @relation(fields: [categoryId], references: [id])
  documents Document[]

  @@unique([categoryId, slug])
  @@map("sub_categories")
}

model Document {
  id              String         @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId          String         @map("user_id") @db.Uuid
  familyId        String?        @map("family_id") @db.Uuid
  categoryId      String         @map("category_id") @db.Uuid
  subCategoryId   String?        @map("sub_category_id") @db.Uuid
  title           String         @db.VarChar(255)
  description     String?        @db.Text
  fileName        String         @map("file_name") @db.VarChar(255)
  fileUrl         String         @map("file_url") @db.VarChar(500)
  fileSize        BigInt         @map("file_size")
  mimeType        String         @map("mime_type") @db.VarChar(100)
  thumbnailUrl    String?        @map("thumbnail_url") @db.VarChar(500)
  status          DocumentStatus @default(ACTIVE)
  issueDate       DateTime?      @map("issue_date") @db.Date
  expiryDate      DateTime?      @map("expiry_date") @db.Date
  documentNumber  String?        @map("document_number") @db.VarChar(100)
  issuer          String?        @db.VarChar(255)
  isFavorite      Boolean        @default(false) @map("is_favorite")
  isSensitive     Boolean        @default(false) @map("is_sensitive")
  ocrStatus       OcrStatus      @default(PENDING) @map("ocr_status")
  ocrText         String?        @map("ocr_text") @db.Text
  aiSummary       String?        @map("ai_summary") @db.Text
  version         Int            @default(1)
  createdAt       DateTime       @default(now()) @map("created_at")
  updatedAt       DateTime       @updatedAt @map("updated_at")
  deletedAt       DateTime?      @map("deleted_at")

  // Relations
  user           User             @relation(fields: [userId], references: [id])
  family         Family?          @relation(fields: [familyId], references: [id])
  category       Category         @relation(fields: [categoryId], references: [id])
  subCategory    SubCategory?     @relation(fields: [subCategoryId], references: [id])
  metadata       DocumentMetadata?
  versions       DocumentVersion[]
  tags           DocumentTag[]
  embeddings     DocumentEmbedding[]
  shareLinks     ShareLink[]
  emergencyDocs  EmergencyDocumentSet[]

  @@index([userId])
  @@index([userId, categoryId])
  @@index([expiryDate])
  @@index([userId, status])
  @@index([userId, deletedAt])
  @@map("documents")
}

model DocumentMetadata {
  id               String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  documentId       String   @unique @map("document_id") @db.Uuid
  extractedFields  Json     @default("{}") @map("extracted_fields") @db.JsonB
  manualFields     Json     @default("{}") @map("manual_fields") @db.JsonB
  confidenceScores Json     @default("{}") @map("confidence_scores") @db.JsonB
  createdAt        DateTime @default(now()) @map("created_at")
  updatedAt        DateTime @updatedAt @map("updated_at")

  document Document @relation(fields: [documentId], references: [id], onDelete: Cascade)

  @@map("document_metadata")
}

model DocumentVersion {
  id            String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  documentId    String   @map("document_id") @db.Uuid
  versionNumber Int      @map("version_number")
  fileUrl       String   @map("file_url") @db.VarChar(500)
  fileSize      BigInt   @map("file_size")
  uploadedBy    String   @map("uploaded_by") @db.Uuid
  changeNote    String?  @map("change_note") @db.Text
  createdAt     DateTime @default(now()) @map("created_at")

  document Document @relation(fields: [documentId], references: [id], onDelete: Cascade)

  @@unique([documentId, versionNumber])
  @@map("document_versions")
}

model DocumentTag {
  id         String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  documentId String    @map("document_id") @db.Uuid
  tag        String    @db.VarChar(50)
  createdBy  String    @map("created_by") @db.Uuid
  source     TagSource @default(MANUAL)

  document Document @relation(fields: [documentId], references: [id], onDelete: Cascade)
  user     User     @relation(fields: [createdBy], references: [id])

  @@unique([documentId, tag])
  @@map("document_tags")
}

model DocumentEmbedding {
  id         String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  documentId String   @map("document_id") @db.Uuid
  chunkIndex Int      @map("chunk_index")
  chunkText  String   @map("chunk_text") @db.Text
  embedding  Unsupported("vector(768)")
  model      String   @db.VarChar(50)
  createdAt  DateTime @default(now()) @map("created_at")

  document Document @relation(fields: [documentId], references: [id], onDelete: Cascade)

  @@unique([documentId, chunkIndex])
  @@map("document_embeddings")
}

model ShareLink {
  id           String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  documentId   String   @map("document_id") @db.Uuid
  createdBy    String   @map("created_by") @db.Uuid
  token        String   @unique @db.VarChar(64)
  passwordHash String?  @map("password_hash") @db.VarChar(255)
  expiresAt    DateTime @map("expires_at")
  maxViews     Int      @default(10) @map("max_views")
  viewCount    Int      @default(0) @map("view_count")
  isActive     Boolean  @default(true) @map("is_active")
  createdAt    DateTime @default(now()) @map("created_at")

  document Document @relation(fields: [documentId], references: [id], onDelete: Cascade)
  creator  User     @relation(fields: [createdBy], references: [id])

  @@map("share_links")
}

// ═══════════════════════════════════════════════════
// FAMILY
// ═══════════════════════════════════════════════════

model Family {
  id         String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  name       String   @db.VarChar(255)
  createdBy  String   @map("created_by") @db.Uuid
  avatarUrl  String?  @map("avatar_url") @db.VarChar(500)
  maxMembers Int      @default(6) @map("max_members")
  createdAt  DateTime @default(now()) @map("created_at")
  updatedAt  DateTime @updatedAt @map("updated_at")

  creator   User               @relation("FamilyCreator", fields: [createdBy], references: [id])
  members   FamilyMembership[]
  documents Document[]

  @@map("families")
}

model FamilyMembership {
  id           String             @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  familyId     String             @map("family_id") @db.Uuid
  userId       String             @map("user_id") @db.Uuid
  role         FamilyRole
  relationship String?            @db.VarChar(50)
  joinedAt     DateTime           @default(now()) @map("joined_at")
  invitedBy    String             @map("invited_by") @db.Uuid
  status       FamilyMemberStatus @default(ACTIVE)

  family  Family @relation(fields: [familyId], references: [id], onDelete: Cascade)
  user    User   @relation(fields: [userId], references: [id])
  inviter User   @relation("InvitedBy", fields: [invitedBy], references: [id])

  @@unique([familyId, userId])
  @@map("family_memberships")
}

// ═══════════════════════════════════════════════════
// EMERGENCY
// ═══════════════════════════════════════════════════

model EmergencyContact {
  id           String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId       String   @map("user_id") @db.Uuid
  contactName  String   @map("contact_name") @db.VarChar(255)
  contactEmail String   @map("contact_email") @db.VarChar(255)
  contactPhone String   @map("contact_phone") @db.VarChar(20)
  relationship String   @db.VarChar(50)
  priority     Int      @default(1)
  isActive     Boolean  @default(true) @map("is_active")
  createdAt    DateTime @default(now()) @map("created_at")

  user       User                   @relation(fields: [userId], references: [id])
  accessLogs EmergencyAccessLog[]
  documentSets EmergencyDocumentSet[]

  @@map("emergency_contacts")
}

model EmergencyDocumentSet {
  id                 String @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId             String @map("user_id") @db.Uuid
  documentId         String @map("document_id") @db.Uuid
  emergencyContactId String? @map("emergency_contact_id") @db.Uuid
  createdAt          DateTime @default(now()) @map("created_at")

  document         Document          @relation(fields: [documentId], references: [id], onDelete: Cascade)
  emergencyContact EmergencyContact? @relation(fields: [emergencyContactId], references: [id])

  @@unique([documentId, emergencyContactId])
  @@map("emergency_document_sets")
}

model EmergencyAccessLog {
  id                 String                @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId             String                @map("user_id") @db.Uuid
  emergencyContactId String                @map("emergency_contact_id") @db.Uuid
  status             EmergencyAccessStatus
  requestedAt        DateTime              @map("requested_at")
  waitingUntil       DateTime              @map("waiting_until")
  resolvedAt         DateTime?             @map("resolved_at")
  resolvedBy         EmergencyResolvedBy?  @map("resolved_by")
  expiresAt          DateTime?             @map("expires_at")
  ipAddress          String?               @map("ip_address") @db.VarChar(45)
  userAgent          String?               @map("user_agent") @db.Text

  emergencyContact EmergencyContact @relation(fields: [emergencyContactId], references: [id])

  @@index([userId, status])
  @@map("emergency_access_logs")
}

// ═══════════════════════════════════════════════════
// LEGACY
// ═══════════════════════════════════════════════════

model LegacyVault {
  id           String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId       String   @unique @map("user_id") @db.Uuid
  isActive     Boolean  @default(false) @map("is_active")
  lastReviewed DateTime? @map("last_reviewed") @db.Date
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt @map("updated_at")

  user       User              @relation(fields: [userId], references: [id])
  nominees   LegacyNominee[]
  directives LegacyDirective[]
  assets     DigitalAsset[]

  @@map("legacy_vaults")
}

model LegacyNominee {
  id           String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  legacyVaultId String  @map("legacy_vault_id") @db.Uuid
  nomineeName  String   @map("nominee_name") @db.VarChar(255)
  nomineeEmail String   @map("nominee_email") @db.VarChar(255)
  nomineePhone String   @map("nominee_phone") @db.VarChar(20)
  relationship String   @db.VarChar(50)
  accessScope  Json     @map("access_scope") @db.JsonB
  priority     Int      @default(1)
  createdAt    DateTime @default(now()) @map("created_at")

  legacyVault LegacyVault       @relation(fields: [legacyVaultId], references: [id], onDelete: Cascade)
  directives  LegacyDirective[]
  assets      DigitalAsset[]

  @@map("legacy_nominees")
}

model LegacyDirective {
  id              String              @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  legacyVaultId   String              @map("legacy_vault_id") @db.Uuid
  type            LegacyDirectiveType
  title           String              @db.VarChar(255)
  content         String              @db.Text
  targetNomineeId String?             @map("target_nominee_id") @db.Uuid
  createdAt       DateTime            @default(now()) @map("created_at")
  updatedAt       DateTime            @updatedAt @map("updated_at")

  legacyVault   LegacyVault    @relation(fields: [legacyVaultId], references: [id], onDelete: Cascade)
  targetNominee LegacyNominee? @relation(fields: [targetNomineeId], references: [id])

  @@map("legacy_directives")
}

model DigitalAsset {
  id              String           @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  legacyVaultId   String           @map("legacy_vault_id") @db.Uuid
  assetType       DigitalAssetType @map("asset_type")
  serviceName     String           @map("service_name") @db.VarChar(255)
  username        String?          @db.VarChar(255)
  notes           String?          @db.Text
  assignedNomineeId String?        @map("assigned_nominee_id") @db.Uuid
  createdAt       DateTime         @default(now()) @map("created_at")

  legacyVault     LegacyVault    @relation(fields: [legacyVaultId], references: [id], onDelete: Cascade)
  assignedNominee LegacyNominee? @relation(fields: [assignedNomineeId], references: [id])

  @@map("digital_assets")
}

// ═══════════════════════════════════════════════════
// BILLING
// ═══════════════════════════════════════════════════

model Plan {
  id                String  @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  name              String  @unique @db.VarChar(50)
  displayName       String  @map("display_name") @db.VarChar(100)
  priceMonthly      Decimal @map("price_monthly") @db.Decimal(10, 2)
  priceYearly       Decimal @map("price_yearly") @db.Decimal(10, 2)
  storageLimitGb    Int     @map("storage_limit_gb")
  maxDocuments      Int     @map("max_documents")
  maxFamilyMembers  Int     @default(1) @map("max_family_members")
  ocrCreditsMonthly Int     @map("ocr_credits_monthly")
  aiQueriesMonthly  Int     @map("ai_queries_monthly")
  features          Json    @db.JsonB
  isActive          Boolean @default(true) @map("is_active")

  subscriptions Subscription[]

  @@map("plans")
}

model Subscription {
  id                 String             @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId             String             @unique @map("user_id") @db.Uuid
  planId             String             @map("plan_id") @db.Uuid
  status             SubscriptionStatus
  billingCycle       BillingCycle       @map("billing_cycle")
  currentPeriodStart DateTime           @map("current_period_start")
  currentPeriodEnd   DateTime           @map("current_period_end")
  paymentGatewayId   String?            @map("payment_gateway_id") @db.VarChar(255)
  trialEndsAt        DateTime?          @map("trial_ends_at")
  cancelledAt        DateTime?          @map("cancelled_at")
  createdAt          DateTime           @default(now()) @map("created_at")
  updatedAt          DateTime           @updatedAt @map("updated_at")

  user     User      @relation(fields: [userId], references: [id])
  plan     Plan      @relation(fields: [planId], references: [id])
  payments Payment[]

  @@map("subscriptions")
}

model Payment {
  id               String        @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  subscriptionId   String        @map("subscription_id") @db.Uuid
  amount           Decimal       @db.Decimal(10, 2)
  currency         String        @default("INR") @db.VarChar(3)
  status           PaymentStatus
  paymentMethod    PaymentMethod @map("payment_method")
  gatewayPaymentId String        @map("gateway_payment_id") @db.VarChar(255)
  gatewayOrderId   String        @map("gateway_order_id") @db.VarChar(255)
  invoiceUrl       String?       @map("invoice_url") @db.VarChar(500)
  paidAt           DateTime?     @map("paid_at")
  createdAt        DateTime      @default(now()) @map("created_at")

  subscription Subscription @relation(fields: [subscriptionId], references: [id])

  @@map("payments")
}

// ═══════════════════════════════════════════════════
// NOTIFICATIONS & AUDIT
// ═══════════════════════════════════════════════════

model Notification {
  id        String           @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId    String           @map("user_id") @db.Uuid
  type      NotificationType
  title     String           @db.VarChar(255)
  body      String           @db.Text
  data      Json             @default("{}") @db.JsonB
  readAt    DateTime?        @map("read_at")
  createdAt DateTime         @default(now()) @map("created_at")

  user User @relation(fields: [userId], references: [id])

  @@index([userId, readAt])
  @@index([userId, createdAt(sort: Desc)])
  @@map("notifications")
}

model NotificationPreference {
  id        String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId    String   @map("user_id") @db.Uuid
  type      NotificationType
  email     Boolean  @default(true)
  push      Boolean  @default(true)
  sms       Boolean  @default(false)
  whatsapp  Boolean  @default(false)
  inApp     Boolean  @default(true) @map("in_app")
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@unique([userId, type])
  @@map("notification_preferences")
}

model AuditLog {
  id           String      @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId       String?     @map("user_id") @db.Uuid
  action       AuditAction
  resourceType String      @map("resource_type") @db.VarChar(50)
  resourceId   String?     @map("resource_id") @db.Uuid
  details      Json        @default("{}") @db.JsonB
  ipAddress    String?     @map("ip_address") @db.VarChar(45)
  userAgent    String?     @map("user_agent") @db.Text
  createdAt    DateTime    @default(now()) @map("created_at")

  user User? @relation(fields: [userId], references: [id])

  @@index([userId, action, createdAt(sort: Desc)])
  @@index([resourceType, resourceId])
  @@map("audit_logs")
}
```

## 3.2 Seed Data Script

The seed script (`packages/database/prisma/seed.ts`) will populate:

1. **11 categories** with icons and colors
2. **50+ sub-categories** with metadata schemas
3. **3 plans** (Free, Premium, Family)
4. **1 admin user** (configurable via env)
5. **Default notification preferences** template

---

# 4. API Architecture

## 4.1 API Design Principles

| Principle                        | Implementation                                                                   |
| -------------------------------- | -------------------------------------------------------------------------------- |
| **RESTful Convention**           | `GET /api/v1/documents`, `POST /api/v1/documents`, `PATCH /api/v1/documents/:id` |
| **Versioned**                    | All endpoints under `/api/v1/` — allows future v2 without breaking               |
| **Consistent Response Envelope** | Every response: `{ success, data, message, meta }`                               |
| **Pagination**                   | Cursor-based for feeds, offset-based for tables: `?page=1&limit=20`              |
| **Idempotent**                   | `Idempotency-Key` header for all POST/PATCH/DELETE operations                    |
| **Rate Limited**                 | Per-IP (anonymous): 100/min, Per-User (authenticated): 300/min                   |
| **Correlation ID**               | `X-Correlation-Id` header propagated through all services                        |

## 4.2 Standard Response Format

```typescript
// Success Response
{
  "success": true,
  "data": { ... },
  "message": "Document uploaded successfully",
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 156,
    "totalPages": 8
  }
}

// Error Response
{
  "success": false,
  "error": {
    "code": "DOCUMENT_NOT_FOUND",
    "message": "The requested document does not exist",
    "details": []
  },
  "meta": {
    "correlationId": "abc-123-def",
    "timestamp": "2026-06-05T00:00:00Z"
  }
}
```

## 4.3 Complete API Endpoint Map

### Auth (`/api/v1/auth`)

| Method | Endpoint           | Description                          | Auth          |
| ------ | ------------------ | ------------------------------------ | ------------- |
| POST   | `/register`        | Register with email/phone + password | Public        |
| POST   | `/login`           | Login with email + password          | Public        |
| POST   | `/login/phone`     | Login with phone + OTP               | Public        |
| POST   | `/login/google`    | Google OAuth login                   | Public        |
| POST   | `/verify-email`    | Verify email with token              | Public        |
| POST   | `/verify-otp`      | Verify phone OTP                     | Public        |
| POST   | `/refresh`         | Refresh access token                 | Refresh Token |
| POST   | `/logout`          | Invalidate session                   | JWT           |
| POST   | `/logout-all`      | Invalidate all sessions              | JWT           |
| POST   | `/forgot-password` | Send password reset email            | Public        |
| POST   | `/reset-password`  | Reset password with token            | Public        |
| POST   | `/mfa/setup`       | Begin MFA setup (get QR code)        | JWT           |
| POST   | `/mfa/verify`      | Verify MFA setup with TOTP           | JWT           |
| POST   | `/mfa/validate`    | Validate TOTP during login           | Partial JWT   |
| DELETE | `/mfa`             | Disable MFA                          | JWT + TOTP    |

### Users (`/api/v1/users`)

| Method | Endpoint           | Description                | Auth           |
| ------ | ------------------ | -------------------------- | -------------- |
| GET    | `/me`              | Get current user profile   | JWT            |
| PATCH  | `/me`              | Update profile             | JWT            |
| PATCH  | `/me/password`     | Change password            | JWT            |
| PATCH  | `/me/avatar`       | Update avatar              | JWT            |
| GET    | `/me/sessions`     | List active sessions       | JWT            |
| DELETE | `/me/sessions/:id` | Revoke a session           | JWT            |
| GET    | `/me/storage`      | Get storage usage stats    | JWT            |
| POST   | `/me/export`       | Request data export (DPDP) | JWT            |
| DELETE | `/me`              | Delete account (soft)      | JWT + Password |

### Documents (`/api/v1/documents`)

| Method | Endpoint           | Description                                       | Auth        |
| ------ | ------------------ | ------------------------------------------------- | ----------- |
| GET    | `/`                | List user's documents (paginated, filterable)     | JWT         |
| POST   | `/`                | Create document record + get upload URL           | JWT         |
| GET    | `/:id`             | Get document detail                               | JWT + Owner |
| PATCH  | `/:id`             | Update document metadata                          | JWT + Owner |
| DELETE | `/:id`             | Soft-delete document                              | JWT + Owner |
| POST   | `/:id/restore`     | Restore deleted document                          | JWT + Owner |
| GET    | `/:id/versions`    | List document versions                            | JWT + Owner |
| POST   | `/:id/versions`    | Upload new version                                | JWT + Owner |
| GET    | `/:id/download`    | Get signed download URL                           | JWT + Owner |
| POST   | `/:id/share`       | Create share link                                 | JWT + Owner |
| PATCH  | `/:id/favorite`    | Toggle favorite                                   | JWT + Owner |
| POST   | `/upload-url`      | Get presigned upload URL                          | JWT         |
| POST   | `/upload-complete` | Confirm upload completion (triggers OCR pipeline) | JWT         |
| POST   | `/bulk/delete`     | Bulk delete documents                             | JWT         |
| POST   | `/bulk/move`       | Bulk move to category                             | JWT         |
| POST   | `/bulk/tag`        | Bulk add tags                                     | JWT         |

### Categories (`/api/v1/categories`)

| Method | Endpoint           | Description                      | Auth |
| ------ | ------------------ | -------------------------------- | ---- |
| GET    | `/`                | List all categories with counts  | JWT  |
| GET    | `/:slug`           | Get category with sub-categories | JWT  |
| GET    | `/:slug/documents` | Get documents in category        | JWT  |

### Search (`/api/v1/search`)

| Method | Endpoint       | Description                       | Auth |
| ------ | -------------- | --------------------------------- | ---- |
| GET    | `/`            | Full-text + metadata search       | JWT  |
| POST   | `/ai`          | Natural language AI search        | JWT  |
| GET    | `/suggestions` | Search suggestions / autocomplete | JWT  |
| GET    | `/recent`      | Recently accessed documents       | JWT  |
| GET    | `/expiring`    | Documents expiring soon           | JWT  |

### AI (`/api/v1/ai`)

| Method | Endpoint                 | Description                    | Auth |
| ------ | ------------------------ | ------------------------------ | ---- |
| POST   | `/ask`                   | Ask a question about documents | JWT  |
| POST   | `/summarize/:documentId` | Generate document summary      | JWT  |
| GET    | `/insights`              | Cross-document insights        | JWT  |

### Notifications (`/api/v1/notifications`)

| Method | Endpoint        | Description                     | Auth |
| ------ | --------------- | ------------------------------- | ---- |
| GET    | `/`             | List notifications (paginated)  | JWT  |
| GET    | `/unread-count` | Get unread count                | JWT  |
| PATCH  | `/:id/read`     | Mark as read                    | JWT  |
| POST   | `/read-all`     | Mark all as read                | JWT  |
| GET    | `/preferences`  | Get notification preferences    | JWT  |
| PATCH  | `/preferences`  | Update notification preferences | JWT  |

### Family (`/api/v1/family`)

| Method | Endpoint                          | Description            | Auth               |
| ------ | --------------------------------- | ---------------------- | ------------------ |
| POST   | `/`                               | Create a family        | JWT                |
| GET    | `/`                               | Get user's family      | JWT                |
| PATCH  | `/:familyId`                      | Update family settings | JWT + FamilyAdmin  |
| POST   | `/:familyId/invite`               | Invite a member        | JWT + FamilyAdmin  |
| DELETE | `/:familyId/members/:userId`      | Remove a member        | JWT + FamilyAdmin  |
| PATCH  | `/:familyId/members/:userId/role` | Change member role     | JWT + FamilyAdmin  |
| GET    | `/:familyId/members`              | List family members    | JWT + FamilyMember |
| GET    | `/:familyId/documents`            | List family documents  | JWT + FamilyMember |
| GET    | `/:familyId/activity`             | Family activity feed   | JWT + FamilyMember |

### Emergency (`/api/v1/emergency`)

| Method | Endpoint            | Description                           | Auth           |
| ------ | ------------------- | ------------------------------------- | -------------- |
| GET    | `/contacts`         | List emergency contacts               | JWT            |
| POST   | `/contacts`         | Add emergency contact                 | JWT            |
| PATCH  | `/contacts/:id`     | Update emergency contact              | JWT            |
| DELETE | `/contacts/:id`     | Remove emergency contact              | JWT            |
| GET    | `/document-set`     | Get emergency document set            | JWT            |
| POST   | `/document-set`     | Add document to emergency set         | JWT            |
| DELETE | `/document-set/:id` | Remove from emergency set             | JWT            |
| POST   | `/request-access`   | Request emergency access (by contact) | Public (token) |
| POST   | `/grant/:logId`     | Grant emergency access                | JWT            |
| POST   | `/deny/:logId`      | Deny emergency access                 | JWT            |
| GET    | `/card`             | Get emergency card data               | JWT            |

### Billing (`/api/v1/billing`)

| Method | Endpoint            | Description                            | Auth              |
| ------ | ------------------- | -------------------------------------- | ----------------- |
| GET    | `/plans`            | List available plans                   | Public            |
| GET    | `/subscription`     | Get current subscription               | JWT               |
| POST   | `/subscribe`        | Create subscription (initiate payment) | JWT               |
| POST   | `/webhook/razorpay` | Razorpay webhook                       | Webhook Signature |
| GET    | `/invoices`         | List payment history                   | JWT               |
| POST   | `/cancel`           | Cancel subscription                    | JWT               |

### Share (Public)

| Method | Endpoint                      | Description                             | Auth   |
| ------ | ----------------------------- | --------------------------------------- | ------ |
| GET    | `/api/v1/share/:token`        | Get shared document (password optional) | Public |
| POST   | `/api/v1/share/:token/verify` | Verify share link password              | Public |

### Admin (`/api/v1/admin`)

| Method | Endpoint            | Description                            | Auth        |
| ------ | ------------------- | -------------------------------------- | ----------- |
| GET    | `/dashboard`        | Admin KPI dashboard                    | JWT + Admin |
| GET    | `/users`            | List all users (paginated, searchable) | JWT + Admin |
| GET    | `/users/:id`        | Get user detail                        | JWT + Admin |
| PATCH  | `/users/:id/status` | Suspend / reactivate user              | JWT + Admin |
| GET    | `/documents/stats`  | Document analytics                     | JWT + Admin |
| GET    | `/audit-logs`       | Browse audit logs                      | JWT + Admin |
| GET    | `/system/health`    | System health status                   | JWT + Admin |
| GET    | `/billing/overview` | Revenue and subscription stats         | JWT + Admin |

### Health

| Method | Endpoint        | Description           | Auth   |
| ------ | --------------- | --------------------- | ------ |
| GET    | `/health`       | Basic health check    | Public |
| GET    | `/health/db`    | Database connectivity | Public |
| GET    | `/health/redis` | Redis connectivity    | Public |

---

# 5. Authentication Flow

## 5.1 Token Architecture

```mermaid
graph TD
    subgraph "Token Types"
        AT["Access Token (JWT)<br/>• 15 min TTL<br/>• Contains: userId, email, role<br/>• Stored: Memory (frontend)"]
        RT["Refresh Token (JWT)<br/>• 7 day TTL<br/>• Contains: userId, sessionId<br/>• Stored: httpOnly cookie + DB hash"]
        ET["Email Verification Token<br/>• 24 hour TTL<br/>• Random 64-char string<br/>• Stored: Redis"]
        OTP["OTP<br/>• 5 min TTL<br/>• 6-digit numeric<br/>• Stored: Redis<br/>• Max 3 attempts"]
    end
```

## 5.2 Registration Flow

```mermaid
sequenceDiagram
    actor U as User
    participant F as Frontend
    participant A as API (Auth)
    participant DB as PostgreSQL
    participant R as Redis
    participant E as Email Service

    U->>F: Fill registration form
    F->>F: Validate (Zod schema)
    F->>A: POST /auth/register {email, password, fullName, phone}
    A->>A: Validate DTO
    A->>DB: Check email/phone uniqueness
    alt Email/Phone exists
        A-->>F: 409 Conflict
    end
    A->>A: Hash password (bcrypt, rounds=12)
    A->>DB: Create User (status=ACTIVE, emailVerified=false)
    A->>DB: Create Subscription (plan=FREE, status=ACTIVE)
    A->>R: Store email verification token (TTL: 24h)
    A->>E: Send verification email with token link
    A->>DB: Log AuditLog (AUTH_REGISTER)
    A-->>F: 201 Created {user, message: "Verification email sent"}
    F-->>U: "Check your email to verify"

    U->>F: Click verification link
    F->>A: POST /auth/verify-email {token}
    A->>R: Lookup & validate token
    A->>DB: Update User.emailVerified = true
    A->>R: Delete token
    A-->>F: 200 OK {message: "Email verified"}
    F-->>U: Redirect to login
```

## 5.3 Login Flow (Email + Password + Optional MFA)

```mermaid
sequenceDiagram
    actor U as User
    participant F as Frontend
    participant A as API (Auth)
    participant DB as PostgreSQL
    participant R as Redis

    U->>F: Enter email + password
    F->>A: POST /auth/login {email, password}
    A->>DB: Find user by email
    alt User not found
        A-->>F: 401 Invalid credentials
    end
    A->>A: Verify password (bcrypt.compare)
    alt Password incorrect
        A->>R: Increment failed attempts
        alt 5+ failures
            A->>DB: Update user.status = SUSPENDED (temporary)
            A-->>F: 429 Account locked (15 min)
        end
        A-->>F: 401 Invalid credentials
    end
    A->>R: Reset failed attempts

    alt MFA Enabled
        A->>A: Generate partial JWT (mfaPending: true, 5 min TTL)
        A-->>F: 200 {mfaRequired: true, partialToken}
        F-->>U: Show TOTP input
        U->>F: Enter TOTP code
        F->>A: POST /auth/mfa/validate {partialToken, code}
        A->>A: Verify TOTP (speakeasy)
        alt Invalid TOTP
            A-->>F: 401 Invalid code
        end
    end

    A->>DB: Create UserSession
    A->>A: Generate Access Token (15 min)
    A->>A: Generate Refresh Token (7 days)
    A->>DB: Store hashed refresh token in session
    A->>DB: Log AuditLog (AUTH_LOGIN)
    A-->>F: 200 {accessToken, user} + Set-Cookie: refreshToken (httpOnly)
    F->>F: Store accessToken in memory (Zustand)
    F-->>U: Redirect to dashboard
```

## 5.4 Token Refresh Flow

```mermaid
sequenceDiagram
    participant F as Frontend (Interceptor)
    participant A as API (Auth)
    participant DB as PostgreSQL

    F->>A: Any API call with expired accessToken
    A-->>F: 401 Token expired
    F->>A: POST /auth/refresh (Cookie: refreshToken)
    A->>A: Verify refresh JWT signature
    A->>DB: Lookup session by userId + verify hash
    alt Session expired or revoked
        A-->>F: 401 Session invalid → redirect to login
    end
    A->>A: Generate new Access Token
    A->>A: Rotate Refresh Token (new token, invalidate old)
    A->>DB: Update session with new refresh token hash
    A-->>F: 200 {accessToken} + Set-Cookie: new refreshToken
    F->>F: Retry original request with new accessToken
```

## 5.5 Google OAuth Flow

```mermaid
sequenceDiagram
    actor U as User
    participant F as Frontend
    participant G as Google OAuth
    participant A as API (Auth)
    participant DB as PostgreSQL

    U->>F: Click "Continue with Google"
    F->>G: Redirect to Google OAuth consent
    G-->>F: Redirect back with authorization code
    F->>A: POST /auth/login/google {code}
    A->>G: Exchange code for tokens
    G-->>A: {access_token, id_token}
    A->>A: Verify id_token, extract email + name + avatar
    A->>DB: Find user by email
    alt New user
        A->>DB: Create User (emailVerified=true, password=random)
        A->>DB: Create Subscription (FREE)
    end
    A->>DB: Create session + generate tokens
    A-->>F: 200 {accessToken, user} + Set-Cookie
```

## 5.6 Security Measures

| Measure                   | Implementation                                                                 |
| ------------------------- | ------------------------------------------------------------------------------ |
| **Password Storage**      | bcrypt with cost factor 12                                                     |
| **JWT Signing**           | RS256 (asymmetric) — private key signs, public key verifies                    |
| **Refresh Token**         | httpOnly, Secure, SameSite=Strict cookie                                       |
| **Token Rotation**        | Every refresh rotates the refresh token; old token immediately invalidated     |
| **Reuse Detection**       | If a revoked refresh token is used, ALL sessions for that user are invalidated |
| **Rate Limiting**         | Login: 5 attempts/15 min per email; OTP: 3 attempts per code                   |
| **CSRF**                  | SameSite=Strict on cookies; Origin header validation                           |
| **Device Fingerprinting** | Track device info per session; alert on new device                             |

---

# 6. RBAC Design

## 6.1 Role Hierarchy

```mermaid
graph TD
    SUPER["🔴 SUPER_ADMIN<br/>Platform owner<br/>Full system access"]
    ADMIN["🟠 ADMIN<br/>Platform administrator<br/>User + content management"]
    OWNER["🟢 OWNER<br/>Account owner<br/>Full access to own data"]
    FAM_ADMIN["🔵 FAMILY_ADMIN<br/>Family vault admin<br/>Manages family members & shared docs"]
    FAM_MEMBER["🟣 FAMILY_MEMBER<br/>Family member<br/>Manages own docs + view shared"]
    FAM_CHILD["🟡 FAMILY_CHILD<br/>Minor member<br/>View-only, parent-managed"]
    FAM_VIEWER["⚪ FAMILY_VIEWER<br/>Extended family / viewer<br/>Read-only on shared docs"]
    EMR_CONTACT["🔴 EMERGENCY_CONTACT<br/>Emergency contact<br/>Time-limited access to emergency set"]

    SUPER --> ADMIN
    ADMIN --> OWNER
    OWNER --> FAM_ADMIN
    FAM_ADMIN --> FAM_MEMBER
    FAM_MEMBER --> FAM_CHILD
    FAM_MEMBER --> FAM_VIEWER
    OWNER --> EMR_CONTACT
```

## 6.2 Permission Matrix

| Permission               |    Owner    |  Fam Admin  | Fam Member | Fam Child | Fam Viewer | Emergency |
| ------------------------ | :---------: | :---------: | :--------: | :-------: | :--------: | :-------: |
| **Own Documents**        |             |             |            |           |            |           |
| Upload                   |     ✅      |      —      |     ✅     |    ❌     |     ❌     |    ❌     |
| View                     |     ✅      |      —      |     ✅     |    👁️     |     ❌     |    ❌     |
| Edit                     |     ✅      |      —      |     ✅     |    ❌     |     ❌     |    ❌     |
| Delete                   |     ✅      |      —      |     ✅     |    ❌     |     ❌     |    ❌     |
| Share                    |     ✅      |      —      |     ✅     |    ❌     |     ❌     |    ❌     |
| **Family Member's Docs** |             |             |            |           |            |           |
| View                     |     N/A     |     ✅      |     ❌     |    ❌     |     ❌     |    ❌     |
| **Shared Family Docs**   |             |             |            |           |            |           |
| View                     |     ✅      |     ✅      |     ✅     |    👁️     |     👁️     |    ❌     |
| Upload                   |     ✅      |     ✅      |     ✅     |    ❌     |     ❌     |    ❌     |
| **Child's Documents**    |             |             |            |           |            |           |
| Full Control             | ✅ (parent) | ✅ (parent) |     ❌     |    N/A    |     ❌     |    ❌     |
| **Emergency Set**        |             |             |            |           |            |           |
| View                     |     ❌      |     ❌      |     ❌     |    ❌     |     ❌     |    ⏱️     |
| **Family Management**    |             |             |            |           |            |           |
| Invite Members           |     ✅      |     ✅      |     ❌     |    ❌     |     ❌     |    ❌     |
| Remove Members           |     ✅      |     ✅      |     ❌     |    ❌     |     ❌     |    ❌     |
| Change Roles             |     ✅      |     ✅      |     ❌     |    ❌     |     ❌     |    ❌     |

> 👁️ = View-only on documents explicitly shared | ⏱️ = Time-limited access (72h) after activation

## 6.3 Implementation Architecture

```typescript
// Permission definition (packages/shared/src/constants/roles.ts)
export const Permissions = {
  // Document permissions
  DOCUMENT_CREATE: 'document:create',
  DOCUMENT_READ: 'document:read',
  DOCUMENT_UPDATE: 'document:update',
  DOCUMENT_DELETE: 'document:delete',
  DOCUMENT_SHARE: 'document:share',
  DOCUMENT_DOWNLOAD: 'document:download',

  // Family permissions
  FAMILY_CREATE: 'family:create',
  FAMILY_MANAGE: 'family:manage',
  FAMILY_INVITE: 'family:invite',
  FAMILY_VIEW: 'family:view',

  // Emergency permissions
  EMERGENCY_MANAGE: 'emergency:manage',
  EMERGENCY_ACCESS: 'emergency:access',

  // Admin permissions
  ADMIN_USERS: 'admin:users',
  ADMIN_SYSTEM: 'admin:system',
  ADMIN_BILLING: 'admin:billing',
  ADMIN_AUDIT: 'admin:audit',
} as const;

// Role-to-Permission mapping
export const RolePermissions: Record<string, string[]> = {
  OWNER: [
    Permissions.DOCUMENT_CREATE,
    Permissions.DOCUMENT_READ,
    Permissions.DOCUMENT_UPDATE,
    Permissions.DOCUMENT_DELETE,
    Permissions.DOCUMENT_SHARE,
    Permissions.DOCUMENT_DOWNLOAD,
    Permissions.FAMILY_CREATE,
    Permissions.FAMILY_MANAGE,
    Permissions.FAMILY_INVITE,
    Permissions.FAMILY_VIEW,
    Permissions.EMERGENCY_MANAGE,
  ],
  FAMILY_ADMIN: [
    Permissions.DOCUMENT_CREATE,
    Permissions.DOCUMENT_READ,
    Permissions.DOCUMENT_UPDATE,
    Permissions.DOCUMENT_DELETE,
    Permissions.FAMILY_MANAGE,
    Permissions.FAMILY_INVITE,
    Permissions.FAMILY_VIEW,
  ],
  FAMILY_MEMBER: [
    Permissions.DOCUMENT_CREATE,
    Permissions.DOCUMENT_READ,
    Permissions.DOCUMENT_UPDATE,
    Permissions.DOCUMENT_DELETE,
    Permissions.FAMILY_VIEW,
  ],
  FAMILY_CHILD: [Permissions.DOCUMENT_READ, Permissions.FAMILY_VIEW],
  FAMILY_VIEWER: [Permissions.DOCUMENT_READ, Permissions.FAMILY_VIEW],
};
```

### Guard Chain (NestJS)

```
Request → JwtAuthGuard → RolesGuard → OwnershipGuard → Controller
              │               │               │
              ▼               ▼               ▼
        Verify JWT      Check role       Verify user owns
        & extract       has required     the requested
        user            permission       resource
```

---

# 7. Document Management Architecture

## 7.1 Document Lifecycle

```mermaid
stateDiagram-v2
    [*] --> Uploading: User initiates upload
    Uploading --> Processing: File stored in S3
    Processing --> Active: OCR + Classification complete
    Processing --> Active: OCR failed (graceful degradation)

    Active --> ExpiringSOON: Expiry within 90 days
    ExpiringSOON --> Expired: Past expiry date
    Expired --> Active: User updates expiry date

    Active --> Archived: User archives
    ExpiringSOON --> Archived: User archives
    Archived --> Active: User restores

    Active --> Deleted: User deletes (soft)
    ExpiringSOON --> Deleted: User deletes (soft)
    Archived --> Deleted: User deletes (soft)
    Deleted --> Active: User restores (within 30 days)
    Deleted --> [*]: Permanent delete (after 30 days)
```

## 7.2 Upload Pipeline

```mermaid
sequenceDiagram
    actor U as User
    participant F as Frontend
    participant A as API
    participant S3 as S3/Cloudinary
    participant Q as BullMQ Queue
    participant W as Workers
    participant DB as PostgreSQL
    participant ES as Elasticsearch

    U->>F: Select file(s) to upload
    F->>F: Client-side validation (type, size)
    F->>A: POST /documents/upload-url {fileName, mimeType, fileSize}
    A->>A: Validate file type & check storage quota
    A->>S3: Generate presigned PUT URL (5 min TTL)
    A-->>F: {uploadUrl, documentId, fields}

    F->>S3: PUT file directly to S3 (with progress tracking)
    S3-->>F: 200 OK

    F->>A: POST /documents/upload-complete {documentId, categoryId, title, metadata}
    A->>DB: Create Document record (ocrStatus=PENDING)
    A->>DB: Create DocumentMetadata (manualFields)
    A->>Q: Enqueue: ocr-pipeline {documentId}
    A->>DB: Log AuditLog (DOCUMENT_UPLOAD)
    A-->>F: 201 Created {document}

    par OCR Pipeline (Async)
        Q->>W: Process OCR Job
        W->>S3: Fetch file
        W->>W: Image enhancement (if image)
        W->>W: OCR extraction (Google Vision / Tesseract)
        W->>DB: Update Document.ocrText, ocrStatus=COMPLETED
        W->>Q: Enqueue: classification {documentId}
        W->>Q: Enqueue: embedding-generation {documentId}
        W->>Q: Enqueue: thumbnail-generation {documentId}
    and Classification (Async)
        Q->>W: Classify document type
        W->>W: Run classification model on OCR text
        W->>DB: Update auto-detected category/subCategory
        W->>DB: Update DocumentMetadata.extractedFields
    and Embedding Generation (Async)
        Q->>W: Generate embeddings
        W->>W: Chunk text → generate embeddings (Gemini)
        W->>DB: Store DocumentEmbedding records
    and Thumbnail Generation (Async)
        Q->>W: Generate thumbnail
        W->>W: Create preview image
        W->>S3: Store thumbnail
        W->>DB: Update Document.thumbnailUrl
    end

    W->>ES: Index document (title, ocrText, metadata, tags)
    W->>F: WebSocket notification: "Document processed"
```

## 7.3 Document Expiry Cron Job

```
┌─────────────────────────────────────────────────────────┐
│ CRON: Daily at 00:00 UTC — ExpiryCheckProcessor         │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  1. Query documents WHERE:                               │
│     - expiryDate IS NOT NULL                             │
│     - status IN (ACTIVE, EXPIRING_SOON)                  │
│     - deletedAt IS NULL                                  │
│                                                          │
│  2. For each document:                                   │
│     ┌──────────────────────┬────────────────────┐        │
│     │ daysUntilExpiry      │ Action             │        │
│     ├──────────────────────┼────────────────────┤        │
│     │ ≤ 0                  │ → Status: EXPIRED  │        │
│     │ 1–7                  │ → Notify: URGENT   │        │
│     │ 8–30                 │ → Notify: WARNING  │        │
│     │ 31–90                │ → Status: EXPIRING │        │
│     │ 91+                  │ → Status: ACTIVE   │        │
│     └──────────────────────┴────────────────────┘        │
│                                                          │
│  3. Batch create notifications                           │
│  4. Queue notification delivery (email, push)            │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

# 8. Storage Architecture

## 8.1 Dual-Provider Strategy

| Provider       | Usage                                              | Rationale                                                                           |
| -------------- | -------------------------------------------------- | ----------------------------------------------------------------------------------- |
| **AWS S3**     | Primary document storage (PDFs, images, originals) | Durability (11 nines), lifecycle policies, presigned URLs, cost-effective           |
| **Cloudinary** | Image transformations, thumbnails, previews        | On-the-fly image resizing, format conversion, CDN-cached delivery, document preview |

## 8.2 S3 Bucket Structure

```
lifeledger-{env}/
├── documents/
│   └── {user_id}/
│       └── {document_id}/
│           ├── v1/
│           │   └── original.pdf
│           ├── v2/
│           │   └── original.pdf
│           └── thumbnails/
│               ├── thumb_200x200.webp
│               └── preview_800x600.webp
│
├── avatars/
│   └── {user_id}/
│       └── avatar.webp
│
├── exports/
│   └── {user_id}/
│       └── {export_id}.zip           # DPDP data export
│
└── temp/
    └── {upload_id}/                   # Temp holding for virus scan
```

## 8.3 Storage Service (Abstract)

```typescript
// Abstract interface — allows swapping S3 ↔ GCS ↔ MinIO
interface IStorageService {
  generateUploadUrl(params: {
    key: string;
    contentType: string;
    maxSizeBytes: number;
    expiresInSeconds: number;
  }): Promise<{ url: string; fields: Record<string, string> }>;

  generateDownloadUrl(key: string, expiresInSeconds: number): Promise<string>;

  deleteObject(key: string): Promise<void>;

  copyObject(sourceKey: string, destKey: string): Promise<void>;

  getObjectMetadata(key: string): Promise<ObjectMetadata>;
}
```

## 8.4 File Validation Rules

| Check                 | Rule                                           | Enforcement                               |
| --------------------- | ---------------------------------------------- | ----------------------------------------- |
| **File Type**         | PDF, JPG, JPEG, PNG, HEIC, WEBP, DOCX, XLSX    | Client + Server (MIME type check)         |
| **File Size**         | Max 25 MB per file                             | Client + Presigned URL policy             |
| **Storage Quota**     | Per plan: Free=1GB, Premium=25GB, Family=100GB | Server-side before generating upload URL  |
| **Virus Scan**        | ClamAV scan on uploaded files                  | Async worker post-upload, before indexing |
| **MIME Verification** | Verify actual MIME matches declared MIME       | Server-side via `file-type` library       |

---

# 9. Search Architecture

## 9.1 Search Stack

```mermaid
graph LR
    subgraph "User Query"
        TEXT["Full-Text Query<br/>'passport scan'"]
        NLP["NL Query<br/>'When does my passport expire?'"]
        FILTER["Filtered Query<br/>Category: Identity<br/>Status: Active"]
    end

    subgraph "Processing"
        QP["Query Parser"]
        NLP_PROC["NLP → Structured Query<br/>(Gemini)"]
    end

    subgraph "Search Engines"
        ES["Elasticsearch<br/>Full-text + filters"]
        PG["PostgreSQL<br/>Metadata queries"]
        VEC["pgvector<br/>Semantic search"]
    end

    subgraph "Results"
        RANK["Ranking &<br/>Deduplication"]
        RES["Search Results"]
    end

    TEXT --> QP --> ES --> RANK
    NLP --> NLP_PROC --> QP
    FILTER --> PG --> RANK
    NLP --> VEC --> RANK
    RANK --> RES
```

## 9.2 Elasticsearch Index Design

```json
// Index: lifeledger_documents
{
  "mappings": {
    "properties": {
      "id": { "type": "keyword" },
      "userId": { "type": "keyword" },
      "familyId": { "type": "keyword" },
      "categorySlug": { "type": "keyword" },
      "subCategorySlug": { "type": "keyword" },
      "title": {
        "type": "text",
        "analyzer": "standard",
        "fields": { "keyword": { "type": "keyword" } }
      },
      "description": { "type": "text", "analyzer": "standard" },
      "ocrText": { "type": "text", "analyzer": "standard" },
      "tags": { "type": "keyword" },
      "documentNumber": { "type": "keyword" },
      "issuer": { "type": "text" },
      "status": { "type": "keyword" },
      "expiryDate": { "type": "date" },
      "issueDate": { "type": "date" },
      "isFavorite": { "type": "boolean" },
      "mimeType": { "type": "keyword" },
      "fileSize": { "type": "long" },
      "createdAt": { "type": "date" },
      "updatedAt": { "type": "date" },
      "metadata": { "type": "object", "dynamic": true }
    }
  },
  "settings": {
    "number_of_shards": 2,
    "number_of_replicas": 1,
    "analysis": {
      "analyzer": {
        "document_analyzer": {
          "type": "custom",
          "tokenizer": "standard",
          "filter": ["lowercase", "stop", "snowball"]
        }
      }
    }
  }
}
```

## 9.3 Sync Strategy (PostgreSQL → Elasticsearch)

```
Document Created/Updated in PostgreSQL
          │
          ▼
  Event emitted (DocumentCreated / DocumentUpdated)
          │
          ▼
  BullMQ Job: index-document
          │
          ▼
  Worker fetches document + metadata + tags from PostgreSQL
          │
          ▼
  Worker upserts into Elasticsearch
          │
          ▼
  Document searchable within ~2 seconds of creation
```

> [!TIP]
> **Fallback Strategy:** If Elasticsearch is unavailable, search falls back to PostgreSQL full-text search using `tsvector` indexes. Degraded but functional.

## 9.4 Natural Language Search Flow

```
User: "Show me insurance policies expiring this year"
  │
  ▼
Gemini API: Convert to structured query
  │
  ▼
{
  "category": "insurance",
  "expiryDateRange": { "from": "2026-01-01", "to": "2026-12-31" },
  "status": ["ACTIVE", "EXPIRING_SOON"]
}
  │
  ▼
Execute against Elasticsearch + return results
```

---

# 10. Notification Architecture

## 10.1 Event-Driven Notification Pipeline

```mermaid
graph TD
    subgraph "Event Sources"
        AUTH_E["Auth Events<br/>(login, password change)"]
        DOC_E["Document Events<br/>(upload, share, view)"]
        EXP_E["Expiry Events<br/>(cron-detected)"]
        EMR_E["Emergency Events<br/>(access request)"]
        FAM_E["Family Events<br/>(invite, join)"]
        BILL_E["Billing Events<br/>(payment, renewal)"]
    end

    subgraph "Event Bus"
        BUS["NestJS EventEmitter<br/>+<br/>BullMQ Queue"]
    end

    subgraph "Notification Service"
        ROUTER["Notification Router"]
        PREFS["Preference<br/>Checker"]
        TEMPLATE["Template<br/>Engine (Handlebars)"]
    end

    subgraph "Delivery Channels"
        INAPP["💬 In-App<br/>(DB + WebSocket)"]
        EMAIL["📧 Email<br/>(AWS SES)"]
        PUSH["🔔 Push<br/>(FCM)"]
        SMS_CH["📱 SMS<br/>(MSG91)"]
    end

    AUTH_E & DOC_E & EXP_E & EMR_E & FAM_E & BILL_E --> BUS
    BUS --> ROUTER
    ROUTER --> PREFS
    PREFS --> TEMPLATE
    TEMPLATE --> INAPP & EMAIL & PUSH & SMS_CH
```

## 10.2 Notification Priority & Channel Matrix

| Event                       |  Priority   | In-App | Email | Push | SMS |
| --------------------------- | :---------: | :----: | :---: | :--: | :-: |
| Emergency access requested  | 🔴 Critical |   ✅   |  ✅   |  ✅  | ✅  |
| New device login            | 🔴 Critical |   ✅   |  ✅   |  ✅  | ❌  |
| Password changed            |   🟠 High   |   ✅   |  ✅   |  ❌  | ❌  |
| Document expiring (7 days)  |   🟠 High   |   ✅   |  ✅   |  ✅  | ❌  |
| Document expiring (30 days) |  🟡 Medium  |   ✅   |  ✅   |  ❌  | ❌  |
| Document expiring (90 days) |   🟢 Low    |   ✅   |  ✅   |  ❌  | ❌  |
| Document shared with you    |  🟡 Medium  |   ✅   |  ✅   |  ✅  | ❌  |
| Family member joined        |   🟢 Low    |   ✅   |  ✅   |  ❌  | ❌  |
| Payment successful          |  🟡 Medium  |   ✅   |  ✅   |  ❌  | ❌  |
| OCR processing complete     |   🟢 Low    |   ✅   |  ❌   |  ❌  | ❌  |
| Weekly digest               |   🟢 Low    |   ❌   |  ✅   |  ❌  | ❌  |

## 10.3 Real-Time In-App Notifications

```typescript
// WebSocket Gateway (NestJS)
@WebSocketGateway({ namespace: '/notifications', cors: true })
export class NotificationGateway {
  @SubscribeMessage('subscribe')
  handleSubscribe(client: Socket, userId: string) {
    client.join(`user:${userId}`);
  }

  // Called by NotificationService after creating a notification
  sendToUser(userId: string, notification: NotificationPayload) {
    this.server.to(`user:${userId}`).emit('notification', notification);
  }
}
```

## 10.4 Cron Schedules

| Job                       | Schedule           | Description                                       |
| ------------------------- | ------------------ | ------------------------------------------------- |
| `expiry-check`            | Daily at 00:00 UTC | Scan documents for upcoming/past expiry           |
| `expired-status-update`   | Daily at 00:30 UTC | Batch update document statuses                    |
| `weekly-digest`           | Sunday 09:00 IST   | Compile and send weekly summary email             |
| `session-cleanup`         | Daily at 02:00 UTC | Remove expired sessions from DB                   |
| `soft-delete-cleanup`     | Daily at 03:00 UTC | Permanently delete documents deleted >30 days ago |
| `emergency-access-expiry` | Hourly             | Revoke expired emergency access grants            |

---

# 11. Admin Architecture

## 11.1 Admin Portal Stack

| Layer                  | Technology                                          |
| ---------------------- | --------------------------------------------------- |
| **Frontend**           | Next.js 15 (separate app in monorepo)               |
| **Auth**               | Same JWT system with `isAdmin` check                |
| **API**                | `/api/v1/admin/*` endpoints guarded by `AdminGuard` |
| **Data Visualization** | Recharts for graphs; TanStack Table for data grids  |

## 11.2 Admin Dashboard KPIs

```
┌────────────────────────────────────────────────────────────┐
│                    ADMIN DASHBOARD                          │
├──────────┬──────────┬──────────┬──────────┬────────────────┤
│ Total    │ Active   │ New      │ Documents│ Storage        │
│ Users    │ Today    │ This Week│ Uploaded │ Used           │
│ 12,456   │ 1,234    │ 567      │ 234,567  │ 2.3 TB         │
├──────────┴──────────┴──────────┴──────────┴────────────────┤
│                                                             │
│  📈 User Growth (30d)        📊 Uploads by Category        │
│  ┌─────────────────────┐     ┌─────────────────────┐       │
│  │      ╱‾‾‾‾╲         │     │ ████ Identity 28%   │       │
│  │    ╱‾      ‾╲       │     │ ███  Medical  22%   │       │
│  │  ╱‾          ‾╲     │     │ ███  Financial 18%  │       │
│  │╱‾              ‾╲   │     │ ██   Education 15%  │       │
│  └─────────────────────┘     │ █    Other     17%  │       │
│                               └─────────────────────┘       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  💰 Revenue This Month: ₹4,56,789                          │
│  📊 Free: 8,234 | Premium: 3,456 | Family: 766             │
│  🔄 Churn Rate: 2.3%                                       │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  🔴 System Health                                           │
│  API: ✅ 99.98%  |  DB: ✅ 45ms  |  Redis: ✅ 2ms          │
│  ES: ✅ 120ms    |  S3: ✅ OK    |  Queue: ✅ 23 pending    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## 11.3 Admin Feature List (MVP)

| Feature                                                       | Endpoints Used            | Priority |
| ------------------------------------------------------------- | ------------------------- | -------- |
| **User Management** — Search, view, suspend, delete           | `/admin/users`            | P0       |
| **Analytics Dashboard** — KPIs, charts, trends                | `/admin/dashboard`        | P0       |
| **Audit Log Viewer** — Browse all audit events                | `/admin/audit-logs`       | P0       |
| **System Health** — Service status, latency, errors           | `/admin/system/health`    | P0       |
| **Subscription Overview** — Revenue, plan distribution        | `/admin/billing/overview` | P1       |
| **Document Analytics** — Upload trends, category distribution | `/admin/documents/stats`  | P1       |
| **Feature Flags** — Toggle features for rollouts              | `/admin/feature-flags`    | P2       |

---

# 12. Frontend Screen Map

```mermaid
graph TD
    subgraph "Public Pages"
        LAND["🏠 Landing Page<br/>/"]
        PRICING["💰 Pricing<br/>/pricing"]
        ABOUT["ℹ️ About<br/>/about"]
    end

    subgraph "Auth Flow"
        LOGIN["🔐 Login<br/>/login"]
        REG["📝 Register<br/>/register"]
        VERIFY["✉️ Verify Email<br/>/verify-email"]
        FORGOT["🔑 Forgot Password<br/>/forgot-password"]
        RESET["🔄 Reset Password<br/>/reset-password"]
        OTP["📱 Verify OTP<br/>/verify-otp"]
        MFA["🔒 MFA Challenge<br/>/mfa"]
    end

    subgraph "Onboarding"
        ONBOARD["🚀 Onboarding Wizard<br/>/onboarding<br/>(3-step guided setup)"]
    end

    subgraph "Dashboard (Protected)"
        DASH["📊 Dashboard Home<br/>/dashboard"]

        subgraph "Documents"
            DOCS["📄 All Documents<br/>/documents"]
            DOC_UP["⬆️ Upload<br/>/documents/upload"]
            DOC_DET["📋 Document Detail<br/>/documents/:id"]
            DOC_EDIT["✏️ Edit Metadata<br/>/documents/:id/edit"]
        end

        subgraph "Categories"
            CATS["📂 Categories<br/>/categories"]
            CAT_DET["📁 Category View<br/>/categories/:slug"]
        end

        subgraph "Search & AI"
            SEARCH_P["🔍 Search<br/>/search"]
            AI_P["🤖 AI Assistant<br/>/ai"]
        end

        subgraph "Family"
            FAM_P["👨‍👩‍👧‍👦 Family Vault<br/>/family"]
            FAM_MEM["👥 Members<br/>/family/members"]
            FAM_INV["✉️ Invite<br/>/family/invite"]
        end

        subgraph "Emergency"
            EMR_P["🚨 Emergency<br/>/emergency"]
            EMR_CARD["💳 Emergency Card<br/>/emergency/card"]
        end

        subgraph "Settings"
            SET_GEN["⚙️ General<br/>/settings"]
            SET_PROF["👤 Profile<br/>/settings/profile"]
            SET_SEC["🔒 Security<br/>/settings/security"]
            SET_BILL["💳 Billing<br/>/settings/billing"]
            SET_NOTIF["🔔 Notifications<br/>/settings/preferences"]
        end

        NOTIF["🔔 Notifications<br/>/notifications"]
    end

    subgraph "Public Access"
        SHARE_P["🔗 Shared Document<br/>/share/:token"]
        EMR_ACC["🚨 Emergency Access<br/>/emergency-access/:token"]
    end

    LAND --> LOGIN & REG
    LOGIN --> DASH
    REG --> VERIFY --> LOGIN
    LOGIN --> MFA --> DASH
    DASH --> DOCS & CATS & SEARCH_P & AI_P & FAM_P & EMR_P & SET_GEN & NOTIF
    DOCS --> DOC_UP & DOC_DET
    DOC_DET --> DOC_EDIT
```

### Screen Count Summary

| Section            |    Screens     | Status    |
| ------------------ | :------------: | --------- |
| Public / Marketing |       3        | Phase 1   |
| Auth               |       7        | Phase 1   |
| Onboarding         | 1 (multi-step) | Phase 1   |
| Dashboard          |       1        | Phase 1   |
| Documents          |       4        | Phase 1   |
| Categories         |       2        | Phase 1   |
| Search             |       1        | Phase 1   |
| AI Assistant       |       1        | Phase 2   |
| Family             |       3        | Phase 3   |
| Emergency          |       2        | Phase 3   |
| Legacy             |       3        | Phase 4   |
| Settings           |       5        | Phase 1   |
| Notifications      |       1        | Phase 1   |
| Public Access      |       2        | Phase 2   |
| Admin Portal       |       8        | Phase 1–2 |
| **Total**          |    **~44**     |           |

---

# 13. Backend Module Map

## 13.1 Module Dependency Graph

```mermaid
graph TB
    subgraph "Core Modules"
        AUTH["🔐 AuthModule"]
        USER["👤 UsersModule"]
        DOC["📄 DocumentsModule"]
        CAT["📂 CategoriesModule"]
    end

    subgraph "Intelligence Modules"
        SEARCH_M["🔍 SearchModule"]
        AI_M["🤖 AiModule"]
        OCR_M["📸 OcrModule<br/>(within DocumentsModule)"]
    end

    subgraph "Collaboration Modules"
        FAM_M["👨‍👩‍👧‍👦 FamilyModule"]
        EMR_M["🚨 EmergencyModule"]
        SHARE_M["🔗 ShareModule<br/>(within DocumentsModule)"]
    end

    subgraph "Platform Modules"
        NOTIF_M["🔔 NotificationsModule"]
        BILLING_M["💳 BillingModule"]
        STORAGE_M["☁️ StorageModule"]
        ADMIN_M["🛠️ AdminModule"]
        HEALTH_M["❤️ HealthModule"]
    end

    subgraph "Infrastructure"
        PRISMA_M["🗄️ PrismaModule<br/>(Global)"]
        REDIS_M["⚡ RedisModule<br/>(Global)"]
        QUEUE_M["📬 QueueModule<br/>(BullMQ, Global)"]
        CONFIG_M["⚙️ ConfigModule<br/>(Global)"]
    end

    AUTH --> USER --> PRISMA_M
    DOC --> STORAGE_M & CAT & SEARCH_M & NOTIF_M
    DOC --> QUEUE_M
    SEARCH_M --> PRISMA_M
    AI_M --> SEARCH_M
    FAM_M --> USER & DOC
    EMR_M --> USER & DOC & NOTIF_M
    BILLING_M --> USER
    ADMIN_M --> USER & DOC & BILLING_M
    NOTIF_M --> REDIS_M & QUEUE_M
```

## 13.2 Module Responsibilities

| Module                  | Controller Endpoints | Service Methods | Workers/Processors                     | Dependencies                                               |
| ----------------------- | -------------------- | --------------- | -------------------------------------- | ---------------------------------------------------------- |
| **AuthModule**          | 14                   | 12              | 0                                      | UsersModule, RedisModule                                   |
| **UsersModule**         | 9                    | 8               | 0                                      | PrismaModule                                               |
| **DocumentsModule**     | 16                   | 14              | 3 (OCR, Thumbnail, Classification)     | StorageModule, CategoriesModule, SearchModule, QueueModule |
| **CategoriesModule**    | 3                    | 3               | 0                                      | PrismaModule                                               |
| **SearchModule**        | 5                    | 5               | 1 (Index sync)                         | Elasticsearch, PrismaModule                                |
| **AiModule**            | 3                    | 4               | 2 (QA, Summary)                        | Gemini API, SearchModule                                   |
| **NotificationsModule** | 5                    | 6               | 2 (Notification delivery, Expiry cron) | QueueModule, RedisModule                                   |
| **FamilyModule**        | 9                    | 8               | 0                                      | UsersModule, PrismaModule                                  |
| **EmergencyModule**     | 9                    | 7               | 1 (Access expiry)                      | UsersModule, NotificationsModule                           |
| **BillingModule**       | 6                    | 5               | 0                                      | Razorpay SDK, UsersModule                                  |
| **StorageModule**       | 0 (internal)         | 5               | 0                                      | AWS SDK / Cloudinary SDK                                   |
| **AdminModule**         | 8                    | 6               | 0                                      | UsersModule, PrismaModule                                  |
| **HealthModule**        | 3                    | 3               | 0                                      | PrismaModule, RedisModule                                  |

## 13.3 Event Flow

```
┌──────────────────────────────────────────────────────┐
│              INTERNAL EVENT BUS                       │
│                                                       │
│  document.uploaded ──► OCR Worker                     │
│                   ──► Search Indexer                  │
│                   ──► Notification Service             │
│                                                       │
│  document.ocr.completed ──► Classification Worker     │
│                         ──► Embedding Worker          │
│                         ──► Notification (in-app)     │
│                                                       │
│  document.expiry.detected ──► Notification Service    │
│                                                       │
│  auth.login ──► Audit Logger                          │
│             ──► Notification (new device)             │
│                                                       │
│  emergency.access.requested ──► Notification (urgent) │
│                                                       │
│  family.member.invited ──► Email Service              │
│                                                       │
│  billing.payment.completed ──► Notification           │
│                            ──► Subscription Update    │
│                                                       │
└──────────────────────────────────────────────────────┘
```

---

# 14. Development Milestones

## 14.1 Sprint Plan (12 Weeks to MVP)

### Sprint 1–2: Foundation (Weeks 1–2)

| Task                                              | Owner     | Status |
| ------------------------------------------------- | --------- | ------ |
| Monorepo setup (Turborepo + pnpm)                 | DevOps    | ☐      |
| Next.js frontend app scaffolding                  | Frontend  | ☐      |
| NestJS backend app scaffolding                    | Backend   | ☐      |
| Shared packages setup (types, validators, config) | Fullstack | ☐      |
| Prisma schema + initial migration                 | Backend   | ☐      |
| Docker Compose (PostgreSQL, Redis, Elasticsearch) | DevOps    | ☐      |
| ESLint + Prettier + Husky + Commitlint            | DevOps    | ☐      |
| CI pipeline (GitHub Actions)                      | DevOps    | ☐      |
| Design system setup (Tailwind + shadcn/ui)        | Frontend  | ☐      |
| Landing page (marketing)                          | Frontend  | ☐      |

**Deliverable:** Monorepo running locally; CI passing; landing page live.

---

### Sprint 3–4: Authentication (Weeks 3–4)

| Task                                             | Owner     | Status |
| ------------------------------------------------ | --------- | ------ |
| Registration API (email + password)              | Backend   | ☐      |
| Email verification flow                          | Backend   | ☐      |
| Login API (email + password)                     | Backend   | ☐      |
| JWT + Refresh token implementation               | Backend   | ☐      |
| Google OAuth integration                         | Backend   | ☐      |
| Phone + OTP login                                | Backend   | ☐      |
| MFA setup + validation                           | Backend   | ☐      |
| Session management (list, revoke)                | Backend   | ☐      |
| Login/Register UI screens                        | Frontend  | ☐      |
| Auth guards + interceptors                       | Backend   | ☐      |
| RBAC guard implementation                        | Backend   | ☐      |
| Forgot/Reset password flow                       | Fullstack | ☐      |
| Auth state management (Zustand + TanStack Query) | Frontend  | ☐      |
| Protected route middleware (Next.js)             | Frontend  | ☐      |

**Deliverable:** Full auth flow working end-to-end.

---

### Sprint 5–6: Core Documents (Weeks 5–6)

| Task                                      | Owner     | Status |
| ----------------------------------------- | --------- | ------ |
| Category + SubCategory seed data          | Backend   | ☐      |
| Categories API                            | Backend   | ☐      |
| Document CRUD API                         | Backend   | ☐      |
| S3 presigned URL upload flow              | Backend   | ☐      |
| Upload UI (drag-and-drop, progress bar)   | Frontend  | ☐      |
| Document metadata form (per sub-category) | Frontend  | ☐      |
| Document listing (grid + list view)       | Frontend  | ☐      |
| Document detail page                      | Frontend  | ☐      |
| Document preview (PDF + images)           | Frontend  | ☐      |
| Expiry date tracking + status calculation | Backend   | ☐      |
| Document favoriting                       | Fullstack | ☐      |
| Document soft-delete + restore            | Fullstack | ☐      |
| Category browsing UI                      | Frontend  | ☐      |
| Dashboard home page with stats            | Frontend  | ☐      |

**Deliverable:** Users can upload, organize, view, and manage documents.

---

### Sprint 7–8: Search + Notifications (Weeks 7–8)

| Task                                | Owner    | Status |
| ----------------------------------- | -------- | ------ |
| Elasticsearch setup + index mapping | Backend  | ☐      |
| Document indexing worker (BullMQ)   | Backend  | ☐      |
| Full-text search API                | Backend  | ☐      |
| Metadata filter search              | Backend  | ☐      |
| Search UI with filters + facets     | Frontend | ☐      |
| Recent/frequent documents API       | Backend  | ☐      |
| Notification model + CRUD API       | Backend  | ☐      |
| Notification preference API         | Backend  | ☐      |
| Expiry check cron job               | Backend  | ☐      |
| Email notification channel (SES)    | Backend  | ☐      |
| In-app notification (WebSocket)     | Backend  | ☐      |
| Notification bell + list UI         | Frontend | ☐      |
| Notification preferences UI         | Frontend | ☐      |
| Expiry reminders (30/7/1 day)       | Backend  | ☐      |

**Deliverable:** Search works; expiry notifications fire; users can manage preferences.

---

### Sprint 9–10: User Settings + Admin (Weeks 9–10)

| Task                                               | Owner     | Status |
| -------------------------------------------------- | --------- | ------ |
| Profile settings page                              | Frontend  | ☐      |
| Security settings (password change, MFA, sessions) | Fullstack | ☐      |
| Onboarding wizard (post-signup)                    | Frontend  | ☐      |
| Admin auth (isAdmin check)                         | Backend   | ☐      |
| Admin dashboard API (KPIs)                         | Backend   | ☐      |
| Admin user management (list, view, suspend)        | Fullstack | ☐      |
| Admin audit log viewer                             | Fullstack | ☐      |
| Admin system health page                           | Fullstack | ☐      |
| Audit logging for all actions                      | Backend   | ☐      |
| Rate limiting (Throttle guard)                     | Backend   | ☐      |

**Deliverable:** Settings functional; admin can manage users and view analytics.

---

### Sprint 11–12: Polish + Deploy (Weeks 11–12)

| Task                                        | Owner     | Status |
| ------------------------------------------- | --------- | ------ |
| End-to-end testing (critical paths)         | QA        | ☐      |
| Error handling polish (all edge cases)      | Fullstack | ☐      |
| Loading states + empty states for all pages | Frontend  | ☐      |
| Mobile responsiveness audit                 | Frontend  | ☐      |
| Performance optimization (Core Web Vitals)  | Frontend  | ☐      |
| Security audit (OWASP Top 10 check)         | Backend   | ☐      |
| Dockerfile + Docker Compose (production)    | DevOps    | ☐      |
| AWS infrastructure setup (Terraform)        | DevOps    | ☐      |
| Staging deployment                          | DevOps    | ☐      |
| Production deployment                       | DevOps    | ☐      |
| Monitoring setup (Grafana, Sentry)          | DevOps    | ☐      |
| DNS + SSL + CDN configuration               | DevOps    | ☐      |
| Seed production data (categories, plans)    | Backend   | ☐      |
| Smoke test on production                    | QA        | ☐      |

**Deliverable:** MVP live in production. 🚀

---

## 14.2 Post-MVP Milestones

| Phase                         | Timeline    | Key Features                                           |
| ----------------------------- | ----------- | ------------------------------------------------------ |
| Phase 2: Intelligence         | Weeks 13–20 | OCR, AI search, auto-categorization, NLP queries       |
| Phase 3: Collaboration        | Weeks 21–28 | Family vault, emergency access, billing (Razorpay)     |
| Phase 4: Legacy + Advanced AI | Weeks 29–40 | Digital legacy, cross-doc analysis, voice search       |
| Phase 5: Platform             | Weeks 41–52 | Public API, native apps, B2B2C, DigiLocker integration |

---

# 15. Production Deployment Architecture

## 15.1 AWS Architecture

```mermaid
graph TB
    subgraph "Users"
        USER_WEB["🌐 Web Browser"]
        USER_MOB["📱 Mobile PWA"]
    end

    subgraph "Edge Layer"
        CF["☁️ CloudFront CDN"]
        WAF_A["🛡️ AWS WAF"]
        R53["🌍 Route 53 DNS"]
    end

    subgraph "Compute (ECS Fargate)"
        subgraph "Frontend Cluster"
            WEB_1["Next.js<br/>Container 1"]
            WEB_2["Next.js<br/>Container 2"]
        end
        subgraph "API Cluster"
            API_1["NestJS<br/>Container 1"]
            API_2["NestJS<br/>Container 2"]
            API_3["NestJS<br/>Container 3"]
        end
        subgraph "Worker Cluster"
            W_OCR["OCR Worker"]
            W_AI["AI Worker"]
            W_NOTIF["Notification Worker"]
            W_INDEX["Search Indexer"]
        end
        subgraph "Admin Cluster"
            ADM_1["Admin Portal<br/>Container"]
        end
    end

    subgraph "Load Balancing"
        ALB_WEB["ALB<br/>(Web)"]
        ALB_API["ALB<br/>(API)"]
    end

    subgraph "Data Layer"
        subgraph "Primary DB"
            RDS["🐘 RDS PostgreSQL<br/>Multi-AZ<br/>db.r6g.large"]
            RDS_READ["📖 Read Replica"]
        end
        ELASTICACHE["⚡ ElastiCache Redis<br/>Cluster Mode<br/>cache.r6g.large"]
        ES_SERVICE["🔍 OpenSearch<br/>(Elasticsearch)<br/>2 nodes"]
        S3_DOCS["☁️ S3<br/>Document Storage"]
        S3_STATIC["☁️ S3<br/>Static Assets"]
    end

    subgraph "Services"
        SES["📧 SES<br/>(Email)"]
        SQS["📬 SQS<br/>(Dead Letter Queue)"]
        KMS["🔑 KMS<br/>(Encryption Keys)"]
        SECRETS["🔐 Secrets Manager"]
        CW["📊 CloudWatch<br/>(Logs + Metrics)"]
    end

    subgraph "External"
        GEMINI["🧠 Gemini API"]
        VISION["👁️ Google Vision API"]
        RAZORPAY_E["💰 Razorpay"]
        FCM_E["🔔 FCM"]
        MSG91_E["📱 MSG91"]
    end

    USER_WEB & USER_MOB --> R53 --> CF --> WAF_A

    CF --> ALB_WEB --> WEB_1 & WEB_2
    WAF_A --> ALB_API --> API_1 & API_2 & API_3

    API_1 & API_2 & API_3 --> RDS & ELASTICACHE & ES_SERVICE & S3_DOCS
    API_1 & API_2 & API_3 --> ELASTICACHE

    W_OCR --> VISION & S3_DOCS & RDS
    W_AI --> GEMINI & RDS
    W_NOTIF --> SES & FCM_E & MSG91_E
    W_INDEX --> ES_SERVICE & RDS

    CF --> S3_STATIC

    RDS --> RDS_READ
```

## 15.2 Infrastructure Specifications

### Compute

| Service                   | Spec               | Count     | Estimated Cost |
| ------------------------- | ------------------ | --------- | -------------- |
| **ECS Fargate — API**     | 1 vCPU, 2 GB RAM   | 2–3 tasks | ~$60/month     |
| **ECS Fargate — Web**     | 0.5 vCPU, 1 GB RAM | 2 tasks   | ~$30/month     |
| **ECS Fargate — Workers** | 1 vCPU, 2 GB RAM   | 2–4 tasks | ~$50/month     |
| **ECS Fargate — Admin**   | 0.5 vCPU, 1 GB RAM | 1 task    | ~$15/month     |

### Data

| Service               | Spec                               | Estimated Cost      |
| --------------------- | ---------------------------------- | ------------------- |
| **RDS PostgreSQL**    | db.t4g.medium, Multi-AZ, 100GB gp3 | ~$100/month         |
| **RDS Read Replica**  | db.t4g.small                       | ~$35/month          |
| **ElastiCache Redis** | cache.t4g.small, 1 node            | ~$25/month          |
| **OpenSearch**        | t3.small.search, 2 nodes, 50GB     | ~$60/month          |
| **S3**                | Standard + Intelligent Tiering     | ~$25/month (at 1TB) |

### Networking & Security

| Service             | Spec             | Estimated Cost |
| ------------------- | ---------------- | -------------- |
| **CloudFront**      | 100 GB transfer  | ~$10/month     |
| **ALB**             | 2 load balancers | ~$35/month     |
| **WAF**             | Basic rules      | ~$10/month     |
| **Route 53**        | 1 hosted zone    | ~$1/month      |
| **ACM**             | SSL Certificates | Free           |
| **KMS**             | 2 keys           | ~$2/month      |
| **Secrets Manager** | 10 secrets       | ~$4/month      |

### **Total Estimated Monthly Cost (MVP): ~$460/month**

> [!NOTE]
> This is for a startup-stage deployment handling ~1,000–5,000 active users. Costs scale with usage, but the architecture supports 100K+ users by scaling ECS tasks and RDS instance sizes.

## 15.3 Deployment Pipeline

```mermaid
graph LR
    subgraph "Development"
        DEV["Developer<br/>Local"]
        PR["Pull Request"]
    end

    subgraph "CI (GitHub Actions)"
        LINT["Lint +<br/>Type Check"]
        TEST["Unit +<br/>Integration Tests"]
        BUILD["Docker<br/>Build"]
        PUSH["Push to<br/>ECR"]
    end

    subgraph "Staging"
        DEPLOY_STG["Deploy to<br/>ECS Staging"]
        E2E["E2E Tests"]
        SMOKE["Smoke<br/>Tests"]
    end

    subgraph "Production"
        APPROVE["Manual<br/>Approval"]
        DEPLOY_PROD["Blue-Green<br/>Deploy"]
        CANARY["Canary<br/>Monitoring"]
        ROLLBACK["Auto-Rollback<br/>(if errors spike)"]
    end

    DEV --> PR --> LINT --> TEST --> BUILD --> PUSH
    PUSH --> DEPLOY_STG --> E2E --> SMOKE
    SMOKE --> APPROVE --> DEPLOY_PROD --> CANARY
    CANARY --> ROLLBACK
```

## 15.4 Environments

| Environment    | Purpose                | Database                       | URL                                 |
| -------------- | ---------------------- | ------------------------------ | ----------------------------------- |
| **Local**      | Development            | Docker PostgreSQL + Redis + ES | `localhost:3000` / `localhost:4000` |
| **Staging**    | Pre-production testing | Shared RDS (staging schema)    | `staging.lifeledger.in`             |
| **Production** | Live users             | Multi-AZ RDS                   | `app.lifeledger.in`                 |

## 15.5 Monitoring & Observability

| Layer        | Tool                                      | Purpose                                                  |
| ------------ | ----------------------------------------- | -------------------------------------------------------- |
| **Logging**  | CloudWatch Logs + Pino (structured JSON)  | Centralized log aggregation                              |
| **Metrics**  | CloudWatch Metrics + custom dashboards    | CPU, memory, request rates, error rates                  |
| **APM**      | Sentry                                    | Error tracking, performance monitoring, release tracking |
| **Uptime**   | UptimeRobot or Better Uptime              | External availability monitoring                         |
| **Alerting** | CloudWatch Alarms → SNS → Slack/PagerDuty | Automated incident alerts                                |
| **Tracing**  | X-Correlation-Id propagation              | Request tracing across services                          |

### Key Alerts

| Alert                        | Condition             | Severity    | Channel           |
| ---------------------------- | --------------------- | ----------- | ----------------- |
| API Error Rate High          | 5xx > 5% for 5 min    | 🔴 Critical | Slack + PagerDuty |
| API Latency High             | P95 > 2s for 10 min   | 🟠 Warning  | Slack             |
| DB Connection Pool Exhausted | Active > 80% capacity | 🔴 Critical | PagerDuty         |
| Queue Depth High             | Pending jobs > 1000   | 🟠 Warning  | Slack             |
| Storage Usage                | > 80% of quota        | 🟡 Info     | Email             |
| Certificate Expiry           | < 14 days             | 🔴 Critical | Email + Slack     |

## 15.6 Environment Variables Template

```env
# ─── Application ───
NODE_ENV=production
APP_PORT=4000
APP_URL=https://app.lifeledger.in
API_URL=https://api.lifeledger.in
CORS_ORIGINS=https://app.lifeledger.in,https://admin.lifeledger.in

# ─── Database ───
DATABASE_URL=postgresql://user:password@host:5432/lifeledger?schema=public
DATABASE_READ_URL=postgresql://user:password@read-host:5432/lifeledger?schema=public

# ─── Redis ───
REDIS_HOST=redis-cluster.xxxxx.cache.amazonaws.com
REDIS_PORT=6379
REDIS_PASSWORD=

# ─── Auth ───
JWT_ACCESS_SECRET=<RS256 private key path>
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_SECRET=<separate secret>
JWT_REFRESH_EXPIRY=7d
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=https://api.lifeledger.in/api/v1/auth/google/callback

# ─── Storage ───
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=ap-south-1
S3_BUCKET=lifeledger-production
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# ─── AI ───
GEMINI_API_KEY=
GOOGLE_VISION_API_KEY=

# ─── Elasticsearch ───
ELASTICSEARCH_URL=https://search-lifeledger-xxxxx.ap-south-1.es.amazonaws.com
ELASTICSEARCH_USERNAME=
ELASTICSEARCH_PASSWORD=

# ─── Email ───
SES_REGION=ap-south-1
SES_FROM_EMAIL=noreply@lifeledger.in

# ─── SMS ───
MSG91_AUTH_KEY=
MSG91_SENDER_ID=LIFLED

# ─── Push Notifications ───
FIREBASE_PROJECT_ID=
FIREBASE_PRIVATE_KEY=
FIREBASE_CLIENT_EMAIL=

# ─── Payments ───
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=

# ─── Monitoring ───
SENTRY_DSN=

# ─── Feature Flags ───
FEATURE_OCR_ENABLED=true
FEATURE_AI_ENABLED=true
FEATURE_FAMILY_ENABLED=false
FEATURE_EMERGENCY_ENABLED=false
FEATURE_LEGACY_ENABLED=false
```

---

# Appendix: Key Architecture Decisions

| Decision             | Choice                                 | Rationale                                                                 |
| -------------------- | -------------------------------------- | ------------------------------------------------------------------------- |
| **Monorepo**         | Turborepo + pnpm                       | Shared types, atomic commits, unified CI                                  |
| **Backend Pattern**  | Modular Monolith (NestJS)              | Clean boundaries without microservice overhead; extract later when needed |
| **Upload Strategy**  | Presigned URLs (client → S3 direct)    | No file streaming through API servers; reduces memory/CPU load            |
| **Search**           | Elasticsearch with PostgreSQL fallback | Purpose-built search with graceful degradation                            |
| **Async Processing** | BullMQ (Redis-backed)                  | Reliable job processing for OCR, AI, notifications                        |
| **Auth Tokens**      | JWT (RS256) + httpOnly Refresh Cookie  | Stateless access; secure refresh with rotation                            |
| **Database**         | PostgreSQL (single source of truth)    | ACID, JSONB for flexible metadata, pgvector for embeddings                |
| **Vector Store**     | pgvector (PostgreSQL extension)        | Avoids separate vector DB; co-located with relational data                |
| **OCR**              | Google Cloud Vision (primary)          | Best multilingual OCR accuracy; Tesseract as fallback                     |
| **AI**               | Gemini API                             | Cost-effective, strong multilingual, fast                                 |
| **Payments**         | Razorpay                               | India-first; supports UPI, cards, netbanking                              |
| **CSS Framework**    | Tailwind CSS + shadcn/ui               | Rapid development + accessible component library                          |
| **Hosting**          | AWS (Mumbai region)                    | Data sovereignty, latency for Indian users, mature ecosystem              |

---

> [!IMPORTANT]
> This blueprint is the engineering source of truth for LifeLedger Phase 1 MVP. All implementation should reference this document. Changes to architecture require an ADR (Architecture Decision Record) in `docs/adr/`.

---

_End of Document — LifeLedger Technical Blueprint v1.0_
