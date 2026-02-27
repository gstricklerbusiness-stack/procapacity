# CLAUDE.md — ProCapacity

## Project Overview
ProCapacity is a capacity planning SaaS for 100–200 person project-based professional services firms. Solo founder, bootstrapped, no budget.
- **Stack:** Next.js (app router) + Vercel, Postgres + Prisma, Stripe, TypeScript
- **Repo:** gstricklerbusiness-stack/procapacity
- **Goal:** $10K MRR. Every decision ladders to revenue.
- **ICP:** 100–200 person US-based project-based agencies and firms paying $499+/month

## Development Priority Order
1. Security — protect all client data
2. Bug fixes — broken things first
3. Code improvements — refactoring, performance, type safety
4. New features — only after 1–3 are solid
5. Tests — cover critical paths (auth, billing, data access)
6. Prisma migrations — most dangerous, last priority unless blocking

## Code Conventions
- Next.js app router only.
- TypeScript always. No `any` uODO.
- Prisma for all DB operations.
- Server components by default.
- Zod for runtime input validation on all API endpoints.

## Autonomy Rules
### Proceed Autonomously
- Small bug fixes, UI improvements, TypeScript types, Refactoring within a file.
### STOP and Show Me the Plan First
- Auth changes, Stripe billing logic, Prisma schema migrations, Security-related changes, Database queries touching user data, Deleting files.

## Output Style
- **Copy-paste ready.** Always.
- **Code output:** File path, line number, exact change.
- **Security flags:** ALL CAPS so I never miss them.

## Modular Rules
Context-specific rules live in .claude/rules/:
- security.md — loads for .ts, .tsx, .prisma files
- billing.md — Stripe protocol, always loaded
- sales.md — Matt Easton sales methodology (future use)
