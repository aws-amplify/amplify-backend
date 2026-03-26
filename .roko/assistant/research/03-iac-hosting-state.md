# IAC-Hosting Branch State & Amplify Backend Hosting Infrastructure Research

## Executive Summary

The `iac-hosting` branch is **currently at the same commit as `main`** (commit `4e761a418f`), meaning any hosting-specific work previously on that branch has been merged. The amplify-backend monorepo follows a clear pattern for resource definitions through `defineAuth`, `defineData`, `defineStorage`, etc. This document outlines the architecture and patterns needed to implement `defineHosting`.

---

## 1. Current iac-hosting Branch State

### Branch Status
- **Main branch**: `4e761a418f` - feat: add health check failure tracker (#3110)
- **iac-hosting branch**: `4e761a418f` - **SAME COMMIT**
- **Result**: No differences between main and iac-hosting

### Key Recent Commits (Last 30)
```
4e761a418f feat: add health check failure tracker (#3110)
ed27ddf0ea Version Packages (#3123)
67e8773f74 feat: Add `standalone` deployment type (#3132)  ← IMPORTANT
bcaa96c9f9 chore(deps): bump @smithy/config-resolver from 4.1.4 to 4.4.6 (#3115)
3c4698471f fix: Add `amplifyconfig` alias in gen1 Dart output for backwards compatibility (#3121)
```

### Notable Finding
Commit `67e8773f74` added support for **`standalone` deployment type**, which is critical for our hosting work. This indicates the infrastructure already supports the three deployment types we need.

---

## 2. DeploymentType Infrastructure

### Current DeploymentType Enum
**Location**: `packages/plugin-types/src/deployment_type.ts`

```typescript
export type DeploymentType = 'branch' | 'sandbox' | 'standalone';
```

### BackendIdentifier Structure
**Location**: `packages/plugin-types/src/backend_identifier.ts`

Three discriminated union types:
1. **Branch Backend** (`type: 'branch'`)
   - `namespace`: AppId
   - `name`: BranchName
   - `type`: 'branch'
   - `hash?`: optional hash for stack naming

2. **Sandbox Backend** (`type: 'sandbox'`)
   - `namespace`: ProjectName
   - `name`: SandboxName
   - `type`: 'sandbox'
   - `hash?`: optional hash

3. **Standalone Backend** (`type: 'standalone'`)
   - `namespace`: ProjectName
   - `name`: BranchName
   - `type`: 'standalone'
   - `hash?`: optional hash

### Context Usage
The deployment type is stored in CDK context:
```typescript
// From packages/platform-core/src/cdk_context_key.ts
export enum CDKContextKey {
  DEPLOYMENT_TYPE = 'amplify-backend-type',
  // ... other keys
}
```

Used throughout the codebase:
```typescript
const deploymentType: DeploymentType = scope.node.getContext(
  CDKContextKey.DEPLOYMENT_TYPE
);
```

---

## 3. The defineBackend Pattern

### Core Architecture

**Location**: `packages/backend/src/backend_factory.ts`

```typescript
export const defineBackend = <T extends DefineBackendProps>(
  constructFactories: T,
): Backend<T> => {
  const backend = new BackendFactory(constructFactories);
  return {
    ...backend.resources,
    createStack: backend.createStack,
    addOutput: backend.addOutput,
    stack: backend.stack,
  };
};
```

### BackendFactory Class Responsibilities
1. **Attribution Metadata Storage** - Tags stacks with Amplify metadata
2. **Stack Resolution** - Manages nested stacks via `NestedStackResolver`
3. **Construct Container** - `SingletonConstructContainer` for dependency injection
4. **Output Storage** - `StackMetadataBackendOutputStorageStrategy` for backend outputs
5. **Branch Linker** - Automatically enabled for `type: 'branch'` deployments
6. **Resource Registration** - Iterates through construct factories and instantiates them

### Usage Example
```typescript
// From packages/integration-tests/src/test-projects/hosting-test-app/amplify/backend.ts
import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource.js';
import { data } from './data/resource.js';

defineBackend({
  auth,
  data,
  // hosting would go here
});
```

---

## 4. The defineAuth/defineData Pattern

### Factory Pattern Structure

**Core Interface**: `packages/plugin-types/src/construct_factory.ts`

```typescript
export type ConstructFactory<T extends ResourceProvider = ResourceProvider> = {
  readonly provides?: string;  // Registration token (e.g., 'AuthResources')
  getInstance: (props: ConstructFactoryGetInstanceProps) => T;
};
```

### defineAuth Implementation

**Location**: `packages/backend-auth/src/factory.ts`

```typescript
export const defineAuth = (
  props: AmplifyAuthProps,
): ConstructFactory<BackendAuth> =>
  new AmplifyAuthFactory(props, new Error().stack);
```

### Factory Class Pattern
```typescript
class AmplifyAuthFactory implements ConstructFactory<BackendAuth> {
  readonly provides = 'AuthResources';  // Registration token
  
  constructor(
    private readonly props: AmplifyAuthProps,
    private readonly importStack = new Error().stack,
  ) {
    // Singleton enforcement
    if (AmplifyAuthFactory.factoryCount > 0) {
      throw new AmplifyUserError('MultipleSingletonResourcesError', {
        message: 'Multiple `defineAuth` calls are not allowed',
        resolution: 'Remove all but one `defineAuth` call',
      });
    }
    AmplifyAuthFactory.factoryCount++;
  }
  
  getInstance = (props: ConstructFactoryGetInstanceProps): BackendAuth => {
    const { constructContainer, importPathVerifier, resourceNameValidator } = props;
    
    // Validate import path
    importPathVerifier?.verify(
      this.importStack,
      path.join('amplify', 'auth', 'resource'),
      'Amplify Auth must be defined in amplify/auth/resource.ts',
    );
    
    // Lazy instantiation via container
    if (!this.generator) {
      this.generator = new AmplifyAuthGenerator(this.props, props);
    }
    return constructContainer.getOrCompute(this.generator) as BackendAuth;
  };
}
```

### Generator Pattern
```typescript
class AmplifyAuthGenerator implements ConstructContainerEntryGenerator {
  readonly resourceGroupName: AmplifyResourceGroupName = 'auth';
  
  generateContainerEntry = ({
    scope,
    backendSecretResolver,
    ssmEnvironmentEntriesGenerator,
    stableBackendIdentifiers,
  }: GenerateContainerEntryProps) => {
    // Instantiate the actual CDK construct
    const authConstruct = new AmplifyAuth(scope, this.name, authProps);
    
    // Add tags
    Tags.of(authConstruct).add(TagName.FRIENDLY_NAME, this.name);
    
    // Return with resource access mixins
    return {
      ...authConstruct,
      getResourceAccessAcceptor: (roleIdentifier) => ({ ... }),
      stack: Stack.of(authConstruct),
    };
  };
}
```

### Key Patterns to Follow
1. **Singleton enforcement** in factory constructor
2. **Import path validation** via `importPathVerifier`
3. **Resource name validation** via `resourceNameValidator`
4. **Lazy instantiation** through `ConstructContainerEntryGenerator`
5. **ResourceProvider pattern** - return object with `resources` property
6. **Resource access** - optional `getResourceAccessAcceptor` for IAM policies
7. **Stack provider** - include `stack: Stack` property

---

## 5. ResourceProvider Pattern

**Location**: `packages/plugin-types/src/resource_provider.ts`

```typescript
export type ResourceProvider<T extends object = object> = {
  resources: T;
};
```

### Auth Example
```typescript
export type BackendAuth = ResourceProvider<AuthResources> &
  ResourceAccessAcceptorFactory<AuthRoleName | string> &
  StackProvider;
```

This means `BackendAuth` returns:
- `resources: AuthResources` - The underlying CDK constructs
- `getResourceAccessAcceptor()` - For IAM access policies
- `stack: Stack` - The stack containing the construct

---

## 6. Hosting-Related Code Search Results

### Existing Hosting Tests
**Location**: `packages/integration-tests/src/test-e2e/hosting.test.ts`
- Tests Amplify Hosting integration with amplify-backend
- Uses pre-configured Amplify App named `hosting-test-app`
- Tests branch deployments and builds

**Test App Structure**:
```
packages/integration-tests/src/test-projects/hosting-test-app/
├── amplify/
│   ├── auth/resource.ts
│   ├── data/resource.ts
│   ├── backend.ts
│   └── test_factories.ts
└── package.json
```

### No Existing defineHosting Found
Searches for:
- `defineHosting` - **Not found**
- `hosting` patterns - Only test files
- CloudFront/S3/WAF/SSR - Only in test data, no constructs

**Conclusion**: No hosting construct implementation exists yet. This is greenfield work.

---

## 7. Monorepo Package Structure

### Backend Category Packages
```
packages/
├── backend/              # Core backend package with defineBackend
├── backend-auth/         # defineAuth implementation
├── backend-data/         # defineData implementation
├── backend-storage/      # defineStorage implementation
├── backend-function/     # defineFunction implementation
├── backend-ai/           # defineConversation implementation
├── auth-construct/       # Low-level auth CDK constructs
├── data-construct/       # Low-level data CDK constructs
└── plugin-types/         # Shared interfaces
```

### Package Dependency Pattern
Each backend-* package:
1. Depends on `@aws-amplify/plugin-types`
2. Depends on `@aws-amplify/backend-output-storage`
3. Depends on `@aws-amplify/backend-output-schemas`
4. May have a companion `-construct` package with low-level CDK constructs

### Suggested Hosting Package Structure
```
packages/
├── backend-hosting/          # NEW - defineHosting implementation
│   ├── src/
│   │   ├── factory.ts        # AmplifyHostingFactory & defineHosting
│   │   ├── types.ts          # HostingProps interfaces
│   │   └── index.ts          # Public exports
│   ├── package.json
│   └── tsconfig.json
│
└── hosting-construct/        # OPTIONAL - Low-level CDK constructs
    ├── src/
    │   ├── construct.ts      # AmplifyHosting L3 construct
    │   ├── cloudfront.ts     # CloudFront configuration
    │   ├── s3.ts             # S3 bucket setup
    │   └── waf.ts            # WAF rules (optional)
    └── package.json
```

---

## 8. Integration with defineBackend

### Current Exports
**Location**: `packages/backend/src/index.ts`

```typescript
export { defineBackend } from './backend_factory.js';

// re-export core functionality from category packages
export { defineData } from '@aws-amplify/backend-data';
export { defineAuth } from '@aws-amplify/backend-auth';
export { defineStorage } from '@aws-amplify/backend-storage';
export { defineFunction } from '@aws-amplify/backend-function';
```

### Proposed Addition
```typescript
// hosting
export { defineHosting } from '@aws-amplify/backend-hosting';
```

### Expected Usage
```typescript
// amplify/hosting/resource.ts
import { defineHosting } from '@aws-amplify/backend';

export const hosting = defineHosting({
  platform: 'static',  // or 'nextjs' | 'react'
  
  distribution: {
    customDomain: {
      domainName: 'example.com',
      certificateArn: '...',
    },
  },
  
  outputs: {
    format: 'amplify',  // Auto-generate outputs for Amplify client
  },
});

// amplify/backend.ts
import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource.js';
import { data } from './data/resource.js';
import { hosting } from './hosting/resource.js';

defineBackend({
  auth,
  data,
  hosting,  // ← NEW
});
```

---

## 9. Key Interfaces to Implement

### ConstructFactory
```typescript
export type ConstructFactory<T extends ResourceProvider> = {
  readonly provides?: string;
  getInstance: (props: ConstructFactoryGetInstanceProps) => T;
};
```

### ResourceProvider
```typescript
export type ResourceProvider<T extends object = object> = {
  resources: T;
};
```

### ConstructFactoryGetInstanceProps
```typescript
export type ConstructFactoryGetInstanceProps = {
  constructContainer: ConstructContainer;
  outputStorageStrategy: BackendOutputStorageStrategy<BackendOutputEntry>;
  importPathVerifier?: ImportPathVerifier;
  resourceNameValidator?: ResourceNameValidator;
};
```

### ConstructContainerEntryGenerator
```typescript
export type ConstructContainerEntryGenerator = {
  readonly resourceGroupName: string;
  generateContainerEntry: (props: GenerateContainerEntryProps) => ResourceProvider;
};
```

---

## 10. Recommended Implementation Plan

### Phase 1: Package Setup
1. Create `packages/backend-hosting/` with package.json
2. Add to workspace and TypeScript project references
3. Set up dependencies:
   - `@aws-amplify/plugin-types`
   - `@aws-amplify/backend-output-storage`
   - `@aws-amplify/backend-output-schemas`
   - `aws-cdk-lib`

### Phase 2: Core Factory
1. Implement `AmplifyHostingFactory` class
   - Singleton enforcement
   - Import path validation
   - Resource name validation
2. Implement `AmplifyHostingGenerator`
   - `resourceGroupName: 'hosting'`
   - `generateContainerEntry()` method
3. Export `defineHosting()` function

### Phase 3: CDK Constructs
Option A: Inline in backend-hosting (simpler for MVP)
Option B: Separate `hosting-construct` package (cleaner separation)

Constructs needed:
- S3 Bucket for hosting
- CloudFront Distribution
- Origin Access Identity
- Optional: WAF rules
- Optional: Custom domain with ACM certificate

### Phase 4: Output Schema
Add to `packages/backend-output-schemas/`:
```typescript
export type HostingOutput = {
  version: '1';
  payload: {
    distributionDomain: string;
    bucketName: string;
    customDomain?: string;
  };
};
```

### Phase 5: Integration
1. Add re-export in `packages/backend/src/index.ts`
2. Add to backend package dependencies
3. Update TypeScript types in Backend<T>

---

## 11. DeploymentType Considerations

### Behavior by Type

**Branch** (`type: 'branch'`)
- Connected to Amplify Hosting branch
- Automatic builds on git push
- Branch linker enabled
- Hosting integrated with CI/CD

**Sandbox** (`type: 'sandbox'`)
- Local development environment
- Quick iterations
- Hosting might deploy to S3 only (no CloudFront cache for faster updates)

**Standalone** (`type: 'standalone'`)
- Manual deployments via `ampx deploy`
- No Amplify Hosting connection
- Full CloudFront + S3 setup

### Implementation Note
The hosting construct should adapt its behavior based on `DeploymentType`:
```typescript
const deploymentType = scope.node.getContext(CDKContextKey.DEPLOYMENT_TYPE);

if (deploymentType === 'sandbox') {
  // Simplified hosting for fast dev iterations
} else {
  // Full CloudFront + S3 with caching
}
```

---

## 12. Backend Output Strategy

### Current Pattern
All resource definitions use `BackendOutputStorageStrategy` to store outputs:

```typescript
// From packages/backend-output-storage/src/store_attribution_metadata.ts
const deploymentType: DeploymentType = stack.node.tryGetContext(
  CDKContextKey.DEPLOYMENT_TYPE
);

// Store outputs based on deployment type
outputStorageStrategy.addBackendOutputEntry('hosting', {
  version: '1',
  payload: {
    distributionDomain: distribution.domainName,
    bucketName: bucket.bucketName,
  },
});
```

### Platform Output
The core backend already stores platform info:
```typescript
// From packages/backend/src/backend_factory.ts
outputStorageStrategy.addBackendOutputEntry(platformOutputKey, {
  version: '1',
  payload: {
    deploymentType: backendId.type,
    region: stack.region,
  },
});
```

---

## 13. Testing Requirements

### Integration Test Structure
Follow existing pattern in `packages/integration-tests/src/test-projects/`:
```
test-projects/
└── hosting-static-site/
    ├── amplify/
    │   ├── hosting/
    │   │   └── resource.ts       # defineHosting({ platform: 'static' })
    │   ├── backend.ts
    │   └── package.json
    └── src/
        └── index.html
```

### Test Cases
1. **Static Site Hosting**
   - Deploy simple HTML/CSS/JS
   - Verify S3 bucket created
   - Verify CloudFront distribution
   - Check outputs match schema

2. **SSR Framework (Future)**
   - Next.js app
   - Lambda@Edge or Lambda function URL
   - Dynamic routing

3. **Custom Domain**
   - ACM certificate
   - Route53 records
   - HTTPS redirect

---

## 14. Open Questions & Next Steps

### Open Questions
1. Should we create a separate `hosting-construct` package or inline CDK constructs?
   - **Recommendation**: Start inline, extract later if needed
   
2. What platforms should MVP support?
   - **Recommendation**: `static` only for MVP, add SSR frameworks later
   
3. How should we handle custom domains?
   - **Recommendation**: Optional prop, require users to provide ACM cert ARN

4. Do we need WAF integration?
   - **Recommendation**: Not for MVP, add as optional feature later

### Next Steps
1. ✅ Research complete - document created
2. ⏭️ Create `backend-hosting` package structure
3. ⏭️ Implement `AmplifyHostingFactory` and `defineHosting`
4. ⏭️ Create basic S3 + CloudFront construct
5. ⏭️ Add output schema
6. ⏭️ Write integration tests
7. ⏭️ Update main backend package to re-export

---

## 15. Key Files Reference

### Must Read
- `packages/backend/src/backend_factory.ts` - Core backend implementation
- `packages/backend-auth/src/factory.ts` - Reference factory pattern
- `packages/plugin-types/src/construct_factory.ts` - Factory interface
- `packages/plugin-types/src/backend_identifier.ts` - BackendIdentifier types
- `packages/plugin-types/src/deployment_type.ts` - DeploymentType enum

### Package Examples
- `packages/backend-storage/` - Similar category package (storage)
- `packages/backend-function/` - Another category example
- `packages/integration-tests/src/test-projects/hosting-test-app/` - Existing hosting test

### Testing References
- `packages/integration-tests/src/test-e2e/hosting.test.ts` - E2E hosting tests
- `packages/integration-tests/src/define_backend_template_harness.ts` - Test harness

---

## Conclusion

The amplify-backend monorepo has a well-established pattern for resource definitions. The `iac-hosting` branch has been merged into main, and the infrastructure (including the `standalone` deployment type) is ready for hosting support.

The next step is to create the `packages/backend-hosting` package following the `defineAuth`/`defineData` pattern:
1. Factory class with singleton enforcement
2. Generator class implementing `ConstructContainerEntryGenerator`
3. CDK constructs for S3 + CloudFront
4. Output schema for distribution domain and bucket name
5. Integration with `defineBackend` via re-exports

**Estimated lines for MVP**: ~800-1200 lines across factory, generator, constructs, types, and tests.
