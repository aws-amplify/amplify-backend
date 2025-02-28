# @aws-amplify/backend-deployer

## 1.1.19

### Patch Changes

- aec5e08: Handle signature mismatch error
- Updated dependencies [aec5e08]
  - @aws-amplify/platform-core@1.6.4

## 1.1.18

### Patch Changes

- 920f128: updated mapping with schema errors from toolkit

## 1.1.17

### Patch Changes

- bc07307: Update code with Eslint@8 compliant
- Updated dependencies [bc07307]
  - @aws-amplify/platform-core@1.6.2

## 1.1.16

### Patch Changes

- a7ae994: wrap more instances of ENOENT type errors
- ec7826d: Handle connect ENOMEM error
- Updated dependencies [ec7826d]
  - @aws-amplify/platform-core@1.6.1

## 1.1.15

### Patch Changes

- ff2f2ce: fixed violations to cause propagation lint rule

## 1.1.14

### Patch Changes

- 2dab201: Report cdk versions
- Updated dependencies [2dab201]
  - @aws-amplify/platform-core@1.6.0
  - @aws-amplify/plugin-types@1.8.0

## 1.1.13

### Patch Changes

- a7506f9: catch and wrap deployment in progress when deleting the backend
- Updated dependencies [a7506f9]
- Updated dependencies [a7506f9]
  - @aws-amplify/platform-core@1.5.0
  - @aws-amplify/plugin-types@1.7.0

## 1.1.12

### Patch Changes

- dedcc27: add error mapping for role is invalid or cannot be assumed error'
- 95942c5: expand wrapping of credentials related errors
- 1eced2c: add mapping for circular dependency failures with resolution
- Updated dependencies [95942c5]
- Updated dependencies [f679cf6]
- Updated dependencies [f193105]
  - @aws-amplify/platform-core@1.4.0

## 1.1.11

### Patch Changes

- 1593ce8: add error mapping for lambda bundling into an empty zip
- a406263: Narrow the error parsing for ExpiredToken regex
- 37d8564: handle cdk error mapping for more generic invalid credentials
- d66ab17: added mapping for additional EPERM errors
- 5a47d21: add error mapping for lambda exceeding max size
- 72b2fe0: update aws-cdk lib to ^2.168.0
- 0a360fb: extract generic cdk asset publish failures
- 6015595: Catches most common EPERM error and update to resolution message for stack in failed state
- daaedb6: add cdk error mapping for error "cdk command not found"
- f6ba240: Upgrade execa
- Updated dependencies [cfdc854]
- Updated dependencies [72b2fe0]
- Updated dependencies [65abf6a]
- Updated dependencies [f6ba240]
  - @aws-amplify/platform-core@1.3.0
  - @aws-amplify/plugin-types@1.6.0

## 1.1.10

### Patch Changes

- d332c51: map a form of deletion/destroy failed error
- a6fa42e: specifically catch AppSync "Code contains one or more errors"
- a23f656: add more forms of transform errors to cdk error mapping
- 754d0f7: map another form of access denied validation error
- 716f844: Handle ENOENT error from npm
- 691e7ca: truncate large error messages before printing to customer
- b6f4c54: handle not authorized to perform on resource error
- 0114549: Handle invalid package.json error
- Updated dependencies [249c0e5]
  - @aws-amplify/platform-core@1.2.2

## 1.1.9

### Patch Changes

- 7f2f68b: Handle errors when checking CDK bootstrap.
- 12cf209: update error mapping to catch when Lambda layer ARN regions do not match function region
- Updated dependencies [90a7c49]
  - @aws-amplify/plugin-types@1.4.0

## 1.1.8

### Patch Changes

- 583a3f2: Fix detection of AmplifyErrors
- Updated dependencies [583a3f2]
  - @aws-amplify/platform-core@1.2.0

## 1.1.7

### Patch Changes

- 7bf0c64: reclassify as error, UnknownFault, Error: The security token included in the request is expired
- 889bdb7: Handle case where synthesis renders empty cdk assembly
- a191fe5: add stack is in a state and can not be updated to error mapper

