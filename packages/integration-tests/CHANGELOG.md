# @aws-amplify/integration-tests

## 0.5.2

### Patch Changes

- ca58bc2: re-increment versions for PR# 1397

## 0.5.1

### Patch Changes

- a817f2d: Change the default client config version

## 0.5.0

### Minor Changes

- f76e983: Use updated metadata fields in form and model generation
- cec91d5: Add dynamic environment variables to function type definition files
- 911c4c6: chore!: update data-construct, data-schema, data-schema-types dependencies
- 0d1b00e: Update generated env package location and use the $ symbol
- 62dab44: add support for function dependencies that require .node files

### Patch Changes

- 54c69c4: chore: rename the new client config file name
- 697d791: Use screaming snake case for SSM entries
- 912034e: limit defineData call to one
- 7cbe58b: bump aws-cdk-lib to 2.127.0
- 26cdffd: backend-data: add support for first-class defineFunction
- 7cbe58b: adding triggers to storage events
- 3998cd3: Fix how paths is added to tsconfig
- 318335d: Ensure resource access env vars are added to function typed shim files
- 4123204: fix: order of array in test assert in gitignored tests
- 7f5edee: Ensure typed shim files contain only the function name
- 5e12247: feat(client-config): Generate client configuration based on a unified JSON schema
- e90f066: add e2e test for sandbox --once deployment
- 0e6f436: chore: bump data-schema packages version (0.16.0)

## 0.5.0-beta.10

### Patch Changes

- e90f066: add e2e test for sandbox --once deployment

## 0.5.0-beta.9

### Minor Changes

- 911c4c6: chore!: update data-construct, data-schema, data-schema-types dependencies

## 0.5.0-beta.8

### Patch Changes

- 54c69c4: chore: rename the new client config file name
- 4123204: fix: order of array in test assert in gitignored tests

## 0.5.0-beta.7

### Minor Changes

- f76e983: Use updated metadata fields in form and model generation

## 0.5.0-beta.6

### Minor Changes

- 62dab44: add support for function dependencies that require .node files

## 0.5.0-beta.5

### Minor Changes

- 0d1b00e: Update generated env package location and use the $ symbol

## 0.5.0-beta.4

### Patch Changes

- 5e12247: feat(client-config): Generate client configuration based on a unified JSON schema

## 0.5.0-beta.3

### Patch Changes

- 26cdffd: backend-data: add support for first-class defineFunction

## 0.5.0-beta.2

### Patch Changes

- 7f5edee: Ensure typed shim files contain only the function name

## 0.5.0-beta.1

### Minor Changes

- cec91d5: Add dynamic environment variables to function type definition files

### Patch Changes

- 912034e: limit defineData call to one
- 3998cd3: Fix how paths is added to tsconfig
- 318335d: Ensure resource access env vars are added to function typed shim files

## 0.4.4-beta.0

### Patch Changes

- 7cbe58b: bump aws-cdk-lib to 2.127.0
- 7cbe58b: adding triggers to storage events

## 0.4.3

### Patch Changes

- 6a001bfe8: Make shared secret names unique for e2e tests

## 0.4.2

### Patch Changes

- d087313e9: Enhance functions to fallback to resolve shared secrets

## 0.4.1

### Patch Changes

- 04f067837: Implement consistent dependency declaration check. Bumped dependencies where necessary.

## 0.4.0

### Minor Changes

- 6a1c252e1: Expose domainPrefix as an input property to the Auth construct.

### Patch Changes

- 6a1c252e1: Cognito domains are now created by default, and oauth settings are exported to frontend config.

## 0.3.8

### Patch Changes

- ae0819a96: match aws-cdk-lib versions
- db775ad6e: Refactor error handling, introduce two new AmplifyErrors

## 0.3.7

### Patch Changes

- 5ed51cbd5: Upgrade aws-cdk to 2.110.1
- 5ed51cbd5: Update data schema for e2e hotswappable test as per the new getting started

## 0.3.6

### Patch Changes

- 733518a71: Add e2e testing for config generation

## 0.3.5

