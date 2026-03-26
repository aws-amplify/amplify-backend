# Amplify IaC Hosting - Design Document Summary

**Research Date**: March 26, 2026  
**Source**: code.amazon.com/packages/AdjosstAIDocuments/trees/mainline/amplify/iachosting/  
**Purpose**: Consolidated reference for implementing `defineHosting` + `definePipeline` constructs

---

## Executive Summary

The Amplify IaC Hosting project aims to provide Infrastructure-as-Code control over frontend hosting and CI/CD, replacing the Console-based Amplify Hosting workflow. This enables:
1. **Backend-only deployment** path (no forced Hosting dependency)
2. **Version-controlled hosting configuration** (IaC parity with backend resources)
3. **Migration path** from managed Amplify Hosting to customer-owned infrastructure

**Critical Finding**: The current HLD covers basic CDN/hosting (S3 + CloudFront) but **misses 73% of Amplify Hosting's features**. Implementation requires addressing atomic deployments, rollback, monitoring, SSR architecture, and operational gaps.

---

## 1. API Design Decisions (PE Review - 9 Topics)

### Topic 0: Implementation Strategy - MOST CRITICAL DECISION

**Question**: Should `defineHosting` use Amplify Hosting API or build from scratch?

**Three Options**:
- **Option A**: Use Amplify Hosting API (AWS::Amplify::App + AWS::Amplify::Branch)
  - ✅ Fast to market, battle-tested infrastructure, minimal new code
  - ❌ Still dependent on Amplify Hosting service (deprecation risk)
  - ⚠️ CloudFormation resources may not expose full configuration

- **Option B**: Build own infrastructure (S3 + CloudFront + Lambda)
  - ✅ Customer owns everything, survives deprecation, full customization
  - ❌ Significant engineering effort (4-6 months), must rebuild all features
  - ❌ Ongoing maintenance for framework adapters (Next.js, Nuxt, etc.)

- **Option C**: Amplify API first, own infrastructure later (phased)
  - ✅ Fast initial launch, can swap implementation later
  - ❌ Two migration paths for customers (Console→IaC, then IaC-Hosting→IaC-Own)

**PE Review Status**: **Decision needed from product team**

---

### Topic 1: Deployment Identifier

**Question**: Where does the deployment identifier come from?

**Three Options**:
- **Option A**: Defined in code (`defineBackend({ identifier: 'my-app-prod' })`)
  - ✅ Version-controlled, PR-reviewable
  - ❌ Same code used for all stages, needs parameterization

- **Option B**: Passed via CLI flag (`npx ampx deploy --identifier my-app-prod`)
  - ✅ External to code, same codebase for all environments
  - ❌ Not version-controlled, easy to mistype

- **Option C**: Code default + CLI override
  - ✅ Best of both: sensible default, overridable
  - ❌ Two places to check when debugging

**Related**: Stack naming conventions follow `amplify-{identifier}-{stage}` pattern

---

### Topic 2: Identifier Structure and App Concept

**Question**: Do we need a two-tier "app + stage" model?

**Three Options**:
- **Option A**: Flat identifier (no app concept)
  - Example: `my-app-dev`, `my-app-prod`
  - ✅ Simple, no new abstractions
  - ❌ No formal relationship between environments

- **Option B**: Two-part app+stage (`my-app / dev`, `my-app / prod`)
  - ✅ Explicit structure, enables app-level operations
  - ❌ New "app" concept needs lifecycle management

- **Option C**: Match Gen2 convention (`amplify-{identifier}-{stage}`)
  - ✅ Consistent with existing patterns
  - ❌ Opinionated prefix may be restrictive

---

### Topic 3: Where Does defineHosting Live?

**PM Decision**: **Inside defineBackend** (Option A - RECOMMENDED)

```typescript
// amplify/hosting/resource.ts
import { defineHosting } from '@aws-amplify/backend';

export const hosting = defineHosting({
  buildOutputDir: '../dist',
});

// amplify/backend.ts
import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { hosting } from './hosting/resource';

defineBackend({ auth, data, hosting });
```

