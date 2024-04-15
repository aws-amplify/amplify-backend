# @aws-amplify/model-generator

## 0.5.0-beta.9

### Patch Changes

- Updated dependencies [1e93535]
  - @aws-amplify/backend-output-schemas@0.7.0-beta.1
  - @aws-amplify/deployed-backend-client@0.4.0-beta.7

## 0.5.0-beta.8

### Minor Changes

- a494aca: refactor: use default directives

### Patch Changes

- @aws-amplify/deployed-backend-client@0.4.0-beta.6

## 0.5.0-beta.7

### Patch Changes

- 592bd4f: refactor log abstraction in `client-config`, `form-generator`, and `model-generator` packages

## 0.5.0-beta.6

### Patch Changes

- @aws-amplify/deployed-backend-client@0.4.0-beta.5

## 0.5.0-beta.5

### Minor Changes

- 8d73779: refactor model generation from schema uri

## 0.5.0-beta.4

### Patch Changes

- Updated dependencies [b0112e3]
  - @aws-amplify/deployed-backend-client@0.4.0-beta.4

## 0.5.0-beta.3

### Minor Changes

- 05c3c9b: Rename target format type and prop in model gen package

### Patch Changes

- Updated dependencies [b931980]
  - @aws-amplify/deployed-backend-client@0.4.0-beta.3

## 0.4.1-beta.2

### Patch Changes

- Updated dependencies [415c4c1]
  - @aws-amplify/deployed-backend-client@0.4.0-beta.2

## 0.4.1-beta.1

### Patch Changes

- Updated dependencies [ab7533d]
  - @aws-amplify/deployed-backend-client@0.4.0-beta.1
  - @aws-amplify/backend-output-schemas@0.7.0-beta.0

## 0.4.1-beta.0

### Patch Changes

- @aws-amplify/deployed-backend-client@0.3.11-beta.0

## 0.4.0

### Minor Changes

- 1814f1a69: Bumped graphql-generator to generate model introspection schema with custom queries/mutations/subscriptions

### Patch Changes

- Updated dependencies [85ced84f2]
  - @aws-amplify/backend-output-schemas@0.6.0
  - @aws-amplify/deployed-backend-client@0.3.10

## 0.3.0

### Minor Changes

- 4c1485aa4: print out file written for amplify generate commands

## 0.2.7

### Patch Changes

- Updated dependencies [618a2ea71]
  - @aws-amplify/backend-output-schemas@0.5.2
  - @aws-amplify/deployed-backend-client@0.3.9

## 0.2.6

### Patch Changes

- @aws-amplify/deployed-backend-client@0.3.8

## 0.2.5

### Patch Changes

- 04f067837: Implement consistent dependency declaration check. Bumped dependencies where necessary.
- Updated dependencies [04f067837]
  - @aws-amplify/deployed-backend-client@0.3.7
  - @aws-amplify/backend-output-schemas@0.5.1

## 0.2.4

### Patch Changes

- Updated dependencies [6a1c252e1]
- Updated dependencies [6a1c252e1]
  - @aws-amplify/backend-output-schemas@0.5.0
  - @aws-amplify/deployed-backend-client@0.3.5

## 0.2.3

### Patch Changes

- 8258926a0: Fix creating android model files that have path embedded in it
  - @aws-amplify/deployed-backend-client@0.3.3

## 0.2.2

### Patch Changes

- Updated dependencies [07b0dfc9f]
  - @aws-amplify/backend-output-schemas@0.4.0
  - @aws-amplify/deployed-backend-client@0.3.1

## 0.2.1

### Patch Changes

- Updated dependencies [71a63a16]
  - @aws-amplify/deployed-backend-client@0.3.0
  - @aws-amplify/backend-output-schemas@0.3.0

## 0.2.0

### Minor Changes

- 92950f99: Return a DocumentGenerationResult that has a writeToDirectory method
- 1a87500d: Generate model introspection schema when producing client config.
- b48dae80: Add wrapper to around types, documents, and model generation (`generateAPICode`).

  Change `createGraphqlDocumentGenerator` and `createGraphqlTypesGenerator` to use backendIdentifier and credentialProvider.

