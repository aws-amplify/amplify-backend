# @aws-amplify/backend

## 0.2.0-alpha.12

### Patch Changes

- 47456c26: Remove ESM features from construct dependency packages and make corresponding updates in consumer packages
- Updated dependencies [47456c26]
- Updated dependencies [47456c26]
  - @aws-amplify/backend-output-storage@0.2.0-alpha.6
  - @aws-amplify/backend-output-schemas@0.2.0-alpha.8
  - @aws-amplify/platform-core@0.1.1-alpha.4

## 0.2.0-alpha.11

### Patch Changes

- 8f99476e: chore: upgrade aws-cdk to 2.103.0
- Updated dependencies [8f99476e]
  - @aws-amplify/backend-output-storage@0.2.0-alpha.5
  - @aws-amplify/plugin-types@0.2.0-alpha.11

## 0.2.0-alpha.10

### Patch Changes

- Updated dependencies [18874854]
- Updated dependencies [883d9da7]
  - @aws-amplify/plugin-types@0.2.0-alpha.10
  - @aws-amplify/backend-output-schemas@0.2.0-alpha.7
  - @aws-amplify/backend-output-storage@0.2.0-alpha.4

## 0.2.0-alpha.9

### Patch Changes

- 755badc2: Upgrade aws-cdk-lib to have cdk custom resource provider run node 18
- Updated dependencies [915c0325]
  - @aws-amplify/platform-core@0.1.1-alpha.3

## 0.2.0-alpha.8

### Patch Changes

- 642e8d55: Remove grantPermission API from backend-secret
- Updated dependencies [642e8d55]
  - @aws-amplify/backend-secret@0.2.0-alpha.5

## 0.2.0-alpha.7

### Patch Changes

- 59f5ea24: chore: upgrade aws-cdk to 2.100.0
- Updated dependencies [59f5ea24]
  - @aws-amplify/backend-output-storage@0.1.1-alpha.3
  - @aws-amplify/backend-secret@0.2.0-alpha.4
  - @aws-amplify/plugin-types@0.2.0-alpha.9

## 0.2.0-alpha.6

### Minor Changes

- 2216d37d: 1. Remove version from the backend secret feature. 2. Use max(secret_last_updated) to trigger secret fetcher.

### Patch Changes

- 36d93e46: add license to package.json
- Updated dependencies [2216d37d]
- Updated dependencies [36d93e46]
  - @aws-amplify/backend-secret@0.2.0-alpha.2
  - @aws-amplify/backend-output-schemas@0.2.0-alpha.5
  - @aws-amplify/backend-output-storage@0.1.1-alpha.2
  - @aws-amplify/platform-core@0.1.1-alpha.1
  - @aws-amplify/plugin-types@0.2.0-alpha.7

## 0.2.0-alpha.5

### Minor Changes

- dc22fdf4: Integrate secret to Auth

### Patch Changes

- 98b17069: Provides sandbox secret CLI commands
- 0398b8e1: Bump graphql construct to 0.9.0 and remove some interface cruft
- baa7a905: Move types package from peer deps to deps
- 34c3fd38: Update backend definition file path convention
- f6618771: add deployment type to stack outputs
- 512f0778: move UniqueBackendIdentifier to platform-core package
- Updated dependencies [98b17069]
- Updated dependencies [0398b8e1]
- Updated dependencies [baa7a905]
- Updated dependencies [dc22fdf4]
- Updated dependencies [f6618771]
- Updated dependencies [512f0778]
  - @aws-amplify/backend-secret@0.2.0-alpha.1
  - @aws-amplify/backend-output-storage@0.1.1-alpha.1
  - @aws-amplify/plugin-types@0.2.0-alpha.6
  - @aws-amplify/backend-output-schemas@0.2.0-alpha.4
  - @aws-amplify/platform-core@0.1.1-alpha.0

## 0.2.0-alpha.4

### Minor Changes

- 407a09ff: Implements backend secret feature, include backend secret resolver and the backend-secret pkg.

### Patch Changes

- 9091c2bf: Fix import path verification on windows
- 1dada824: chore: Update eslint config to new flat config type
- f75fa531: Refactor OutputStorageStrategy into stateless shared dependency
- Updated dependencies [ac3df080]
- Updated dependencies [53779253]
- Updated dependencies [1dada824]
- Updated dependencies [407a09ff]
- Updated dependencies [b4f82717]
- Updated dependencies [05f97b26]
- Updated dependencies [f75fa531]
  - @aws-amplify/backend-output-schemas@0.2.0-alpha.3
  - @aws-amplify/backend-output-storage@0.1.1-alpha.0
  - @aws-amplify/backend-secret@0.2.0-alpha.0
  - @aws-amplify/plugin-types@0.1.1-alpha.5

## 0.1.1-alpha.3

### Patch Changes

- Updated dependencies [ce008a2]
- Updated dependencies [f201c94]
  - @aws-amplify/backend-output-schemas@0.2.0-alpha.2
  - @aws-amplify/plugin-types@0.1.1-alpha.3

## 0.1.1-alpha.2

### Patch Changes

- b2b0c2d: force version bump
- Updated dependencies [b2b0c2d]
- Updated dependencies [395c8f0]
  - @aws-amplify/backend-output-schemas@0.1.1-alpha.1
  - @aws-amplify/plugin-types@0.1.1-alpha.2

## 0.1.1-alpha.1

### Patch Changes

- 3bda96f: update methods to use arrow notation
- Updated dependencies [2ef006f]
- Updated dependencies [3bda96f]
  - @aws-amplify/plugin-types@0.1.1-alpha.1

## 0.1.1-alpha.0

### Patch Changes

- 7296e9d: Initial publish
- Updated dependencies [7296e9d]
  - @aws-amplify/backend-output-schemas@0.1.1-alpha.0
  - @aws-amplify/plugin-types@0.1.1-alpha.0
