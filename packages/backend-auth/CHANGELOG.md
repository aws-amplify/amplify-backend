# @aws-amplify/backend-auth

## 0.7.0

### Minor Changes

- c93ecde: Add oauth client config even if no external provider is configured

### Patch Changes

- Updated dependencies [c93ecde]
- Updated dependencies [8995e3b]
- Updated dependencies [ce5a5ac]
  - @aws-amplify/auth-construct@0.7.1
  - @aws-amplify/plugin-types@0.10.0
  - @aws-amplify/backend-output-storage@0.4.1

## 0.6.1

### Patch Changes

- 74d2cd4: drop alpha suffix from auth-construct package
- Updated dependencies [a3c93c6]
- Updated dependencies [c637d0e]
- Updated dependencies [74d2cd4]
  - @aws-amplify/auth-construct@0.7.0

## 0.6.0

### Minor Changes

- 1058383: Standardize name validation across storage, functions, auth, and data

### Patch Changes

- d558832: Update sms and mfa types to use code generation functions instead of strings.
- Updated dependencies [d558832]
  - @aws-amplify/auth-construct-alpha@0.6.1

## 0.5.0

### Minor Changes

- ab05ae0: attach policy & ssm params to acces userpool from auth resource
- 4995bda: Introduce initial iteration of access control mechanism between backend resources.
  The APIs and functioality are NOT final and are subject to change without notice.
- 85e953f: OIDC now supports a list of providers which will be configured for your user pool.
- f999897: Enable auth group access to storage and change syntax for specifying owner-based access

### Patch Changes

- 6c6af9b: chore: convert errors to AmplifyUserError
- 697d791: Use screaming snake case for SSM entries
- 7cbe58b: bump aws-cdk-lib to 2.127.0
- ef111b4: Add friendly-name tag to resources
- 5ebc1d4: Added manageGroups as an IAM action.
- 937086b: require "resolution" in AmplifyUserError options
- aee7501: limit defineAuth call to one
- 48ff3bd: Add cfnFunction to function resources
- Updated dependencies [ab7533d]
- Updated dependencies [697d791]
- Updated dependencies [7cbe58b]
- Updated dependencies [1e93535]
- Updated dependencies [109cd1b]
- Updated dependencies [65b516d]
- Updated dependencies [db23a3f]
- Updated dependencies [1d444df]
- Updated dependencies [394b72e]
- Updated dependencies [fe59a49]
- Updated dependencies [c54625f]
- Updated dependencies [3cb2a52]
- Updated dependencies [4995bda]
- Updated dependencies [85e953f]
- Updated dependencies [5e12247]
- Updated dependencies [48ff3bd]
- Updated dependencies [1b8386b]
  - @aws-amplify/backend-output-storage@0.4.0
  - @aws-amplify/auth-construct-alpha@0.6.0
  - @aws-amplify/plugin-types@0.9.0

## 0.5.0-beta.13

### Patch Changes

- ef111b4: Add friendly-name tag to resources
- Updated dependencies [db23a3f]
  - @aws-amplify/plugin-types@0.9.0-beta.3
  - @aws-amplify/backend-output-storage@0.4.0-beta.8
  - @aws-amplify/auth-construct-alpha@0.6.0-beta.13

## 0.5.0-beta.12

### Patch Changes

- Updated dependencies [65b516d]
  - @aws-amplify/auth-construct-alpha@0.6.0-beta.12
  - @aws-amplify/backend-output-storage@0.4.0-beta.7

## 0.5.0-beta.11

### Patch Changes

- Updated dependencies [1e93535]
  - @aws-amplify/auth-construct-alpha@0.6.0-beta.11
  - @aws-amplify/backend-output-storage@0.4.0-beta.6

## 0.5.0-beta.10

### Patch Changes

- 6c6af9b: chore: convert errors to AmplifyUserError
- 5ebc1d4: Added manageGroups as an IAM action.
- 48ff3bd: Add cfnFunction to function resources
- Updated dependencies [48ff3bd]
- Updated dependencies [1b8386b]
  - @aws-amplify/plugin-types@0.9.0-beta.2
  - @aws-amplify/auth-construct-alpha@0.6.0-beta.10
  - @aws-amplify/backend-output-storage@0.4.0-beta.5

