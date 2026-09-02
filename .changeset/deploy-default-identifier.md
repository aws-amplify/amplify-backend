---
'@aws-amplify/backend-cli': minor
---

feat(cli): default `ampx deploy --identifier` to the package.json name

`ampx deploy` (non-pipeline) no longer errors when `--identifier` is omitted. It
now defaults the identifier to the sanitized `package.json` `name` — the same
source `ampx sandbox` uses for its namespace and that self-managed hosting uses
for its secret/config store prefix — and prints which identifier it chose
(`No --identifier provided; using "<name>" (from package.json name)...`) so the
choice is never silent. Pass `--identifier <name>` to override. `--pipeline`
deployments are unaffected (they supply per-stage identifiers).
