# @aws-amplify/backend-cli

## 0.3.1

### Patch Changes

- 4ad1db95: Gracefully handle Crtl+C error during CLI prompting

## 0.3.0

### Minor Changes

- ff08a94b: Add 'amplify configure' command.

### Patch Changes

- a216255e: Add successfulDeletion event to remove amplify configuration on deletion
- Updated dependencies [ff08a94b]
- Updated dependencies [863dc241]
- Updated dependencies [a216255e]
  - @aws-amplify/cli-core@0.2.0
  - @aws-amplify/form-generator@0.3.0
  - @aws-amplify/client-config@0.2.1
  - @aws-amplify/sandbox@0.2.1

## 0.2.0

### Minor Changes

- 348b3783: Added form generation event to sandbox
- 98b17069: Provides sandbox secret CLI commands
- 2216d37d: 1. Remove version from the backend secret feature. 2. Use max(secret_last_updated) to trigger secret fetcher.
- 56fbcc5f: Generated typescript codegen by default, and add type defaults as well
- 3fd21230: Removes event hook that runs formgen after sandbox deployment.
- 319e62bb: Add bootstrap detection in sandbox
- 0b2d50da: Add form generation interface
- ee3d55fe: Add event handlers for Sandbox
- 6ec93aed: Add generate graphql-client-code command with mocked implementation
- 2bd14d48: Adds profile option to sandbox command
- ac625207: adds pipeline-deploy command
- 2b18af15: Add model filtering to form generation
- b4f82717: Create a new deployed-backend-client package that provides a convenient interface for retrieving stack outputs
- 1a19914d: By default, artifacts render in ./{ui-components,graphql}

### Patch Changes

- e233eab6: make default amplifyconfig format json, change js format to mjs, and add dart format
- 23fc5b13: Lint fixes
- 813cdfb0: Extract BackendIdentifierResolver into its own class
- 7141c188: chore: validate that the profile can vend credentials before moving on
- c3383926: Run npm init as part of create-amplify if necessary. List aws-cdk as a peerDependency of sandbox. Fix sandbox stack naming and lookup
- 7853b00a: Make CLI options kebab case
- b2b0c2da: force version bump
- ed841e3e: fix: pipeline deploy passes the required parameter to the deployer
- 7296e9d9: Initial publish
- 4fd18b12: fix: change 'out' to 'outDir'
- 75d90a57: add `format` option to sandbox. Rename `out` option to `outDir`.
- 76ba7929: chore: reformat yargs error display
- 915c0325: Offer to reset the sandbox if a non deployable change is detected
- df25ec57: Remove short circuit logic in client config generation event
- 4f3c1711: update backend-deployer dependency
- 0765e494: fix(cli): Sanitize app names generated from package json
- 3bda96ff: update methods to use arrow notation
- caaf1fee: Add model and form generation outputs to watch exclusions
- 01320d4b: add `amplify generate config --format` option
- d84f92c0: make pipeline-deploy cmd generate config
- bb3bf89a: add backend metadata manager
- fcc7d389: Enable type checking during deployment
- 512f0778: move UniqueBackendIdentifier to platform-core package
- 6ba66d9b: fix: ctrl-c behavior for sandbox
- Updated dependencies [2bbf3f20]
- Updated dependencies [f0ef7c6a]
- Updated dependencies [e233eab6]
- Updated dependencies [92950f99]
- Updated dependencies [23fc5b13]
- Updated dependencies [e9c0c9b5]
- Updated dependencies [47bfb317]
- Updated dependencies [ac3df080]
- Updated dependencies [98b17069]
- Updated dependencies [c3383926]
- Updated dependencies [642e8d55]
- Updated dependencies [c78daa11]
- Updated dependencies [b2b0c2da]
- Updated dependencies [a351b261]
- Updated dependencies [1817c55c]
- Updated dependencies [2216d37d]
- Updated dependencies [baa7a905]
- Updated dependencies [1a87500d]
- Updated dependencies [b48dae80]
- Updated dependencies [56fbcc5f]
- Updated dependencies [7296e9d9]
- Updated dependencies [53779253]
- Updated dependencies [5585f473]
- Updated dependencies [233adaba]
- Updated dependencies [75d90a57]
- Updated dependencies [76ba7929]
- Updated dependencies [915c0325]
- Updated dependencies [b40d2d7b]
- Updated dependencies [c5d18967]
- Updated dependencies [ad73f897]
- Updated dependencies [675f4283]
- Updated dependencies [c03a2f8c]
- Updated dependencies [b40d2d7b]
- Updated dependencies [3bda96ff]
- Updated dependencies [319e62bb]
- Updated dependencies [ee3d55fe]
- Updated dependencies [7103735b]
- Updated dependencies [395c8f0d]
- Updated dependencies [08601278]
- Updated dependencies [1cefbdd4]
- Updated dependencies [2bd14d48]
- Updated dependencies [ce008a2c]
- Updated dependencies [01320d4b]
- Updated dependencies [36d93e46]
- Updated dependencies [ac625207]
- Updated dependencies [aee0a52d]
- Updated dependencies [8f99476e]
- Updated dependencies [4d411b67]
- Updated dependencies [d1295912]
- Updated dependencies [f46f69fb]
- Updated dependencies [b1da9601]
- Updated dependencies [bb3bf89a]
- Updated dependencies [2b18af15]
- Updated dependencies [407a09ff]
- Updated dependencies [47456c26]
- Updated dependencies [0b029cb5]
- Updated dependencies [b4f82717]
- Updated dependencies [f2394dbe]
- Updated dependencies [5b9aac15]
- Updated dependencies [fcc7d389]
- Updated dependencies [05f97b26]
- Updated dependencies [d925b097]
- Updated dependencies [2525b582]
- Updated dependencies [1a6dd467]
- Updated dependencies [f75fa531]
- Updated dependencies [f6618771]
- Updated dependencies [4664e675]
- Updated dependencies [f201c94a]
- Updated dependencies [5c1d9de8]
- Updated dependencies [512f0778]
- Updated dependencies [e0e1488b]
- Updated dependencies [883d9da7]
- Updated dependencies [59f5ea24]
  - @aws-amplify/client-config@0.2.0
  - @aws-amplify/deployed-backend-client@0.2.0
  - @aws-amplify/model-generator@0.2.0
  - @aws-amplify/backend-output-schemas@0.2.0
  - @aws-amplify/backend-secret@0.2.0
  - @aws-amplify/sandbox@0.2.0
  - @aws-amplify/form-generator@0.2.0
  - @aws-amplify/cli-core@0.1.0
  - @aws-amplify/platform-core@0.1.1

