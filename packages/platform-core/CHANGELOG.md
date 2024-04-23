# @aws-amplify/platform-core

## 0.5.0

### Minor Changes

- 74cbda0: decentralize AmplifyErrorType
- ef111b4: Add friendly-name tag to resources
- 937086b: require "resolution" in AmplifyUserError options
- 4995bda: Introduce initial iteration of access control mechanism between backend resources.
  The APIs and functioality are NOT final and are subject to change without notice.

### Patch Changes

- 6c6af9b: chore: convert errors to AmplifyUserError
- ab7533d: Add output and configuration for customer owned lambdas
- aec89f9: chore: correctly handle quotes in the error messages
- 2a69684: chore: handle generic error serialization correctly
- 5e12247: feat(client-config): Generate client configuration based on a unified JSON schema
- b0b4dea: fix: serialize downstream errors when they are not generic Errors
- Updated dependencies [ab7533d]
- Updated dependencies [697d791]
- Updated dependencies [7cbe58b]
- Updated dependencies [109cd1b]
- Updated dependencies [db23a3f]
- Updated dependencies [4995bda]
- Updated dependencies [5e12247]
- Updated dependencies [48ff3bd]
  - @aws-amplify/plugin-types@0.9.0

## 0.5.0-beta.7

### Minor Changes

- ef111b4: Add friendly-name tag to resources

### Patch Changes

- Updated dependencies [db23a3f]
  - @aws-amplify/plugin-types@0.9.0-beta.3

## 0.5.0-beta.6

### Patch Changes

- b0b4dea: fix: serialize downstream errors when they are not generic Errors

## 0.5.0-beta.5

### Patch Changes

- 6c6af9b: chore: convert errors to AmplifyUserError
- Updated dependencies [48ff3bd]
  - @aws-amplify/plugin-types@0.9.0-beta.2

## 0.5.0-beta.4

### Patch Changes

- aec89f9: chore: correctly handle quotes in the error messages
- 2a69684: chore: handle generic error serialization correctly

## 0.5.0-beta.3

### Patch Changes

- 5e12247: feat(client-config): Generate client configuration based on a unified JSON schema
- Updated dependencies [5e12247]
  - @aws-amplify/plugin-types@0.9.0-beta.1

## 0.5.0-beta.2

### Minor Changes

- 937086b: require "resolution" in AmplifyUserError options

## 0.5.0-beta.1

### Minor Changes

- 4995bda: Introduce initial iteration of access control mechanism between backend resources.
  The APIs and functioality are NOT final and are subject to change without notice.

### Patch Changes

- ab7533d: Add output and configuration for customer owned lambdas
- Updated dependencies [ab7533d]
- Updated dependencies [7cbe58b]
- Updated dependencies [109cd1b]
- Updated dependencies [4995bda]
  - @aws-amplify/plugin-types@0.9.0-beta.0

## 0.5.0-beta.0

### Minor Changes

- 74cbda0: decentralize AmplifyErrorType

## 0.4.4

### Patch Changes

- Updated dependencies [85ced84f2]
- Updated dependencies [b73d76a78]
  - @aws-amplify/plugin-types@0.8.0

## 0.4.3

### Patch Changes

- 0809ad36d: fix empty catch block

## 0.4.2

### Patch Changes

- Updated dependencies [d087313e9]
  - @aws-amplify/plugin-types@0.7.1

## 0.4.1

### Patch Changes

- 04f067837: Implement consistent dependency declaration check. Bumped dependencies where necessary.

## 0.4.0

### Minor Changes

- 5678ab4d4: Sanitize invalid characters when constructing SSM parameter paths.
  Uses the same convention that is used for sanitizing stack names.

  **NOTE:** Any secrets created before this change will no longer be found.
  Recreate sandbox secrets using `npx amplify sandbox secret set` and recreate branch secrets in the Amplify console.

## 0.3.4

### Patch Changes

