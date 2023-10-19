# @aws-amplify/sandbox

## 0.2.0-alpha.14

### Patch Changes

- 915c0325: Offer to reset the sandbox if a non deployable change is detected
- Updated dependencies [e9c0c9b5]
- Updated dependencies [915c0325]
- Updated dependencies [9c86218e]
  - @aws-amplify/deployed-backend-client@0.2.0-alpha.8
  - @aws-amplify/cli-core@0.1.0-alpha.2
  - @aws-amplify/backend-deployer@0.2.0-alpha.8
  - @aws-amplify/platform-core@0.1.1-alpha.3

## 0.2.0-alpha.13

### Patch Changes

- Updated dependencies [2bbf3f20]
  - @aws-amplify/client-config@0.2.0-alpha.11

## 0.2.0-alpha.12

### Patch Changes

- 59f5ea24: chore: upgrade aws-cdk to 2.100.0
- Updated dependencies [5585f473]
- Updated dependencies [59f5ea24]
  - @aws-amplify/deployed-backend-client@0.2.0-alpha.6
  - @aws-amplify/backend-deployer@0.2.0-alpha.7
  - @aws-amplify/backend-secret@0.2.0-alpha.4

## 0.2.0-alpha.11

### Patch Changes

- Updated dependencies [1a87500d]
  - @aws-amplify/client-config@0.2.0-alpha.10

## 0.2.0-alpha.10

### Patch Changes

- c78daa11: fix(sandbox): delete should pass the deployment type to deployer
- c03a2f8c: fix(sandbox): Show underlying error message and quit if sandbox delete fails
- Updated dependencies [c78daa11]
- Updated dependencies [7103735b]
- Updated dependencies [f46f69fb]
- Updated dependencies [d925b097]
  - @aws-amplify/backend-deployer@0.2.0-alpha.6
  - @aws-amplify/backend-secret@0.2.0-alpha.3
  - @aws-amplify/deployed-backend-client@0.2.0-alpha.4

## 0.2.0-alpha.9

### Patch Changes

- Updated dependencies [2525b582]
  - @aws-amplify/deployed-backend-client@0.2.0-alpha.3
  - @aws-amplify/client-config@0.2.0-alpha.9

## 0.2.0-alpha.8

### Minor Changes

- 2216d37d: 1. Remove version from the backend secret feature. 2. Use max(secret_last_updated) to trigger secret fetcher.

### Patch Changes

- 36d93e46: add license to package.json
- Updated dependencies [2216d37d]
- Updated dependencies [36d93e46]
  - @aws-amplify/backend-deployer@0.2.0-alpha.5
  - @aws-amplify/backend-secret@0.2.0-alpha.2
  - @aws-amplify/deployed-backend-client@0.2.0-alpha.2
  - @aws-amplify/client-config@0.2.0-alpha.8
  - @aws-amplify/platform-core@0.1.1-alpha.1

## 0.2.0-alpha.7

### Minor Changes

- 319e62bb: Add bootstrap detection in sandbox
- ee3d55fe: Add event handlers for Sandbox

### Patch Changes

- f6618771: add deployment type to stack outputs
- 512f0778: move UniqueBackendIdentifier to platform-core package
- Updated dependencies [23fc5b13]
- Updated dependencies [bb3bf89a]
- Updated dependencies [f6618771]
- Updated dependencies [512f0778]
  - @aws-amplify/client-config@0.2.0-alpha.7
  - @aws-amplify/deployed-backend-client@0.2.0-alpha.1
  - @aws-amplify/backend-deployer@0.1.1-alpha.4
  - @aws-amplify/platform-core@0.1.1-alpha.0

## 0.2.0-alpha.6

### Minor Changes

- 2bd14d48: Adds profile option to sandbox command
- b4f82717: Create a new deployed-backend-client package that provides a convenient interface for retrieving stack outputs

### Patch Changes

- 75d90a57: add `format` option to sandbox. Rename `out` option to `outDir`.
- 1dada824: chore: Update eslint config to new flat config type
- Updated dependencies [1dada824]
- Updated dependencies [407a09ff]
- Updated dependencies [b4f82717]
- Updated dependencies [05f97b26]
- Updated dependencies [f75fa531]
- Updated dependencies [e0e1488b]
  - @aws-amplify/client-config@0.2.0-alpha.6
  - @aws-amplify/deployed-backend-client@0.2.0-alpha.0

## 0.1.1-alpha.5

### Patch Changes

- 233adab: fix(sandbox): ignore paths in .gitignore to be considered for sandbox watch process
- Updated dependencies [01320d4]
  - @aws-amplify/client-config@0.2.0-alpha.5

## 0.1.1-alpha.4

### Patch Changes

- Updated dependencies [ce008a2]
- Updated dependencies [afa0b3d]
- Updated dependencies [f201c94]
- Updated dependencies [4f3c171]
  - @aws-amplify/client-config@0.2.0-alpha.4
  - @aws-amplify/backend-deployer@0.1.1-alpha.3

## 0.1.1-alpha.3

### Patch Changes

- b2b0c2d: force version bump
- Updated dependencies [b2b0c2d]
- Updated dependencies [395c8f0]
  - @aws-amplify/backend-deployer@0.1.1-alpha.2
  - @aws-amplify/client-config@0.1.1-alpha.3

## 0.1.1-alpha.2

### Patch Changes

- 3bda96f: update methods to use arrow notation
- Updated dependencies [3bda96f]
  - @aws-amplify/backend-deployer@0.1.1-alpha.1
  - @aws-amplify/client-config@0.1.1-alpha.2

## 0.1.1-alpha.1

### Patch Changes

- c338392: Run npm init as part of create-amplify if necessary. List aws-cdk as a peerDependency of sandbox. Fix sandbox stack naming and lookup
- ac62520: adds pipeline-deploy command
- Updated dependencies [c338392]
- Updated dependencies [ac62520]
  - @aws-amplify/client-config@0.1.1-alpha.1
  - @aws-amplify/backend-deployer@0.1.1-alpha.0

## 0.1.1-alpha.0

### Patch Changes

- 7296e9d: Initial publish
- Updated dependencies [7296e9d]
  - @aws-amplify/client-config@0.1.1-alpha.0
