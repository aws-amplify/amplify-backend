# @aws-amplify/hosting

Deploy static sites, SPAs, and SSR (Next.js) applications to AWS using CloudFront + S3 + Lambda.

## ⚠️ Important: Separate File Required

Hosting **must** be defined in `amplify/hosting.ts` — a separate file from `amplify/backend.ts`. This is because hosting deploys as an independent CloudFormation stack, allowing you to deploy frontend and backend independently.

```
amplify/
├── backend.ts      ← defineBackend() — auth, data, storage
├── hosting.ts      ← defineHosting() — CloudFront, S3, Lambda
└── ...
```

## Quick Start

### SPA (React, Vue, etc.)

```typescript
// amplify/hosting.ts
import { defineHosting } from '@aws-amplify/hosting';

defineHosting({
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
// amplify/hosting.ts
import { defineHosting } from '@aws-amplify/hosting';

defineHosting({
  framework: 'nextjs',
  buildCommand: 'npm run build',
});
```

### Deploy

```bash
# Deploy everything (backend + frontend)
npx ampx deploy --identifier prod

# Deploy only backend (auth, data, storage)
npx ampx deploy --identifier prod --backend

# Deploy only frontend (hosting) — requires backend deployed first
npx ampx deploy --identifier prod --frontend
```

## Common Mistakes

❌ **WRONG — Do NOT add hosting to defineBackend:**

```typescript
// amplify/backend.ts — THIS IS WRONG
import { defineBackend } from '@aws-amplify/backend';
import { hosting } from './hosting/resource';

defineBackend({ hosting }); // ❌ Will not work
```

✅ **CORRECT — Use a separate amplify/hosting.ts file:**

```typescript
// amplify/hosting.ts — THIS IS CORRECT
import { defineHosting } from '@aws-amplify/hosting';

defineHosting({
  framework: 'spa',
  buildCommand: 'npm run build',
});
```

Hosting is a standalone CDK entry point. The CLI discovers `amplify/hosting.ts` automatically and deploys it as a separate CloudFormation stack.

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
// amplify/hosting.ts
import { defineHosting } from '@aws-amplify/hosting';

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
// amplify/hosting.ts
import { defineHosting } from '@aws-amplify/hosting';

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

**Note:** `--backend` and `--frontend` are mutually exclusive. Specifying both is an error.

## Limitations

### Sandbox

`defineHosting` is not supported in `ampx sandbox`. Hosting resources are silently skipped during sandbox development. Use `ampx deploy --identifier <name>` for full hosting deployment.

### Pipeline Deploy

`defineHosting` is not supported with `ampx pipeline-deploy` (branch deployments). Use `ampx deploy` for standalone hosting deployment.

## Custom Framework Adapters

For frameworks not built in (Astro, Remix, etc.), provide a custom adapter:

```typescript
// amplify/hosting.ts
import { defineHosting } from '@aws-amplify/hosting';
import type { FrameworkAdapterFn } from '@aws-amplify/hosting/adapters';

const myAdapter: FrameworkAdapterFn = (buildOutputDir, projectDir) => ({
  version: 1,
  routes: [{ path: '/*', target: { kind: 'Static' } }],
  framework: { name: 'my-framework' },
});

defineHosting({
  customAdapter: myAdapter,
  buildCommand: 'npm run build',
});
```

## Lambda Configuration

Customize SSR Lambda settings:

```typescript
// amplify/hosting.ts
import { defineHosting } from '@aws-amplify/hosting';

defineHosting({
  framework: 'nextjs',
  compute: {
    memorySize: 1024, // MB (default: 512)
    timeout: 60, // seconds (default: 30)
    reservedConcurrency: 50, // concurrent executions (default: none)
  },
});
```

## Content Security Policy (CSP)

The default CSP is intentionally restrictive:

```
default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https:; media-src 'self'; object-src 'none'; frame-ancestors 'self'
```

**`unsafe-eval` is NOT included** in the default policy. This was a deliberate security decision — `eval()` and `new Function()` are common XSS vectors. Most modern frameworks (including Next.js) work without `unsafe-eval`.

However, some libraries (e.g., certain template engines, older chart libraries) require `eval()` at runtime. If your app needs it, use the `contentSecurityPolicy` prop to override:

