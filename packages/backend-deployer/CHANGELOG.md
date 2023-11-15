# @aws-amplify/backend-deployer

## 0.3.0

### Minor Changes

- 71a63a16: Change stack naming strategy to include deployment type as a suffix

### Patch Changes

- Updated dependencies [8181509a]
- Updated dependencies [71a63a16]
  - @aws-amplify/plugin-types@0.4.0
  - @aws-amplify/platform-core@0.2.0

## 0.2.3

### Patch Changes

- 68dc91e3: chore: support for JS backend apps
- Updated dependencies [68dc91e3]
  - @aws-amplify/platform-core@0.1.4

## 0.2.2

### Patch Changes

- Updated dependencies [457b1662]
  - @aws-amplify/plugin-types@0.3.0
  - @aws-amplify/platform-core@0.1.2

## 0.2.1

### Patch Changes

- 1c685d10: do not require confirmation at pipeline deploy

## 0.2.0

### Minor Changes

- 2216d37d: 1. Remove version from the backend secret feature. 2. Use max(secret_last_updated) to trigger secret fetcher.

### Patch Changes

- c78daa11: fix(sandbox): delete should pass the deployment type to deployer
- b2b0c2da: force version bump
- 915c0325: Offer to reset the sandbox if a non deployable change is detected
- 5826ad3b: chore: update cdk error mapper for case when cognito user attributes cannot be updated
- 3bda96ff: update methods to use arrow notation
- 36d93e46: add license to package.json
- afa0b3da: simplify error map and tests
- ac625207: adds pipeline-deploy command
- 8f99476e: chore: upgrade aws-cdk to 2.103.0
- 991403ec: use modern tsc features at compilation
- fcc7d389: Enable type checking during deployment
- f6618771: add deployment type to stack outputs
- 4664e675: Change default cdk output directory for sandbox environments
- 9c86218e: fix: allow custom root stacks to be deployable
- 512f0778: move UniqueBackendIdentifier to platform-core package
- 4f3c1711: Improve known error messages
- 59f5ea24: chore: upgrade aws-cdk to 2.100.0
- Updated dependencies [0398b8e1]
- Updated dependencies [b2b0c2da]
- Updated dependencies [18874854]
- Updated dependencies [7296e9d9]
- Updated dependencies [915c0325]
- Updated dependencies [2ef006f1]
- Updated dependencies [3bda96ff]
- Updated dependencies [7103735b]
- Updated dependencies [3c36ace9]
- Updated dependencies [36d93e46]
- Updated dependencies [8f99476e]
- Updated dependencies [dc22fdf4]
- Updated dependencies [407a09ff]
- Updated dependencies [47456c26]
- Updated dependencies [5b9aac15]
- Updated dependencies [f6618771]
- Updated dependencies [f201c94a]
- Updated dependencies [512f0778]
- Updated dependencies [883d9da7]
- Updated dependencies [59f5ea24]
  - @aws-amplify/plugin-types@0.2.0
  - @aws-amplify/platform-core@0.1.1

## 0.2.0-alpha.11

### Patch Changes

- 8f99476e: chore: upgrade aws-cdk to 2.103.0
- 991403ec: use modern tsc features at compilation
- Updated dependencies [8f99476e]
  - @aws-amplify/plugin-types@0.2.0-alpha.11

## 0.2.0-alpha.10

### Patch Changes

- 5826ad3b: chore: update cdk error mapper for case when cognito user attributes cannot be updated
- 4664e675: Change default cdk output directory for sandbox environments

## 0.2.0-alpha.9

### Patch Changes

- fcc7d389: Enable type checking during deployment

## 0.2.0-alpha.8

### Patch Changes

- 915c0325: Offer to reset the sandbox if a non deployable change is detected
- 9c86218e: fix: allow custom root stacks to be deployable
- Updated dependencies [915c0325]
  - @aws-amplify/platform-core@0.1.1-alpha.3

## 0.2.0-alpha.7

### Patch Changes

- 59f5ea24: chore: upgrade aws-cdk to 2.100.0
- Updated dependencies [59f5ea24]
  - @aws-amplify/plugin-types@0.2.0-alpha.9

## 0.2.0-alpha.6

### Patch Changes

- c78daa11: fix(sandbox): delete should pass the deployment type to deployer
- Updated dependencies [7103735b]
  - @aws-amplify/plugin-types@0.2.0-alpha.8

## 0.2.0-alpha.5

### Minor Changes

- 2216d37d: 1. Remove version from the backend secret feature. 2. Use max(secret_last_updated) to trigger secret fetcher.

### Patch Changes

- 36d93e46: add license to package.json
- Updated dependencies [36d93e46]
  - @aws-amplify/platform-core@0.1.1-alpha.1
  - @aws-amplify/plugin-types@0.2.0-alpha.7

## 0.1.1-alpha.4

### Patch Changes

- f6618771: add deployment type to stack outputs
- 512f0778: move UniqueBackendIdentifier to platform-core package
- Updated dependencies [0398b8e1]
- Updated dependencies [dc22fdf4]
- Updated dependencies [f6618771]
- Updated dependencies [512f0778]
  - @aws-amplify/plugin-types@0.2.0-alpha.6
  - @aws-amplify/platform-core@0.1.1-alpha.0

## 0.1.1-alpha.3

### Patch Changes

- afa0b3d: simplify error map and tests
- 4f3c171: Improve known error messages
- Updated dependencies [f201c94]
  - @aws-amplify/plugin-types@0.1.1-alpha.3

## 0.1.1-alpha.2

### Patch Changes

- b2b0c2d: force version bump
- Updated dependencies [b2b0c2d]
  - @aws-amplify/plugin-types@0.1.1-alpha.2

## 0.1.1-alpha.1

### Patch Changes

- 3bda96f: update methods to use arrow notation
- Updated dependencies [2ef006f]
- Updated dependencies [3bda96f]
  - @aws-amplify/plugin-types@0.1.1-alpha.1

## 0.1.1-alpha.0

### Patch Changes

- ac62520: adds pipeline-deploy command
