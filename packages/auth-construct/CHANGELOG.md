# @aws-amplify/auth-construct-alpha

## 0.2.2

### Patch Changes

- Updated dependencies [79a6e09f]
- Updated dependencies [457b1662]
- Updated dependencies [79a6e09f]
  - @aws-amplify/backend-output-schemas@0.2.1
  - @aws-amplify/plugin-types@0.3.0

## 0.2.1

### Patch Changes

- d0119b25: Flatten loginWith type to improve autocompletion.

## 0.2.0

### Minor Changes

- 47456c26: Store attribution metadata in stack descriptions
- 2ef006f1: Support for email and phone number login has been updated to reflect new type structures. User attributes and verification settings have also been added.
- 3c36ace9: Implement UserPool trigger config
- 790c3a60: Add support for account recovery settings.
- dc22fdf4: Integrate secret to Auth
- f201c94a: add support for external auth providers

### Patch Changes

- a911292b: Change default behavior of user attributes to mutable.
- eac939b5: Update types and validation for email and sms.
- 0398b8e1: Bump graphql construct to 0.9.0 and remove some interface cruft
- b2b0c2da: force version bump
- 18874854: Rename MFA enforcementType to mode. Convert accountRecovery to string union instead of enum. Make totp setting optional. Make auth/unauth roles required properties.
- baa7a905: Move types package from peer deps to deps
- 7296e9d9: Initial publish
- fa75e94b: Remove custom attributes and change userAttributes to UserPool Standard Attributes.
- b0b5da94: Migrate Auth construct from ESM to CJS.
- 3bda96ff: update methods to use arrow notation
- 41ae36e2: Simplify phoneNumber to phone, and make verificationEmailStyle more user friendly.
- 7103735b: cdk lib dependency declaration
- db395e9c: Refactor clientSecretValue to clientSecret in Google provider props.
- 395c8f0d: Add identityPoolId to output, and set delete policy on user pool to delete.
- 3f0790b0: fix identity pool id ref
- ccacd673: Update types for MFA settings.
- 3f0790b0: fix cognito idp
- 36d93e46: add license to package.json
- 88fe36a1: Update code and link message templates to be more intuitive.
- 8f99476e: chore: upgrade aws-cdk to 2.103.0
- b10f2a61: Rename UserPoolWebClient to UserPoolAppClient
- 47456c26: Remove ESM features from construct dependency packages and make corresponding updates in consumer packages
- 5f02b83b: Fix issue with additional oauth settings and improve documentation.
- 740e2dc2: Update types for verification settings.
- f75fa531: Refactor OutputStorageStrategy into stateless shared dependency
- bc419e41: Update naming for social login providers.
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

## 0.2.0-alpha.18

### Minor Changes

- 47456c26: Store attribution metadata in stack descriptions

### Patch Changes

- 47456c26: Remove ESM features from construct dependency packages and make corresponding updates in consumer packages
- Updated dependencies [47456c26]
- Updated dependencies [47456c26]
  - @aws-amplify/backend-output-storage@0.2.0-alpha.6
  - @aws-amplify/backend-output-schemas@0.2.0-alpha.8

## 0.2.0-alpha.17

### Patch Changes

- 8f99476e: chore: upgrade aws-cdk to 2.103.0
- Updated dependencies [8f99476e]
  - @aws-amplify/backend-output-storage@0.2.0-alpha.5
  - @aws-amplify/plugin-types@0.2.0-alpha.11

## 0.2.0-alpha.16

### Patch Changes

- 18874854: Rename MFA enforcementType to mode. Convert accountRecovery to string union instead of enum. Make totp setting optional. Make auth/unauth roles required properties.
- Updated dependencies [18874854]
- Updated dependencies [883d9da7]
  - @aws-amplify/plugin-types@0.2.0-alpha.10
  - @aws-amplify/backend-output-schemas@0.2.0-alpha.7
  - @aws-amplify/backend-output-storage@0.2.0-alpha.4

## 0.2.0-alpha.15

### Patch Changes