```typescript
// amplify/hosting.ts
import { defineHosting } from '@aws-amplify/hosting';

defineHosting({
  contentSecurityPolicy:
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https:; media-src 'self'; object-src 'none'; frame-ancestors 'self'",
});
```

## Standalone CDK Usage (No Amplify CLI)

`AmplifyHostingConstruct` works as a standard CDK L3 construct in any CDK project — no Amplify CLI, no `defineHosting()`, no `amplify/` directory required.

### Sub-path Imports

Use sub-path imports to pull in only what you need:

```typescript
// The construct itself
import { AmplifyHostingConstruct } from '@aws-amplify/hosting/constructs';

// Adapters for framework detection and build output transformation
import {
  spaAdapter,
  nextjsAdapter,
  detectFramework,
  getAdapter,
} from '@aws-amplify/hosting/adapters';

// Error type for catch clauses
import { HostingError } from '@aws-amplify/hosting/error';

// Manifest types for custom adapters
import type {
  DeployManifest,
  ManifestRoute,
  ComputeResource,
} from '@aws-amplify/hosting';
```

> **Dependency note:** The sub-path imports (`/constructs`, `/adapters`, `/error`) do **not** import any `@aws-amplify/*` packages at runtime. Only the main entry point (`@aws-amplify/hosting`) re-exports the `defineHosting()` factory which depends on `@aws-amplify/plugin-types` and other Amplify packages. If you only use sub-path imports, your project does not need any Amplify packages installed.

### SPA Example (Vanilla CDK)

```typescript
import { App, Stack } from 'aws-cdk-lib';
import { AmplifyHostingConstruct } from '@aws-amplify/hosting/constructs';
import type { DeployManifest } from '@aws-amplify/hosting';

const app = new App();
const stack = new Stack(app, 'MySpaStack', {
  env: { account: '123456789012', region: 'us-east-1' },
});

const manifest: DeployManifest = {
  version: 1,
  routes: [{ path: '/*', target: { kind: 'Static' } }],
  framework: { name: 'spa' },
  buildId: 'my-build-001',
};

const hosting = new AmplifyHostingConstruct(stack, 'Hosting', {
  manifest,
  staticAssetPath: './dist', // your build output directory
});

// Access created resources for composition with other constructs
console.log(hosting.distributionUrl); // https://d111111abcdef8.cloudfront.net
console.log(hosting.bucket.bucketName); // auto-generated bucket name
```

### Next.js SSR Example (Vanilla CDK)

```typescript
import { App, Stack } from 'aws-cdk-lib';
import { AmplifyHostingConstruct } from '@aws-amplify/hosting/constructs';
import type { DeployManifest } from '@aws-amplify/hosting';

const app = new App();
const stack = new Stack(app, 'MyNextjsStack', {
  env: { account: '123456789012', region: 'us-east-1' },
});

const manifest: DeployManifest = {
  version: 1,
  routes: [
    {
      path: '/_next/static/*',
      target: {
        kind: 'Static',
        cacheControl: 'public, max-age=31536000, immutable',
      },
    },
    { path: '/favicon.ico', target: { kind: 'Static' } },
    { path: '/*', target: { kind: 'Compute', src: 'default' } },
  ],
  computeResources: [
    { name: 'default', runtime: 'nodejs20.x', entrypoint: 'run.sh' },
  ],
  framework: { name: 'nextjs', version: '15.0.0' },
  buildId: 'nextjs-build-001',
};

new AmplifyHostingConstruct(stack, 'Hosting', {
  manifest,
  staticAssetPath: './.next/static', // Static assets directory
  computeBasePath: './.next/standalone', // Directory containing compute resources
  compute: {
    memorySize: 1024, // MB
    timeout: 60, // seconds
  },
});
```

### Custom Domain with BYO Certificate

```typescript
import { Certificate } from 'aws-cdk-lib/aws-certificatemanager';
import { AmplifyHostingConstruct } from '@aws-amplify/hosting/constructs';

// Certificate MUST be in us-east-1 — CloudFront requirement
const cert = Certificate.fromCertificateArn(
  stack,
  'MyCert',
  'arn:aws:acm:us-east-1:123456789012:certificate/abc-123',
);

new AmplifyHostingConstruct(stack, 'Hosting', {
  manifest,
  staticAssetPath: './dist',
  domain: {
    domainName: 'app.example.com',
    hostedZone: 'example.com',
    certificate: cert, // BYO cert — skips deprecated DnsValidatedCertificate
  },
});
```