## 0.5.0-beta.9

### Patch Changes

- Updated dependencies [fe59a49]
  - @aws-amplify/auth-construct-alpha@0.6.0-beta.9

## 0.5.0-beta.8

### Patch Changes

- Updated dependencies [394b72e]
  - @aws-amplify/auth-construct-alpha@0.6.0-beta.8

## 0.5.0-beta.7

### Patch Changes

- @aws-amplify/backend-output-storage@0.4.0-beta.4
- @aws-amplify/auth-construct-alpha@0.6.0-beta.7

## 0.5.0-beta.6

### Patch Changes

- Updated dependencies [5e12247]
  - @aws-amplify/plugin-types@0.9.0-beta.1
  - @aws-amplify/backend-output-storage@0.4.0-beta.3
  - @aws-amplify/auth-construct-alpha@0.6.0-beta.6

## 0.5.0-beta.5

### Patch Changes

- 937086b: require "resolution" in AmplifyUserError options
  - @aws-amplify/backend-output-storage@0.4.0-beta.2
  - @aws-amplify/auth-construct-alpha@0.6.0-beta.5

## 0.5.0-beta.4

### Minor Changes

- ab05ae0: attach policy & ssm params to acces userpool from auth resource
- f999897: Enable auth group access to storage and change syntax for specifying owner-based access

### Patch Changes

- Updated dependencies [1d444df]
  - @aws-amplify/auth-construct-alpha@0.6.0-beta.4

## 0.5.0-beta.3

### Patch Changes

- aee7501: limit defineAuth call to one
- Updated dependencies [c54625f]
  - @aws-amplify/auth-construct-alpha@0.6.0-beta.3

## 0.5.0-beta.2

### Minor Changes

- 4995bda: Introduce initial iteration of access control mechanism between backend resources.
  The APIs and functioality are NOT final and are subject to change without notice.
- 85e953f: OIDC now supports a list of providers which will be configured for your user pool.

### Patch Changes

- 7cbe58b: bump aws-cdk-lib to 2.127.0
- Updated dependencies [ab7533d]
- Updated dependencies [7cbe58b]
- Updated dependencies [109cd1b]
- Updated dependencies [4995bda]
- Updated dependencies [85e953f]
  - @aws-amplify/backend-output-storage@0.4.0-beta.1
  - @aws-amplify/auth-construct-alpha@0.6.0-beta.2
  - @aws-amplify/plugin-types@0.9.0-beta.0

## 0.4.8-beta.1

### Patch Changes

- @aws-amplify/backend-output-storage@0.3.1-beta.0
- @aws-amplify/auth-construct-alpha@0.5.7-beta.1

## 0.4.8-beta.0

### Patch Changes

- Updated dependencies [3cb2a527f]
  - @aws-amplify/auth-construct-alpha@0.5.7-beta.0

## 0.4.7

### Patch Changes

- Updated dependencies [29fb32bcf]
  - @aws-amplify/auth-construct-alpha@0.5.6

## 0.4.6

### Patch Changes

- Updated dependencies [8c371b1ff]
- Updated dependencies [85ced84f2]
- Updated dependencies [348717b55]
- Updated dependencies [b73d76a78]
  - @aws-amplify/auth-construct-alpha@0.5.5
  - @aws-amplify/backend-output-storage@0.3.0
  - @aws-amplify/plugin-types@0.8.0

## 0.4.5

### Patch Changes

- Updated dependencies [48ca0e703]
  - @aws-amplify/auth-construct-alpha@0.5.4

## 0.4.4

### Patch Changes

- Updated dependencies [618a2ea71]
- Updated dependencies [f70611df3]
  - @aws-amplify/auth-construct-alpha@0.5.3
  - @aws-amplify/backend-output-storage@0.2.11

## 0.4.3

### Patch Changes

- d087313e9: Enhance functions to fallback to resolve shared secrets
- Updated dependencies [d087313e9]
  - @aws-amplify/plugin-types@0.7.1
  - @aws-amplify/auth-construct-alpha@0.5.2
  - @aws-amplify/backend-output-storage@0.2.10

## 0.4.2

### Patch Changes

