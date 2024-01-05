# @aws-amplify/backend-function

## 0.5.0

### Minor Changes

- e5da97e37: Implement function secret access

### Patch Changes

- c885ff22d: Add unit test to know when oldest Node LTS changes to update default function runtime
- Updated dependencies [e5da97e37]
  - @aws-amplify/plugin-types@0.7.0
  - @aws-amplify/backend-output-storage@0.2.7

## 0.4.0

### Minor Changes

- 2ab4b3149: Add runtime to defineFunction
- b4e0a00a9: Add timeout, memory and environment variables to defineFunction

### Patch Changes

- Updated dependencies [6714cd69c]
- Updated dependencies [fd6516c8b]
  - @aws-amplify/plugin-types@0.6.0

## 0.3.0

### Minor Changes

- c6c39d04c: Initial implementation of new 'defineFunction' entry point

### Patch Changes

- Updated dependencies [c6c39d04c]
  - @aws-amplify/plugin-types@0.5.0

## 0.2.5

### Patch Changes

- 5ed51cbd5: Upgrade aws-cdk to 2.110.1
- Updated dependencies [5ed51cbd5]
  - @aws-amplify/backend-output-storage@0.2.6
  - @aws-amplify/function-construct-alpha@0.2.1
  - @aws-amplify/plugin-types@0.4.2

## 0.2.4

### Patch Changes

- @aws-amplify/backend-output-storage@0.2.5

## 0.2.3

### Patch Changes

- Updated dependencies [cb855dfa5]
  - @aws-amplify/backend-output-storage@0.2.4

## 0.2.2

### Patch Changes

- Updated dependencies [70685f36b]
  - @aws-amplify/backend-output-storage@0.2.3

## 0.2.1

### Patch Changes

- Updated dependencies [65fe3a8fd]
- Updated dependencies [cd5feeed0]
  - @aws-amplify/plugin-types@0.4.1
  - @aws-amplify/backend-output-storage@0.2.2

## 0.2.0

### Minor Changes

- 71a63a16: Change stack naming strategy to include deployment type as a suffix

### Patch Changes

- Updated dependencies [8181509a]
- Updated dependencies [71a63a16]
  - @aws-amplify/plugin-types@0.4.0
  - @aws-amplify/backend-output-storage@0.2.1

## 0.1.4

### Patch Changes

- 68dc91e3: chore: support for JS backend apps

## 0.1.3

### Patch Changes

- 0bd8a3f3: add missing dev deps

## 0.1.2

### Patch Changes

- Updated dependencies [457b1662]
  - @aws-amplify/plugin-types@0.3.0

## 0.1.1

### Patch Changes

- b2b0c2da: force version bump
- baa7a905: Move types package from peer deps to deps
- 7296e9d9: Initial publish
- c5d18967: Re-export category entry points from @aws-amplify/backend and move shared test classes to new private package
- 3bda96ff: update methods to use arrow notation
- 7103735b: cdk lib dependency declaration
- 36d93e46: add license to package.json
- 8f99476e: chore: upgrade aws-cdk to 2.103.0
- dc22fdf4: Integrate secret to Auth
- 407a09ff: Implements backend secret feature, include backend secret resolver and the backend-secret pkg.
- fcc7d389: Enable type checking during deployment
- f75fa531: Refactor OutputStorageStrategy into stateless shared dependency
- f6618771: add deployment type to stack outputs
- 59f5ea24: chore: upgrade aws-cdk to 2.100.0
- Updated dependencies [47456c26]
- Updated dependencies [ac3df080]
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
- Updated dependencies [f75fa531]
- Updated dependencies [f201c94a]
- Updated dependencies [512f0778]
- Updated dependencies [883d9da7]
- Updated dependencies [59f5ea24]
  - @aws-amplify/backend-output-storage@0.2.0
  - @aws-amplify/function-construct-alpha@0.2.0
  - @aws-amplify/plugin-types@0.2.0