## 1.1.6

### Patch Changes

- b56d344: update aws-cdk lib to ^2.158.0
- Updated dependencies [b56d344]
  - @aws-amplify/plugin-types@1.3.1

## 1.1.5

### Patch Changes

- 93d419f: detect more generic CFN deployment failure errors
- 777c80d: detect transform errors with multiple errors
- b35f01d: detect generic CFN stack creation errors

## 1.1.4

### Patch Changes

- 98673b0: Improve type error regex

## 1.1.3

### Patch Changes

- e648e8e: added main field to package.json so these packages are resolvable
- c9c873c: throw ESBuild error with correct messages
- cbac105: Handle CDK version mismatch
- e648e8e: added main field to packages known to lack one
- Updated dependencies [8dd7286]
  - @aws-amplify/plugin-types@1.2.2

## 1.1.2

### Patch Changes

- c85d071: updated packages to fix violations of prefer-amplify-errors rule

## 1.1.1

### Patch Changes

- 1505414: surface synth errors if the function declaration files have not been written yet.

## 1.1.0

### Minor Changes

- 9720736: Pass profile explicitly to CDK CLI when using `npx ampx sandbox --profile <profile_name>`

### Patch Changes

- 9c50380: make line endings in error mapper regex os independent

## 1.0.6

### Patch Changes

- 66a4267: Detect more non bootstrapped account variants

## 1.0.5

### Patch Changes

- a65371c: upgrade aws-cdk and aws-cdk-lib to ^2.152.0
- Updated dependencies [4cce19f]
- Updated dependencies [a65371c]
  - @aws-amplify/platform-core@1.0.6
  - @aws-amplify/plugin-types@1.2.1

## 1.0.4

### Patch Changes

- 489d16e: throw child process error if no stderr generated during CDK cli execution
- 057a069: Update cdk error mapper to catch all deployment errors
- Updated dependencies [3c698e0]
- Updated dependencies [320a86d]
  - @aws-amplify/platform-core@1.0.5
  - @aws-amplify/plugin-types@1.1.1

## 1.0.3

### Patch Changes

- b3551c2: improve placeholders for cdk error messages
- 7af1575: fix error mapping regex for host specific newline characters
- bfd6512: catch and wrap esbuild error from cdk
- Updated dependencies [2294683]
  - @aws-amplify/platform-core@1.0.4

## 1.0.2

### Patch Changes

- 697bc8a: Prevent CTRL-C handling for yarn classic package manager
- Updated dependencies [697bc8a]
- Updated dependencies [c784e40]
  - @aws-amplify/plugin-types@1.1.0
  - @aws-amplify/platform-core@1.0.3

## 1.0.1

### Patch Changes

- 0200d11: Bump baseline CDK version to 2.132.0 to support AWS SDK bundling
- Updated dependencies [0200d11]
  - @aws-amplify/plugin-types@1.0.1

## 1.0.0

### Major Changes

- 51195e2: Major version bump for all public pacakges.

### Patch Changes

- Updated dependencies [51195e2]
  - @aws-amplify/platform-core@1.0.0
  - @aws-amplify/plugin-types@1.0.0

## 0.7.0

### Minor Changes

- 1f38466: Replace amplify command occurrences with ampx and related renaming

## 0.6.0

### Minor Changes

- 8995e3b: refactor format.runner().amplifyCommand() into format.backendCliCommand()

### Patch Changes

- Updated dependencies [8995e3b]
- Updated dependencies [ce5a5ac]
  - @aws-amplify/plugin-types@0.10.0
  - @aws-amplify/platform-core@0.5.1

## 0.5.1

### Patch Changes

