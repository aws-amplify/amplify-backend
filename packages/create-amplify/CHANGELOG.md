# create-amplify

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
