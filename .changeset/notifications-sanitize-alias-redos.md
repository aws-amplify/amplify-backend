---
'@aws-amplify/backend-notifications': patch
---

Harden `sanitizeInstanceAlias` against polynomial regex backtracking (ReDoS). The dash-collapse and leading/trailing-dash trim on the uncontrolled `instanceAlias` input are now done with a linear `split('-').filter(Boolean).join('-')` pass and a character-loop trim instead of anchored repeated-quantifier regexes (`/-+/g`, `/^-+|-+$/g`, `/-+$/g`). Behavior is unchanged.
