# @aws-amplify/plugin-types

## 0.9.0-beta.2

### Patch Changes

- 48ff3bd: Add cfnFunction to function resources

## 0.9.0-beta.1

### Patch Changes

- 5e12247: feat(client-config): Generate client configuration based on a unified JSON schema

## 0.9.0-beta.0

### Minor Changes

- 4995bda: Introduce initial iteration of access control mechanism between backend resources.
  The APIs and functioality are NOT final and are subject to change without notice.

### Patch Changes

- ab7533d: Add output and configuration for customer owned lambdas
- 7cbe58b: bump aws-cdk-lib to 2.127.0
- 109cd1b: Add support for generating user pool groups.

## 0.8.0

### Minor Changes

- 85ced84f2: Add ability to add custom outputs
- b73d76a78: Support yarn 1, yarn 2+ and pnpm package managers

## 0.7.1

### Patch Changes

- d087313e9: Enhance functions to fallback to resolve shared secrets

## 0.7.0

### Minor Changes

- e5da97e37: Implement function secret access

## 0.6.0

### Minor Changes

- 6714cd69c: Reinstate accessing all properties on backend construct objects
- fd6516c8b: Rework Backend platform type to allow accessing CDK constructs using backend.<name>.<constructName> rather than backend.resources.<name>.resources.<constructName>

## 0.5.0

### Minor Changes

- c6c39d04c: Expose new `defineFunction` interface

## 0.4.2

### Patch Changes

- 5ed51cbd5: Upgrade aws-cdk to 2.110.1

## 0.4.1

### Patch Changes

- 65fe3a8fd: remove unused type
- cd5feeed0: Expand types for Auth to improve auto completion suggestions.

## 0.4.0

### Minor Changes

- 71a63a16: Change stack naming strategy to include deployment type as a suffix

### Patch Changes

- 8181509a: Added a prefix to the auth cfnResources.

## 0.3.1

### Patch Changes

- 3bff764b: Expose user pool and client as cfn resources.

## 0.3.0

### Minor Changes

- 457b1662: getConstructFactory no longer throws an error if the factory is not found, and returns undefined instead.

## 0.2.0

### Minor Changes

- dc22fdf4: Integrate secret to Auth
- 883d9da7: Migrate auth dependencies to CommonJS.

### Patch Changes

- 0398b8e1: Bump graphql construct to 0.9.0 and remove some interface cruft
- b2b0c2da: force version bump
- 18874854: Rename MFA enforcementType to mode. Convert accountRecovery to string union instead of enum. Make totp setting optional. Make auth/unauth roles required properties.
- 7296e9d9: Initial publish
- 2ef006f1: Support for email and phone number login has been updated to reflect new type structures. User attributes and verification settings have also been added.
- 3bda96ff: update methods to use arrow notation
- 7103735b: cdk lib dependency declaration
- 3c36ace9: Implement UserPool trigger config
- 36d93e46: add license to package.json
- 8f99476e: chore: upgrade aws-cdk to 2.103.0
- 407a09ff: Implements backend secret feature, include backend secret resolver and the backend-secret pkg.
- f201c94a: add support for external auth providers
- 512f0778: move UniqueBackendIdentifier to platform-core package
- 59f5ea24: chore: upgrade aws-cdk to 2.100.0

## 0.2.0-alpha.11

### Patch Changes

- 8f99476e: chore: upgrade aws-cdk to 2.103.0

## 0.2.0-alpha.10

### Minor Changes

- 883d9da7: Migrate auth dependencies to CommonJS.

### Patch Changes

- 18874854: Rename MFA enforcementType to mode. Convert accountRecovery to string union instead of enum. Make totp setting optional. Make auth/unauth roles required properties.

## 0.2.0-alpha.9

### Patch Changes

- 59f5ea24: chore: upgrade aws-cdk to 2.100.0

## 0.2.0-alpha.8

### Patch Changes

- 7103735b: cdk lib dependency declaration

## 0.2.0-alpha.7

### Patch Changes

- 36d93e46: add license to package.json

## 0.2.0-alpha.6

### Minor Changes

- dc22fdf4: Integrate secret to Auth

### Patch Changes

- 0398b8e1: Bump graphql construct to 0.9.0 and remove some interface cruft
- 512f0778: move UniqueBackendIdentifier to platform-core package

## 0.1.1-alpha.5

### Patch Changes

- 407a09ff: Implements backend secret feature, include backend secret resolver and the backend-secret pkg.

## 0.1.1-alpha.4

### Patch Changes

- 3c36ace: Implement UserPool trigger config

## 0.1.1-alpha.3

### Patch Changes

- f201c94: add support for external auth providers

## 0.1.1-alpha.2

### Patch Changes

- b2b0c2d: force version bump

## 0.1.1-alpha.1

### Patch Changes

- 2ef006f: Support for email and phone number login has been updated to reflect new type structures. User attributes and verification settings have also been added.
- 3bda96f: update methods to use arrow notation

## 0.1.1-alpha.0

### Patch Changes

- 7296e9d: Initial publish
