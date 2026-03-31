# @aws-amplify/hosting

Deploy static sites, SPAs, and SSR (Next.js) applications to AWS using CloudFront + S3 + Lambda.

## Quick Start

### SPA (React, Vue, etc.)

```typescript
// amplify/hosting/resource.ts
import { defineHosting } from '@aws-amplify/hosting';

export const hosting = defineHosting({
  framework: 'spa',
  buildCommand: 'npm run build',
});
```

### Next.js (SSR)

> **⚠️ Prerequisite:** Your `next.config.js` must have `output: 'standalone'` set before building.
>
> ```js
> // next.config.js
> module.exports = { output: 'standalone' };
> ```

```typescript
// amplify/hosting/resource.ts
import { defineHosting } from '@aws-amplify/hosting';

export const hosting = defineHosting({
  framework: 'nextjs',
  buildCommand: 'npm run build',
});
```

### Wire into backend

```typescript
// amplify/backend.ts
import { defineBackend } from '@aws-amplify/backend';
import { hosting } from './hosting/resource';

defineBackend({ hosting });
```

### Deploy

```bash
npx ampx deploy --identifier prod
```

## What Happens During Deploy?

1. **Build** — your build command runs (e.g., `npm run build`)
2. **Adapter** — the framework adapter transforms build output into the canonical `.amplify-hosting/` structure
3. **CDK Synth** — CDK synthesizes a CloudFormation template with S3, CloudFront, Lambda (for SSR), etc.
4. **CloudFormation Deploy** — AWS provisions/updates all resources

**Timelines:**

- **First deploy:** ~15-20 minutes (CloudFront distribution provisioning is the bottleneck)
- **Subsequent deploys:** ~5 minutes (asset upload + cache invalidation)
- **Stack deletion:** ~20-40 minutes (CloudFront must be fully disabled before removal)

## Configuration

| Prop                    | Type                                              | Default                  | Description                                                            |
| ----------------------- | ------------------------------------------------- | ------------------------ | ---------------------------------------------------------------------- |
| `framework`             | `'nextjs' \| 'spa' \| 'static' \| string`         | auto-detected            | Framework type. Auto-detected from package.json.                       |
| `buildCommand`          | `string`                                          | -                        | Build command to run before deployment.                                |
| `buildOutputDir`        | `string`                                          | framework-dependent      | Build output directory.                                                |
| `domain`                | `{ domainName, hostedZone }`                      | -                        | Custom domain with SSL. Requires Route53 hosted zone.                  |
| `waf`                   | `{ enabled, rateLimit? }`                         | -                        | Enable AWS WAF with managed rules + rate limiting. Adds ~$5/month.     |
| `customAdapter`         | `FrameworkAdapterFn`                              | -                        | Custom framework adapter for unsupported frameworks.                   |
| `compute`               | `{ memorySize?, timeout?, reservedConcurrency? }` | `{ 512, 30, undefined }` | Lambda configuration for SSR.                                          |
| `contentSecurityPolicy` | `string`                                          | restrictive default      | Custom CSP header value.                                               |
| `retainOnDelete`        | `boolean`                                         | `false`                  | Retain S3 bucket on stack deletion.                                    |
| `accessLogging`         | `boolean`                                         | `false`                  | Enable CloudFront access logs to S3.                                   |
| `priceClass`            | `PriceClass`                                      | `PRICE_CLASS_100`        | CloudFront price class. Use `PRICE_CLASS_ALL` for global distribution. |
| `name`                  | `string`                                          | -                        | Optional resource name.                                                |

## Architecture

- **S3**: Private bucket with OAC (Origin Access Control). All public access blocked.
- **CloudFront**: HTTP/2 + HTTP/3, TLS 1.2+, gzip/brotli compression, security headers (HSTS, CSP, X-Frame-Options).
- **Lambda** (SSR only): Node.js 20, Lambda Web Adapter for streaming, IAM-authenticated Function URL, least-privilege IAM role.
- **Atomic deployments**: Each deploy creates a new build ID prefix in S3. CloudFront Function rewrites URLs. Zero-downtime cutover.

## Custom Domains

