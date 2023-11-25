# @aws-amplify/backend-data

## 0.8.3

### Patch Changes

- 308d1729a: Add messaging and test about not updating provision strategy

## 0.8.2

### Patch Changes

- 5ed51cbd5: Upgrade aws-cdk to 2.110.1
- Updated dependencies [5ed51cbd5]
  - @aws-amplify/backend-output-storage@0.2.6
  - @aws-amplify/plugin-types@0.4.2

## 0.8.1

### Patch Changes

- a2ed0ae14: Update data-schema version
  - @aws-amplify/backend-output-storage@0.2.5

## 0.8.0

### Minor Changes

- f449188cf: fix(@aws-amplify/backend-data) - Align with authorization modes used in the aws-amplify client library

## 0.7.1

### Patch Changes

- 0af242db4: Update import to data construct to allow for specific attribution tags
- Updated dependencies [cb855dfa5]
  - @aws-amplify/backend-output-storage@0.2.4

## 0.7.0

### Minor Changes

- 688db7bf8: Update deployment strategy to use amplify tables, and allow drop/replace semantics for sandbox tables

### Patch Changes

- 85bbab431: Use correct reference to identity pool id in IAM auth
- Updated dependencies [70685f36b]
  - @aws-amplify/backend-output-storage@0.2.3

## 0.6.0

### Minor Changes

- 3cda50cb7: Update backend-data to use new data-construct and explicitly specific default ddb strategy.

## 0.5.1

### Patch Changes

- bd8b5d1a5: update data/resource template; bump data-schema versions
- Updated dependencies [65fe3a8fd]
- Updated dependencies [cd5feeed0]
- Updated dependencies [07b0dfc9f]
  - @aws-amplify/plugin-types@0.4.1
  - @aws-amplify/backend-output-schemas@0.4.0
  - @aws-amplify/backend-output-storage@0.2.2

## 0.5.0

### Minor Changes

- 85a015b7: switch to using data-schema packages
- 71a63a16: Change stack naming strategy to include deployment type as a suffix

### Patch Changes

- 8181509a: Added a prefix to the auth cfnResources.
- Updated dependencies [8181509a]
- Updated dependencies [71a63a16]
  - @aws-amplify/plugin-types@0.4.0
  - @aws-amplify/backend-output-schemas@0.3.0
  - @aws-amplify/backend-output-storage@0.2.1

## 0.4.0

### Minor Changes

- 6be68224: Update authorizationMode config to simplify inputs, and more closely align with final interface
- 14a18c6e: Rename backend-graphql to backend-data

### Patch Changes

- a126d8df: bump amplify data versions

## 0.3.2

### Patch Changes

- 3bff764b: Expose user pool and client as cfn resources.
- Updated dependencies [3bff764b]
  - @aws-amplify/plugin-types@0.3.1

## 0.3.1

### Patch Changes

- 0bd8a3f3: add missing dev deps

## 0.3.0

### Minor Changes

- 42127d0a: Add support for functions as input to the defineData call.

### Patch Changes

- 1dd824cb: Bump graphql-api construct version

## 0.2.1

### Patch Changes

- 457b1662: getConstructFactory no longer throws an error if the factory is not found, and returns undefined instead.
- 46e0aad6: Update backend-graphql library to start decomposing translation layer from backend definitions into CDK
- Updated dependencies [79a6e09f]
- Updated dependencies [457b1662]
- Updated dependencies [79a6e09f]
  - @aws-amplify/backend-output-schemas@0.2.1
  - @aws-amplify/plugin-types@0.3.0

## 0.2.0

### Minor Changes

- 66190beb: integrate api-next as the default data experience
- b89c5397: Update to use v1.1.0 graphql-api-construct
- ae9e9f10: Create factory functions for defining category config

### Patch Changes

- 0398b8e1: Bump graphql construct to 0.9.0 and remove some interface cruft
- b2b0c2da: force version bump
- baa7a905: Move types package from peer deps to deps
- 7296e9d9: Initial publish
- c5d18967: Re-export category entry points from @aws-amplify/backend and move shared test classes to new private package
- 34c3fd38: Update backend definition file path convention
- 2ef006f1: Support for email and phone number login has been updated to reflect new type structures. User attributes and verification settings have also been added.
- 3bda96ff: update methods to use arrow notation
- 7103735b: cdk lib dependency declaration
- f8df0ed6: add defineData authorizationModes passthrough
- 30820177: Update @aws-amplify/graphql-api-construct dependency to 1.1.4
- 36d93e46: add license to package.json
- 8f99476e: chore: upgrade aws-cdk to 2.103.0
- dc22fdf4: Integrate secret to Auth
- 407a09ff: Implements backend secret feature, include backend secret resolver and the backend-secret pkg.
- f75fa531: Refactor OutputStorageStrategy into stateless shared dependency
- f6618771: add deployment type to stack outputs
- f201c94a: add support for external auth providers
- 59f5ea24: chore: upgrade aws-cdk to 2.100.0
- Updated dependencies [47456c26]
- Updated dependencies [ac3df080]
- Updated dependencies [0398b8e1]
- Updated dependencies [b2b0c2da]
- Updated dependencies [18874854]
- Updated dependencies [7296e9d9]
- Updated dependencies [53779253]
- Updated dependencies [2ef006f1]
- Updated dependencies [3bda96ff]
- Updated dependencies [7103735b]
- Updated dependencies [3c36ace9]
- Updated dependencies [395c8f0d]
- Updated dependencies [ce008a2c]
- Updated dependencies [36d93e46]
- Updated dependencies [8f99476e]
- Updated dependencies [dc22fdf4]
- Updated dependencies [407a09ff]
- Updated dependencies [47456c26]
- Updated dependencies [b4f82717]
- Updated dependencies [05f97b26]
- Updated dependencies [2525b582]
- Updated dependencies [f75fa531]
- Updated dependencies [f6618771]
- Updated dependencies [f201c94a]
- Updated dependencies [512f0778]
- Updated dependencies [883d9da7]
- Updated dependencies [59f5ea24]
  - @aws-amplify/backend-output-storage@0.2.0
  - @aws-amplify/backend-output-schemas@0.2.0
  - @aws-amplify/plugin-types@0.2.0