### Patch Changes

- fe2d96f04: run tests in parallel

## 0.3.4

### Patch Changes

- 48c25802d: Auth role policy action is now AssumeRoleWithWebIdentity.

## 0.3.3

### Patch Changes

- 5cc252204: use latest aws-amplify verion in project_creator
- 70685f36b: Add usage data metrics

## 0.3.2

### Patch Changes

- 23b369d79: Add amplify comment when writing to gitignore
- bd8b5d1a5: update data/resource template; bump data-schema versions

## 0.3.1

### Patch Changes

- fdff69be3: Update error message when running create amplify in an existing amplify project

## 0.3.0

### Minor Changes

- 85a015b7: switch to using data-schema packages

## 0.2.4

### Patch Changes

- 8f03cd09: enable branch linker by default

## 0.2.3

### Patch Changes

- 68dc91e3: chore: support for JS backend apps
- a126d8df: bump amplify data versions

## 0.2.2

### Patch Changes

- 79a6e09f: Change stackOutputKey to platformOutputKey
- 93c956ea: Add aws_project_region to e2e test assert
- 79a6e09f: Add aws_project_region to amplifyconfiguration.json

## 0.2.1

### Patch Changes

- d0119b25: Flatten loginWith type to improve autocompletion.
- 4e48e4ba: chore: add new defineBackend to better align with other backend factories

## 0.2.0

### Minor Changes

- 66190beb: integrate api-next as the default data experience
- ce008a2c: Add model generation package.
- d1295912: Add Auth external identity provider to e2e test

### Patch Changes

- e233eab6: make default amplifyconfig format json, change js format to mjs, and add dart format
- e233eab6: Toggle resolveJsonModule flag when creating tsconfig
- 7853b00a: Make CLI options kebab case
- b2b0c2da: force version bump
- 7296e9d9: Initial publish
- ecacab6c: stream stderr of child process
- c5d18967: Re-export category entry points from @aws-amplify/backend and move shared test classes to new private package
- 9addd57f: Ensure .gitignore file exists with correct content in create-amplify flow
- 3c36ace9: Implement UserPool trigger config
- 395c8f0d: Add identityPoolId to output, and set delete policy on user pool to delete.
- 36d93e46: add license to package.json
- 790c3a60: Add support for account recovery settings.
- b10f2a61: Rename UserPoolWebClient to UserPoolAppClient
- f75fa531: Refactor OutputStorageStrategy into stateless shared dependency
- f6618771: add deployment type to stack outputs

## 0.2.0-alpha.10

### Patch Changes

- 9addd57f: Ensure .gitignore file exists with correct content in create-amplify flow

## 0.2.0-alpha.9

### Patch Changes

- e233eab6: make default amplifyconfig format json, change js format to mjs, and add dart format
- e233eab6: Toggle resolveJsonModule flag when creating tsconfig

## 0.2.0-alpha.8

### Patch Changes

- b10f2a61: Rename UserPoolWebClient to UserPoolAppClient

## 0.2.0-alpha.7

### Patch Changes

- 7853b00a: Make CLI options kebab case

## 0.2.0-alpha.6

### Minor Changes

- 66190beb: integrate api-next as the default data experience

### Patch Changes

- 36d93e46: add license to package.json

## 0.2.0-alpha.5

### Patch Changes

- ecacab6c: stream stderr of child process
- f6618771: add deployment type to stack outputs

## 0.2.0-alpha.4

### Patch Changes

- f75fa531: Refactor OutputStorageStrategy into stateless shared dependency

## 0.2.0-alpha.3

### Patch Changes

- 3c36ace: Implement UserPool trigger config
- 790c3a6: Add support for account recovery settings.

## 0.2.0-alpha.2

### Minor Changes

- ce008a2: Add model generation package.

## 0.1.1-alpha.1

### Patch Changes

- b2b0c2d: force version bump
- 395c8f0: Add identityPoolId to output, and set delete policy on user pool to delete.

## 0.1.1-alpha.0

### Patch Changes

- 7296e9d: Initial publish
