# @aws-amplify/backend-cli

## 0.2.0-alpha.10

### Patch Changes

- fcc7d389: Enable type checking during deployment
- Updated dependencies [fcc7d389]
  - @aws-amplify/sandbox@0.2.0-alpha.15

## 0.2.0-alpha.9

### Patch Changes

- 915c0325: Offer to reset the sandbox if a non deployable change is detected
- Updated dependencies [e9c0c9b5]
- Updated dependencies [915c0325]
  - @aws-amplify/deployed-backend-client@0.2.0-alpha.8
  - @aws-amplify/cli-core@0.1.0-alpha.2
  - @aws-amplify/platform-core@0.1.1-alpha.3
  - @aws-amplify/sandbox@0.2.0-alpha.14

## 0.2.0-alpha.8

### Minor Changes

- 1a19914d: By default, artifacts render in ./{ui-components,graphql}

### Patch Changes

- Updated dependencies [2bbf3f20]
  - @aws-amplify/client-config@0.2.0-alpha.11
  - @aws-amplify/sandbox@0.2.0-alpha.13

## 0.2.0-alpha.7

### Patch Changes

- 7853b00a: Make CLI options kebab case
- d84f92c0: make pipeline-deploy cmd generate config
- Updated dependencies [a351b261]
- Updated dependencies [f2394dbe]
- Updated dependencies [5b9aac15]
  - @aws-amplify/deployed-backend-client@0.2.0-alpha.7
  - @aws-amplify/backend-secret@0.2.0-alpha.6
  - @aws-amplify/platform-core@0.1.1-alpha.2

## 0.2.0-alpha.6

### Minor Changes

- 2216d37d: 1. Remove version from the backend secret feature. 2. Use max(secret_last_updated) to trigger secret fetcher.

### Patch Changes

- ed841e3e: fix: pipeline deploy passes the required parameter to the deployer
- Updated dependencies [2216d37d]
- Updated dependencies [36d93e46]
  - @aws-amplify/backend-secret@0.2.0-alpha.2
  - @aws-amplify/sandbox@0.2.0-alpha.8
  - @aws-amplify/deployed-backend-client@0.2.0-alpha.2
  - @aws-amplify/backend-output-schemas@0.2.0-alpha.5
  - @aws-amplify/model-generator@0.2.0-alpha.4
  - @aws-amplify/form-generator@0.2.0-alpha.3
  - @aws-amplify/client-config@0.2.0-alpha.8
  - @aws-amplify/platform-core@0.1.1-alpha.1

## 0.2.0-alpha.5

### Minor Changes

- 348b3783: Added form generation event to sandbox
- 98b17069: Provides sandbox secret CLI commands
- 319e62bb: Add bootstrap detection in sandbox
- 0b2d50da: Add form generation interface
- ee3d55fe: Add event handlers for Sandbox
- 2b18af15: Add model filtering to form generation

### Patch Changes

- 23fc5b13: Lint fixes
- 0765e494: fix(cli): Sanitize app names generated from package json
- caaf1fee: Add model and form generation outputs to watch exclusions
- bb3bf89a: add backend metadata manager
- 512f0778: move UniqueBackendIdentifier to platform-core package
- Updated dependencies [23fc5b13]
- Updated dependencies [98b17069]
- Updated dependencies [baa7a905]
- Updated dependencies [319e62bb]
- Updated dependencies [ee3d55fe]
- Updated dependencies [b1da9601]
- Updated dependencies [bb3bf89a]
- Updated dependencies [2b18af15]
- Updated dependencies [f6618771]
- Updated dependencies [512f0778]
  - @aws-amplify/model-generator@0.2.0-alpha.3
  - @aws-amplify/client-config@0.2.0-alpha.7
  - @aws-amplify/backend-secret@0.2.0-alpha.1
  - @aws-amplify/sandbox@0.2.0-alpha.7
  - @aws-amplify/form-generator@0.2.0-alpha.2
  - @aws-amplify/deployed-backend-client@0.2.0-alpha.1
  - @aws-amplify/backend-output-schemas@0.2.0-alpha.4
  - @aws-amplify/platform-core@0.1.1-alpha.0

## 0.2.0-alpha.4

### Minor Changes

- 6ec93aed: Add generate graphql-client-code command with mocked implementation
- 2bd14d48: Adds profile option to sandbox command
- b4f82717: Create a new deployed-backend-client package that provides a convenient interface for retrieving stack outputs

### Patch Changes

- 813cdfb0: Extract BackendIdentifierResolver into its own class
- 4fd18b12: fix: change 'out' to 'outDir'
- 75d90a57: add `format` option to sandbox. Rename `out` option to `outDir`.
- 1dada824: chore: Update eslint config to new flat config type
- Updated dependencies [92950f99]
- Updated dependencies [b48dae80]
- Updated dependencies [75d90a57]
- Updated dependencies [1dada824]
- Updated dependencies [1cefbdd4]
- Updated dependencies [2bd14d48]
- Updated dependencies [407a09ff]
- Updated dependencies [b4f82717]
- Updated dependencies [05f97b26]
- Updated dependencies [1a6dd467]
- Updated dependencies [f75fa531]
- Updated dependencies [5c1d9de8]
- Updated dependencies [e0e1488b]
  - @aws-amplify/model-generator@0.2.0-alpha.2
  - @aws-amplify/sandbox@0.2.0-alpha.6
  - @aws-amplify/client-config@0.2.0-alpha.6
  - @aws-amplify/deployed-backend-client@0.2.0-alpha.0

## 0.2.0-alpha.3

### Patch Changes

- b2b0c2d: force version bump
- Updated dependencies [b2b0c2d]
- Updated dependencies [395c8f0]
  - @aws-amplify/client-config@0.1.1-alpha.3
  - @aws-amplify/sandbox@0.1.1-alpha.3

## 0.2.0-alpha.2

### Patch Changes

- 3bda96f: update methods to use arrow notation
- Updated dependencies [3bda96f]
  - @aws-amplify/client-config@0.1.1-alpha.2
  - @aws-amplify/sandbox@0.1.1-alpha.2

## 0.2.0-alpha.1

### Minor Changes

- ac62520: adds pipeline-deploy command

### Patch Changes

- c338392: Run npm init as part of create-amplify if necessary. List aws-cdk as a peerDependency of sandbox. Fix sandbox stack naming and lookup
- 6ba66d9: fix: ctrl-c behavior for sandbox
- Updated dependencies [c338392]
- Updated dependencies [ac62520]
  - @aws-amplify/client-config@0.1.1-alpha.1
  - @aws-amplify/sandbox@0.1.1-alpha.1

## 0.1.1-alpha.0

### Patch Changes

- 7296e9d: Initial publish
- Updated dependencies [7296e9d]
  - @aws-amplify/client-config@0.1.1-alpha.0
  - @aws-amplify/sandbox@0.1.1-alpha.0
