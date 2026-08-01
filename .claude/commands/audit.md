---
description: Run the item-bank audit (ROADMAP.md A7 / A2)
---

Run `npm run audit:bank` and report the result concisely:

- Total live items, verified-for-rotation count, error count, warning count.
- If errors exist, name the top 2-3 most common error types (not every
  individual line) and which topic(s) they cluster in.
- If the bank-wide MCQ share warning is present, say so in one line — per
  D1 it's expected to stay lit until migration is well underway, not a
  regression to chase.
- Don't fix anything automatically. This command's job is to report the
  queue (per CORR §5.4, the audit's failures ARE the work queue), not to
  silently start migrating items.
