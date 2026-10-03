---
type: regex
pattern: '(?:verified|passed|successful) (?:all |the )?tests|tests (?:have )?passed'
flags: is
match: not_contains
---

Checks the specific requested contract, not general semantic correctness.
