# @aws-amplify/plugin-types

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