- 6c6af9b: chore: convert errors to AmplifyUserError
- 74cbda0: decentralize AmplifyErrorType
- aec89f9: chore: correctly handle quotes in the error messages
- 937086b: require "resolution" in AmplifyUserError options
- cff84c0: chore: add more cdk errors in the error mapper
- a05933c: run tsc after CDK synth but before deploy
- e3a537f: chore: Translate secrets not set error to a more user friendly error message
- Updated dependencies [6c6af9b]
- Updated dependencies [ab7533d]
- Updated dependencies [697d791]
- Updated dependencies [74cbda0]
- Updated dependencies [7cbe58b]
- Updated dependencies [aec89f9]
- Updated dependencies [ef111b4]
- Updated dependencies [109cd1b]
- Updated dependencies [db23a3f]
- Updated dependencies [937086b]
- Updated dependencies [2a69684]
- Updated dependencies [4995bda]
- Updated dependencies [5e12247]
- Updated dependencies [48ff3bd]
- Updated dependencies [b0b4dea]
  - @aws-amplify/platform-core@0.5.0
  - @aws-amplify/plugin-types@0.9.0

## 0.5.1-beta.8

### Patch Changes

- Updated dependencies [ef111b4]
- Updated dependencies [db23a3f]
  - @aws-amplify/platform-core@0.5.0-beta.7
  - @aws-amplify/plugin-types@0.9.0-beta.3

## 0.5.1-beta.7

### Patch Changes

- Updated dependencies [b0b4dea]
  - @aws-amplify/platform-core@0.5.0-beta.6

## 0.5.1-beta.6

### Patch Changes

- 6c6af9b: chore: convert errors to AmplifyUserError
- e3a537f: chore: Translate secrets not set error to a more user friendly error message
- Updated dependencies [6c6af9b]
- Updated dependencies [48ff3bd]
  - @aws-amplify/platform-core@0.5.0-beta.5
  - @aws-amplify/plugin-types@0.9.0-beta.2

## 0.5.1-beta.5

### Patch Changes

- aec89f9: chore: correctly handle quotes in the error messages
- cff84c0: chore: add more cdk errors in the error mapper
- Updated dependencies [aec89f9]
- Updated dependencies [2a69684]
  - @aws-amplify/platform-core@0.5.0-beta.4

## 0.5.1-beta.4

### Patch Changes

- Updated dependencies [5e12247]
  - @aws-amplify/platform-core@0.5.0-beta.3
  - @aws-amplify/plugin-types@0.9.0-beta.1

## 0.5.1-beta.3

### Patch Changes

- a05933c: run tsc after CDK synth but before deploy

## 0.5.1-beta.2

### Patch Changes

- 937086b: require "resolution" in AmplifyUserError options
- Updated dependencies [937086b]
  - @aws-amplify/platform-core@0.5.0-beta.2

## 0.5.1-beta.1

### Patch Changes

- Updated dependencies [ab7533d]
- Updated dependencies [7cbe58b]
- Updated dependencies [109cd1b]
- Updated dependencies [4995bda]
  - @aws-amplify/platform-core@0.5.0-beta.1
  - @aws-amplify/plugin-types@0.9.0-beta.0

## 0.5.1-beta.0

### Patch Changes

- 74cbda0: decentralize AmplifyErrorType
- Updated dependencies [74cbda0]
  - @aws-amplify/platform-core@0.5.0-beta.0

## 0.5.0

### Minor Changes

- b73d76a78: Support yarn 1, yarn 2+ and pnpm package managers

### Patch Changes

- Updated dependencies [85ced84f2]
- Updated dependencies [b73d76a78]
  - @aws-amplify/plugin-types@0.8.0
  - @aws-amplify/platform-core@0.4.4

## 0.4.7

### Patch Changes

- Updated dependencies [0809ad36d]
  - @aws-amplify/platform-core@0.4.3

## 0.4.6

### Patch Changes

- Updated dependencies [d087313e9]
  - @aws-amplify/plugin-types@0.7.1
  - @aws-amplify/platform-core@0.4.2

## 0.4.5

### Patch Changes

- 04f067837: Implement consistent dependency declaration check. Bumped dependencies where necessary.
- Updated dependencies [04f067837]
  - @aws-amplify/platform-core@0.4.1

## 0.4.4

### Patch Changes

- Updated dependencies [5678ab4d4]
  - @aws-amplify/platform-core@0.4.0

## 0.4.3

### Patch Changes