## 0.2.0-alpha.13

### Patch Changes

- Updated dependencies [47456c26]
- Updated dependencies [47456c26]
  - @aws-amplify/backend-output-storage@0.2.0-alpha.6
  - @aws-amplify/backend-output-schemas@0.2.0-alpha.8

## 0.2.0-alpha.12

### Patch Changes

- 8f99476e: chore: upgrade aws-cdk to 2.103.0
- Updated dependencies [8f99476e]
  - @aws-amplify/backend-output-storage@0.2.0-alpha.5
  - @aws-amplify/plugin-types@0.2.0-alpha.11

## 0.2.0-alpha.11

### Patch Changes

- Updated dependencies [18874854]
- Updated dependencies [883d9da7]
  - @aws-amplify/plugin-types@0.2.0-alpha.10
  - @aws-amplify/backend-output-schemas@0.2.0-alpha.7
  - @aws-amplify/backend-output-storage@0.2.0-alpha.4

## 0.2.0-alpha.10

### Patch Changes

- 30820177: Update @aws-amplify/graphql-api-construct dependency to 1.1.4

## 0.2.0-alpha.9

### Patch Changes

- 59f5ea24: chore: upgrade aws-cdk to 2.100.0
- Updated dependencies [59f5ea24]
  - @aws-amplify/backend-output-storage@0.1.1-alpha.3
  - @aws-amplify/plugin-types@0.2.0-alpha.9

## 0.2.0-alpha.8

### Patch Changes

- 7103735b: cdk lib dependency declaration
- Updated dependencies [7103735b]
  - @aws-amplify/plugin-types@0.2.0-alpha.8

## 0.2.0-alpha.7

### Patch Changes

- f8df0ed6: add defineData authorizationModes passthrough

## 0.2.0-alpha.6

### Minor Changes

- 66190beb: integrate api-next as the default data experience

### Patch Changes

- 36d93e46: add license to package.json
- Updated dependencies [36d93e46]
  - @aws-amplify/backend-output-schemas@0.2.0-alpha.5
  - @aws-amplify/backend-output-storage@0.1.1-alpha.2
  - @aws-amplify/plugin-types@0.2.0-alpha.7

## 0.2.0-alpha.5

### Minor Changes

- b89c5397: Update to use v1.1.0 graphql-api-construct
- ae9e9f10: Create factory functions for defining category config

### Patch Changes

- 0398b8e1: Bump graphql construct to 0.9.0 and remove some interface cruft
- baa7a905: Move types package from peer deps to deps
- 34c3fd38: Update backend definition file path convention
- dc22fdf4: Integrate secret to Auth
- f6618771: add deployment type to stack outputs
- Updated dependencies [0398b8e1]
- Updated dependencies [dc22fdf4]
- Updated dependencies [f6618771]
- Updated dependencies [512f0778]
  - @aws-amplify/backend-output-storage@0.1.1-alpha.1
  - @aws-amplify/plugin-types@0.2.0-alpha.6
  - @aws-amplify/backend-output-schemas@0.2.0-alpha.4

## 0.1.1-alpha.4

### Patch Changes

- 407a09ff: Implements backend secret feature, include backend secret resolver and the backend-secret pkg.
- f75fa531: Refactor OutputStorageStrategy into stateless shared dependency
- Updated dependencies [ac3df080]
- Updated dependencies [53779253]
- Updated dependencies [1dada824]
- Updated dependencies [407a09ff]
- Updated dependencies [b4f82717]
- Updated dependencies [05f97b26]
- Updated dependencies [f75fa531]
  - @aws-amplify/backend-output-schemas@0.2.0-alpha.3
  - @aws-amplify/backend-output-storage@0.1.1-alpha.0
  - @aws-amplify/plugin-types@0.1.1-alpha.5

## 0.1.1-alpha.3

### Patch Changes

- f201c94: add support for external auth providers
- Updated dependencies [ce008a2]
- Updated dependencies [f201c94]
  - @aws-amplify/backend-output-schemas@0.2.0-alpha.2
  - @aws-amplify/plugin-types@0.1.1-alpha.3

## 0.1.1-alpha.2

### Patch Changes

- b2b0c2d: force version bump
- Updated dependencies [b2b0c2d]
- Updated dependencies [395c8f0]
  - @aws-amplify/backend-output-schemas@0.1.1-alpha.1
  - @aws-amplify/plugin-types@0.1.1-alpha.2

## 0.1.1-alpha.1

### Patch Changes

- 2ef006f: Support for email and phone number login has been updated to reflect new type structures. User attributes and verification settings have also been added.
- 3bda96f: update methods to use arrow notation
- Updated dependencies [2ef006f]
- Updated dependencies [3bda96f]
  - @aws-amplify/plugin-types@0.1.1-alpha.1

## 0.1.1-alpha.0

### Patch Changes

- 7296e9d: Initial publish
- Updated dependencies [7296e9d]
  - @aws-amplify/backend-output-schemas@0.1.1-alpha.0
  - @aws-amplify/plugin-types@0.1.1-alpha.0