- b0b5da94: Migrate Auth construct from ESM to CJS.

## 0.2.0-alpha.14

### Patch Changes

- b10f2a61: Rename UserPoolWebClient to UserPoolAppClient
- 5f02b83b: Fix issue with additional oauth settings and improve documentation.

## 0.2.0-alpha.13

### Patch Changes

- 88fe36a1: Update code and link message templates to be more intuitive.

## 0.2.0-alpha.12

### Patch Changes

- 41ae36e2: Simplify phoneNumber to phone, and make verificationEmailStyle more user friendly.
- db395e9c: Refactor clientSecretValue to clientSecret in Google provider props.

## 0.2.0-alpha.11

### Patch Changes

- fa75e94b: Remove custom attributes and change userAttributes to UserPool Standard Attributes.
- ccacd673: Update types for MFA settings.
- bc419e41: Update naming for social login providers.

## 0.2.0-alpha.10

### Patch Changes

- eac939b5: Update types and validation for email and sms.
- 59f5ea24: chore: upgrade aws-cdk to 2.100.0
- Updated dependencies [59f5ea24]
  - @aws-amplify/backend-output-storage@0.1.1-alpha.3
  - @aws-amplify/plugin-types@0.2.0-alpha.9

## 0.2.0-alpha.9

### Patch Changes

- 7103735b: cdk lib dependency declaration
- Updated dependencies [7103735b]
  - @aws-amplify/plugin-types@0.2.0-alpha.8

## 0.2.0-alpha.8

### Patch Changes

- 36d93e46: add license to package.json
- Updated dependencies [36d93e46]
  - @aws-amplify/backend-output-schemas@0.2.0-alpha.5
  - @aws-amplify/backend-output-storage@0.1.1-alpha.2
  - @aws-amplify/plugin-types@0.2.0-alpha.7

## 0.2.0-alpha.7

### Minor Changes

- dc22fdf4: Integrate secret to Auth

### Patch Changes

- 0398b8e1: Bump graphql construct to 0.9.0 and remove some interface cruft
- baa7a905: Move types package from peer deps to deps
- 740e2dc2: Update types for verification settings.
- Updated dependencies [0398b8e1]
- Updated dependencies [dc22fdf4]
- Updated dependencies [f6618771]
- Updated dependencies [512f0778]
  - @aws-amplify/backend-output-storage@0.1.1-alpha.1
  - @aws-amplify/plugin-types@0.2.0-alpha.6
  - @aws-amplify/backend-output-schemas@0.2.0-alpha.4

## 0.2.0-alpha.6

### Patch Changes

- a911292b: Change default behavior of user attributes to mutable.
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

## 0.2.0-alpha.5

### Minor Changes

- 3c36ace: Implement UserPool trigger config
- 790c3a6: Add support for account recovery settings.

### Patch Changes

- Updated dependencies [3c36ace]
  - @aws-amplify/plugin-types@0.1.1-alpha.4

## 0.2.0-alpha.4

### Minor Changes

- f201c94: add support for external auth providers

### Patch Changes

- Updated dependencies [ce008a2]
- Updated dependencies [f201c94]
  - @aws-amplify/backend-output-schemas@0.2.0-alpha.2
  - @aws-amplify/plugin-types@0.1.1-alpha.3

## 0.2.0-alpha.3

### Patch Changes

- b2b0c2d: force version bump
- 395c8f0: Add identityPoolId to output, and set delete policy on user pool to delete.
- Updated dependencies [b2b0c2d]
- Updated dependencies [395c8f0]
  - @aws-amplify/backend-output-schemas@0.1.1-alpha.1
  - @aws-amplify/plugin-types@0.1.1-alpha.2

## 0.2.0-alpha.2

### Patch Changes

- 3f0790b: fix identity pool id ref
- 3f0790b: fix cognito idp

## 0.2.0-alpha.1

### Minor Changes

- 2ef006f: Support for email and phone number login has been updated to reflect new type structures. User attributes and verification settings have also been added.

### Patch Changes

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
