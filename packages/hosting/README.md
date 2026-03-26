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
```typescript
// amplify/hosting/resource.ts
import { defineHosting } from '@aws-amplify/hosting';

export const hosting = defineHosting({
  framework: 'nextjs',
  buildCommand: 'npm run build',
});
```

**⚠️ Next.js Requirement:** Your `next.config.js` must have `output: 'standalone'` set:
```js
// next.config.js
module.exports = { output: 'standalone' };
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

## Configuration

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `framework` | `'nextjs' \| 'spa' \| 'static' \| string` | auto-detected | Framework type. Auto-detected from package.json. |
| `buildCommand` | `string` | - | Build command to run before deployment. |
| `buildOutputDir` | `string` | framework-dependent | Build output directory. |
| `domain` | `{ domainName, hostedZone }` | - | Custom domain with SSL. Requires Route53 hosted zone. |
| `waf` | `{ enabled: boolean }` | - | Enable AWS WAF with managed rules + rate limiting. Adds ~$5/month. |
| `customAdapter` | `FrameworkAdapterFn` | - | Custom framework adapter for unsupported frameworks. |
| `compute` | `{ memorySize?, timeout?, reservedConcurrency? }` | `{ 512, 30, 100 }` | Lambda configuration for SSR. |
| `retainOnDelete` | `boolean` | `false` | Retain S3 bucket on stack deletion. |
| `accessLogging` | `boolean` | `false` | Enable CloudFront access logs to S3. |
| `name` | `string` | - | Optional resource name. |

## Deployment Timeline

- **First deploy:** ~15-20 minutes (CloudFront distribution creation)
- **Subsequent deploys:** ~5 minutes (asset upload + cache invalidation)
- **Stack deletion:** ~20-40 minutes (CloudFront distribution must be disabled first)

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

**First deploy with a custom domain takes longer** (2-5 extra minutes with Route53, potentially much longer with external DNS) because ACM certificate validation blocks the CloudFormation stack until the certificate is issued. This is inherent to CDK/CloudFormation's synchronous model and cannot be avoided. Subsequent deploys with an already-validated certificate are fast.

**Recommendation:** Keep your Route53 hosted zone in the same AWS account for the smoothest experience. DNS validation records are created automatically.

**Note:** Changing `domainName` after initial deploy causes 5-30 minutes of downtime (certificate replacement).

## WAF (Web Application Firewall)

Enables AWS Managed Rules (Common Rule Set + Known Bad Inputs) and IP-based rate limiting (2000 req/5min/IP).

```typescript
defineHosting({
  waf: { enabled: true },
});
```

**Cost:** ~$5/month base + $1/million requests. Use for production apps with security requirements.

## Custom Framework Adapters

For frameworks not built in (Astro, Remix, etc.), provide a custom adapter:

```typescript
import { defineHosting, FrameworkAdapterFn } from '@aws-amplify/hosting';

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
    memorySize: 1024,       // MB (default: 512)
    timeout: 60,            // seconds (default: 30)
    reservedConcurrency: 50, // concurrent executions (default: 100)
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
