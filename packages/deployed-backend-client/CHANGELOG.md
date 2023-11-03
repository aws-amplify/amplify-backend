# @aws-amplify/deployed-backend-client

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
