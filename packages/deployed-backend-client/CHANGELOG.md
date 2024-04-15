# @aws-amplify/deployed-backend-client

## 0.4.0-beta.7

### Patch Changes

- Updated dependencies [1e93535]
  - @aws-amplify/backend-output-schemas@0.7.0-beta.1

## 0.4.0-beta.6

### Patch Changes

- Updated dependencies [6c6af9b]
  - @aws-amplify/platform-core@0.5.0-beta.5

## 0.4.0-beta.5

### Patch Changes

- Updated dependencies [aec89f9]
- Updated dependencies [2a69684]
  - @aws-amplify/platform-core@0.5.0-beta.4

## 0.4.0-beta.4

### Minor Changes

- b0112e3: Surface model schema uri in deployed backend client output

### Patch Changes

- Updated dependencies [5e12247]
  - @aws-amplify/platform-core@0.5.0-beta.3

## 0.4.0-beta.3

### Minor Changes

- b931980: Add listBackends method to return a list of stacks for sandbox and branch deployments

### Patch Changes

- Updated dependencies [937086b]
  - @aws-amplify/platform-core@0.5.0-beta.2

## 0.4.0-beta.2

### Minor Changes

- 415c4c1: remove static method

## 0.4.0-beta.1

### Minor Changes

- ab7533d: Add output and configuration for customer owned lambdas

### Patch Changes

- Updated dependencies [ab7533d]
- Updated dependencies [4995bda]
  - @aws-amplify/backend-output-schemas@0.7.0-beta.0
  - @aws-amplify/platform-core@0.5.0-beta.1

## 0.3.11-beta.0

### Patch Changes

- Updated dependencies [74cbda0]
  - @aws-amplify/platform-core@0.5.0-beta.0

## 0.3.10

### Patch Changes

- Updated dependencies [85ced84f2]
  - @aws-amplify/backend-output-schemas@0.6.0
  - @aws-amplify/platform-core@0.4.4

## 0.3.9

### Patch Changes

- Updated dependencies [0809ad36d]
- Updated dependencies [618a2ea71]
  - @aws-amplify/platform-core@0.4.3
  - @aws-amplify/backend-output-schemas@0.5.2

## 0.3.8

### Patch Changes

- @aws-amplify/platform-core@0.4.2

## 0.3.7

### Patch Changes

- 04f067837: Implement consistent dependency declaration check. Bumped dependencies where necessary.
- Updated dependencies [04f067837]
  - @aws-amplify/backend-output-schemas@0.5.1
  - @aws-amplify/platform-core@0.4.1

## 0.3.6

### Patch Changes

- Updated dependencies [5678ab4d4]
  - @aws-amplify/platform-core@0.4.0

## 0.3.5

### Patch Changes

- Updated dependencies [8688aa00f]
- Updated dependencies [6a1c252e1]
- Updated dependencies [6a1c252e1]
- Updated dependencies [e5da97e37]
  - @aws-amplify/platform-core@0.3.4
  - @aws-amplify/backend-output-schemas@0.5.0

## 0.3.4

### Patch Changes

- d2c3baa7e: filter non-sandbox stacks
- Updated dependencies [db775ad6e]
  - @aws-amplify/platform-core@0.3.2

## 0.3.3

### Patch Changes

- Updated dependencies [aabe5dd61]
- Updated dependencies [5f336ffbb]
- Updated dependencies [85e619116]
  - @aws-amplify/platform-core@0.3.0

## 0.3.2

### Patch Changes

- 4fee488eb: chore: avoid crashing sandbox on failing to retrieve metadata
- Updated dependencies [cb855dfa5]
  - @aws-amplify/platform-core@0.2.2

## 0.3.1

### Patch Changes

- Updated dependencies [07b0dfc9f]
  - @aws-amplify/backend-output-schemas@0.4.0

## 0.3.0

### Minor Changes

- 71a63a16: Change stack naming strategy to include deployment type as a suffix

### Patch Changes

- Updated dependencies [71a63a16]
  - @aws-amplify/backend-output-schemas@0.3.0
  - @aws-amplify/platform-core@0.2.0

## 0.2.2

### Patch Changes

- bbb5b657: update sdk client deps
- 1cdb3ba9: add DELETING backend deployment status

## 0.2.1

### Patch Changes

- 79a6e09f: Change stackOutputKey to platformOutputKey
- Updated dependencies [79a6e09f]
- Updated dependencies [79a6e09f]
  - @aws-amplify/backend-output-schemas@0.2.1
  - @aws-amplify/platform-core@0.1.2

## 0.2.0

### Minor Changes

- 5585f473: Add apiId and modelIntrospectionSchema props
- f46f69fb: Allows overrides in backend metadata class factories
- b4f82717: Create a new deployed-backend-client package that provides a convenient interface for retrieving stack outputs

### Patch Changes

