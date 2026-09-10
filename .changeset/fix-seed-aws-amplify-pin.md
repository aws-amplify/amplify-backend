---
'@aws-amplify/seed': patch
---

Loosen `aws-amplify` from an exact version pin (`6.14.4`) back to a caret range (`^6.14.4`) so npm can deduplicate it against the consuming app's `aws-amplify` version. The exact pin (introduced in #3144, shipped in 1.1.3) forced a second, nested `aws-amplify` copy whenever the app used any other 6.x version, producing an unconfigured Amplify singleton and `Auth UserPool not configured` / `SeedingFailedError` during `ampx sandbox seed`.