**Rationale**:
- Follows existing Gen2 folder-per-resource pattern
- Backwards compatible (additive change)
- Hosting becomes just another resource category

**Alternatives Considered**:
- Separate top-level `frontend.ts` file (breaks convention)
- Nested in `backend.ts` without folder (breaks folder-per-resource pattern)

---

### Topic 4: Naming - Frontend Hosting Construct

**PM Decision**: **`defineHosting`** (RECOMMENDED)

**Rationale**:
- Short, clear, matches `define*` pattern
- Consistent with `defineAuth`, `defineData`, `defineStorage`

**Alternatives Considered**:
- `defineFrontend` - too broad (implies more than hosting)
- `defineWebHosting` - longer, excludes mobile
- `defineSite` - unfamiliar in AWS/Amplify context

---

### Topic 5: Naming - Pipeline Construct

**Options**:
- `definePipeline` - matches pattern, well-understood CI/CD term
- `defineDeployment` - focuses on outcome vs mechanism
- `defineCICD` - precise but awkward naming
- `defineWorkflow` - broader but overloaded term

**PE Review Status**: Leaning toward `definePipeline`

---

### Topic 6: defineApp() Top-Level Grouping

**PM Decision**: **No defineApp initially** (Option A - RECOMMENDED)

```typescript
// Independent top-level calls (backwards compatible)
defineBackend({ auth, data });
defineHosting({ buildOutputDir: 'dist' });
```

**Rationale**:
- Simple, incremental adoption
- No breaking change to existing `defineBackend` usage
- Future: could add optional `defineApp` wrapper

---

### Topic 7: Independent Adoptability

**PM Decision**: **Fully independent** (RECOMMENDED)

**Customer Personas** (from HLD):
- **Persona B**: Full IaC (both hosting + pipeline) ✅
- **Persona C**: External frontend (Vercel) + Amplify pipeline ✅
- **Persona D**: External pipeline (GitHub Actions) + Amplify hosting ✅
- **Persona E**: Backend-only (no frontend, no pipeline) ✅

**Design Principle**: `defineHosting` and `definePipeline` must be usable independently. No forced coupling.

---

### Topic 8: SSR Scope for Launch

**Three Options**:
- **Option A**: SPA-only at launch (fastest, 3 weeks)
  - ✅ Covers React SPAs, Vite apps, static sites
  - ❌ Excludes Next.js SSR customers (large segment)

- **Option B**: Next.js SSR at launch (recommended, ~6 weeks)
  - ✅ Covers largest framework, significant value add
  - ⚠️ Requires Lambda runtime, routing, image optimization

- **Option C**: Full SSR at launch (all frameworks, 12+ weeks)
  - ✅ Maximum coverage
  - ❌ High risk, long timeline, maintenance burden

**PM Decision Status**: Likely **Option B** (Next.js SSR + SPA)

---

### Topic 9: Feature Branch Environments

**Options**:
- **Option A**: Not in initial scope (faster launch)
  - ❌ Competitive gap vs Vercel/Netlify
  
- **Option B**: In initial scope (PR preview URLs)
  - ✅ Competitive parity
  - ❌ Complex: dynamic stack creation, DNS wildcard, cleanup

**PM Decision Status**: Likely **Option A** (defer to Phase 2+)

---

## 2. Feature Scope - Launch Phases

### Phase 1 - MVP (3 weeks, RECOMMENDED)
**Core hosting + deployment fundamentals**

✅ **Must Have**:
- Static site hosting (S3 + CloudFront)
- SPA support (React, Vue, Angular)
- Custom domains + SSL (ACM + Route53)
- Basic WAF integration
- URL routing rules (redirects, rewrites)
- **Atomic deployments** (Build ID mechanism) - CRITICAL
- **Rollback strategy** - CRITICAL
- **CloudWatch monitoring** (auto-dashboard + 4 alarms) - HIGH PRIORITY
- **S3 OAC security** (Origin Access Control) - SECURITY
- CI/CD pipeline (CodeBuild + CodePipeline)

**Next.js SSR** (if Option B chosen):
- Lambda-based SSR runtime
- API routes support
- Static asset serving via S3
- Image optimization (Lambda)