- 04f067837: Implement consistent dependency declaration check. Bumped dependencies where necessary.
- Updated dependencies [04f067837]
  - @aws-amplify/auth-construct-alpha@0.5.1
  - @aws-amplify/backend-output-storage@0.2.9

## 0.4.1

### Patch Changes

- @aws-amplify/backend-output-storage@0.2.8

## 0.4.0

### Minor Changes

- 6a1c252e1: Expose domainPrefix as an input property to the Auth construct.

### Patch Changes

- 6a1c252e1: Cognito domains are now created by default, and oauth settings are exported to frontend config.
- Updated dependencies [e5da97e37]
- Updated dependencies [6a1c252e1]
- Updated dependencies [6a1c252e1]
  - @aws-amplify/plugin-types@0.7.0
  - @aws-amplify/auth-construct-alpha@0.5.0
  - @aws-amplify/backend-output-storage@0.2.7

## 0.3.7

### Patch Changes

- Updated dependencies [6714cd69c]
- Updated dependencies [fed9fddbb]
- Updated dependencies [fd6516c8b]
  - @aws-amplify/plugin-types@0.6.0
  - @aws-amplify/auth-construct-alpha@0.4.4

## 0.3.6

### Patch Changes

- Updated dependencies [c6c39d04c]
  - @aws-amplify/plugin-types@0.5.0
  - @aws-amplify/auth-construct-alpha@0.4.3

## 0.3.5

### Patch Changes

- 5ed51cbd5: Upgrade aws-cdk to 2.110.1
- Updated dependencies [5ed51cbd5]
  - @aws-amplify/backend-output-storage@0.2.6
  - @aws-amplify/auth-construct-alpha@0.4.2
  - @aws-amplify/plugin-types@0.4.2

## 0.3.4

### Patch Changes

- @aws-amplify/backend-output-storage@0.2.5

## 0.3.3

### Patch Changes

- Updated dependencies [48c25802d]
- Updated dependencies [cb855dfa5]
  - @aws-amplify/auth-construct-alpha@0.4.1
  - @aws-amplify/backend-output-storage@0.2.4

## 0.3.2

### Patch Changes

- Updated dependencies [70685f36b]
  - @aws-amplify/backend-output-storage@0.2.3

## 0.3.1

### Patch Changes

- cd5feeed0: Expand types for Auth to improve auto completion suggestions.
- Updated dependencies [65fe3a8fd]
- Updated dependencies [cd5feeed0]
- Updated dependencies [07b0dfc9f]
  - @aws-amplify/plugin-types@0.4.1
  - @aws-amplify/auth-construct-alpha@0.4.0
  - @aws-amplify/backend-output-storage@0.2.2

## 0.3.0

### Minor Changes

- 71a63a16: Change stack naming strategy to include deployment type as a suffix

### Patch Changes

- Updated dependencies [f30c438e]
- Updated dependencies [95818a7a]
- Updated dependencies [8181509a]
- Updated dependencies [f30c438e]
- Updated dependencies [71a63a16]
  - @aws-amplify/auth-construct-alpha@0.3.0
  - @aws-amplify/plugin-types@0.4.0
  - @aws-amplify/backend-output-storage@0.2.1

## 0.2.3

### Patch Changes

- 0bd8a3f3: add missing dev deps

## 0.2.2

### Patch Changes

- Updated dependencies [457b1662]
  - @aws-amplify/plugin-types@0.3.0
  - @aws-amplify/auth-construct-alpha@0.2.2

## 0.2.1

### Patch Changes

- d0119b25: Flatten loginWith type to improve autocompletion.
- Updated dependencies [d0119b25]
  - @aws-amplify/auth-construct-alpha@0.2.1

## 0.2.0

### Minor Changes

- bf24d363: Change Auth external providers'IDs to secret type
- 3c36ace9: Implement UserPool trigger config
- dc22fdf4: Integrate secret to Auth
- ae9e9f10: Create factory functions for defining category config

### Patch Changes

