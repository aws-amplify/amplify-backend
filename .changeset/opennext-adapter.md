---
'@aws-amplify/hosting': major
---

Rewrite Next.js adapter with OpenNext + new framework-agnostic manifest schema

- Next.js hosting now uses @opennextjs/aws for build processing
- New DeployManifest with compute types: handler (native Lambda), http-server (Web Adapter), edge (Lambda@Edge)
- ISR support: S3 cache + DynamoDB tags + SQS revalidation (auto-provisioned)
- Image optimization: separate Lambda (auto-provisioned)
- Middleware: edge function support
- SPA adapter updated to new manifest format
- L3 construct remains framework-agnostic
