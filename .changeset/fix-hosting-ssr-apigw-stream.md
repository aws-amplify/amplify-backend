---
'@aws-amplify/hosting': patch
---

Front the SSR Lambda with API Gateway REST API + STREAM mode instead of OAC + Function URL. CloudFront OAC SigV4-signs every forwarded request including the SHA-256 of the body; Lambda Function URL recomputes that hash from received bytes and the two diverge on every non-empty `POST`/`PUT`/`PATCH`, returning **403 SignatureDoesNotMatch**. API Gateway invokes Lambda via `lambda:InvokeFunction` (no body re-hash) and `responseTransferMode: STREAM` preserves response streaming end-to-end. Image-optimization and S3 static assets keep their OAC paths — they are GET-only and unaffected. Adapter glue: Next.js (OpenNext) generates an `aws-apigw-v1` + `aws-lambda-streaming` config and post-build patches the streaming wrapper; Nuxt/Nitro post-build patches the bundled handler to fall through from payload v2 fields to v1.
