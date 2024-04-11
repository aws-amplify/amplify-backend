# create-amplify

## 0.7.0-beta.12

### Minor Changes

- c1ec6e1: remove new lines on create-amplify

### Patch Changes

- 54c69c4: chore: rename the new client config file name
- 4123204: fix: order of array in test assert in gitignored tests
- Updated dependencies [6c6af9b]
- Updated dependencies [48ff3bd]
- Updated dependencies [1c52df1]
  - @aws-amplify/platform-core@0.5.0-beta.5
  - @aws-amplify/plugin-types@0.9.0-beta.2
  - @aws-amplify/cli-core@0.5.0-beta.10

## 0.7.0-beta.11

### Patch Changes

- 73d8da4: Updated `data/resource.ts` template based on user study
- Updated dependencies [77079c6]
  - @aws-amplify/cli-core@0.5.0-beta.9

## 0.7.0-beta.10

### Patch Changes

- Updated dependencies [4d47f63]
  - @aws-amplify/cli-core@0.5.0-beta.8

## 0.7.0-beta.9

### Patch Changes

- 11031fd: updated the client sample to have `await`
- Updated dependencies [aec89f9]
- Updated dependencies [2a69684]
  - @aws-amplify/platform-core@0.5.0-beta.4
  - @aws-amplify/cli-core@0.5.0-beta.7

## 0.7.0-beta.8

### Patch Changes

- Updated dependencies [0d1b00e]
  - @aws-amplify/cli-core@0.5.0-beta.6

## 0.7.0-beta.7

### Patch Changes

- Updated dependencies [7537216]
  - @aws-amplify/cli-core@0.5.0-beta.5

## 0.7.0-beta.6

### Patch Changes

- d452e8e: remove comments from defineAuth template
- c6a65d5: fix: when you do create-amplify absolute path, raised error and log.
- Updated dependencies [5e12247]
  - @aws-amplify/platform-core@0.5.0-beta.3
  - @aws-amplify/plugin-types@0.9.0-beta.1
  - @aws-amplify/cli-core@0.5.0-beta.4

## 0.7.0-beta.5

### Patch Changes

- Updated dependencies [e0ae60c]
  - @aws-amplify/cli-core@0.5.0-beta.3

## 0.7.0-beta.4

### Patch Changes

- ee247fd: use printer from cli-core
- Updated dependencies [3e34244]
- Updated dependencies [ee247fd]
- Updated dependencies [937086b]
  - @aws-amplify/cli-core@0.5.0-beta.2
  - @aws-amplify/platform-core@0.5.0-beta.2

## 0.7.0-beta.3

### Minor Changes

- eec100e: Updates the create flow with colors, verbosity and better structure

### Patch Changes

- Updated dependencies [3998cd3]
- Updated dependencies [8d9a7a4]
- Updated dependencies [b0ba24d]
- Updated dependencies [8d9a7a4]
  - @aws-amplify/cli-core@0.5.0-beta.1

## 0.6.1-beta.2

### Patch Changes

- Updated dependencies [ab7533d]
- Updated dependencies [a01f6b9]
- Updated dependencies [7cbe58b]
- Updated dependencies [baeb68f]
- Updated dependencies [109cd1b]
- Updated dependencies [4995bda]
  - @aws-amplify/platform-core@0.5.0-beta.1
  - @aws-amplify/plugin-types@0.9.0-beta.0
  - @aws-amplify/cli-core@0.4.1-beta.0

## 0.6.1-beta.1

### Patch Changes

- Updated dependencies [74cbda0]
  - @aws-amplify/platform-core@0.5.0-beta.0

## 0.6.1-beta.0

### Patch Changes

- 21f6292a1: Force release to beta tag

## 0.6.0

### Minor Changes

- b73d76a78: Support yarn 1, yarn 2+ and pnpm package managers

### Patch Changes

- Updated dependencies [85ced84f2]
- Updated dependencies [b73d76a78]
  - @aws-amplify/plugin-types@0.8.0
  - @aws-amplify/cli-core@0.4.0
  - @aws-amplify/platform-core@0.4.4

## 0.5.0

### Minor Changes

- fb07bafce: Refactor Printer class & deprecate Logger

### Patch Changes

- Updated dependencies [fb07bafce]
  - @aws-amplify/cli-core@0.3.0

## 0.4.4

### Patch Changes

- Updated dependencies [0809ad36d]
  - @aws-amplify/platform-core@0.4.3

## 0.4.3