## 0.2.0-alpha.15

### Patch Changes

- 76ba7929: chore: reformat yargs error display
- Updated dependencies [f0ef7c6a]
- Updated dependencies [47bfb317]
- Updated dependencies [76ba7929]
  - @aws-amplify/deployed-backend-client@0.2.0-alpha.11
  - @aws-amplify/model-generator@0.2.0-alpha.7
  - @aws-amplify/cli-core@0.1.0-alpha.4

## 0.2.0-alpha.14

### Patch Changes

- 7141c188: chore: validate that the profile can vend credentials before moving on
- Updated dependencies [8f99476e]
  - @aws-amplify/sandbox@0.2.0-alpha.18

## 0.2.0-alpha.13

### Patch Changes

- e233eab6: make default amplifyconfig format json, change js format to mjs, and add dart format
- Updated dependencies [e233eab6]
- Updated dependencies [4664e675]
  - @aws-amplify/client-config@0.2.0-alpha.12
  - @aws-amplify/sandbox@0.2.0-alpha.17

## 0.2.0-alpha.12

### Minor Changes

- 3fd21230: Removes event hook that runs formgen after sandbox deployment.

### Patch Changes

- df25ec57: Remove short circuit logic in client config generation event
- Updated dependencies [1817c55c]
- Updated dependencies [675f4283]
- Updated dependencies [08601278]
- Updated dependencies [aee0a52d]
- Updated dependencies [4d411b67]
- Updated dependencies [883d9da7]
  - @aws-amplify/form-generator@0.2.0-alpha.4
  - @aws-amplify/cli-core@0.1.0-alpha.3
  - @aws-amplify/sandbox@0.2.0-alpha.16
  - @aws-amplify/deployed-backend-client@0.2.0-alpha.9
  - @aws-amplify/backend-output-schemas@0.2.0-alpha.7

## 0.2.0-alpha.11

### Minor Changes

- 56fbcc5f: Generated typescript codegen by default, and add type defaults as well

### Patch Changes

- Updated dependencies [56fbcc5f]
  - @aws-amplify/model-generator@0.2.0-alpha.6

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
