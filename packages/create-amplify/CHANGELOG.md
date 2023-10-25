# create-amplify

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
