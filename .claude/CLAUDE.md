# Global Claude Code Rules

## Baseline Safety
Always refer to the project-specific CLAUDE.md and .claude/ folder for permission levels, autonomy rules, and security protocols before taking any action.

If no project-specific configuration exists:
- STOP and ask before any change touching auth, billing, database schema, or security
- NEVER hardcode secrets or environment variables
- NEVER commit .env files or credentials
- Show exact file paths and code diffs for every change
