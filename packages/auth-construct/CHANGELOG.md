# @aws-amplify/auth-construct-alpha

## 0.6.0-beta.11

### Patch Changes

- 1e93535: chore: auto-generate cognito domain when external providers are configured
- Updated dependencies [1e93535]
  - @aws-amplify/backend-output-schemas@0.7.0-beta.1
  - @aws-amplify/backend-output-storage@0.4.0-beta.6

## 0.6.0-beta.10

### Patch Changes

- 1b8386b: Auth user attribute mappings have been simplified to use strings instead of objects with an attributeName property.
- Updated dependencies [48ff3bd]
  - @aws-amplify/plugin-types@0.9.0-beta.2
  - @aws-amplify/backend-output-storage@0.4.0-beta.5

## 0.6.0-beta.9

### Patch Changes

- fe59a49: This change adds support for customizing the email verification link text.

## 0.6.0-beta.8

### Patch Changes

- 394b72e: chore: updates to client config schema and config generation

## 0.6.0-beta.7

### Patch Changes

- @aws-amplify/backend-output-storage@0.4.0-beta.4

## 0.6.0-beta.6

### Patch Changes

- Updated dependencies [5e12247]
  - @aws-amplify/plugin-types@0.9.0-beta.1
  - @aws-amplify/backend-output-storage@0.4.0-beta.3

## 0.6.0-beta.5

### Patch Changes

- @aws-amplify/backend-output-storage@0.4.0-beta.2

## 0.6.0-beta.4

### Patch Changes

- 1d444df: Fix deployment bug with SAML providers.

## 0.6.0-beta.3

### Patch Changes

- c54625f: Update frontend config to output OIDC provider names instead of just 'OIDC'.

## 0.6.0-beta.2

### Minor Changes

- 4995bda: Introduce initial iteration of access control mechanism between backend resources.
  The APIs and functioality are NOT final and are subject to change without notice.
- 85e953f: OIDC now supports a list of providers which will be configured for your user pool.

### Patch Changes

- ab7533d: Add output and configuration for customer owned lambdas
- 7cbe58b: bump aws-cdk-lib to 2.127.0
- 109cd1b: Add support for generating user pool groups.
- Updated dependencies [ab7533d]
- Updated dependencies [7cbe58b]
- Updated dependencies [109cd1b]
- Updated dependencies [4995bda]
  - @aws-amplify/backend-output-schemas@0.7.0-beta.0
  - @aws-amplify/backend-output-storage@0.4.0-beta.1
  - @aws-amplify/plugin-types@0.9.0-beta.0

## 0.5.7-beta.1

### Patch Changes

- @aws-amplify/backend-output-storage@0.3.1-beta.0

## 0.5.7-beta.0

### Patch Changes

- 3cb2a527f: Fix a bug that would cause attribute mappings to be ignored.

## 0.5.6

### Patch Changes

- 29fb32bcf: OIDC attributeRequestMethod no longer requires importing OidcAttributeRequestMethod.

## 0.5.5

### Patch Changes

- 8c371b1ff: Allow users to customize the resource names for auth.
- 85ced84f2: Add ability to add custom outputs
- 348717b55: Fix bug in frontend config where oauth would not be output if domain prefix was not defined.
- Updated dependencies [85ced84f2]
- Updated dependencies [b73d76a78]
  - @aws-amplify/backend-output-schemas@0.6.0
  - @aws-amplify/backend-output-storage@0.3.0
  - @aws-amplify/plugin-types@0.8.0

## 0.5.4

### Patch Changes

- 48ca0e703: Automatically map email attributes for social providers.

## 0.5.3

### Patch Changes

- 618a2ea71: Add allowUnauthenticatedIdentities to config output.
- f70611df3: Updated SAML metadata types to simplify imports.
- Updated dependencies [618a2ea71]
  - @aws-amplify/backend-output-schemas@0.5.2
  - @aws-amplify/backend-output-storage@0.2.11

## 0.5.2

### Patch Changes

- Updated dependencies [d087313e9]
  - @aws-amplify/plugin-types@0.7.1
  - @aws-amplify/backend-output-storage@0.2.10

## 0.5.1

### Patch Changes

- 04f067837: Implement consistent dependency declaration check. Bumped dependencies where necessary.
- Updated dependencies [04f067837]
  - @aws-amplify/backend-output-schemas@0.5.1
  - @aws-amplify/backend-output-storage@0.2.9

## 0.5.0

### Minor Changes

- 6a1c252e1: Expose domainPrefix as an input property to the Auth construct.

### Patch Changes

- 6a1c252e1: Cognito domains are now created by default, and oauth settings are exported to frontend config.
- Updated dependencies [e5da97e37]
- Updated dependencies [6a1c252e1]
- Updated dependencies [6a1c252e1]
  - @aws-amplify/plugin-types@0.7.0
  - @aws-amplify/backend-output-schemas@0.5.0
  - @aws-amplify/backend-output-storage@0.2.7

## 0.4.4

### Patch Changes

- fed9fddbb: Fixes bug with ARN construction when configuring SAML/OIDC
- Updated dependencies [6714cd69c]
- Updated dependencies [fd6516c8b]
  - @aws-amplify/plugin-types@0.6.0

## 0.4.3

### Patch Changes

- Updated dependencies [c6c39d04c]
  - @aws-amplify/plugin-types@0.5.0

## 0.4.2

### Patch Changes

- 5ed51cbd5: Upgrade aws-cdk to 2.110.1
- Updated dependencies [5ed51cbd5]
  - @aws-amplify/backend-output-storage@0.2.6
  - @aws-amplify/plugin-types@0.4.2

## 0.4.1

### Patch Changes

- 48c25802d: Auth role policy action is now AssumeRoleWithWebIdentity.
- Updated dependencies [cb855dfa5]
  - @aws-amplify/backend-output-storage@0.2.4

## 0.4.0

### Minor Changes

- 07b0dfc9f: Adding zero-config auth config to amplifyconfiguration.json

### Patch Changes

- Updated dependencies [65fe3a8fd]
- Updated dependencies [cd5feeed0]
- Updated dependencies [07b0dfc9f]
  - @aws-amplify/plugin-types@0.4.1
  - @aws-amplify/backend-output-schemas@0.4.0
  - @aws-amplify/backend-output-storage@0.2.2

## 0.3.0

### Minor Changes

- 71a63a16: Change stack naming strategy to include deployment type as a suffix

### Patch Changes

- f30c438e: Update OAuthScope types to string union.
- 95818a7a: Add conditions to default unauth and auth role
- 8181509a: Added a prefix to the auth cfnResources.
- f30c438e: Update the documentation for phone number 'verificationMessage'.
- Updated dependencies [8181509a]
- Updated dependencies [71a63a16]
  - @aws-amplify/plugin-types@0.4.0
  - @aws-amplify/backend-output-schemas@0.3.0
  - @aws-amplify/backend-output-storage@0.2.1

## 0.2.4

### Patch Changes

- 3bff764b: Expose user pool and client as cfn resources.
- Updated dependencies [3bff764b]
  - @aws-amplify/plugin-types@0.3.1

## 0.2.3

### Patch Changes

- ce371dac: Update default user pool deletion to DESTROY.

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
