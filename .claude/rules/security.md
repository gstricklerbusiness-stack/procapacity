---
description: Security rules and Prisma migration protocol for all TypeScript and Prisma files
globs:
  - "**/*.ts"
  - "**/*.tsx"
  - "**/*.prisma"
---
# Securies
**SECURITY IS THE TOP PRIORITY. ALWAYS.**

## Core Rules
- **FLAG ANY CODE THAT EXPOSES USER DATA OR SECRETS IN ALL CAPS**
- **NEVER hardcode environment variables — all secrets in .env**
- **ALWAYS validate and sanitize all inputs server-side**
- **NEVER commit .env files, secrets, or credentials to the repository**

## Prisma Query Safety
- Prisma queries must **NEVER** expose raw user data — always `select` only needed fields.
- **ALL** API routes must verify authentication before any database operation.

## Prisma Migration Protocol
1. re any migration: list ALL schema changes and side effects.
2. **FLAG ANY DESTRUCTIVE CHANGES IN ALL CAPS.**
3. Show the migration SQL before running it.
4. Confirm with founder before executing `prisma migrate dev`.