> **Important:** CloudFront requires ACM certificates to be in `us-east-1`. If you provide a certificate from another region, the construct throws an `InvalidCertificateRegionError` at synth time (for concrete ARNs). For cross-stack token ARNs, CloudFront will reject the certificate at deploy time.

### Writing a Custom Adapter

The construct is driven by a `DeployManifest`. Built-in adapters (`spaAdapter`, `nextjsAdapter`) scan framework build output and produce this manifest. You can write your own adapter for any framework (Astro, Remix, SvelteKit, etc.).

**The `DeployManifest` interface:**

```typescript
type DeployManifest = {
  version: 1;
  routes: ManifestRoute[]; // URL patterns → Static or Compute targets
  computeResources?: ComputeResource[]; // Lambda functions (for SSR)
  framework: { name: string; version?: string };
  buildId?: string; // For atomic deployments (auto-generated if omitted)
};

type ManifestRoute = {
  path: string; // e.g., '/*', '/_next/static/*', '/favicon.ico'
  target: {
    kind: 'Static' | 'Compute';
    src?: string; // Compute resource name (for kind: 'Compute')
    cacheControl?: string; // Cache-Control header for static assets
  };
};

type ComputeResource = {
  name: string; // Subdirectory name in computeBasePath
  runtime: string; // e.g., 'nodejs20.x'
  entrypoint: string; // e.g., 'run.sh'
};
```

**Skeleton adapter for a custom framework:**

```typescript
import * as fs from 'fs';
import * as path from 'path';
import type { DeployManifest, ManifestRoute } from '@aws-amplify/hosting';

/**
 * Custom adapter for Astro (example).
 * Scans Astro's build output and returns a DeployManifest.
 */
export const astroAdapter = (
  buildOutputDir: string,
  _projectDir: string,
): DeployManifest => {
  // 1. Validate build output exists
  if (!fs.existsSync(buildOutputDir)) {
    throw new Error(`Build output not found at ${buildOutputDir}`);
  }

  // 2. Scan for static vs. server-rendered content
  const hasServerDir = fs.existsSync(path.join(buildOutputDir, 'server'));
  const routes: ManifestRoute[] = [];

  // 3. Add static asset routes
  routes.push({
    path: '/_astro/*',
    target: {
      kind: 'Static',
      cacheControl: 'public, max-age=31536000, immutable',
    },
  });

  // 4. Add compute route if SSR is detected
  if (hasServerDir) {
    routes.push({
      path: '/*',
      target: { kind: 'Compute', src: 'default' },
    });
  } else {
    routes.push({
      path: '/*',
      target: { kind: 'Static' },
    });
  }

  // 5. Return the manifest
  return {
    version: 1,
    routes,
    ...(hasServerDir
      ? {
          computeResources: [
            { name: 'default', runtime: 'nodejs20.x', entrypoint: 'run.sh' },
          ],
        }
      : {}),
    framework: { name: 'astro' },
  };
};
```

**Using a custom adapter with the construct:**

```typescript
import { AmplifyHostingConstruct } from '@aws-amplify/hosting/constructs';
import { astroAdapter } from './astro-adapter';

const manifest = astroAdapter('./dist', process.cwd());

new AmplifyHostingConstruct(stack, 'Hosting', {
  manifest,
  staticAssetPath: './dist/client',
  computeBasePath: './dist/server', // only if SSR
});
```

The key insight is that **any framework can be supported** by writing an adapter that scans the build output and returns a `DeployManifest`. The construct handles all AWS resource creation (S3, CloudFront, Lambda, OAC, etc.) based on the manifest.

## Troubleshooting

### "Next.js standalone output not found"

Add `output: 'standalone'` to your `next.config.js` and rebuild.

### Build fails but error message is unclear

Run your build command locally (`npm run build`) to see full output. The deploy shows first 1000 + last 1000 characters.

### CloudFront returns 403

This should not happen with the OAC bucket policy. If it does, check that the S3 bucket policy includes the CloudFront distribution ARN.

### Deploy takes very long

First deploy creates a CloudFront distribution (~15-20 min). Subsequent deploys are faster (~5 min).