### Patch Changes

- 981bd4423: Use latest CDKv2 version in create amplify flow
  - @aws-amplify/platform-core@0.4.2

## 0.4.2

### Patch Changes

- 43740488a: Move pinning of CDK version from @aws-amplify/backend to customer's project
- 04f067837: Implement consistent dependency declaration check. Bumped dependencies where necessary.
- Updated dependencies [04f067837]
  - @aws-amplify/platform-core@0.4.1

## 0.4.1

### Patch Changes

- Updated dependencies [5678ab4d4]
  - @aws-amplify/platform-core@0.4.0

## 0.4.0

### Minor Changes

- 6a1c252e1: Expose domainPrefix as an input property to the Auth construct.

### Patch Changes

- 6a1c252e1: Cognito domains are now created by default, and oauth settings are exported to frontend config.
- Updated dependencies [8688aa00f]
- Updated dependencies [e5da97e37]
  - @aws-amplify/platform-core@0.3.4

## 0.3.10

### Patch Changes

- 32c5156fe: generate new projects with tsconfig moduleResolution = bundler and remove '.js' extension from relative imports
  - @aws-amplify/platform-core@0.3.3

## 0.3.9

### Patch Changes

- db775ad6e: Refactor error handling, introduce two new AmplifyErrors
- c6c39d04c: Expose new `defineFunction` interface
- Updated dependencies [db775ad6e]
  - @aws-amplify/platform-core@0.3.2

## 0.3.8

### Patch Changes

- 5ed51cbd5: Upgrade aws-cdk to 2.110.1
- Updated dependencies [5ed51cbd5]
  - @aws-amplify/platform-core@0.3.1

## 0.3.7

### Patch Changes

- aa9045ea3: add npx to "get started" command in create-amplify
- 85e619116: Adding message about usage data tracking when creating new project
- Updated dependencies [aabe5dd61]
- Updated dependencies [5f336ffbb]
- Updated dependencies [85e619116]
  - @aws-amplify/platform-core@0.3.0

## 0.3.6

### Patch Changes

- f449188cf: fix(@aws-amplify/backend-data) - Align with authorization modes used in the aws-amplify client library

## 0.3.5

### Patch Changes

- e15afece7: adds comment in defineAuth template for docs

## 0.3.4

### Patch Changes

- 002954370: Create default tsconfig.json in amplify directory on npx create amplify and run tsc on amplify directory during deployment
- 48c25802d: Auth role policy action is now AssumeRoleWithWebIdentity.
- Updated dependencies [cb855dfa5]
  - @aws-amplify/platform-core@0.2.2

## 0.3.3

### Patch Changes

- 5cc252204: use latest aws-amplify verion in project_creator
- 70685f36b: Add usage data metrics
- Updated dependencies [70685f36b]
  - @aws-amplify/platform-core@0.2.1

## 0.3.2

### Patch Changes

- 14d862196: Animate ellipsis for high level create amplify logs
- 23b369d79: Add amplify comment when writing to gitignore
- bd8b5d1a5: update data/resource template; bump data-schema versions
- 14d862196: Hide npm outputs and switch from using console to logger in create amplify

## 0.3.1

### Patch Changes

- fdff69be3: Update error message when running create amplify in an existing amplify project

## 0.3.0

### Minor Changes

- 85a015b7: switch to using data-schema packages
- 71a63a16: Change stack naming strategy to include deployment type as a suffix

### Patch Changes

- 39b3f8dd: update readme

## 0.2.3

### Patch Changes

- 68dc91e3: chore: support for JS backend apps

## 0.2.2

### Patch Changes

- 39791e30: Update .gitignore content filtering
- 79a6e09f: Change stackOutputKey to platformOutputKey
- 79a6e09f: Add aws_project_region to amplifyconfiguration.json

## 0.2.1

### Patch Changes

- 4e48e4ba: chore: add new defineBackend to better align with other backend factories
- 25b81098: set type: module in package.json in amplify directory
- Updated dependencies [ff08a94b]
  - @aws-amplify/cli-core@0.2.0

## 0.2.0

### Minor Changes

- c3383926: Run npm init as part of create-amplify if necessary. List aws-cdk as a peerDependency of sandbox. Fix sandbox stack naming and lookup
- 66190beb: integrate api-next as the default data experience
- ae9e9f10: Create factory functions for defining category config

### Patch Changes