- 56fbcc5f: Generated typescript codegen by default, and add type defaults as well
- 1cefbdd4: feat: add model generation to @aws-amplify/model-generator
- ce008a2c: Add model generation package.
- 5c1d9de8: feat: add types generation

### Patch Changes

- 23fc5b13: Lint fixes
- 47bfb317: fix: generate multiple swift files
- b2b0c2da: force version bump
- c5d18967: Re-export category entry points from @aws-amplify/backend and move shared test classes to new private package
- 36d93e46: add license to package.json
- bb3bf89a: add backend metadata manager
- 1a6dd467: refactor: use @aws-amplify/graphql-generator in model-generator
- Updated dependencies [f0ef7c6a]
- Updated dependencies [e9c0c9b5]
- Updated dependencies [ac3df080]
- Updated dependencies [b2b0c2da]
- Updated dependencies [a351b261]
- Updated dependencies [7296e9d9]
- Updated dependencies [53779253]
- Updated dependencies [5585f473]
- Updated dependencies [b40d2d7b]
- Updated dependencies [c5d18967]
- Updated dependencies [b40d2d7b]
- Updated dependencies [395c8f0d]
- Updated dependencies [ce008a2c]
- Updated dependencies [36d93e46]
- Updated dependencies [4d411b67]
- Updated dependencies [f46f69fb]
- Updated dependencies [bb3bf89a]
- Updated dependencies [47456c26]
- Updated dependencies [0b029cb5]
- Updated dependencies [b4f82717]
- Updated dependencies [5b9aac15]
- Updated dependencies [05f97b26]
- Updated dependencies [d925b097]
- Updated dependencies [2525b582]
- Updated dependencies [f75fa531]
- Updated dependencies [f6618771]
- Updated dependencies [f201c94a]
- Updated dependencies [512f0778]
- Updated dependencies [883d9da7]
  - @aws-amplify/deployed-backend-client@0.2.0
  - @aws-amplify/backend-output-schemas@0.2.0

## 0.2.0-alpha.7

### Patch Changes

- 47bfb317: fix: generate multiple swift files
- Updated dependencies [f0ef7c6a]
  - @aws-amplify/deployed-backend-client@0.2.0-alpha.11

## 0.2.0-alpha.6

### Minor Changes

- 56fbcc5f: Generated typescript codegen by default, and add type defaults as well

## 0.2.0-alpha.5

### Minor Changes

- 1a87500d: Generate model introspection schema when producing client config.

## 0.2.0-alpha.4

### Patch Changes

- 36d93e46: add license to package.json
- Updated dependencies [36d93e46]
  - @aws-amplify/deployed-backend-client@0.2.0-alpha.2
  - @aws-amplify/backend-output-schemas@0.2.0-alpha.5

## 0.2.0-alpha.3

### Patch Changes

- 23fc5b13: Lint fixes
- bb3bf89a: add backend metadata manager
- Updated dependencies [bb3bf89a]
- Updated dependencies [f6618771]
- Updated dependencies [512f0778]
  - @aws-amplify/deployed-backend-client@0.2.0-alpha.1
  - @aws-amplify/backend-output-schemas@0.2.0-alpha.4

## 0.2.0-alpha.2

### Minor Changes

- 92950f99: Return a DocumentGenerationResult that has a writeToDirectory method
- b48dae80: Add wrapper to around types, documents, and model generation (`generateAPICode`).

  Change `createGraphqlDocumentGenerator` and `createGraphqlTypesGenerator` to use backendIdentifier and credentialProvider.

- 1cefbdd4: feat: add model generation to @aws-amplify/model-generator
- 5c1d9de8: feat: add types generation

### Patch Changes

- 1dada824: chore: Update eslint config to new flat config type
- 1a6dd467: refactor: use @aws-amplify/graphql-generator in model-generator
- Updated dependencies [ac3df080]
- Updated dependencies [53779253]
- Updated dependencies [1dada824]
- Updated dependencies [b4f82717]
- Updated dependencies [05f97b26]
- Updated dependencies [f75fa531]
  - @aws-amplify/backend-output-schemas@0.2.0-alpha.3
  - @aws-amplify/deployed-backend-client@0.2.0-alpha.0

## 0.2.0-alpha.1

### Minor Changes

- ce008a2: Add model generation package.

## 0.1.1-alpha.0

### Patch Changes

- b2b0c2d: force version bump
