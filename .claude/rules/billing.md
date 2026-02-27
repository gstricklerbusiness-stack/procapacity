---
description: Stripe billing protocol and payment handling rules
globs:
  - "**/*.ts"
  - "**/*.tsx"
---
# Stripe Billing Protocol
## Sacred Rules
1. **NEVER modify webhook handlers without explicit founder approval**
2. **NEVER change subscription logic, seat calculation, or pricing without approval**
3. Always test Stripe changes against Stripe CLI or test mode first
4. Verify idempotency on all webhook handlers