## 0.1.1-alpha.11

### Patch Changes

- Updated dependencies [47456c26]
  - @aws-amplify/backend-output-storage@0.2.0-alpha.6
  - @aws-amplify/function-construct-alpha@0.2.0-alpha.7

## 0.1.1-alpha.10

### Patch Changes

- 8f99476e: chore: upgrade aws-cdk to 2.103.0
- Updated dependencies [8f99476e]
  - @aws-amplify/backend-output-storage@0.2.0-alpha.5
  - @aws-amplify/function-construct-alpha@0.1.1-alpha.6
  - @aws-amplify/plugin-types@0.2.0-alpha.11

## 0.1.1-alpha.9

### Patch Changes

- Updated dependencies [18874854]
- Updated dependencies [883d9da7]
  - @aws-amplify/plugin-types@0.2.0-alpha.10
  - @aws-amplify/backend-output-storage@0.2.0-alpha.4

## 0.1.1-alpha.8

### Patch Changes

- fcc7d389: Enable type checking during deployment

## 0.1.1-alpha.7

### Patch Changes

- 59f5ea24: chore: upgrade aws-cdk to 2.100.0
- Updated dependencies [59f5ea24]
  - @aws-amplify/backend-output-storage@0.1.1-alpha.3
  - @aws-amplify/function-construct-alpha@0.1.1-alpha.5
  - @aws-amplify/plugin-types@0.2.0-alpha.9

## 0.1.1-alpha.6

### Patch Changes

- 7103735b: cdk lib dependency declaration
- Updated dependencies [7103735b]
  - @aws-amplify/function-construct-alpha@0.1.1-alpha.4
  - @aws-amplify/plugin-types@0.2.0-alpha.8

## 0.1.1-alpha.5

### Patch Changes

- 36d93e46: add license to package.json
- Updated dependencies [36d93e46]
  - @aws-amplify/backend-output-storage@0.1.1-alpha.2
  - @aws-amplify/function-construct-alpha@0.1.1-alpha.3
  - @aws-amplify/plugin-types@0.2.0-alpha.7

## 0.1.1-alpha.4

### Patch Changes

- baa7a905: Move types package from peer deps to deps
- dc22fdf4: Integrate secret to Auth
- f6618771: add deployment type to stack outputs
- Updated dependencies [0398b8e1]
- Updated dependencies [dc22fdf4]
- Updated dependencies [512f0778]
  - @aws-amplify/backend-output-storage@0.1.1-alpha.1
  - @aws-amplify/plugin-types@0.2.0-alpha.6

## 0.1.1-alpha.3

### Patch Changes

- 407a09ff: Implements backend secret feature, include backend secret resolver and the backend-secret pkg.
- f75fa531: Refactor OutputStorageStrategy into stateless shared dependency
- Updated dependencies [ac3df080]
- Updated dependencies [407a09ff]
- Updated dependencies [f75fa531]
  - @aws-amplify/backend-output-storage@0.1.1-alpha.0
  - @aws-amplify/plugin-types@0.1.1-alpha.5

## 0.1.1-alpha.2

### Patch Changes

- b2b0c2d: force version bump
- Updated dependencies [b2b0c2d]
  - @aws-amplify/function-construct-alpha@0.1.1-alpha.1
  - @aws-amplify/plugin-types@0.1.1-alpha.2

## 0.1.1-alpha.1

### Patch Changes

- 3bda96f: update methods to use arrow notation
- Updated dependencies [2ef006f]
- Updated dependencies [3bda96f]
  - @aws-amplify/plugin-types@0.1.1-alpha.1

## 0.1.1-alpha.0

### Patch Changes

- 7296e9d: Initial publish
- Updated dependencies [7296e9d]
  - @aws-amplify/function-construct-alpha@0.1.1-alpha.0
  - @aws-amplify/plugin-types@0.1.1-alpha.0