- b2b0c2da: force version bump
- baa7a905: Move types package from peer deps to deps
- 7296e9d9: Initial publish
- c5d18967: Re-export category entry points from @aws-amplify/backend and move shared test classes to new private package
- 34c3fd38: Update backend definition file path convention
- 2ef006f1: Support for email and phone number login has been updated to reflect new type structures. User attributes and verification settings have also been added.
- 3bda96ff: update methods to use arrow notation
- 41ae36e2: Simplify phoneNumber to phone, and make verificationEmailStyle more user friendly.
- 7103735b: cdk lib dependency declaration
- db395e9c: Refactor clientSecretValue to clientSecret in Google provider props.
- 36d93e46: add license to package.json
- 88fe36a1: Update code and link message templates to be more intuitive.
- 8f99476e: chore: upgrade aws-cdk to 2.103.0
- 407a09ff: Implements backend secret feature, include backend secret resolver and the backend-secret pkg.
- f75fa531: Refactor OutputStorageStrategy into stateless shared dependency
- f6618771: add deployment type to stack outputs
- bc419e41: Update naming for social login providers.
- 59f5ea24: chore: upgrade aws-cdk to 2.100.0
- Updated dependencies [47456c26]
- Updated dependencies [a911292b]
- Updated dependencies [ac3df080]
- Updated dependencies [eac939b5]
- Updated dependencies [0398b8e1]
- Updated dependencies [b2b0c2da]
- Updated dependencies [18874854]
- Updated dependencies [baa7a905]
- Updated dependencies [7296e9d9]
- Updated dependencies [fa75e94b]
- Updated dependencies [b0b5da94]
- Updated dependencies [2ef006f1]
- Updated dependencies [3bda96ff]
- Updated dependencies [41ae36e2]
- Updated dependencies [7103735b]
- Updated dependencies [db395e9c]
- Updated dependencies [3c36ace9]
- Updated dependencies [395c8f0d]
- Updated dependencies [3f0790b0]
- Updated dependencies [ccacd673]
- Updated dependencies [3f0790b0]
- Updated dependencies [36d93e46]
- Updated dependencies [88fe36a1]
- Updated dependencies [790c3a60]
- Updated dependencies [8f99476e]
- Updated dependencies [b10f2a61]
- Updated dependencies [dc22fdf4]
- Updated dependencies [407a09ff]
- Updated dependencies [47456c26]
- Updated dependencies [5f02b83b]
- Updated dependencies [740e2dc2]
- Updated dependencies [f75fa531]
- Updated dependencies [f201c94a]
- Updated dependencies [512f0778]
- Updated dependencies [bc419e41]
- Updated dependencies [883d9da7]
- Updated dependencies [59f5ea24]
  - @aws-amplify/backend-output-storage@0.2.0
  - @aws-amplify/auth-construct-alpha@0.2.0
  - @aws-amplify/plugin-types@0.2.0

## 0.2.0-alpha.15

### Patch Changes

- Updated dependencies [47456c26]
- Updated dependencies [47456c26]
  - @aws-amplify/backend-output-storage@0.2.0-alpha.6
  - @aws-amplify/auth-construct-alpha@0.2.0-alpha.18

## 0.2.0-alpha.14

### Patch Changes

- 8f99476e: chore: upgrade aws-cdk to 2.103.0
- Updated dependencies [8f99476e]
  - @aws-amplify/backend-output-storage@0.2.0-alpha.5
  - @aws-amplify/auth-construct-alpha@0.2.0-alpha.17
  - @aws-amplify/plugin-types@0.2.0-alpha.11

## 0.2.0-alpha.13

### Patch Changes

- Updated dependencies [18874854]
- Updated dependencies [883d9da7]
  - @aws-amplify/auth-construct-alpha@0.2.0-alpha.16
  - @aws-amplify/plugin-types@0.2.0-alpha.10
  - @aws-amplify/backend-output-storage@0.2.0-alpha.4

## 0.2.0-alpha.12

### Patch Changes

- 88fe36a1: Update code and link message templates to be more intuitive.
- Updated dependencies [88fe36a1]
  - @aws-amplify/auth-construct-alpha@0.2.0-alpha.13

## 0.2.0-alpha.11

### Patch Changes

- 41ae36e2: Simplify phoneNumber to phone, and make verificationEmailStyle more user friendly.
- db395e9c: Refactor clientSecretValue to clientSecret in Google provider props.
- Updated dependencies [41ae36e2]
- Updated dependencies [db395e9c]
  - @aws-amplify/auth-construct-alpha@0.2.0-alpha.12

## 0.2.0-alpha.10

### Patch Changes

