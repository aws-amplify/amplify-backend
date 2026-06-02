---
'@aws-amplify/hosting': patch
---

Strip the `:nextInternalLocale(...)` group from `routes-manifest.json` sources/destinations so user-declared `headers()` and `redirects()` rules still lift to CloudFront on Pages Router projects with i18n. Without the strip, CloudFront's PathPattern syntax rejected the locale group and security-named headers (e.g. `X-Frame-Options: DENY`) silently fell through to OpenNext where CloudFront refuses them in the customHeaders array.