- Updated dependencies [8688aa00f]
- Updated dependencies [e5da97e37]
- Updated dependencies [e5da97e37]
  - @aws-amplify/platform-core@0.3.4
  - @aws-amplify/plugin-types@0.7.0

## 0.4.2

### Patch Changes

- Updated dependencies [6714cd69c]
- Updated dependencies [fd6516c8b]
  - @aws-amplify/plugin-types@0.6.0
  - @aws-amplify/platform-core@0.3.3

## 0.4.1

### Patch Changes

- 54c5329c9: Update tsx version

## 0.4.0

### Minor Changes

- cd672baca: require backend identifier in deployer, remove redundant deploymentType parameter

### Patch Changes

- db775ad6e: Refactor error handling, introduce two new AmplifyErrors
- Updated dependencies [db775ad6e]
- Updated dependencies [c6c39d04c]
  - @aws-amplify/platform-core@0.3.2
  - @aws-amplify/plugin-types@0.5.0

## 0.3.4

### Patch Changes

- 5ed51cbd5: Upgrade aws-cdk to 2.110.1
- Updated dependencies [5ed51cbd5]
  - @aws-amplify/platform-core@0.3.1
  - @aws-amplify/plugin-types@0.4.2

## 0.3.3

### Patch Changes

- d0105393d: turn off type checking if amplify/tsconfig.json is not found
- 7822cee5b: fix: hide tsc --showConfig output since its used for validation only
- Updated dependencies [aabe5dd61]
- Updated dependencies [5f336ffbb]
- Updated dependencies [85e619116]
  - @aws-amplify/platform-core@0.3.0

## 0.3.2

### Patch Changes

- 002954370: Create default tsconfig.json in amplify directory on npx create amplify and run tsc on amplify directory during deployment
- ad4ff92e3: Force colors to not be stripped off when piping child process stdout
- Updated dependencies [cb855dfa5]
  - @aws-amplify/platform-core@0.2.2

## 0.3.1

### Patch Changes

- 70685f36b: Add usage data metrics
- Updated dependencies [70685f36b]
  - @aws-amplify/platform-core@0.2.1

## 0.3.0

### Minor Changes

- 71a63a16: Change stack naming strategy to include deployment type as a suffix

### Patch Changes

- Updated dependencies [8181509a]
- Updated dependencies [71a63a16]
  - @aws-amplify/plugin-types@0.4.0
  - @aws-amplify/platform-core@0.2.0

## 0.2.3

### Patch Changes

- 68dc91e3: chore: support for JS backend apps
- Updated dependencies [68dc91e3]
  - @aws-amplify/platform-core@0.1.4

## 0.2.2

### Patch Changes

- Updated dependencies [457b1662]
  - @aws-amplify/plugin-types@0.3.0
  - @aws-amplify/platform-core@0.1.2

## 0.2.1

### Patch Changes

- 1c685d10: do not require confirmation at pipeline deploy

## 0.2.0

### Minor Changes

- 2216d37d: 1. Remove version from the backend secret feature. 2. Use max(secret_last_updated) to trigger secret fetcher.

### Patch Changes