- f0ef7c6a: parse region from stack arn
- e9c0c9b5: add resources to stack metadata response
- a351b261: Fall back backend metadata lastUpdated field to `CreationTime` when `LastUpdatedTime` is not set
- b40d2d7b: if getOutput throws, filter the result from the sandbox list
- c5d18967: Re-export category entry points from @aws-amplify/backend and move shared test classes to new private package
- b40d2d7b: update input types
- 36d93e46: add license to package.json
- 4d411b67: remove model-introspection-schema from backend metadata
- bb3bf89a: add backend metadata manager
- 47456c26: Remove ESM features from construct dependency packages and make corresponding updates in consumer packages
- 0b029cb5: add link to supported resource types
- 5b9aac15: add backend identifier to sandbox metadata response
- d925b097: update api child stack finder
- 2525b582: add reader for cms metadata
- f6618771: add deployment type to stack outputs
- 512f0778: move UniqueBackendIdentifier to platform-core package
- Updated dependencies [ac3df080]
- Updated dependencies [b2b0c2da]
- Updated dependencies [7296e9d9]
- Updated dependencies [53779253]
- Updated dependencies [915c0325]
- Updated dependencies [395c8f0d]
- Updated dependencies [ce008a2c]
- Updated dependencies [36d93e46]
- Updated dependencies [47456c26]
- Updated dependencies [b4f82717]
- Updated dependencies [5b9aac15]
- Updated dependencies [05f97b26]
- Updated dependencies [2525b582]
- Updated dependencies [f75fa531]
- Updated dependencies [f6618771]
- Updated dependencies [f201c94a]
- Updated dependencies [512f0778]
- Updated dependencies [883d9da7]
  - @aws-amplify/backend-output-schemas@0.2.0
  - @aws-amplify/platform-core@0.1.1

## 0.2.0-alpha.11

### Patch Changes

- f0ef7c6a: parse region from stack arn

## 0.2.0-alpha.10

### Patch Changes

- 47456c26: Remove ESM features from construct dependency packages and make corresponding updates in consumer packages
- 0b029cb5: add link to supported resource types
- Updated dependencies [47456c26]
  - @aws-amplify/backend-output-schemas@0.2.0-alpha.8
  - @aws-amplify/platform-core@0.1.1-alpha.4

## 0.2.0-alpha.9

### Patch Changes

- 4d411b67: remove model-introspection-schema from backend metadata
- Updated dependencies [883d9da7]
  - @aws-amplify/backend-output-schemas@0.2.0-alpha.7

## 0.2.0-alpha.8

### Patch Changes

- e9c0c9b5: add resources to stack metadata response
- Updated dependencies [915c0325]
  - @aws-amplify/platform-core@0.1.1-alpha.3

## 0.2.0-alpha.7

### Patch Changes

- a351b261: Fall back backend metadata lastUpdated field to `CreationTime` when `LastUpdatedTime` is not set
- 5b9aac15: add backend identifier to sandbox metadata response
- Updated dependencies [5b9aac15]
  - @aws-amplify/platform-core@0.1.1-alpha.2

## 0.2.0-alpha.6

### Minor Changes

- 5585f473: Add apiId and modelIntrospectionSchema props

## 0.2.0-alpha.5

### Patch Changes

- b40d2d7b: if getOutput throws, filter the result from the sandbox list
- b40d2d7b: update input types

## 0.2.0-alpha.4

### Minor Changes

- f46f69fb: Allows overrides in backend metadata class factories

### Patch Changes

- d925b097: update api child stack finder

## 0.2.0-alpha.3

### Patch Changes

- 2525b582: add reader for cms metadata
- Updated dependencies [2525b582]
  - @aws-amplify/backend-output-schemas@0.2.0-alpha.6

## 0.2.0-alpha.2

### Patch Changes

- 36d93e46: add license to package.json
- Updated dependencies [36d93e46]
  - @aws-amplify/backend-output-schemas@0.2.0-alpha.5
  - @aws-amplify/platform-core@0.1.1-alpha.1

## 0.2.0-alpha.1

### Patch Changes

- bb3bf89a: add backend metadata manager
- f6618771: add deployment type to stack outputs
- 512f0778: move UniqueBackendIdentifier to platform-core package
- Updated dependencies [f6618771]
- Updated dependencies [512f0778]
  - @aws-amplify/backend-output-schemas@0.2.0-alpha.4
  - @aws-amplify/platform-core@0.1.1-alpha.0

## 0.2.0-alpha.0

### Minor Changes

- b4f82717: Create a new deployed-backend-client package that provides a convenient interface for retrieving stack outputs

### Patch Changes

- Updated dependencies [ac3df080]
- Updated dependencies [53779253]
- Updated dependencies [1dada824]
- Updated dependencies [b4f82717]
- Updated dependencies [05f97b26]
- Updated dependencies [f75fa531]
  - @aws-amplify/backend-output-schemas@0.2.0-alpha.3
