# @aws-amplify/backend-output-schemas

## 0.7.0

### Minor Changes

- ab7533d: Add output and configuration for customer owned lambdas

### Patch Changes

- 1e93535: chore: auto-generate cognito domain when external providers are configured

## 0.7.0-beta.1

### Patch Changes

- 1e93535: chore: auto-generate cognito domain when external providers are configured

## 0.7.0-beta.0

### Minor Changes

- ab7533d: Add output and configuration for customer owned lambdas

## 0.6.0

### Minor Changes

- 85ced84f2: Add ability to add custom outputs

## 0.5.2

### Patch Changes

- 618a2ea71: Add allowUnauthenticatedIdentities to config output.

## 0.5.1

### Patch Changes

- 04f067837: Implement consistent dependency declaration check. Bumped dependencies where necessary.

## 0.5.0

### Minor Changes

- 6a1c252e1: Expose domainPrefix as an input property to the Auth construct.

### Patch Changes

- 6a1c252e1: Cognito domains are now created by default, and oauth settings are exported to frontend config.

## 0.4.0

### Minor Changes

- 07b0dfc9f: Adding zero-config auth config to amplifyconfiguration.json

## 0.3.0

### Minor Changes

- 71a63a16: Change stack naming strategy to include deployment type as a suffix

## 0.2.1

### Patch Changes

- 79a6e09f: Change stackOutputKey to platformOutputKey
- 79a6e09f: Add aws_project_region to amplifyconfiguration.json

## 0.2.0

### Minor Changes

- ce008a2c: Add model generation package.
- b4f82717: Create a new deployed-backend-client package that provides a convenient interface for retrieving stack outputs
- 05f97b26: Add AppSync outputs to client config
- f75fa531: Refactor OutputStorageStrategy into stateless shared dependency
- 883d9da7: Migrate auth dependencies to CommonJS.

### Patch Changes

- ac3df080: Add "main" field to package.json to support CJS loaders
- b2b0c2da: force version bump
- 7296e9d9: Initial publish
- 53779253: re-export construct output objects in root package namespace
- 395c8f0d: Add identityPoolId to output, and set delete policy on user pool to delete.
- 36d93e46: add license to package.json
- 47456c26: Remove ESM features from construct dependency packages and make corresponding updates in consumer packages
- 2525b582: add reader for cms metadata
- f6618771: add deployment type to stack outputs
- f201c94a: add support for external auth providers

## 0.2.0-alpha.8

### Patch Changes

- 47456c26: Remove ESM features from construct dependency packages and make corresponding updates in consumer packages

## 0.2.0-alpha.7

### Minor Changes

- 883d9da7: Migrate auth dependencies to CommonJS.

## 0.2.0-alpha.6

### Patch Changes

- 2525b582: add reader for cms metadata

## 0.2.0-alpha.5

### Patch Changes

- 36d93e46: add license to package.json

## 0.2.0-alpha.4

### Patch Changes

- f6618771: add deployment type to stack outputs

## 0.2.0-alpha.3

### Minor Changes

- b4f82717: Create a new deployed-backend-client package that provides a convenient interface for retrieving stack outputs
- 05f97b26: Add AppSync outputs to client config
- f75fa531: Refactor OutputStorageStrategy into stateless shared dependency

### Patch Changes

- ac3df080: Add "main" field to package.json to support CJS loaders
- 53779253: re-export construct output objects in root package namespace
- 1dada824: chore: Update eslint config to new flat config type

## 0.2.0-alpha.2

### Minor Changes

- ce008a2: Add model generation package.

### Patch Changes

- f201c94: add support for external auth providers

## 0.1.1-alpha.1

### Patch Changes

- b2b0c2d: force version bump
- 395c8f0: Add identityPoolId to output, and set delete policy on user pool to delete.

## 0.1.1-alpha.0

### Patch Changes

- 7296e9d: Initial publish
