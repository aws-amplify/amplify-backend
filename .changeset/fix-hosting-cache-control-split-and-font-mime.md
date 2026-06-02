---
'@aws-amplify/hosting': patch
---

Split static asset Cache-Control into immutable (hashed paths) + mutable (HTML/public) so a redeploy invalidates cached HTML on next request, and re-deploy fonts with explicit Content-Type so CORS-restricted `font/woff*` types aren't served as `binary/octet-stream`.
