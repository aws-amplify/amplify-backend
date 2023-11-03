# @aws-amplify/backend

## 0.3.0

### Minor Changes

- 457b1662: getConstructFactory no longer throws an error if the factory is not found, and returns undefined instead.

### Patch Changes

- 79a6e09f: Change stackOutputKey to platformOutputKey
- e8a3d179: link branch to app in pipeline deployment
- 79a6e09f: Add aws_project_region to amplifyconfiguration.json
- cb861316: bundle AWS SDK in branch linker lambda
- Updated dependencies [79a6e09f]
- Updated dependencies [457b1662]
- Updated dependencies [79a6e09f]
- Updated dependencies [46e0aad6]
  - @aws-amplify/backend-output-schemas@0.2.1
  - @aws-amplify/plugin-types@0.3.0
  - @aws-amplify/backend-graphql@0.2.1
  - @aws-amplify/backend-auth@0.2.2
  - @aws-amplify/backend-function@0.1.2
  - @aws-amplify/backend-storage@0.2.1
  - @aws-amplify/backend-secret@0.2.1
  - @aws-amplify/platform-core@0.1.2

## 0.2.1

### Patch Changes

- 4e48e4ba: chore: add new defineBackend to better align with other backend factories
- Updated dependencies [d0119b25]
  - @aws-amplify/backend-auth@0.2.1

## 0.2.0

### Minor Changes

- 2216d37d: 1. Remove version from the backend secret feature. 2. Use max(secret_last_updated) to trigger secret fetcher.
- c5d18967: Re-export category entry points from @aws-amplify/backend and move shared test classes to new private package
- dc22fdf4: Integrate secret to Auth
- 407a09ff: Implements backend secret feature, include backend secret resolver and the backend-secret pkg.

### Patch Changes

- 98b17069: Provides sandbox secret CLI commands
- 0398b8e1: Bump graphql construct to 0.9.0 and remove some interface cruft
- 642e8d55: Remove grantPermission API from backend-secret
- b2b0c2da: force version bump
- baa7a905: Move types package from peer deps to deps
- 7296e9d9: Initial publish
- 9091c2bf: Fix import path verification on windows
- 34c3fd38: Update backend definition file path convention
- 3bda96ff: update methods to use arrow notation
- b4946f34: add jsdoc comments for `secret()`
- 36d93e46: add license to package.json
- 8f99476e: chore: upgrade aws-cdk to 2.103.0
- 47456c26: Remove ESM features from construct dependency packages and make corresponding updates in consumer packages
- f75fa531: Refactor OutputStorageStrategy into stateless shared dependency
- f6618771: add deployment type to stack outputs
- 755badc2: Upgrade aws-cdk-lib to have cdk custom resource provider run node 18
- 512f0778: move UniqueBackendIdentifier to platform-core package
- 59f5ea24: chore: upgrade aws-cdk to 2.100.0
- Updated dependencies [47456c26]
- Updated dependencies [bf24d363]
- Updated dependencies [ac3df080]
- Updated dependencies [98b17069]
- Updated dependencies [0398b8e1]
- Updated dependencies [642e8d55]
- Updated dependencies [b2b0c2da]
- Updated dependencies [18874854]
- Updated dependencies [66190beb]
- Updated dependencies [2216d37d]
- Updated dependencies [baa7a905]
- Updated dependencies [7296e9d9]
- Updated dependencies [53779253]
- Updated dependencies [915c0325]
- Updated dependencies [c5d18967]
- Updated dependencies [34c3fd38]
- Updated dependencies [2ef006f1]
- Updated dependencies [3bda96ff]
- Updated dependencies [41ae36e2]
- Updated dependencies [7103735b]
- Updated dependencies [db395e9c]
- Updated dependencies [f8df0ed6]
- Updated dependencies [3c36ace9]
- Updated dependencies [395c8f0d]
- Updated dependencies [ce008a2c]
- Updated dependencies [30820177]
- Updated dependencies [36d93e46]
- Updated dependencies [88fe36a1]
- Updated dependencies [8f99476e]
- Updated dependencies [b89c5397]
- Updated dependencies [d1295912]
- Updated dependencies [dc22fdf4]
- Updated dependencies [407a09ff]
- Updated dependencies [47456c26]
- Updated dependencies [b4f82717]
- Updated dependencies [ae9e9f10]
- Updated dependencies [f2394dbe]
- Updated dependencies [5b9aac15]
- Updated dependencies [fcc7d389]
- Updated dependencies [05f97b26]
- Updated dependencies [2525b582]
- Updated dependencies [f75fa531]
- Updated dependencies [f6618771]
- Updated dependencies [f201c94a]
- Updated dependencies [512f0778]
- Updated dependencies [bc419e41]
- Updated dependencies [883d9da7]
- Updated dependencies [59f5ea24]
  - @aws-amplify/backend-output-storage@0.2.0
  - @aws-amplify/backend-auth@0.2.0
  - @aws-amplify/backend-output-schemas@0.2.0
  - @aws-amplify/backend-secret@0.2.0
  - @aws-amplify/backend-graphql@0.2.0
  - @aws-amplify/backend-storage@0.2.0
  - @aws-amplify/plugin-types@0.2.0
  - @aws-amplify/backend-function@0.1.1
  - @aws-amplify/platform-core@0.1.1

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