- 8688aa00f: Classify package json parsing errors as user errors
- e5da97e37: Move parameter path methods to ParameterPathConversions
- Updated dependencies [e5da97e37]
  - @aws-amplify/plugin-types@0.7.0

## 0.3.3

### Patch Changes

- Updated dependencies [6714cd69c]
- Updated dependencies [fd6516c8b]
  - @aws-amplify/plugin-types@0.6.0

## 0.3.2

### Patch Changes

- db775ad6e: Refactor error handling, introduce two new AmplifyErrors
- Updated dependencies [c6c39d04c]
  - @aws-amplify/plugin-types@0.5.0

## 0.3.1

### Patch Changes

- 5ed51cbd5: Upgrade aws-cdk to 2.110.1
- Updated dependencies [5ed51cbd5]
  - @aws-amplify/plugin-types@0.4.2

## 0.3.0

### Minor Changes

- aabe5dd61: Bump to minor version for usage data consent

### Patch Changes

- 5f336ffbb: close file handle after reading config
- 85e619116: integrate usage data tracking consent with usage-data-emitter

## 0.2.2

### Patch Changes

- cb855dfa5: chore: refactor packageJsonReader and generate installationIds from hostname

## 0.2.1

### Patch Changes

- 70685f36b: Add usage data metrics

## 0.2.0

### Minor Changes

- 71a63a16: Change stack naming strategy to include deployment type as a suffix

### Patch Changes

- Updated dependencies [8181509a]
- Updated dependencies [71a63a16]
  - @aws-amplify/plugin-types@0.4.0

## 0.1.4

### Patch Changes

- 68dc91e3: chore: support for JS backend apps

## 0.1.3

### Patch Changes

- 0bd8a3f3: add 'main' entry to package.json

## 0.1.2

### Patch Changes

- Updated dependencies [457b1662]
  - @aws-amplify/plugin-types@0.3.0

## 0.1.1

### Patch Changes

- 915c0325: Offer to reset the sandbox if a non deployable change is detected
- 36d93e46: add license to package.json
- 47456c26: Remove ESM features from construct dependency packages and make corresponding updates in consumer packages
- 5b9aac15: add backend identifier to sandbox metadata response
- f6618771: add deployment type to stack outputs
- 512f0778: move UniqueBackendIdentifier to platform-core package
- Updated dependencies [0398b8e1]
- Updated dependencies [b2b0c2da]
- Updated dependencies [18874854]
- Updated dependencies [7296e9d9]
- Updated dependencies [2ef006f1]
- Updated dependencies [3bda96ff]
- Updated dependencies [7103735b]
- Updated dependencies [3c36ace9]
- Updated dependencies [36d93e46]
- Updated dependencies [8f99476e]
- Updated dependencies [dc22fdf4]
- Updated dependencies [407a09ff]
- Updated dependencies [f201c94a]
- Updated dependencies [512f0778]
- Updated dependencies [883d9da7]
- Updated dependencies [59f5ea24]
  - @aws-amplify/plugin-types@0.2.0

## 0.1.1-alpha.4

### Patch Changes

- 47456c26: Remove ESM features from construct dependency packages and make corresponding updates in consumer packages

## 0.1.1-alpha.3

### Patch Changes

- 915c0325: Offer to reset the sandbox if a non deployable change is detected

## 0.1.1-alpha.2

### Patch Changes

- 5b9aac15: add backend identifier to sandbox metadata response

## 0.1.1-alpha.1

### Patch Changes

- 36d93e46: add license to package.json
- Updated dependencies [36d93e46]
  - @aws-amplify/plugin-types@0.2.0-alpha.7

## 0.1.1-alpha.0

### Patch Changes

- f6618771: add deployment type to stack outputs
- 512f0778: move UniqueBackendIdentifier to platform-core package
- Updated dependencies [0398b8e1]
- Updated dependencies [dc22fdf4]
- Updated dependencies [512f0778]
  - @aws-amplify/plugin-types@0.2.0-alpha.6