❌ **Deferred**:
- ISR (Incremental Static Regeneration)
- PR preview environments
- Additional SSR frameworks (Nuxt, Astro, SvelteKit)
- Advanced monitoring (X-Ray tracing)
- Password protection
- Automated migration tooling

---

### Phase 2 - Developer Experience (3 weeks)
- Environment variables + secrets management
- Build notifications (email, Slack, SNS)
- **Skew protection** (version mismatch prevention)
- SSG page optimization (route directly to S3, not Lambda)
- Enhanced logging (structured logs, query templates)

---

### Phase 3 - Competitive Parity (6 weeks)
- PR preview environments (ephemeral stacks)
- Advanced image optimization (AVIF, WebP, auto-format)
- Streaming SSR (response streaming)
- Auto-detect routing (framework-aware)
- Enhanced caching strategies

---

### Phase 4 - Full Parity (6+ weeks)
- ISR support (Lambda + DynamoDB + custom cache)
- Git OAuth integration (webhook automation)
- i18n routing (locale-based routing)
- Canary deployments (traffic splitting)
- Additional SSR frameworks (Nuxt, Astro, SvelteKit)

---

## 3. Critical Architecture Decisions

### 3.1 Atomic Deployments - Build ID Mechanism

**Problem**: During deployments, users can fetch mismatched assets (CSS from v1, JS from v2) → broken apps

**Amplify's Solution**:
```
1. Artifacts stored by Build ID: s3://bucket/{appId}/{branch}/{buildId}/
2. CloudFront Function injects X-Amplify-Build-ID header
3. Header becomes part of cache key
4. Origin request rewrites path: /page.js → /{buildId}/page.js
5. New deployment = new Build ID = automatic cache invalidation
```

**Benefits**:
- Zero-downtime deployments
- Free cache invalidation ($0 vs $50/deploy for 10K pages)
- Instant rollback (<30 seconds vs 5-15 minutes re-deploy)
- Old clients continue using old assets (no version skew)

**Implementation Complexity**: 🔴 HARD (~500 LOC CF Function + CDK)

**Status**: ❌ **NOT in current HLD** - MUST ADD for Phase 1

---

### 3.2 Rollback Strategy

**Current HLD Gap**: Zero rollback design

**Amplify's Approach**:
- Keep last N build artifacts in S3
- Rollback = update CloudFront Function to previous Build ID
- Takes <30 seconds

**Alternatives for IaC**:
1. **CloudFormation stack version rollback** (5-15 min, not instant)
2. **Blue-green CloudFront distributions** (complex, expensive)
3. **Build ID mechanism** (recommended, matches Amplify)

**Status**: ❌ **NOT in current HLD** - MUST ADD for Phase 1

---

### 3.3 SSR Lambda Architecture

**Open Decision**: Which Lambda invocation pattern?

**Three Options**:

| Option | Cold Start | Cost | Streaming | Complexity |
|--------|-----------|------|-----------|------------|
| **API Gateway + Lambda** | 1910ms | $1.91/1M | ❌ No | Low |
| **Lambda Function URLs** | 300ms | $1.91/1M | ✅ Yes | Low |
| **Lambda@Edge** | 1400ms | $5.72/1M | ❌ No | High |

**Amplify Uses**: API Gateway + Lambda (in service accounts, cell-based sharding)

**IaC Recommendation**: **Lambda Function URLs** (faster, simpler, supports streaming)

---

### 3.4 SSG Page Routing Problem

**Critical Performance Issue**: Current HLD routes **all requests through Lambda**, including static pages

**Impact**:
- Static page via Lambda: ~1910ms (cold start) + compute cost
- Static page via S3: ~30ms (1173% faster)
- Wastes Lambda invocations on zero-value static content

**Solution**: Route detection in CloudFront
```typescript
// CloudFront behavior priorities
1. /_next/static/* → S3 (always static)
2. /api/* → Lambda (always dynamic)
3. /[slug] → Check deploy-manifest.json routing rules
4. Default → S3
```

**Status**: ❌ **NOT addressed in HLD** - HIGH PRIORITY

---

