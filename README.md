# Resume App

AI-powered resume management and job match analysis built with Next.js App Router. The app lets users upload PDF resumes, extract text and a preview image, and run asynchronous AI analysis and job matching. Results are stored in Postgres, validated with Zod, and surfaced in the UI with real-time updates.

This README is intentionally ASCII-only.

## Table of contents

- Overview
- Key features
- Tech stack
- Architecture and data flow
- Application routes
- API surface (tRPC)
- Background jobs (Inngest)
- Data model (Prisma)
- Environment variables
- Local development
- Scripts
- Testing
- Database and Prisma workflow
- Upload and parsing pipeline
- Real-time updates with Pusher
- Observability (Sentry)
- Deployment notes
- Troubleshooting
- Roadmap ideas
- License

## Overview

The project focuses on the end-to-end resume workflow:

- Upload a resume PDF.
- Extract text and create a preview image.
- Save resume metadata in Postgres.
- Trigger AI analysis or job matching as background jobs.
- Persist results in Postgres and stream completion events to the UI.

The UI is organized by route groups:

- Public marketing page at / (hero, pricing, testimonials).
- Auth pages for sign-in and sign-up.
- Authenticated pages for dashboard, resumes, analyzer, tracker, and ai-coach.

## Key features

- Authentication with Better Auth (email/password and GitHub social login).
- Resume upload with UploadThing (PDF-only, size-limited) and thumbnail generation via ConvertAPI.
- Resume text extraction using unpdf to enable analysis without re-uploading the file.
- Asynchronous AI analysis and job match scoring using Inngest + OpenAI.
- Real-time notifications using Pusher when analysis completes.
- tRPC API with protected procedures, React Query caching, and invalidation.
- Prisma ORM with PostgreSQL and a schema designed for analysis and job applications.
- Sentry instrumentation for client and server errors.
- Tailwind CSS v4 with shadcn/ui components and a theming system.

## Tech stack

- Frontend: Next.js 16 App Router, React 19, Tailwind CSS 4, shadcn/ui, lucide-react, sonner
- Backend: Next.js Route Handlers, tRPC, Prisma
- Database: PostgreSQL
- Auth: better-auth
- AI: OpenAI SDK
- Background jobs: Inngest
- Realtime: Pusher
- Uploads: UploadThing, ConvertAPI, unpdf
- Observability: Sentry

## Architecture and data flow

High-level building blocks:

- UI and server components in src/app
- Feature modules in src/features
- tRPC routers in src/trpc and src/features/\*/server
- Inngest functions in src/inngest
- Prisma schema in prisma/schema.prisma

### Resume upload and analysis flow

```mermaid
sequenceDiagram
  participant U as User
  participant UI as Next.js UI
  participant UT as UploadThing
  participant CA as ConvertAPI
  participant DB as Postgres
  participant IN as Inngest
  participant OA as OpenAI
  participant PU as Pusher

  U->>UI: Upload PDF
  UI->>UT: Upload file
  UT->>CA: Convert first page to JPG
  UT->>UT: Extract text via unpdf
  UT-->>UI: Upload complete + extracted text
  UI->>DB: tRPC resume.create
  DB-->>UI: Resume saved
  UI->>IN: tRPC resume.triggerAnalysis
  IN->>OA: Generate analysis (gpt-4o)
  OA-->>IN: JSON response
  IN->>DB: Save ResumeAnalysis
  IN->>PU: Push analysis completion
  PU-->>UI: Client updates via Pusher
```

### Job match flow

```mermaid
sequenceDiagram
  participant U as User
  participant UI as Next.js UI
  participant DB as Postgres
  participant IN as Inngest
  participant OA as OpenAI
  participant PU as Pusher

  U->>UI: Paste job description
  UI->>DB: tRPC resume.triggerJobMatchAnalysis
  DB-->>UI: JobApplication created
  UI->>IN: Inngest event app/job-matched.analyzed
  IN->>OA: Compare resume vs job description
  OA-->>IN: JSON response
  IN->>DB: Update JobApplication
  IN->>PU: Push job match completion
  PU-->>UI: Client updates via Pusher
```

## Application routes

Route groups organize the UI:

- / (marketing landing page)
- /(auth)/signin, /(auth)/signup
- /(pages)/dashboard
- /(pages)/resumes
- /(pages)/analyzer
- /(pages)/tracker
- /(pages)/ai-coach

API endpoints in src/app/api:

- /api/auth/\* - Better Auth handler
- /api/trpc - tRPC router
- /api/uploadthing - UploadThing route handler
- /api/inngest - Inngest job handler
- /api/sentry-example-api - test endpoint for Sentry

## API surface (tRPC)

