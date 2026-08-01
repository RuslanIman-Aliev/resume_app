# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev            # Next.js dev server (http://localhost:3000)
npm run build          # Production build
npm run lint           # ESLint
npm run typecheck      # tsc --noEmit
npm run test           # Vitest (unit/integration, run once)
npm run test:watch     # Vitest watch mode
npm run test:server    # Focused server/router tests
npm run test:coverage  # Vitest with V8 coverage
npm run test:e2e       # Playwright e2e (auto-starts the app via webServer)
npm run test:e2e:smoke # Fast e2e subset (analyzer + ai-coach specs)
npm run check:bundle-size  # Enforce prod JS bundle budgets

# Run a single unit test file
npx vitest run src/features/resumes/server/routers.test.ts

# Run a single e2e spec
npx playwright test tests/e2e/analyzer.spec.ts
```

Background jobs require the Inngest dev server in a second terminal:

```bash
npx inngest-cli@latest dev -u http://localhost:3000/api/inngest
```

`postinstall` runs `prisma generate`. After editing `prisma/schema.prisma`, run `npx prisma migrate dev`.

## Architecture

Next.js 16 App Router + React 19, tRPC over TanStack Query, Prisma/Postgres, Better Auth, OpenAI analysis dispatched through Inngest background jobs, with Pusher pushing completion events back to the client. Path alias `@/*` maps to `src/*`.

### Feature-module layout
Code is organized by feature under `src/features/<feature>/` (ai-coach, analyzer, resumes, tracker, recent-analyzer, dashboard, auth, main-page). Each has `components/`; features with backend logic add a `server/routers.ts` (and colocated `*.test.ts`). Route shells live in `src/app/(pages)/<feature>` and `src/app/(auth)`, but the substance lives in the feature module.

### tRPC
- Routers are composed in `src/trpc/routers/_app.ts` from feature routers. Note the router *keys* don't always match feature folder names — `recent-analyzer/server/routers.ts` exports `jobApplicationRouter`, registered as `jobApplication`.
- `src/trpc/init.ts` defines `protectedProcedure`, which resolves the Better Auth session and injects `ctx.auth`. **Always derive the user via `ctx.auth.user.id`** — the hardcoded `userId: "user_123"` in `createTRPCContext` is unused legacy; do not rely on it.
- Server components/actions call procedures via `src/trpc/server.tsx`; client via `src/trpc/client.tsx`.

### Error handling
`src/lib/app-error.ts` is the error contract. Throw `TRPCError` (or `createAppError`) on the server; the tRPC `errorFormatter` normalizes every error into an `AppError` (`code`, `message`, `retryable`) attached to `shape.data.appError`. Clients read it via `normalizeAppError`. Codes drive retry behavior (see `retryableCodes`/`nonRetryableCodes`). App-specific codes in use include `PRECONDITION_FAILED` (no effective change) and `NOT_FOUND` (missing structured data).

### Background jobs (Inngest)
`src/inngest/functions.ts` holds `analyze-resume` and `analyze-job-matched`. Both build an OpenAI prompt, validate the model output with Zod, write to Postgres, then send a Pusher event. Jobs are served at `/api/inngest`. tRPC mutations (`resume.triggerAnalysis`, `resume.triggerJobMatchAnalysis`) only enqueue events (`app/resume.analyzed`, `app/job-matched.analyzed`) — they do not run AI inline.

### Data flow (resume analysis)
Upload (UploadThing → ConvertAPI thumbnail + `unpdf` text extraction) → `resume.create` persists metadata + parsed content → `triggerAnalysis` fires an Inngest event → job calls OpenAI, validates, writes `ResumeAnalysis`, pushes Pusher event → UI updates in real time. Job matching mirrors this via `JobApplication`.

### Environment validation
`src/lib/env.server.ts` (`server-only`) validates all server env vars with Zod at import time and throws on missing/malformed values — fail fast rather than at request time. Add new required server vars here. Public vars live in `env.public.ts`.

### Other conventions
- Prisma client is a singleton in `src/lib/db.ts` (`@/lib/db` default export); uses the `@prisma/adapter-pg` adapter.
- Zod schemas shared across layers live in `src/lib/schemas.ts`.
- Logging goes through the scrubbed logger in `src/lib/logger.ts` — never dump raw objects/uploads.
- shadcn/ui components in `src/components/ui`; Tailwind CSS v4.
- Sentry is wired via `sentry.*.config.ts` and `next.config.ts`.
- Vitest runs in a `jsdom` environment with `vitest.setup.ts`; tests are colocated as `*.test.ts(x)` under `src/`.

## CI quality gate
GitHub Actions runs lint, secret scanning, typecheck, coverage unit tests, a production build, bundle-size checks, and Playwright e2e on PRs and pushes to main/master. Run `npm run lint && npm run typecheck && npm run test` before pushing.