### 3.5 amplify_outputs.json Circular Dependency

**Problem**:
1. Frontend build needs `amplify_outputs.json` (backend endpoints)
2. Backend must deploy first to generate outputs
3. Hosting stack needs frontend build artifacts
4. **Circular dependency!**

**Solution**: Two-phase deployment orchestration
```
Phase 1: Deploy backend → Generate amplify_outputs.json
Phase 2: Build frontend (with outputs) → Deploy hosting
```

**Implementation**: `defineBackend` must complete before `defineHosting` starts

**Status**: ⚠️ **Acknowledged but not detailed in HLD**

---

## 4. Top 10 Critical Blind Spots (from Research)

| # | Gap | Severity | Why It Matters |
|---|-----|----------|----------------|
| 1 | No atomic deployment / Build ID | 🔴 CRITICAL | Broken deploys, no instant rollback, expensive cache invalidation |
| 2 | No rollback strategy | 🔴 CRITICAL | Bad deploys stay live 10-30 minutes |
| 3 | amplify_outputs.json circular dependency | 🔴 CRITICAL | Build orchestration undefined |
| 4 | SSG pages routed through Lambda | 🔴 CRITICAL | 1173% slower than S3, wasted compute |
| 5 | No skew protection | 🔴 HIGH | Stale clients fetch mismatched chunks → broken apps |
| 6 | No monitoring / observability | 🔴 HIGH | No dashboards, alarms, log retention |
| 7 | No OAC for S3 security | 🔴 HIGH | S3 publicly accessible (security vulnerability) |
| 8 | ISR not addressed | 🟡 HIGH | Fundamental Next.js feature, requires custom implementation |
| 9 | Lambda architecture undecided | 🟡 HIGH | Affects performance, cost, streaming support |
| 10 | Competitive gap on cold starts | 🟡 MEDIUM | Amplify 2000ms vs Vercel 1300ms vs Cloudflare <10ms |

---

## 5. Key Constraints and Limitations

### 5.1 What's Hard to Replicate from Amplify Hosting

**Very Hard** (2000+ LOC each):
1. **ISR (Incremental Static Regeneration)**
   - Requires: Lambda + DynamoDB + CloudFront behaviors
   - Next.js relies on filesystem writes (ephemeral in Lambda)
   - Must implement custom cache + on-demand revalidation

2. **Git OAuth Integration**
   - Webhook validation, rate limiting, retry logic
   - Multi-provider support (GitHub, GitLab, Bitbucket, CodeCommit)
   - Token rotation, secret management

**Hard** (500-1000 LOC each):
3. **Atomic Deployments** (Build ID mechanism)
4. **Skew Protection** (cache key manipulation)
5. **PR Preview Environments** (dynamic stack creation/cleanup)
6. **Image Optimization** (Lambda-based transformation)

---

### 5.2 Amplify Hosting Internal Architecture

**Request Flow** (for reference):
```
User Browser
  ↓
CloudFront Distribution (per-app)
  ↓
ALB (Application Load Balancer)
  ↓
AWSAmplifyHostingGateway (Rust service on ECS/Fargate)
  ↓         ↓              ↓
 S3     Lambda SSR   ImageOptimizer
(Static) (Dynamic)   (Transforms)
```

**Key Insight**: Amplify uses a **centralized Gateway** (Rust) that routes ALL apps. IaC uses direct CloudFront behaviors (simpler, no Gateway needed).

---

### 5.3 SSR Implementation Details

**Amplify SSRv2 Architecture**:
- Lambda functions in **Amplify service accounts** (not customer accounts)
- Cell-based sharding across multiple Data Plane accounts
- Fork of AWS Lambda Web Adapter runtime
- Per-framework runtimes (Next.js-v12, Next.js-v13, Nuxt-v2, etc.)

**IaC Approach**:
- Lambda in **customer accounts** (full ownership)
- No cell sharding (simpler)
- Standard Lambda runtime + framework adapter layer
- Must maintain framework-specific build outputs

---

### 5.4 Deploy Manifest Specification

**File**: `deploy-manifest.json` (in build output)