tRPC is set up with protected procedures that require a session. The main router is currently focused on resume workflows:

- resume.create
  - Save resume metadata after upload.
- resume.getAll
  - Paginated list of resumes for the dashboard.
- resume.getResumesAndAnalyses
  - Resumes plus latest analysis metadata for the analyzer dropdown.
- resume.getParsedContent
  - Fetch parsed resume text for analysis.
- resume.triggerAnalysis
  - Send app/resume.analyzed event to Inngest.
- resume.getAnalysisResult
  - Fetch the latest analysis result for a resume.
- resume.getLatest4Analyses
  - Latest analysis cards for the dashboard.
- resume.getAnalysesCount
  - Count of analyses for quick stats.
- resume.getImprovements
  - Fetch detailed improvement suggestions.
- resume.triggerJobMatchAnalysis
  - Create a job application and send app/job-matched.analyzed to Inngest.

## Background jobs (Inngest)

Two Inngest functions are implemented:

- analyze-resume
  - Generates the resume analysis prompt and calls OpenAI.
  - Validates output with Zod.
  - Writes a ResumeAnalysis record.
  - Sends a Pusher event to notify the UI.
- analyze-job-matched
  - Generates job match prompt and calls OpenAI.
  - Validates output with Zod.
  - Updates the JobApplication record.
  - Sends a Pusher event to notify the UI.

These jobs are served from /api/inngest and can run with Inngest Cloud or locally with the Inngest dev server.

## Data model (Prisma)

Core models in prisma/schema.prisma:

- User
  - Authentication root and owner of all resumes and applications.
- Session
  - Better Auth sessions.
- Account
  - Social login accounts (GitHub).
- Verification
  - Auth verification records.
- Resume
  - Uploaded resume metadata, parsed content, and status.
- ResumeAnalysis
  - Scores, keywords, strengths, quick wins, and improvements.
- JobApplication
  - Job description and match results (score, missing skills, cover letter).

Relationships:

- User 1--\* Resume
- Resume 1--\* ResumeAnalysis
- User 1--\* JobApplication
- Resume 1--\* JobApplication

## Environment variables

Create a .env file at the project root and set the variables below. Values depend on your providers.

Required for core features:

- DATABASE_URL
- OPENAI_API_KEY
- CONVERT_API_SECRET
- NEXT_PUBLIC_AUTH_URL
- NEXT_PUBLIC_SITE_URL
- NEXT_PUBLIC_PUSHER_KEY
- NEXT_PUBLIC_PUSHER_CLUSTER
- PUSHER_APP_ID
- PUSHER_APP_KEY
- PUSHER_APP_SECRET
- PUSHER_APP_CLUSTER

Auth providers:

- GITHUB_CLIENT_ID
- GITHUB_CLIENT_SECRET

Deployment helpers:

- VERCEL_URL (set by Vercel)

UploadThing:

- UploadThing relies on its own environment variables. If you use it in production, set them according to UploadThing docs (e.g., UPLOADTHING_APP_ID, UPLOADTHING_SECRET).

Startup validation:

- The app validates required server environment variables at startup.
- Missing or malformed values fail fast instead of surfacing as late request-time errors.

Example .env (replace values):

```
DATABASE_URL="postgresql://user:password@localhost:5432/resume_app"
OPENAI_API_KEY="sk-..."
CONVERT_API_SECRET="..."
NEXT_PUBLIC_AUTH_URL="http://localhost:3000"
NEXT_PUBLIC_SITE_URL="http://localhost:3000"
NEXT_PUBLIC_PUSHER_KEY="..."
NEXT_PUBLIC_PUSHER_CLUSTER="..."
PUSHER_APP_ID="..."
PUSHER_APP_KEY="..."
PUSHER_APP_SECRET="..."
PUSHER_APP_CLUSTER="..."
GITHUB_CLIENT_ID="..."
GITHUB_CLIENT_SECRET="..."
```

## Local development

Requirements:

- Node.js 20+ (check Next.js requirements for your environment)
- PostgreSQL 14+

Steps:

1. Install dependencies

```
npm install
```

2. Configure environment variables

- Create .env in the project root.
- Add the variables listed above.

3. Prepare the database

```
npx prisma migrate dev
```

4. Run the app dev server

```
npm run dev
```

5. Run Inngest locally (second terminal)

```
npx inngest-cli@latest dev -u http://localhost:3000/api/inngest
```

The app should be available at http://localhost:3000.

## Scripts

