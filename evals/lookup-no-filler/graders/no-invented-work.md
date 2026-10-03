---
type: regex
pattern: '\b(next(?: action| step)?|step \d+ of \d+|recommended)\b'
flags: is
match: not_contains
---

Checks the specific requested contract, not general semantic correctness.