- c78daa11: fix(sandbox): delete should pass the deployment type to deployer
- b2b0c2da: force version bump
- 915c0325: Offer to reset the sandbox if a non deployable change is detected
- 5826ad3b: chore: update cdk error mapper for case when cognito user attributes cannot be updated
- 3bda96ff: update methods to use arrow notation
- 36d93e46: add license to package.json
- afa0b3da: simplify error map and tests
- ac625207: adds pipeline-deploy command
- 8f99476e: chore: upgrade aws-cdk to 2.103.0
- 991403ec: use modern tsc features at compilation
- fcc7d389: Enable type checking during deployment
- f6618771: add deployment type to stack outputs
- 4664e675: Change default cdk output directory for sandbox environments
- 9c86218e: fix: allow custom root stacks to be deployable
- 512f0778: move UniqueBackendIdentifier to platform-core package
- 4f3c1711: Improve known error messages
- 59f5ea24: chore: upgrade aws-cdk to 2.100.0
- Updated dependencies [0398b8e1]
- Updated dependencies [b2b0c2da]
- Updated dependencies [18874854]
- Updated dependencies [7296e9d9]
- Updated dependencies [915c0325]
- Updated dependencies [2ef006f1]
- Updated dependencies [3bda96ff]
- Updated dependencies [7103735b]
- Updated dependencies [3c36ace9]
- Updated dependencies [36d93e46]
- Updated dependencies [8f99476e]
- Updated dependencies [dc22fdf4]
- Updated dependencies [407a09ff]
- Updated dependencies [47456c26]
- Updated dependencies [5b9aac15]
- Updated dependencies [f6618771]
- Updated dependencies [f201c94a]
- Updated dependencies [512f0778]
- Updated dependencies [883d9da7]
- Updated dependencies [59f5ea24]
  - @aws-amplify/plugin-types@0.2.0
  - @aws-amplify/platform-core@0.1.1

## 0.2.0-alpha.11

### Patch Changes

- 8f99476e: chore: upgrade aws-cdk to 2.103.0
- 991403ec: use modern tsc features at compilation
- Updated dependencies [8f99476e]
  - @aws-amplify/plugin-types@0.2.0-alpha.11

## 0.2.0-alpha.10

### Patch Changes

- 5826ad3b: chore: update cdk error mapper for case when cognito user attributes cannot be updated
- 4664e675: Change default cdk output directory for sandbox environments

## 0.2.0-alpha.9

### Patch Changes

- fcc7d389: Enable type checking during deployment

## 0.2.0-alpha.8

### Patch Changes

- 915c0325: Offer to reset the sandbox if a non deployable change is detected
- 9c86218e: fix: allow custom root stacks to be deployable
- Updated dependencies [915c0325]
  - @aws-amplify/platform-core@0.1.1-alpha.3

## 0.2.0-alpha.7

### Patch Changes

- 59f5ea24: chore: upgrade aws-cdk to 2.100.0
- Updated dependencies [59f5ea24]
  - @aws-amplify/plugin-types@0.2.0-alpha.9

## 0.2.0-alpha.6

### Patch Changes

- c78daa11: fix(sandbox): delete should pass the deployment type to deployer
- Updated dependencies [7103735b]
  - @aws-amplify/plugin-types@0.2.0-alpha.8

## 0.2.0-alpha.5

### Minor Changes

- 2216d37d: 1. Remove version from the backend secret feature. 2. Use max(secret_last_updated) to trigger secret fetcher.

### Patch Changes

- 36d93e46: add license to package.json
- Updated dependencies [36d93e46]
  - @aws-amplify/platform-core@0.1.1-alpha.1
  - @aws-amplify/plugin-types@0.2.0-alpha.7

## 0.1.1-alpha.4

### Patch Changes

- f6618771: add deployment type to stack outputs
- 512f0778: move UniqueBackendIdentifier to platform-core package
- Updated dependencies [0398b8e1]
- Updated dependencies [dc22fdf4]
- Updated dependencies [f6618771]
- Updated dependencies [512f0778]
  - @aws-amplify/plugin-types@0.2.0-alpha.6
  - @aws-amplify/platform-core@0.1.1-alpha.0

## 0.1.1-alpha.3

### Patch Changes

- afa0b3d: simplify error map and tests
- 4f3c171: Improve known error messages
- Updated dependencies [f201c94]
  - @aws-amplify/plugin-types@0.1.1-alpha.3

## 0.1.1-alpha.2

### Patch Changes

- b2b0c2d: force version bump
- Updated dependencies [b2b0c2d]
  - @aws-amplify/plugin-types@0.1.1-alpha.2

## 0.1.1-alpha.1

### Patch Changes

- 3bda96f: update methods to use arrow notation
- Updated dependencies [2ef006f]
- Updated dependencies [3bda96f]
  - @aws-amplify/plugin-types@0.1.1-alpha.1

## 0.1.1-alpha.0

### Patch Changes

- ac62520: adds pipeline-deploy command