- bc419e41: Update naming for social login providers.
- Updated dependencies [fa75e94b]
- Updated dependencies [ccacd673]
- Updated dependencies [bc419e41]
  - @aws-amplify/auth-construct-alpha@0.2.0-alpha.11

## 0.2.0-alpha.9

### Patch Changes

- 59f5ea24: chore: upgrade aws-cdk to 2.100.0
- Updated dependencies [eac939b5]
- Updated dependencies [59f5ea24]
  - @aws-amplify/auth-construct-alpha@0.2.0-alpha.10
  - @aws-amplify/backend-output-storage@0.1.1-alpha.3
  - @aws-amplify/plugin-types@0.2.0-alpha.9

## 0.2.0-alpha.8

### Patch Changes

- 7103735b: cdk lib dependency declaration
- Updated dependencies [7103735b]
  - @aws-amplify/auth-construct-alpha@0.2.0-alpha.9
  - @aws-amplify/plugin-types@0.2.0-alpha.8

## 0.2.0-alpha.7

### Minor Changes

- bf24d363: Change Auth external providers'IDs to secret type

## 0.2.0-alpha.6

### Patch Changes

- 36d93e46: add license to package.json
- Updated dependencies [36d93e46]
  - @aws-amplify/backend-output-storage@0.1.1-alpha.2
  - @aws-amplify/auth-construct-alpha@0.2.0-alpha.8
  - @aws-amplify/plugin-types@0.2.0-alpha.7

## 0.2.0-alpha.5

### Minor Changes

- dc22fdf4: Integrate secret to Auth
- ae9e9f10: Create factory functions for defining category config

### Patch Changes

- baa7a905: Move types package from peer deps to deps
- 34c3fd38: Update backend definition file path convention
- f6618771: add deployment type to stack outputs
- Updated dependencies [0398b8e1]
- Updated dependencies [baa7a905]
- Updated dependencies [dc22fdf4]
- Updated dependencies [740e2dc2]
- Updated dependencies [512f0778]
  - @aws-amplify/backend-output-storage@0.1.1-alpha.1
  - @aws-amplify/auth-construct-alpha@0.2.0-alpha.7
  - @aws-amplify/plugin-types@0.2.0-alpha.6

## 0.2.0-alpha.4

### Patch Changes

- 407a09ff: Implements backend secret feature, include backend secret resolver and the backend-secret pkg.
- f75fa531: Refactor OutputStorageStrategy into stateless shared dependency
- Updated dependencies [a911292b]
- Updated dependencies [ac3df080]
- Updated dependencies [407a09ff]
- Updated dependencies [f75fa531]
  - @aws-amplify/auth-construct-alpha@0.2.0-alpha.6
  - @aws-amplify/backend-output-storage@0.1.1-alpha.0
  - @aws-amplify/plugin-types@0.1.1-alpha.5

## 0.2.0-alpha.3

### Minor Changes

- 3c36ace: Implement UserPool trigger config

### Patch Changes

- Updated dependencies [3c36ace]
- Updated dependencies [790c3a6]
  - @aws-amplify/auth-construct-alpha@0.2.0-alpha.5
  - @aws-amplify/plugin-types@0.1.1-alpha.4

## 0.1.1-alpha.2

### Patch Changes

- b2b0c2d: force version bump
- Updated dependencies [b2b0c2d]
- Updated dependencies [395c8f0]
  - @aws-amplify/auth-construct-alpha@0.2.0-alpha.3
  - @aws-amplify/plugin-types@0.1.1-alpha.2

## 0.1.1-alpha.1

### Patch Changes

- 2ef006f: Support for email and phone number login has been updated to reflect new type structures. User attributes and verification settings have also been added.
- 3bda96f: update methods to use arrow notation
- Updated dependencies [2ef006f]
- Updated dependencies [3bda96f]
  - @aws-amplify/auth-construct-alpha@0.2.0-alpha.1
  - @aws-amplify/plugin-types@0.1.1-alpha.1

## 0.1.1-alpha.0

### Patch Changes

- 7296e9d: Initial publish
- Updated dependencies [7296e9d]
  - @aws-amplify/auth-construct-alpha@0.1.1-alpha.0
  - @aws-amplify/plugin-types@0.1.1-alpha.0