Requires a Route53 hosted zone in the same AWS account. ACM certificate is automatically created and validated via DNS.

```typescript
defineHosting({
  domain: {
    domainName: 'app.example.com',
    hostedZone: 'example.com',
  },
});
```

**First deploy with a custom domain takes longer** (2-5 extra minutes with Route53, potentially much longer with external DNS) because ACM certificate validation blocks the CloudFormation stack until the certificate is issued.

**External DNS users:** You must manually create a CNAME record for ACM validation. CloudFormation will wait up to 72 hours for certificate validation before timing out and rolling back.

**Recommendation:** Keep your Route53 hosted zone in the same AWS account for the smoothest experience. DNS validation records are created automatically.

### Changing Your Custom Domain

Changing `domainName` after initial deploy causes **5-30 minutes of downtime** while the certificate is replaced and CloudFront is reconfigured. For zero-downtime domain migration:

1. Create a new stack with the new domain
2. Verify the new site works
3. Update DNS to point to the new CloudFront distribution
4. Delete the old stack

## WAF (Web Application Firewall)

Enables AWS Managed Rules (Common Rule Set + Known Bad Inputs) and IP-based rate limiting (1000 req/5min/IP default).

```typescript
defineHosting({
  waf: { enabled: true, rateLimit: 1000 },
});
```

**Cost:** ~$5/month base + $1/million requests. Use for production apps with security requirements.

### WAF Region Requirement

WAF with CloudFront scope requires deployment in `us-east-1`. Deploying with WAF enabled in other regions will fail with a clear error message.

## Two-Phase Deploy

`ampx deploy` uses a two-phase deployment model:

1. **Backend phase** (`ampx deploy --backend`): Deploys auth, data, and storage resources. Generates `amplify_outputs.json`.
2. **Frontend phase** (`ampx deploy --frontend`): Runs your build command (with `amplify_outputs.json` available), then deploys hosting resources.

Running `ampx deploy` without flags deploys both phases sequentially.

### Flags

| Flag         | Behavior                                                     |
| ------------ | ------------------------------------------------------------ |
| (none)       | Deploy backend + frontend                                    |
| `--backend`  | Deploy backend only (skip hosting)                           |
| `--frontend` | Deploy frontend only (requires backend to be deployed first) |

## Limitations

### Sandbox

`defineHosting` is not supported in `ampx sandbox`. Hosting resources are silently skipped during sandbox development. Use `ampx deploy --identifier <name>` for full hosting deployment.

### Pipeline Deploy

`defineHosting` is not supported with `ampx pipeline-deploy` (branch deployments). Use `ampx deploy` for standalone hosting deployment.

## Custom Framework Adapters

For frameworks not built in (Astro, Remix, etc.), provide a custom adapter:

```typescript
import { defineHosting } from '@aws-amplify/hosting';
import type { FrameworkAdapterFn } from '@aws-amplify/hosting/adapters';

const myAdapter: FrameworkAdapterFn = (buildOutputDir, projectDir) => ({
  version: 1,
  routes: [{ path: '/*', target: { kind: 'Static' } }],
  framework: { name: 'my-framework' },
});

export const hosting = defineHosting({
  customAdapter: myAdapter,
  buildCommand: 'npm run build',
});
```

## Lambda Configuration

Customize SSR Lambda settings:

```typescript
defineHosting({
  framework: 'nextjs',
  compute: {
    memorySize: 1024, // MB (default: 512)
    timeout: 60, // seconds (default: 30)
    reservedConcurrency: 50, // concurrent executions (default: none)
  },
});
```

## Troubleshooting

### "Next.js standalone output not found"

Add `output: 'standalone'` to your `next.config.js` and rebuild.

### Build fails but error message is unclear

Run your build command locally (`npm run build`) to see full output. The deploy shows first 1000 + last 1000 characters.

### CloudFront returns 403

This should not happen with the OAC bucket policy. If it does, check that the S3 bucket policy includes the CloudFront distribution ARN.

### Deploy takes very long

First deploy creates a CloudFront distribution (~15-20 min). Subsequent deploys are faster (~5 min).
