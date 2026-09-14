---
---

fix(scripts): strip symbol brands unconditionally in check_api_changes (build script only, no published package change)

The symbol-brand handling merged in #3338 threw an error when a matched brand
member was not marked optional. But `check_api_changes` reconstructs types from
the baseline API report, and API Extractor renders symbol-keyed properties
WITHOUT the `?` (a source `[BRAND]?: true` shows as `[BRAND]: true`) — so the
check always saw the brand as "required" and threw on the current baseline,
failing `check_api_changes` for `@aws-amplify/hosting` on every PR and on the
release PR.

Remove the infeasible required-brand throw and strip the inert (`: true`) brand
shape unconditionally (the behavior that originally passed). Optional-vs-required
is not recoverable from the report, so the convention is documented instead: such
brands must be declared optional in the source type (a genuinely required brand
would surface downstream as `TS2741`).
