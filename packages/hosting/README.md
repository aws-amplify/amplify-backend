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

> **Note:** `defineHosting()` is designed to be invoked by the Amplify CLI (`ampx deploy`). It synthesizes a CloudFormation template only when it receives an internal `'amplifySynth'` IPC message from the CLI. Running `amplify/hosting.ts` directly with `npx cdk synth` or `node` will **not** produce a CloudFormation template. If you need to use the hosting construct in a standalone CDK app, use `AmplifyHostingConstruct` from `@aws-amplify/hosting/constructs` instead — see [Standalone CDK Usage](#standalone-cdk-usage-no-amplify-cli) below.

### Next.js (SSR)

```typescript
// amplify/hosting.ts
import { defineHosting } from '@aws-amplify/hosting';

defineHosting({
  framework: 'nextjs',
  buildCommand: 'npm run build',
});
```

> **Note:** You do **not** need to configure `output: 'standalone'` in `next.config.js`. The adapter uses [@opennextjs/aws](https://opennext.js.org/) internally, which handles the build transformation automatically.

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

## Architecture

The hosting package uses a two-layer architecture:

1. **Framework adapters** — transform framework-specific build output into a generic `DeployManifest`
2. **L3 CDK construct** — reads the manifest and provisions AWS resources (S3, CloudFront, Lambda, etc.)

The construct is completely framework-agnostic. It never knows whether the manifest came from Next.js, Astro, or a custom adapter.

### Adapter Pipeline

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────────┐
│  Framework      │     │  Deploy Manifest  │     │  AWS Resources      │
│  Build Output   │ ──► │  (generic JSON)   │ ──► │  (CDK L3 Construct) │
└─────────────────┘     └──────────────────┘     └─────────────────────┘
     adapter()                                      AmplifyHostingConstruct
```

### Built-in Adapters

| Adapter     | Description                                                                                                                                                                       |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Next.js** | Uses [@opennextjs/aws](https://opennext.js.org/) to process Next.js build output. Supports App Router, Pages Router, ISR, middleware, image optimization, and response streaming. |
| **SPA**     | Static single-page apps (React, Vue, Angular, etc.). All routes serve `index.html` with client-side routing.                                                                      |

### Infrastructure

- **S3**: Private bucket with OAC (Origin Access Control). All public access blocked.
- **CloudFront**: HTTP/2 + HTTP/3, TLS 1.2+, gzip/brotli compression, security headers (HSTS, CSP, X-Frame-Options).
- **Lambda** (SSR): Native Lambda handlers with response streaming, IAM-authenticated Function URL, least-privilege IAM role.
- **Lambda@Edge** (Middleware): Edge functions for request/response transformation.
- **Image Optimization**: Separate Lambda with sharp for on-demand image resizing and format conversion.
- **ISR Cache**: S3 cache bucket + DynamoDB (tag-based revalidation) + SQS (async revalidation queue). Auto-provisioned when the adapter declares cache config.
- **Atomic deployments**: Each deploy creates a new build ID prefix in S3. CloudFront Function rewrites URLs. Zero-downtime cutover.

## Features

### ISR (Incremental Static Regeneration)

Next.js ISR with `revalidateTag()` and `revalidatePath()` is fully supported. The adapter automatically provisions:

- **S3 cache bucket** — stores pre-rendered pages
- **DynamoDB table** — maps cache tags to paths for `revalidateTag()`
- **SQS queue** — handles async revalidation requests

No configuration required — if your Next.js app uses ISR, the infrastructure is provisioned automatically.

### Image Optimization

Next.js `<Image>` component and `next/image` optimization work out of the box. A dedicated Lambda function handles:

- On-demand resizing to configured sizes
- Format conversion (WebP, AVIF)
- Caching optimized images in S3

### Middleware

Next.js middleware runs as a Lambda@Edge function, supporting:

- Request/response header manipulation
- Redirects and rewrites
- Authentication checks at the edge
- Geolocation-based routing

### Response Streaming

SSR responses are streamed using Lambda response streaming (via Function URLs), reducing Time to First Byte (TTFB) for server-rendered pages.

## What Happens During Deploy?

1. **Build** — your build command runs (e.g., `npm run build`)
2. **Adapter** — the framework adapter transforms build output into a `DeployManifest` (Next.js uses OpenNext internally)
3. **CDK Synth** — CDK synthesizes a CloudFormation template based on the manifest
4. **CloudFormation Deploy** — AWS provisions/updates all resources

**Timelines:**

- **First deploy:** ~15-20 minutes (CloudFront distribution provisioning is the bottleneck)
- **Subsequent deploys:** ~5 minutes (asset upload + cache invalidation)
- **Stack deletion:** ~20-40 minutes (CloudFront must be fully disabled before removal)

## Configuration

| Prop                    | Type                                              | Default                  | Description                                                        |
| ----------------------- | ------------------------------------------------- | ------------------------ | ------------------------------------------------------------------ |
| `framework`             | `'nextjs' \| 'spa' \| 'static' \| string`         | auto-detected            | Framework type. Auto-detected from package.json.                   |
| `buildCommand`          | `string`                                          | -                        | Build command to run before deployment.                            |
| `buildOutputDir`        | `string`                                          | framework-dependent      | Build output directory.                                            |
| `domain`                | `{ domainName, hostedZone }`                      | -                        | Custom domain with SSL. Requires Route53 hosted zone.              |
| `waf`                   | `{ enabled, rateLimit? }`                         | -                        | Enable AWS WAF with managed rules + rate limiting. Adds ~$5/month. |
| `customAdapter`         | `FrameworkAdapterFn`                              | -                        | Custom framework adapter for unsupported frameworks.               |
| `compute`               | `{ memorySize?, timeout?, reservedConcurrency? }` | `{ 512, 30, undefined }` | Lambda configuration for SSR.                                      |
| `contentSecurityPolicy` | `string`                                          | restrictive default      | Custom CSP header value.                                           |
| `retainOnDelete`        | `boolean`                                         | `false`                  | Retain S3 bucket on stack deletion.                                |

> **⚠️ Production warning:** By default `retainOnDelete` is `false`, which means the S3 bucket and **all hosted assets are permanently deleted** when the CloudFormation stack is destroyed. This is convenient for dev/test but **risky for production**. For production stacks, set `retainOnDelete: true` to preserve the bucket on stack deletion. In standalone CDK usage, you can also set `removalPolicy: RemovalPolicy.RETAIN` on the construct's bucket directly.
> | `accessLogging` | `boolean` | `false` | Enable CloudFront access logs to S3. |
> | `priceClass` | `PriceClass` | `PRICE_CLASS_100` | CloudFront price class. Use `PRICE_CLASS_ALL` for global distribution. |
> | `name` | `string` | - | Optional resource name. |

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

For frameworks not built in (Astro, Remix, SvelteKit, etc.), provide a custom adapter that returns a `DeployManifest`:

```typescript
// amplify/hosting.ts
import { defineHosting } from '@aws-amplify/hosting';
import type { FrameworkAdapterFn } from '@aws-amplify/hosting/adapters';
import type { DeployManifest } from '@aws-amplify/hosting';

const myAdapter: FrameworkAdapterFn = (
  buildOutputDir,
  projectDir,
): DeployManifest => ({
  version: 1,
  compute: {},
  staticAssets: { directory: buildOutputDir },
  routes: [{ pattern: '/*', target: 'static' }],
});

defineHosting({
  customAdapter: myAdapter,
  buildCommand: 'npm run build',
});
```

### SSR Custom Adapter Example

```typescript
import type { DeployManifest } from '@aws-amplify/hosting';

const astroSSRAdapter: FrameworkAdapterFn = (
  buildOutputDir,
  projectDir,
): DeployManifest => ({
  version: 1,
  compute: {
    server: {
      type: 'handler',
      bundle: `${buildOutputDir}/server`,
      handler: 'entry.handler',
      placement: 'regional',
      streaming: true,
      runtime: 'nodejs20.x',
      memorySize: 512,
      timeout: 30,
    },
  },
  staticAssets: {
    directory: `${buildOutputDir}/client`,
    cacheControl: 'public, max-age=31536000, immutable',
  },
  routes: [
    { pattern: '/_astro/*', target: 'static' },
    { pattern: '/favicon.ico', target: 'static' },
    { pattern: '/*', target: 'server' },
  ],
});
```

## Deploy Manifest Schema

The `DeployManifest` is the contract between framework adapters and the L3 construct. Custom adapters must return this shape:

```typescript
type DeployManifest = {
  version: 1;

  /** Named compute resources */
  compute: Record<string, ComputeResource>;

  /** Static asset configuration */
  staticAssets: {
    directory: string;
    cacheControl?: string;
  };

  /** Route behaviors — maps URL patterns to compute or static */
  routes: RouteBehavior[];

  /** Cache infrastructure (auto-provisions S3 + DynamoDB + SQS) */
  cache?: CacheConfig;

  /** Image optimization (auto-provisions a separate Lambda) */
  imageOptimization?: ImageConfig;

  /** Middleware (deploys to Lambda@Edge) */
  middleware?: MiddlewareConfig;

  /** Redirects, rewrites, custom headers */
  redirects?: Redirect[];
  rewrites?: Rewrite[];
  headers?: CustomHeader[];

  /** Build ID for atomic deployments (auto-generated if omitted) */
  buildId?: string;
};

type ComputeResource = {
  type: 'handler' | 'http-server' | 'edge';
  bundle: string;
  handler?: string; // for type: 'handler'
  entrypoint?: string; // for type: 'http-server'
  port?: number; // for type: 'http-server'
  placement: 'regional' | 'global';
  streaming?: boolean;
  runtime?: string;
  memorySize?: number;
  timeout?: number;
  environment?: Record<string, string>;
};

type RouteBehavior = {
  pattern: string; // URL pattern (glob or regex)
  target: string; // compute resource name, or 'static'
  fallback?: string; // fallback target on error
};

type CacheConfig = {
  computeResource: string;
  tagRevalidation: boolean; // provisions DynamoDB
  revalidationQueue: boolean; // provisions SQS
};

type ImageConfig = {
  bundle: string;
  handler: string;
  formats: string[];
  sizes: number[];
};

type MiddlewareConfig = {
  bundle: string;
  handler: string;
  matchers: string[];
};
```

### Compute Types

| Type          | Description                                    | AWS Resource               |
| ------------- | ---------------------------------------------- | -------------------------- |
| `handler`     | Native Lambda handler (fastest cold start)     | Lambda with Function URL   |
| `http-server` | HTTP server wrapped with Lambda Web Adapter    | Lambda + Web Adapter layer |
| `edge`        | Edge function for low-latency global execution | Lambda@Edge                |

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
  RouteBehavior,
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
  compute: {},
  staticAssets: { directory: './dist' },
  routes: [{ pattern: '/*', target: 'static' }],
};

const hosting = new AmplifyHostingConstruct(stack, 'Hosting', {
  manifest,
  staticAssetPath: './dist',
});

// Access created resources for composition with other constructs
console.log(hosting.distributionUrl); // https://d111111abcdef8.cloudfront.net
console.log(hosting.bucket.bucketName); // auto-generated bucket name
```

### Next.js SSR Example (Vanilla CDK)

```typescript
import { App, Stack } from 'aws-cdk-lib';
import { AmplifyHostingConstruct } from '@aws-amplify/hosting/constructs';
import { nextjsAdapter } from '@aws-amplify/hosting/adapters';

const app = new App();
const stack = new Stack(app, 'MyNextjsStack', {
  env: { account: '123456789012', region: 'us-east-1' },
});

// Run the OpenNext adapter to produce a DeployManifest
const manifest = nextjsAdapter({ projectDir: process.cwd() });

new AmplifyHostingConstruct(stack, 'Hosting', {
  manifest,
  compute: {
    memorySize: 1024,
    timeout: 60,
  },
});
```

The Next.js adapter uses `@opennextjs/aws` internally to process the build output and produces a manifest with:

- Native Lambda handlers (no Web Adapter wrapper needed)
- ISR cache configuration (S3 + DynamoDB + SQS)
- Image optimization Lambda
- Middleware edge function (if applicable)

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

The construct is driven by a `DeployManifest`. Built-in adapters (`spaAdapter`, `nextjsAdapter`) process framework build output and produce this manifest. You can write your own adapter for any framework (Astro, Remix, SvelteKit, etc.).

**Skeleton adapter for a custom framework:**

```typescript
import * as fs from 'fs';
import * as path from 'path';
import type { DeployManifest, RouteBehavior } from '@aws-amplify/hosting';

/**
 * Custom adapter for Astro (example).
 * Scans Astro's build output and returns a DeployManifest.
 */
export const astroAdapter = (
  buildOutputDir: string,
  _projectDir: string,
): DeployManifest => {
  if (!fs.existsSync(buildOutputDir)) {
    throw new Error(`Build output not found at ${buildOutputDir}`);
  }

  const hasServerDir = fs.existsSync(path.join(buildOutputDir, 'server'));
  const routes: RouteBehavior[] = [];

  // Static assets with aggressive caching
  routes.push({
    pattern: '/_astro/*',
    target: 'static',
  });

  if (hasServerDir) {
    // SSR: catch-all goes to compute
    routes.push({ pattern: '/*', target: 'server' });

    return {
      version: 1,
      compute: {
        server: {
          type: 'handler',
          bundle: path.join(buildOutputDir, 'server'),
          handler: 'entry.handler',
          placement: 'regional',
          streaming: true,
          runtime: 'nodejs20.x',
        },
      },
      staticAssets: {
        directory: path.join(buildOutputDir, 'client'),
        cacheControl: 'public, max-age=31536000, immutable',
      },
      routes,
    };
  }

  // Static-only: all routes from S3
  routes.push({ pattern: '/*', target: 'static' });

  return {
    version: 1,
    compute: {},
    staticAssets: { directory: path.join(buildOutputDir, 'client') },
    routes,
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
});
```

The key insight is that **any framework can be supported** by writing an adapter that returns a `DeployManifest`. The construct handles all AWS resource creation (S3, CloudFront, Lambda, OAC, etc.) based on the manifest.

## Troubleshooting

### Build fails but error message is unclear

Run your build command locally (`npm run build`) to see full output. The deploy shows first 1000 + last 1000 characters.

### CloudFront returns 403

This should not happen with the OAC bucket policy. If it does, check that the S3 bucket policy includes the CloudFront distribution ARN.

### Deploy takes very long

First deploy creates a CloudFront distribution (~15-20 min). Subsequent deploys are faster (~5 min).

### ISR pages are not revalidating

Ensure your Next.js app uses the App Router with `revalidateTag()` or `revalidatePath()`. Pages Router ISR (`revalidate: N` in `getStaticProps`) is also supported via time-based revalidation.

### Image optimization returns 500

Check that the image optimization Lambda has sufficient memory (default: 512MB). Large images may require 1024MB+. Increase via the `compute` configuration.