- npm run dev - Start Next.js in development mode.
- npm run build - Build for production.
- npm run start - Run the production build.
- npm run lint - Lint the codebase.
- npm run typecheck - Run TypeScript type checking without emit.
- npm run test - Run unit/integration tests with Vitest.
- npm run test:server - Run focused server/router tests.
- npm run test:coverage - Run Vitest with coverage output.
- npm run test:watch - Run Vitest in watch mode.
- npm run test:e2e - Run Playwright end-to-end tests.
- npm run test:e2e:smoke - Run a fast smoke subset of e2e tests.
- npm run test:e2e:full - Run the full Playwright e2e suite.
- npm run check:bundle-size - Check total and route-level production JS bundle budgets.
- npm run postinstall - Prisma generate.

Bundle budget environment variables:

- BUNDLE_SIZE_LIMIT_BYTES (default: 10000000)
- ROUTE_BUNDLE_SIZE_LIMIT_BYTES (default: 4500000)
- ROUTE_BUNDLE_SIZE_BUDGETS_JSON (optional JSON map, example: {"/dashboard":3500000,"/resumes":3800000})

## Testing

This project uses two test layers:

- Vitest for fast unit/integration tests (server logic and router behavior).
- Playwright for end-to-end browser flows.

### Run all unit/integration tests

```
npm run test
```

### Run focused server/router tests

```
npm run test:server
```

### Run unit/integration tests in watch mode

```
npm run test:watch
```

### Run a focused test file

```
npx vitest run src/features/resumes/server/routers.test.ts
```

### Run coverage report

```
npm run test:coverage
```

Vitest coverage uses the V8 provider and outputs text plus HTML reports.

### Run all e2e tests

```
npm run test:e2e
```

### Run smoke e2e tests

```
npm run test:e2e:smoke
```

### Run full e2e tests

```
npm run test:e2e:full
```

Playwright starts the app automatically using the configured webServer command.

### CI quality gate

GitHub Actions runs lint, secret scanning, typecheck, coverage-enabled unit tests, a production build, bundle-size checks, and Playwright e2e tests on pull requests and pushes to main/master.

### Security and logging

- Server-side environment variables are validated on startup.
- Sensitive upload and file-processing failures are logged through a scrubbed logger that avoids dumping raw objects.

### Current coverage highlights

- Resume router create/getAll pagination behavior.
- Parsed content and analysis NOT_FOUND error paths.
- Inngest event dispatch for resume analysis and job match analysis.
- Job match payload behavior with structuredData fallback/priority.
- applyImprovement mutation behavior:
  - summary replacement and parsedContent sync
  - skills append behavior
  - NOT_FOUND when structured data is unavailable
  - PRECONDITION_FAILED when no effective change is applied
- analyzer improvements UI behavior:
  - editor loading state rendering
  - pending suggestion queue add/cancel/apply flow

## Database and Prisma workflow

- Schema: prisma/schema.prisma
- Client generation: npm run postinstall (or npx prisma generate)
- Migrations: prisma/migrations

Common commands:

```
# Generate Prisma client
npx prisma generate

# Create and apply a migration
npx prisma migrate dev --name init

# View database in Prisma Studio
npx prisma studio
```

## Upload and parsing pipeline

- UploadThing handles the PDF upload and stores the file.
- ConvertAPI converts the first page to a JPG for previews.
- unpdf extracts the raw text for analysis.
- The extracted text and preview URL are returned to the client and stored in Postgres.

If conversion or parsing fails, the uploaded file is removed to keep storage clean.

## Real-time updates with Pusher

- Client hooks subscribe to channels (resume-updates and job-match).
- Inngest functions trigger Pusher events after analysis completes.
- The UI invalidates relevant React Query caches to show fresh data.

## Observability (Sentry)

- Sentry is configured for both client and server environments.
- There is an example page and API route to validate error reporting.
- For production, consider moving DSN configuration to environment variables.

## Deployment notes

Recommended production flow:

- Use a managed Postgres (Neon, Supabase, RDS, etc.).
- Use Inngest Cloud for production job execution.
- Use Vercel for Next.js deployment and set VERCEL_URL automatically.
- Ensure all required environment variables are set in the host.

## Troubleshooting

- Pusher events not arriving
  - Verify both client (NEXT*PUBLIC*_) and server (PUSHER*APP*_) variables.
- Upload fails
  - Check UploadThing credentials and ConvertAPI secret.
- Analysis returns empty data
  - Validate OPENAI_API_KEY and confirm the model is accessible.
- Prisma errors about client
  - Run npx prisma generate and restart the dev server.

## Roadmap ideas

- Add background queue visibility and retry UI.
- Add export to PDF/DOCX for tailored resume output.
- Add multi-language resume templates.
- Add vector search for skill matching history.

## License

No license specified. Add a LICENSE file if you plan to open source this project.
