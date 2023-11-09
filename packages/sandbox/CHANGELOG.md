# @aws-amplify/sandbox

## 0.2.4

### Patch Changes

- Updated dependencies [68dc91e3]
  - @aws-amplify/backend-deployer@0.2.3
  - @aws-amplify/platform-core@0.1.4

## 0.2.3

### Patch Changes

- Updated dependencies [0bd8a3f3]
- Updated dependencies [0bd8a3f3]
  - @aws-amplify/client-config@0.2.3
  - @aws-amplify/platform-core@0.1.3

## 0.2.2

### Patch Changes

- Updated dependencies [79a6e09f]
- Updated dependencies [79a6e09f]
  - @aws-amplify/deployed-backend-client@0.2.1
  - @aws-amplify/client-config@0.2.2
  - @aws-amplify/backend-deployer@0.2.2
  - @aws-amplify/backend-secret@0.2.1
  - @aws-amplify/platform-core@0.1.2

## 0.2.1

### Patch Changes

- a216255e: Add successfulDeletion event to remove amplify configuration on deletion
- Updated dependencies [ff08a94b]
- Updated dependencies [a216255e]
- Updated dependencies [1c685d10]
  - @aws-amplify/cli-core@0.2.0
  - @aws-amplify/client-config@0.2.1
  - @aws-amplify/backend-deployer@0.2.1

## 0.2.0

### Minor Changes

- 2216d37d: 1. Remove version from the backend secret feature. 2. Use max(secret_last_updated) to trigger secret fetcher.
- 319e62bb: Add bootstrap detection in sandbox
- ee3d55fe: Add event handlers for Sandbox
- 2bd14d48: Adds profile option to sandbox command
- b4f82717: Create a new deployed-backend-client package that provides a convenient interface for retrieving stack outputs

### Patch Changes

- c3383926: Run npm init as part of create-amplify if necessary. List aws-cdk as a peerDependency of sandbox. Fix sandbox stack naming and lookup
- c78daa11: fix(sandbox): delete should pass the deployment type to deployer
- b2b0c2da: force version bump
- 7296e9d9: Initial publish
- 233adaba: fix(sandbox): ignore paths in .gitignore to be considered for sandbox watch process
- 75d90a57: add `format` option to sandbox. Rename `out` option to `outDir`.
- 915c0325: Offer to reset the sandbox if a non deployable change is detected
- c03a2f8c: fix(sandbox): Show underlying error message and quit if sandbox delete fails
- 3bda96ff: update methods to use arrow notation
- 08601278: change sandbox --dir-to-watch to ./amplify directory
- 36d93e46: add license to package.json
- ac625207: adds pipeline-deploy command
- 8f99476e: chore: upgrade aws-cdk to 2.103.0
- fcc7d389: Enable type checking during deployment
- f6618771: add deployment type to stack outputs
- 4664e675: Change default cdk output directory for sandbox environments
- 512f0778: move UniqueBackendIdentifier to platform-core package
- 59f5ea24: chore: upgrade aws-cdk to 2.100.0
- Updated dependencies [2bbf3f20]
- Updated dependencies [f0ef7c6a]
- Updated dependencies [e233eab6]
- Updated dependencies [23fc5b13]
- Updated dependencies [e9c0c9b5]
- Updated dependencies [98b17069]
- Updated dependencies [c3383926]
- Updated dependencies [642e8d55]
- Updated dependencies [c78daa11]
- Updated dependencies [b2b0c2da]
- Updated dependencies [a351b261]
- Updated dependencies [2216d37d]
- Updated dependencies [baa7a905]
- Updated dependencies [1a87500d]
- Updated dependencies [7296e9d9]
- Updated dependencies [5585f473]
- Updated dependencies [76ba7929]
- Updated dependencies [915c0325]
- Updated dependencies [b40d2d7b]
- Updated dependencies [c5d18967]
- Updated dependencies [675f4283]
- Updated dependencies [5826ad3b]
- Updated dependencies [b40d2d7b]
- Updated dependencies [3bda96ff]
- Updated dependencies [7103735b]
- Updated dependencies [395c8f0d]
- Updated dependencies [ce008a2c]
- Updated dependencies [01320d4b]
- Updated dependencies [36d93e46]
- Updated dependencies [afa0b3da]
- Updated dependencies [ac625207]
- Updated dependencies [8f99476e]
- Updated dependencies [4d411b67]
- Updated dependencies [d1295912]
- Updated dependencies [f46f69fb]
- Updated dependencies [bb3bf89a]
- Updated dependencies [407a09ff]
- Updated dependencies [47456c26]
- Updated dependencies [0b029cb5]
- Updated dependencies [b4f82717]
- Updated dependencies [f2394dbe]
- Updated dependencies [991403ec]
- Updated dependencies [5b9aac15]
- Updated dependencies [fcc7d389]
- Updated dependencies [05f97b26]
- Updated dependencies [d925b097]
- Updated dependencies [2525b582]
- Updated dependencies [f75fa531]
- Updated dependencies [f6618771]
- Updated dependencies [4664e675]
- Updated dependencies [f201c94a]
- Updated dependencies [9c86218e]
- Updated dependencies [512f0778]
- Updated dependencies [e0e1488b]
- Updated dependencies [4f3c1711]
- Updated dependencies [59f5ea24]
  - @aws-amplify/client-config@0.2.0
  - @aws-amplify/deployed-backend-client@0.2.0
  - @aws-amplify/backend-secret@0.2.0
  - @aws-amplify/backend-deployer@0.2.0
  - @aws-amplify/cli-core@0.1.0
  - @aws-amplify/platform-core@0.1.1

## 0.2.0-alpha.18

### Patch Changes

- 8f99476e: chore: upgrade aws-cdk to 2.103.0
- Updated dependencies [8f99476e]
- Updated dependencies [991403ec]
  - @aws-amplify/backend-deployer@0.2.0-alpha.11

## 0.2.0-alpha.17

### Patch Changes

- 4664e675: Change default cdk output directory for sandbox environments
- Updated dependencies [e233eab6]
- Updated dependencies [5826ad3b]
- Updated dependencies [4664e675]
  - @aws-amplify/client-config@0.2.0-alpha.12
  - @aws-amplify/backend-deployer@0.2.0-alpha.10

## 0.2.0-alpha.16

### Patch Changes

- 08601278: change sandbox --dir-to-watch to ./amplify directory
- Updated dependencies [675f4283]
- Updated dependencies [4d411b67]
  - @aws-amplify/cli-core@0.1.0-alpha.3
  - @aws-amplify/deployed-backend-client@0.2.0-alpha.9

## 0.2.0-alpha.15

### Patch Changes

- fcc7d389: Enable type checking during deployment
- Updated dependencies [fcc7d389]
  - @aws-amplify/backend-deployer@0.2.0-alpha.9

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