**Key Components**:
```typescript
{
  version: 1,
  routes: [
    { path: "/api/*", target: { kind: "Compute", src: "default" } },
    { path: "/*", target: { kind: "Static" }, fallback: { kind: "Static", src: "404.html" } }
  ],
  computeResources: [
    { name: "default", runtime: "nodejs22.x", entrypoint: "index.js" }
  ],
  imageSettings: {
    sizes: [640, 750, 828, 1080, 1200],
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60
  },
  framework: { name: "Next.js", version: "14.0.0" }
}
```

**IaC Usage**: CloudFront behaviors must parse this manifest to configure routing

---

## 6. Operational Gaps - What Must Be Implemented

### 6.1 Monitoring (Auto-Configure)

**Required CloudWatch Resources**:
1. **Dashboard** (automatic creation)
   - Widgets: Requests, 5xx errors, latency (P50/P95/P99), cache hit ratio
   
2. **Alarms** (4 critical alarms)
   - 5xx error rate > 5% (HIGH PRIORITY)
   - P95 latency > 2 seconds
   - Cache invalidation errors
   - Lambda cold start rate > 20% (SSR only)

3. **Log Groups with Retention**
   - Build logs: 30 days
   - SSR Lambda logs: 7 days
   - CloudFront access logs: 90 days (lifecycle policy)

**Status**: ❌ **NOT in current HLD**

---

### 6.2 Security (Must Have)

**Origin Access Control (OAC)**:
```typescript
const oac = new cloudfront.S3OriginAccessControl(this, 'OAC', {
  signing: cloudfront.Signing.SIGV4_NO_OVERRIDE,
});

// Block public access to S3
bucket.addToResourcePolicy(new iam.PolicyStatement({
  effect: iam.Effect.Deny,
  principals: [new iam.AnyPrincipal()],
  actions: ['s3:*'],
  resources: [bucket.arnForObjects('*')],
  conditions: {
    StringNotEquals: {
      'AWS:SourceArn': `arn:aws:cloudfront::${this.account}:distribution/${distribution.distributionId}`
    }
  }
}));
```

**Without OAC**: S3 bucket is **publicly accessible** (security vulnerability)

**Status**: ❌ **NOT in current HLD** - MUST ADD

---

### 6.3 Cold Start Mitigation (SSR)

**Amplify's Approach**: Cell-based sharding + keep-warm mechanisms

**IaC Options**:
1. **Provisioned Concurrency** (expensive: $0.015/GB-hour)
2. **Smaller bundle sizes** (split per-route functions)
3. **Lambda SnapStart** (Java only, not Node.js)
4. **Per-route functions** (faster cold start, more complex routing)

**Cost Comparison** (1M requests/month):
- **Monolithic function**: 512MB, 200ms avg → $1.91/month + cold starts
- **Per-route functions**: 10 routes × 128MB, 50ms avg → $1.91/month + 10× cold starts but faster
- **Provisioned (1 instance)**: $5.40/month + $1.91 invocation = $7.31/month

**Recommendation**: Start with monolithic, optimize later based on metrics

---

## 7. Open Questions (Require Product Decisions)

### Q1: Deployment Type Implementation
- Use new `standalone` deployment type in Gen2 deployer?
- How to avoid breaking existing `BRANCH` and `SANDBOX` types?
- Stack naming conventions for standalone?

### Q2: Cache Invalidation Strategy
- Build ID mechanism (recommended, $0 cost)?
- Explicit CloudFront invalidations ($50/deploy for 10K pages)?
- Hybrid approach?