- a130ba6a: fix data template
- b2b0c2da: force version bump
- c0d7c475: fix create amplify artifact compilation
- 9a1cf731: Execute npm init with --yes flag and split dependencies and dev dependencies when installing packages into the project
- e233eab6: Toggle resolveJsonModule flag when creating tsconfig
- 7296e9d9: Initial publish
- e5870d72: Install alpha package versions
- c5d18967: Re-export category entry points from @aws-amplify/backend and move shared test classes to new private package
- 9addd57f: Ensure .gitignore file exists with correct content in create-amplify flow
- 34c3fd38: Update backend definition file path convention
- 675f4283: Move prompter in create_amplify to cli-core package
- 8df061e1: Initialize Gen2 project as ESM
- 2ef006f1: Support for email and phone number login has been updated to reflect new type structures. User attributes and verification settings have also been added.
- 3bda96ff: update methods to use arrow notation
- 0c7d55fb: add prompts to customize the project root and to confirm if to continue installing all the dependencies
- 395c8f0d: Add identityPoolId to output, and set delete policy on user pool to delete.
- e45f8525: make directory if the user provided directory doesn't exist
- 36d93e46: add license to package.json
- 790c3a60: Add support for account recovery settings.
- d1295912: Add Auth external identity provider to e2e test
- b10f2a61: Rename UserPoolWebClient to UserPoolAppClient
- 5a0df894: change log to instruct user to run command inside the project root
- f75fa531: Refactor OutputStorageStrategy into stateless shared dependency
- f6618771: add deployment type to stack outputs
- Updated dependencies [76ba7929]
- Updated dependencies [915c0325]
- Updated dependencies [675f4283]
  - @aws-amplify/cli-core@0.1.0

## 0.2.0-alpha.15

### Patch Changes

- 9addd57f: Ensure .gitignore file exists with correct content in create-amplify flow
- Updated dependencies [76ba7929]
  - @aws-amplify/cli-core@0.1.0-alpha.4

## 0.2.0-alpha.14

### Patch Changes

- e233eab6: Toggle resolveJsonModule flag when creating tsconfig

## 0.2.0-alpha.13

### Patch Changes

- 675f4283: Move prompter in create_amplify to cli-core package
- 8df061e1: Initialize Gen2 project as ESM
- 5a0df894: change log to instruct user to run command inside the project root
- Updated dependencies [675f4283]
  - @aws-amplify/cli-core@0.1.0-alpha.3

## 0.2.0-alpha.12

### Patch Changes

- e45f8525: make directory if the user provided directory doesn't exist
- b10f2a61: Rename UserPoolWebClient to UserPoolAppClient

## 0.2.0-alpha.11

### Patch Changes

- 0c7d55fb: add prompts to customize the project root and to confirm if to continue installing all the dependencies

## 0.2.0-alpha.10

### Patch Changes

- a130ba6a: fix data template

## 0.2.0-alpha.9

### Patch Changes

- c0d7c475: fix create amplify artifact compilation

## 0.2.0-alpha.8

### Minor Changes

- 66190beb: integrate api-next as the default data experience

### Patch Changes

- 36d93e46: add license to package.json

## 0.2.0-alpha.7

### Minor Changes

- ae9e9f10: Create factory functions for defining category config

### Patch Changes

- 34c3fd38: Update backend definition file path convention
- f6618771: add deployment type to stack outputs

## 0.2.0-alpha.6

### Patch Changes

- 1dada824: chore: Update eslint config to new flat config type
- f75fa531: Refactor OutputStorageStrategy into stateless shared dependency

## 0.2.0-alpha.5

### Patch Changes

- 790c3a6: Add support for account recovery settings.

## 0.2.0-alpha.4

### Patch Changes

- b2b0c2d: force version bump
- 395c8f0: Add identityPoolId to output, and set delete policy on user pool to delete.

## 0.2.0-alpha.3

### Patch Changes

- 9a1cf73: Execute npm init with --yes flag and split dependencies and dev dependencies when installing packages into the project

## 0.2.0-alpha.2

### Patch Changes

- 2ef006f: Support for email and phone number login has been updated to reflect new type structures. User attributes and verification settings have also been added.
- 3bda96f: update methods to use arrow notation

## 0.2.0-alpha.1

### Minor Changes

- c338392: Run npm init as part of create-amplify if necessary. List aws-cdk as a peerDependency of sandbox. Fix sandbox stack naming and lookup

## 0.1.1-alpha.0

### Patch Changes

- 7296e9d: Initial publish
- e5870d7: Install alpha package versions