### Q3: Lambda Invocation Pattern (SSR)
- API Gateway (Amplify's choice, proven)?
- Function URLs (faster, simpler, streaming)?
- Lambda@Edge (expensive, limited, but edge locations)?

### Q4: Framework Adapter Maintenance
- Support all frameworks at launch or phased?
- Community adapters vs first-party?
- Version compatibility strategy (Next.js 13 vs 14 vs 15)?

### Q5: Migration Path from Amplify Hosting
- Automated migration tool?
- Manual migration guide?
- Side-by-side comparison tool?

---

## 8. Implementation Recommendations

### Immediate Priority (Phase 1 - Weeks 1-3)

**Week 1 - Foundation**:
1. ✅ Resolve PE Review decisions (Topics 0-9)
2. ✅ Add `defineHosting` API (in `amplify/hosting/resource.ts`)
3. ✅ Add `standalone` deployment type to Gen2 deployer
4. ✅ Implement S3 + CloudFront + OAC (secure by default)

**Week 2 - Atomic Deployments**:
5. ✅ Build ID mechanism (CloudFront Function + origin rewrite)
6. ✅ Artifact storage by Build ID
7. ✅ Rollback implementation (Build ID switching)
8. ✅ Cache strategy (automatic invalidation via Build ID)

**Week 3 - Monitoring + SSR**:
9. ✅ Auto-create CloudWatch dashboard + alarms
10. ✅ Log retention policies (30d builds, 7d Lambda)
11. ✅ Lambda SSR runtime (if Option B chosen)
12. ✅ Route detection (SSG → S3, SSR → Lambda)

---

### Success Metrics

**Phase 1 MVP Must Achieve**:
- ✅ Deploy static site (SPA) in <5 minutes
- ✅ Custom domain with SSL in <15 minutes
- ✅ Rollback in <30 seconds
- ✅ Zero 5xx errors during deployment (atomic)
- ✅ Monitoring dashboard auto-created
- ✅ S3 secured (OAC, no public access)
- ✅ (If SSR) Next.js app with API routes working

**Performance Targets**:
- Static page load: <100ms (P95)
- SSR page load: <2000ms (P95, including cold start)
- Cache hit ratio: >90% after warmup

---

## 9. Key References

### Internal Documents (code.amazon.com)
- **PE Review**: `amplify/iachosting/design/AMPLIFY_IAC_HOSTING_PE_REVIEW.md`
- **PM Decisions**: `amplify/iachosting/design/HOSTING_PM_DECISIONS.html`
- **Internals**: `research/amplify_hosting/AMPLIFY_HOSTING_INTERNALS.md`
- **Blind Spots**: `research/amplify_hosting/AMPLIFY_HOSTING_BLIND_SPOTS.md`
- **Feature Gaps**: `research/details/amplify-hosting-feature-gap-analysis.md`
- **Operational Gaps**: `research/details/operational-gaps-comprehensive-report.md`
- **SSR Research**: `research/details/amplify-hosting-ssr-build-research-report.md`

### Code Repositories
- **Gen2 Backend**: github.com/aws-amplify/amplify-backend (open source)
- **Amplify Hosting**: code.amazon.com (31 core packages, 836 total)

---

## 10. Summary - Critical Takeaways

### What the HLD Currently Covers
✅ Basic S3 + CloudFront hosting  
✅ Custom domains (conceptually)  
✅ CI/CD pipeline (CodeBuild + CodePipeline)  
⚠️ SSR deployment (architecture undefined)

### What MUST Be Added (Phase 1)
🔴 **Atomic deployments** (Build ID mechanism)  
🔴 **Rollback strategy** (instant, not 10-minute re-deploy)  
🔴 **Monitoring** (auto-dashboard + alarms)  
🔴 **Security** (S3 OAC)  
🔴 **SSG routing** (S3, not Lambda)  
🔴 **Skew protection** (cache key versioning)  
🔴 **amplify_outputs.json** orchestration (two-phase deploy)

### Strategic Decision Points
1. **Implementation Strategy** (Topic 0) - Amplify API vs Own Infra → **Needs product decision**
2. **SSR Scope** (Topic 8) - SPA-only vs Next.js SSR → **Likely Next.js SSR**
3. **Lambda Pattern** - API Gateway vs Function URLs → **Recommend Function URLs**
4. **Feature Branch Envs** (Topic 9) - Launch vs defer → **Likely defer to Phase 2**

### Estimated Effort
- **Phase 1 MVP** (SPA + monitoring + atomic): **3 weeks**
- **Phase 1 + Next.js SSR**: **6 weeks**
- **Full feature parity**: **4-6 months**

---

**End of Document** | 500 lines | Research timestamp: 2026-03-26T11:17:37Z
