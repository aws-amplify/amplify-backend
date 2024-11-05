# @aws-amplify/sandbox

## 1.2.5

### Patch Changes

- 583a3f2: Fix detection of AmplifyErrors
- Updated dependencies [583a3f2]
  - @aws-amplify/platform-core@1.2.0
  - @aws-amplify/backend-deployer@1.1.8

## 1.2.4

### Patch Changes

- b56d344: update aws-cdk lib to ^2.158.0
- Updated dependencies [c3c3057]
- Updated dependencies [b56d344]
  - @aws-amplify/cli-core@1.2.0
  - @aws-amplify/backend-deployer@1.1.6
  - @aws-amplify/client-config@1.5.1
  - @aws-amplify/plugin-types@1.3.1

## 1.2.3

### Patch Changes

- 0a5e51c: Stream conversation logs in sandbox

## 1.2.2

### Patch Changes

- e648e8e: added main field to package.json so these packages are resolvable
- 0ff73ec: add ExpiredToken in the list of credentials error
- 8dd7286: fixed errors in plugin-types and cli-core along with any extraneous dependencies in other packages
- e648e8e: added main field to packages known to lack one
- Updated dependencies [e648e8e]
- Updated dependencies [0ff73ec]
- Updated dependencies [c9c873c]
- Updated dependencies [cbac105]
- Updated dependencies [8dd7286]
- Updated dependencies [e648e8e]
  - @aws-amplify/deployed-backend-client@1.4.1
  - @aws-amplify/backend-deployer@1.1.3
  - @aws-amplify/backend-secret@1.1.2
  - @aws-amplify/client-config@1.3.1
  - @aws-amplify/plugin-types@1.2.2
  - @aws-amplify/cli-core@1.1.3

## 1.2.1

### Patch Changes

- 79fdc7c: wrap InvalidSignatureException in AmplifyUserError
- Updated dependencies [79fdc7c]
  - @aws-amplify/backend-secret@1.1.1

## 1.2.0

### Minor Changes

- 9720736: Pass profile explicitly to CDK CLI when using `npx ampx sandbox --profile <profile_name>`

### Patch Changes

- 5405c87: chore: refactor error handling for secrets client
- Updated dependencies [9c50380]
- Updated dependencies [5405c87]
- Updated dependencies [9720736]
  - @aws-amplify/backend-deployer@1.1.0
  - @aws-amplify/backend-secret@1.1.0

## 1.1.3

### Patch Changes

- a65371c: upgrade aws-cdk and aws-cdk-lib to ^2.152.0
- Updated dependencies [4cce19f]
- Updated dependencies [a65371c]
  - @aws-amplify/platform-core@1.0.6
  - @aws-amplify/backend-deployer@1.0.5

## 1.1.2

### Patch Changes

- 3c698e0: upgrade AWS SDK packages to latest
- Updated dependencies [489d16e]
- Updated dependencies [3c698e0]
- Updated dependencies [057a069]
- Updated dependencies [eab6ddb]
- Updated dependencies [36feb29]
- Updated dependencies [320a86d]
  - @aws-amplify/backend-deployer@1.0.4
  - @aws-amplify/deployed-backend-client@1.3.0
  - @aws-amplify/backend-secret@1.0.1
  - @aws-amplify/client-config@1.1.3
  - @aws-amplify/platform-core@1.0.5
  - @aws-amplify/cli-core@1.1.2

## 1.1.1

### Patch Changes

- 09b4cc1: Correctly classify credentials related errors while making sdk calls to SSM
- Updated dependencies [697bc8a]
- Updated dependencies [c784e40]
  - @aws-amplify/backend-deployer@1.0.2
  - @aws-amplify/cli-core@1.1.1
  - @aws-amplify/deployed-backend-client@1.1.0
  - @aws-amplify/client-config@1.1.1
  - @aws-amplify/platform-core@1.0.3

## 1.1.0

### Minor Changes

- 8f23287: feat: add support for function logs streaming to sandbox

### Patch Changes

- Updated dependencies [8f23287]
- Updated dependencies [ebbbb60]
  - @aws-amplify/cli-core@1.1.0
  - @aws-amplify/client-config@1.1.0

## 1.0.6

### Patch Changes

- 44ca7d7: refactor top level cli error handling
- Updated dependencies [44ca7d7]
- Updated dependencies [ca92f23]
  - @aws-amplify/platform-core@1.0.2

## 1.0.5

### Patch Changes

- 0200d11: Bump baseline CDK version to 2.132.0 to support AWS SDK bundling
- Updated dependencies [8968cf4]
- Updated dependencies [4b249ed]
- Updated dependencies [0200d11]
- Updated dependencies [20bf679]
  - @aws-amplify/client-config@1.0.5
  - @aws-amplify/backend-deployer@1.0.1

## 1.0.4

### Patch Changes

- 4dd9d5a: Fix case when CDK boostrap parameter is not found
- Updated dependencies [ca9d68d]
- Updated dependencies [ca9d68d]
  - @aws-amplify/deployed-backend-client@1.0.2
  - @aws-amplify/client-config@1.0.4

## 1.0.3

### Patch Changes

- 5b5c15c: use ssm parameter to detect CDK boostrap
- Updated dependencies [1146bbd]
- Updated dependencies [530bf2c]
- Updated dependencies [925f97d]
  - @aws-amplify/client-config@1.0.3
  - @aws-amplify/platform-core@1.0.1

## 1.0.2

### Patch Changes

- 1dc61de: bumping client-config version
- Updated dependencies [f7b8089]
  - @aws-amplify/client-config@1.0.2

## 1.0.1

### Patch Changes

- @aws-amplify/client-config@1.0.1
- @aws-amplify/deployed-backend-client@1.0.1

## 1.0.0

### Major Changes

- 51195e2: Major version bump for all public pacakges.

### Patch Changes

- Updated dependencies [51195e2]
- Updated dependencies [dc193cd]
  - @aws-amplify/backend-deployer@1.0.0
  - @aws-amplify/backend-secret@1.0.0
  - @aws-amplify/cli-core@1.0.0
  - @aws-amplify/client-config@1.0.0
  - @aws-amplify/deployed-backend-client@1.0.0
  - @aws-amplify/platform-core@1.0.0

## 0.6.3

### Patch Changes

- 1f38466: Replace amplify command occurrences with ampx and related renaming
- Updated dependencies [1f38466]
- Updated dependencies [694daaf]
  - @aws-amplify/backend-deployer@0.7.0
  - @aws-amplify/cli-core@0.7.0
  - @aws-amplify/client-config@0.9.7

## 0.6.2

### Patch Changes

- ca58bc2: re-increment versions for PR# 1397
- Updated dependencies [ca58bc2]
  - @aws-amplify/client-config@0.9.6

## 0.6.1

### Patch Changes

- Updated dependencies [a817f2d]
  - @aws-amplify/client-config@0.9.5

## 0.6.0

### Minor Changes

- 8995e3b: refactor format.runner().amplifyCommand() into format.backendCliCommand()

### Patch Changes

- Updated dependencies [c93ecde]
- Updated dependencies [8995e3b]
- Updated dependencies [ce5a5ac]
  - @aws-amplify/client-config@0.9.4
  - @aws-amplify/cli-core@0.6.0
  - @aws-amplify/backend-deployer@0.6.0
  - @aws-amplify/platform-core@0.5.1
  - @aws-amplify/backend-secret@0.4.6
  - @aws-amplify/deployed-backend-client@0.4.2

## 0.5.5

### Patch Changes

- @aws-amplify/client-config@0.9.3

## 0.5.4

### Patch Changes

- Updated dependencies [c2c8910]
  - @aws-amplify/deployed-backend-client@0.4.1
  - @aws-amplify/client-config@0.9.2

## 0.5.3

### Patch Changes

- Updated dependencies [dca2a00]
  - @aws-amplify/client-config@0.9.1

## 0.5.2

### Patch Changes

- 1375e5b: improve to notify us that the amplify dir does not exist at the path when run amplify sandox
- 88c1b28: temporarely downgrade @parcel/watcher to 2.1.0 for npm 10.4 issue
- aec89f9: chore: correctly handle quotes in the error messages
- e90f066: support single sandbox deployment with --once flag
- 3e34244: use `format` to replace `color` and remove `color`.
- 615a3e6: upgrade @parcel/watcher wo use the latest version
- 937086b: require "resolution" in AmplifyUserError options
- cff84c0: chore: add more cdk errors in the error mapper
- 1c52df1: chore: Adds a log message to inform the name of the sandbox being created/initialized
- Updated dependencies [6c6af9b]
- Updated dependencies [54c69c4]
- Updated dependencies [ab7533d]
- Updated dependencies [a01f6b9]
- Updated dependencies [8d73779]
- Updated dependencies [74cbda0]
- Updated dependencies [1e93535]
- Updated dependencies [7537216]
- Updated dependencies [baeb68f]
- Updated dependencies [77079c6]
- Updated dependencies [aec89f9]
- Updated dependencies [e0ae60c]
- Updated dependencies [b0112e3]
- Updated dependencies [ef111b4]
- Updated dependencies [3998cd3]
- Updated dependencies [4d47f63]
- Updated dependencies [79cff6d]
- Updated dependencies [fe46848]
- Updated dependencies [8d9a7a4]
- Updated dependencies [3e34244]
- Updated dependencies [394b72e]
- Updated dependencies [592bd4f]
- Updated dependencies [b0ba24d]
- Updated dependencies [e15e9be]
- Updated dependencies [ee247fd]
- Updated dependencies [8d9a7a4]
- Updated dependencies [937086b]
- Updated dependencies [0d1b00e]
- Updated dependencies [cff84c0]
- Updated dependencies [2a69684]
- Updated dependencies [d95ab02]
- Updated dependencies [4995bda]
- Updated dependencies [4cd282e]
- Updated dependencies [edee8d7]
- Updated dependencies [a05933c]
- Updated dependencies [5e12247]
- Updated dependencies [4f66069]
- Updated dependencies [e3a537f]
- Updated dependencies [415c4c1]
- Updated dependencies [1c52df1]
- Updated dependencies [b931980]
- Updated dependencies [bb5a446]
- Updated dependencies [b0b4dea]
  - @aws-amplify/backend-deployer@0.5.1
  - @aws-amplify/platform-core@0.5.0
  - @aws-amplify/client-config@0.9.0
  - @aws-amplify/deployed-backend-client@0.4.0
  - @aws-amplify/cli-core@0.5.0
  - @aws-amplify/backend-secret@0.4.5

## 0.5.2-beta.19

### Patch Changes

- Updated dependencies [ef111b4]
  - @aws-amplify/platform-core@0.5.0-beta.7
  - @aws-amplify/backend-deployer@0.5.1-beta.8
  - @aws-amplify/backend-secret@0.4.5-beta.7
  - @aws-amplify/cli-core@0.5.0-beta.12
  - @aws-amplify/client-config@0.9.0-beta.15
  - @aws-amplify/deployed-backend-client@0.4.0-beta.10

## 0.5.2-beta.18

### Patch Changes

- e90f066: support single sandbox deployment with --once flag
- Updated dependencies [fe46848]
- Updated dependencies [4f66069]
  - @aws-amplify/deployed-backend-client@0.4.0-beta.9
  - @aws-amplify/client-config@0.9.0-beta.14

## 0.5.2-beta.17

### Patch Changes

- Updated dependencies [e15e9be]
- Updated dependencies [edee8d7]
- Updated dependencies [b0b4dea]
  - @aws-amplify/client-config@0.9.0-beta.13
  - @aws-amplify/deployed-backend-client@0.4.0-beta.8
  - @aws-amplify/platform-core@0.5.0-beta.6
  - @aws-amplify/backend-deployer@0.5.1-beta.7
  - @aws-amplify/backend-secret@0.4.5-beta.6
  - @aws-amplify/cli-core@0.5.0-beta.11

## 0.5.2-beta.16

### Patch Changes

- Updated dependencies [1e93535]
- Updated dependencies [bb5a446]
  - @aws-amplify/client-config@0.9.0-beta.12
  - @aws-amplify/deployed-backend-client@0.4.0-beta.7

## 0.5.2-beta.15

### Patch Changes

- 1375e5b: improve to notify us that the amplify dir does not exist at the path when run amplify sandox
- 1c52df1: chore: Adds a log message to inform the name of the sandbox being created/initialized
- Updated dependencies [6c6af9b]
- Updated dependencies [54c69c4]
- Updated dependencies [e3a537f]
- Updated dependencies [1c52df1]
  - @aws-amplify/backend-deployer@0.5.1-beta.6
  - @aws-amplify/platform-core@0.5.0-beta.5
  - @aws-amplify/client-config@0.9.0-beta.11
  - @aws-amplify/cli-core@0.5.0-beta.10
  - @aws-amplify/backend-secret@0.4.5-beta.5
  - @aws-amplify/deployed-backend-client@0.4.0-beta.6

## 0.5.2-beta.14

### Patch Changes

- Updated dependencies [77079c6]
  - @aws-amplify/cli-core@0.5.0-beta.9

## 0.5.2-beta.13

### Patch Changes

- Updated dependencies [4d47f63]
  - @aws-amplify/cli-core@0.5.0-beta.8

## 0.5.2-beta.12

### Patch Changes

- Updated dependencies [394b72e]
- Updated dependencies [592bd4f]
  - @aws-amplify/client-config@0.9.0-beta.10

## 0.5.2-beta.11

### Patch Changes

- aec89f9: chore: correctly handle quotes in the error messages
- cff84c0: chore: add more cdk errors in the error mapper
- Updated dependencies [aec89f9]
- Updated dependencies [cff84c0]
- Updated dependencies [2a69684]
  - @aws-amplify/platform-core@0.5.0-beta.4
  - @aws-amplify/backend-deployer@0.5.1-beta.5
  - @aws-amplify/backend-secret@0.4.5-beta.4
  - @aws-amplify/cli-core@0.5.0-beta.7
  - @aws-amplify/client-config@0.9.0-beta.9
  - @aws-amplify/deployed-backend-client@0.4.0-beta.5

## 0.5.2-beta.10

### Patch Changes

- Updated dependencies [8d73779]
- Updated dependencies [0d1b00e]
  - @aws-amplify/client-config@0.9.0-beta.8
  - @aws-amplify/cli-core@0.5.0-beta.6

## 0.5.2-beta.9

### Patch Changes

- Updated dependencies [7537216]
- Updated dependencies [d95ab02]
  - @aws-amplify/cli-core@0.5.0-beta.5
  - @aws-amplify/client-config@0.9.0-beta.7

## 0.5.2-beta.8

### Patch Changes

- Updated dependencies [4cd282e]
  - @aws-amplify/client-config@0.9.0-beta.6

## 0.5.2-beta.7

### Patch Changes

- Updated dependencies [b0112e3]
- Updated dependencies [5e12247]
  - @aws-amplify/deployed-backend-client@0.4.0-beta.4
  - @aws-amplify/client-config@0.9.0-beta.5
  - @aws-amplify/platform-core@0.5.0-beta.3
  - @aws-amplify/backend-deployer@0.5.1-beta.4
  - @aws-amplify/backend-secret@0.4.5-beta.3
  - @aws-amplify/cli-core@0.5.0-beta.4

## 0.5.2-beta.6

### Patch Changes

- Updated dependencies [e0ae60c]
- Updated dependencies [a05933c]
  - @aws-amplify/cli-core@0.5.0-beta.3
  - @aws-amplify/backend-deployer@0.5.1-beta.3

## 0.5.2-beta.5

### Patch Changes

- 3e34244: use `format` to replace `color` and remove `color`.
- 937086b: require "resolution" in AmplifyUserError options
- Updated dependencies [3e34244]
- Updated dependencies [ee247fd]
- Updated dependencies [937086b]
- Updated dependencies [b931980]
  - @aws-amplify/cli-core@0.5.0-beta.2
  - @aws-amplify/backend-deployer@0.5.1-beta.2
  - @aws-amplify/platform-core@0.5.0-beta.2
  - @aws-amplify/deployed-backend-client@0.4.0-beta.3
  - @aws-amplify/client-config@0.9.0-beta.4
  - @aws-amplify/backend-secret@0.4.5-beta.2

## 0.5.2-beta.4

### Patch Changes

- 615a3e6: upgrade @parcel/watcher wo use the latest version

## 0.5.2-beta.3

### Patch Changes

- Updated dependencies [3998cd3]
- Updated dependencies [79cff6d]
- Updated dependencies [8d9a7a4]
- Updated dependencies [b0ba24d]
- Updated dependencies [8d9a7a4]
  - @aws-amplify/cli-core@0.5.0-beta.1
  - @aws-amplify/client-config@0.9.0-beta.3

## 0.5.2-beta.2

### Patch Changes

- Updated dependencies [415c4c1]
  - @aws-amplify/deployed-backend-client@0.4.0-beta.2
  - @aws-amplify/client-config@0.8.1-beta.2

## 0.5.2-beta.1

### Patch Changes

- 88c1b28: temporarely downgrade @parcel/watcher to 2.1.0 for npm 10.4 issue
- Updated dependencies [ab7533d]
- Updated dependencies [a01f6b9]
- Updated dependencies [baeb68f]
- Updated dependencies [4995bda]
  - @aws-amplify/deployed-backend-client@0.4.0-beta.1
  - @aws-amplify/platform-core@0.5.0-beta.1
  - @aws-amplify/cli-core@0.4.1-beta.0
  - @aws-amplify/client-config@0.8.1-beta.1
  - @aws-amplify/backend-deployer@0.5.1-beta.1
  - @aws-amplify/backend-secret@0.4.5-beta.1

## 0.5.2-beta.0

### Patch Changes

- Updated dependencies [74cbda0]
  - @aws-amplify/backend-deployer@0.5.1-beta.0
  - @aws-amplify/platform-core@0.5.0-beta.0
  - @aws-amplify/backend-secret@0.4.5-beta.0
  - @aws-amplify/client-config@0.8.1-beta.0
  - @aws-amplify/deployed-backend-client@0.3.11-beta.0

## 0.5.1

### Patch Changes

- Updated dependencies [b1c3e0d49]
- Updated dependencies [6daae6be5]
  - @aws-amplify/client-config@0.8.0

## 0.5.0

### Minor Changes

- b73d76a78: Support yarn 1, yarn 2+ and pnpm package managers

### Patch Changes

- Updated dependencies [85ced84f2]
- Updated dependencies [348717b55]
- Updated dependencies [b73d76a78]
  - @aws-amplify/client-config@0.7.0
  - @aws-amplify/backend-deployer@0.5.0
  - @aws-amplify/cli-core@0.4.0
  - @aws-amplify/deployed-backend-client@0.3.10
  - @aws-amplify/backend-secret@0.4.4
  - @aws-amplify/platform-core@0.4.4

## 0.4.0

### Minor Changes

- fb07bafce: Refactor Printer class & deprecate Logger

### Patch Changes

- Updated dependencies [4c1485aa4]
- Updated dependencies [fb07bafce]
  - @aws-amplify/client-config@0.6.0
  - @aws-amplify/cli-core@0.3.0

## 0.3.14

### Patch Changes

- Updated dependencies [0809ad36d]
- Updated dependencies [618a2ea71]
  - @aws-amplify/platform-core@0.4.3
  - @aws-amplify/client-config@0.5.3
  - @aws-amplify/backend-deployer@0.4.7
  - @aws-amplify/backend-secret@0.4.3
  - @aws-amplify/deployed-backend-client@0.3.9

## 0.3.13

### Patch Changes

- @aws-amplify/backend-deployer@0.4.6
- @aws-amplify/backend-secret@0.4.2
- @aws-amplify/platform-core@0.4.2
- @aws-amplify/client-config@0.5.2
- @aws-amplify/deployed-backend-client@0.3.8

## 0.3.12

### Patch Changes

- 04f067837: Implement consistent dependency declaration check. Bumped dependencies where necessary.
- Updated dependencies [04f067837]
  - @aws-amplify/deployed-backend-client@0.3.7
  - @aws-amplify/backend-deployer@0.4.5
  - @aws-amplify/backend-secret@0.4.1
  - @aws-amplify/client-config@0.5.1
  - @aws-amplify/platform-core@0.4.1

## 0.3.11

### Patch Changes

- Updated dependencies [5678ab4d4]
- Updated dependencies [5678ab4d4]
  - @aws-amplify/platform-core@0.4.0
  - @aws-amplify/backend-secret@0.4.0
  - @aws-amplify/backend-deployer@0.4.4
  - @aws-amplify/deployed-backend-client@0.3.6

## 0.3.10

### Patch Changes

- Updated dependencies [8688aa00f]
- Updated dependencies [6a1c252e1]
- Updated dependencies [6a1c252e1]
- Updated dependencies [e5da97e37]
  - @aws-amplify/platform-core@0.3.4
  - @aws-amplify/client-config@0.5.0
  - @aws-amplify/backend-secret@0.3.4
  - @aws-amplify/backend-deployer@0.4.3
  - @aws-amplify/deployed-backend-client@0.3.5

## 0.3.9

### Patch Changes

- @aws-amplify/backend-deployer@0.4.2
- @aws-amplify/backend-secret@0.3.3
- @aws-amplify/platform-core@0.3.3

## 0.3.8

### Patch Changes

- Updated dependencies [54c5329c9]
  - @aws-amplify/backend-deployer@0.4.1

## 0.3.7

### Patch Changes

- db775ad6e: Refactor error handling, introduce two new AmplifyErrors
- cd672baca: require backend identifier in deployer, remove redundant deploymentType parameter
- Updated dependencies [db775ad6e]
- Updated dependencies [cd672baca]
- Updated dependencies [d2c3baa7e]
  - @aws-amplify/backend-deployer@0.4.0
  - @aws-amplify/platform-core@0.3.2
  - @aws-amplify/deployed-backend-client@0.3.4
  - @aws-amplify/backend-secret@0.3.2

## 0.3.6

### Patch Changes

- 5ed51cbd5: Upgrade aws-cdk to 2.110.1
- Updated dependencies [5ed51cbd5]
  - @aws-amplify/backend-deployer@0.3.4
  - @aws-amplify/platform-core@0.3.1

## 0.3.5

### Patch Changes

- Updated dependencies [aabe5dd61]
- Updated dependencies [d0105393d]
- Updated dependencies [5f336ffbb]
- Updated dependencies [7822cee5b]
- Updated dependencies [85e619116]
  - @aws-amplify/platform-core@0.3.0
  - @aws-amplify/backend-deployer@0.3.3
  - @aws-amplify/backend-secret@0.3.1
  - @aws-amplify/deployed-backend-client@0.3.3

## 0.3.4

### Patch Changes

- Updated dependencies [c47e03e20]
  - @aws-amplify/client-config@0.4.2

## 0.3.3

### Patch Changes

- 730afd8fe: fix: handling \!pattern in gitignore to avoid excluding everything from watching in sandbox
- Updated dependencies [002954370]
- Updated dependencies [4fee488eb]
- Updated dependencies [ad4ff92e3]
- Updated dependencies [cb855dfa5]
  - @aws-amplify/backend-deployer@0.3.2
  - @aws-amplify/deployed-backend-client@0.3.2
  - @aws-amplify/platform-core@0.2.2

## 0.3.2

### Patch Changes

- 70685f36b: Add usage data metrics
- Updated dependencies [70685f36b]
- Updated dependencies [50934da02]
  - @aws-amplify/backend-deployer@0.3.1
  - @aws-amplify/platform-core@0.2.1
  - @aws-amplify/client-config@0.4.1

## 0.3.1

### Patch Changes

- Updated dependencies [07b0dfc9f]
- Updated dependencies [01ebbc497]
  - @aws-amplify/client-config@0.4.0
  - @aws-amplify/deployed-backend-client@0.3.1

## 0.3.0

### Minor Changes

- 71a63a16: Change stack naming strategy to include deployment type as a suffix

### Patch Changes

- Updated dependencies [71a63a16]
  - @aws-amplify/deployed-backend-client@0.3.0
  - @aws-amplify/backend-deployer@0.3.0
  - @aws-amplify/backend-secret@0.3.0
  - @aws-amplify/client-config@0.3.0
  - @aws-amplify/platform-core@0.2.0

## 0.2.4

### Patch Changes

- Updated dependencies [68dc91e3]
  - @aws-amplify/backend-deployer@0.2.3
  - @aws-amplify/platform-core@0.1.4

## 0.2.3

### Patch Changes

- Updated dependencies [0bd8a3f3]
- Updated dependencies [0bd8a3f3]
  - @aws-amplify/client-config@0.2.3
  - @aws-amplify/platform-core@0.1.3

## 0.2.2

### Patch Changes

- Updated dependencies [79a6e09f]
- Updated dependencies [79a6e09f]
  - @aws-amplify/deployed-backend-client@0.2.1
  - @aws-amplify/client-config@0.2.2
  - @aws-amplify/backend-deployer@0.2.2
  - @aws-amplify/backend-secret@0.2.1
  - @aws-amplify/platform-core@0.1.2

## 0.2.1

### Patch Changes

- a216255e: Add successfulDeletion event to remove amplify configuration on deletion
- Updated dependencies [ff08a94b]
- Updated dependencies [a216255e]
- Updated dependencies [1c685d10]
  - @aws-amplify/cli-core@0.2.0
  - @aws-amplify/client-config@0.2.1
  - @aws-amplify/backend-deployer@0.2.1

## 0.2.0

### Minor Changes

- 2216d37d: 1. Remove version from the backend secret feature. 2. Use max(secret_last_updated) to trigger secret fetcher.
- 319e62bb: Add bootstrap detection in sandbox
- ee3d55fe: Add event handlers for Sandbox
- 2bd14d48: Adds profile option to sandbox command
- b4f82717: Create a new deployed-backend-client package that provides a convenient interface for retrieving stack outputs

### Patch Changes

- c3383926: Run npm init as part of create-amplify if necessary. List aws-cdk as a peerDependency of sandbox. Fix sandbox stack naming and lookup
- c78daa11: fix(sandbox): delete should pass the deployment type to deployer
- b2b0c2da: force version bump
- 7296e9d9: Initial publish
- 233adaba: fix(sandbox): ignore paths in .gitignore to be considered for sandbox watch process
- 75d90a57: add `format` option to sandbox. Rename `out` option to `outDir`.
- 915c0325: Offer to reset the sandbox if a non deployable change is detected
- c03a2f8c: fix(sandbox): Show underlying error message and quit if sandbox delete fails
- 3bda96ff: update methods to use arrow notation
- 08601278: change sandbox --dir-to-watch to ./amplify directory
- 36d93e46: add license to package.json
- ac625207: adds pipeline-deploy command
- 8f99476e: chore: upgrade aws-cdk to 2.103.0
- fcc7d389: Enable type checking during deployment
- f6618771: add deployment type to stack outputs
- 4664e675: Change default cdk output directory for sandbox environments
- 512f0778: move UniqueBackendIdentifier to platform-core package
- 59f5ea24: chore: upgrade aws-cdk to 2.100.0
- Updated dependencies [2bbf3f20]
- Updated dependencies [f0ef7c6a]
- Updated dependencies [e233eab6]
- Updated dependencies [23fc5b13]
- Updated dependencies [e9c0c9b5]
- Updated dependencies [98b17069]
- Updated dependencies [c3383926]
- Updated dependencies [642e8d55]
- Updated dependencies [c78daa11]
- Updated dependencies [b2b0c2da]
- Updated dependencies [a351b261]
- Updated dependencies [2216d37d]
- Updated dependencies [baa7a905]
- Updated dependencies [1a87500d]
- Updated dependencies [7296e9d9]
- Updated dependencies [5585f473]
- Updated dependencies [76ba7929]
- Updated dependencies [915c0325]
- Updated dependencies [b40d2d7b]
- Updated dependencies [c5d18967]
- Updated dependencies [675f4283]
- Updated dependencies [5826ad3b]
- Updated dependencies [b40d2d7b]
- Updated dependencies [3bda96ff]
- Updated dependencies [7103735b]
- Updated dependencies [395c8f0d]
- Updated dependencies [ce008a2c]
- Updated dependencies [01320d4b]
- Updated dependencies [36d93e46]
- Updated dependencies [afa0b3da]
- Updated dependencies [ac625207]
- Updated dependencies [8f99476e]
- Updated dependencies [4d411b67]
- Updated dependencies [d1295912]
- Updated dependencies [f46f69fb]
- Updated dependencies [bb3bf89a]
- Updated dependencies [407a09ff]
- Updated dependencies [47456c26]
- Updated dependencies [0b029cb5]
- Updated dependencies [b4f82717]
- Updated dependencies [f2394dbe]
- Updated dependencies [991403ec]
- Updated dependencies [5b9aac15]
- Updated dependencies [fcc7d389]
- Updated dependencies [05f97b26]
- Updated dependencies [d925b097]
- Updated dependencies [2525b582]
- Updated dependencies [f75fa531]
- Updated dependencies [f6618771]
- Updated dependencies [4664e675]
- Updated dependencies [f201c94a]
- Updated dependencies [9c86218e]
- Updated dependencies [512f0778]
- Updated dependencies [e0e1488b]
- Updated dependencies [4f3c1711]
- Updated dependencies [59f5ea24]
  - @aws-amplify/client-config@0.2.0
  - @aws-amplify/deployed-backend-client@0.2.0
  - @aws-amplify/backend-secret@0.2.0
  - @aws-amplify/backend-deployer@0.2.0
  - @aws-amplify/cli-core@0.1.0
  - @aws-amplify/platform-core@0.1.1

## 0.2.0-alpha.18

### Patch Changes

- 8f99476e: chore: upgrade aws-cdk to 2.103.0
- Updated dependencies [8f99476e]
- Updated dependencies [991403ec]
  - @aws-amplify/backend-deployer@0.2.0-alpha.11

## 0.2.0-alpha.17

### Patch Changes

- 4664e675: Change default cdk output directory for sandbox environments
- Updated dependencies [e233eab6]
- Updated dependencies [5826ad3b]
- Updated dependencies [4664e675]
  - @aws-amplify/client-config@0.2.0-alpha.12
  - @aws-amplify/backend-deployer@0.2.0-alpha.10

## 0.2.0-alpha.16

### Patch Changes

- 08601278: change sandbox --dir-to-watch to ./amplify directory
- Updated dependencies [675f4283]
- Updated dependencies [4d411b67]
  - @aws-amplify/cli-core@0.1.0-alpha.3
  - @aws-amplify/deployed-backend-client@0.2.0-alpha.9

## 0.2.0-alpha.15

### Patch Changes

- fcc7d389: Enable type checking during deployment
- Updated dependencies [fcc7d389]
  - @aws-amplify/backend-deployer@0.2.0-alpha.9

## 0.2.0-alpha.14

### Patch Changes

- 915c0325: Offer to reset the sandbox if a non deployable change is detected
- Updated dependencies [e9c0c9b5]
- Updated dependencies [915c0325]
- Updated dependencies [9c86218e]
  - @aws-amplify/deployed-backend-client@0.2.0-alpha.8
  - @aws-amplify/cli-core@0.1.0-alpha.2
  - @aws-amplify/backend-deployer@0.2.0-alpha.8
  - @aws-amplify/platform-core@0.1.1-alpha.3

## 0.2.0-alpha.13

### Patch Changes

- Updated dependencies [2bbf3f20]
  - @aws-amplify/client-config@0.2.0-alpha.11

## 0.2.0-alpha.12

### Patch Changes

- 59f5ea24: chore: upgrade aws-cdk to 2.100.0
- Updated dependencies [5585f473]
- Updated dependencies [59f5ea24]
  - @aws-amplify/deployed-backend-client@0.2.0-alpha.6
  - @aws-amplify/backend-deployer@0.2.0-alpha.7
  - @aws-amplify/backend-secret@0.2.0-alpha.4

## 0.2.0-alpha.11

### Patch Changes

- Updated dependencies [1a87500d]
  - @aws-amplify/client-config@0.2.0-alpha.10

## 0.2.0-alpha.10

### Patch Changes

- c78daa11: fix(sandbox): delete should pass the deployment type to deployer
- c03a2f8c: fix(sandbox): Show underlying error message and quit if sandbox delete fails
- Updated dependencies [c78daa11]
- Updated dependencies [7103735b]
- Updated dependencies [f46f69fb]
- Updated dependencies [d925b097]
  - @aws-amplify/backend-deployer@0.2.0-alpha.6
  - @aws-amplify/backend-secret@0.2.0-alpha.3
  - @aws-amplify/deployed-backend-client@0.2.0-alpha.4

## 0.2.0-alpha.9

### Patch Changes

- Updated dependencies [2525b582]
  - @aws-amplify/deployed-backend-client@0.2.0-alpha.3
  - @aws-amplify/client-config@0.2.0-alpha.9

## 0.2.0-alpha.8

### Minor Changes

- 2216d37d: 1. Remove version from the backend secret feature. 2. Use max(secret_last_updated) to trigger secret fetcher.

### Patch Changes

- 36d93e46: add license to package.json
- Updated dependencies [2216d37d]
- Updated dependencies [36d93e46]
  - @aws-amplify/backend-deployer@0.2.0-alpha.5
  - @aws-amplify/backend-secret@0.2.0-alpha.2
  - @aws-amplify/deployed-backend-client@0.2.0-alpha.2
  - @aws-amplify/client-config@0.2.0-alpha.8
  - @aws-amplify/platform-core@0.1.1-alpha.1

## 0.2.0-alpha.7

### Minor Changes

- 319e62bb: Add bootstrap detection in sandbox
- ee3d55fe: Add event handlers for Sandbox

### Patch Changes

- f6618771: add deployment type to stack outputs
- 512f0778: move UniqueBackendIdentifier to platform-core package
- Updated dependencies [23fc5b13]
- Updated dependencies [bb3bf89a]
- Updated dependencies [f6618771]
- Updated dependencies [512f0778]
  - @aws-amplify/client-config@0.2.0-alpha.7
  - @aws-amplify/deployed-backend-client@0.2.0-alpha.1
  - @aws-amplify/backend-deployer@0.1.1-alpha.4
  - @aws-amplify/platform-core@0.1.1-alpha.0

## 0.2.0-alpha.6

### Minor Changes

- 2bd14d48: Adds profile option to sandbox command
- b4f82717: Create a new deployed-backend-client package that provides a convenient interface for retrieving stack outputs

### Patch Changes

- 75d90a57: add `format` option to sandbox. Rename `out` option to `outDir`.
- 1dada824: chore: Update eslint config to new flat config type
- Updated dependencies [1dada824]
- Updated dependencies [407a09ff]
- Updated dependencies [b4f82717]
- Updated dependencies [05f97b26]
- Updated dependencies [f75fa531]
- Updated dependencies [e0e1488b]
  - @aws-amplify/client-config@0.2.0-alpha.6
  - @aws-amplify/deployed-backend-client@0.2.0-alpha.0

## 0.1.1-alpha.5

### Patch Changes

- 233adab: fix(sandbox): ignore paths in .gitignore to be considered for sandbox watch process
- Updated dependencies [01320d4]
  - @aws-amplify/client-config@0.2.0-alpha.5

## 0.1.1-alpha.4

### Patch Changes

- Updated dependencies [ce008a2]
- Updated dependencies [afa0b3d]
- Updated dependencies [f201c94]
- Updated dependencies [4f3c171]
  - @aws-amplify/client-config@0.2.0-alpha.4
  - @aws-amplify/backend-deployer@0.1.1-alpha.3

## 0.1.1-alpha.3

### Patch Changes

- b2b0c2d: force version bump
- Updated dependencies [b2b0c2d]
- Updated dependencies [395c8f0]
  - @aws-amplify/backend-deployer@0.1.1-alpha.2
  - @aws-amplify/client-config@0.1.1-alpha.3

## 0.1.1-alpha.2

### Patch Changes

- 3bda96f: update methods to use arrow notation
- Updated dependencies [3bda96f]
  - @aws-amplify/backend-deployer@0.1.1-alpha.1
  - @aws-amplify/client-config@0.1.1-alpha.2

## 0.1.1-alpha.1

### Patch Changes

- c338392: Run npm init as part of create-amplify if necessary. List aws-cdk as a peerDependency of sandbox. Fix sandbox stack naming and lookup
- ac62520: adds pipeline-deploy command
- Updated dependencies [c338392]
- Updated dependencies [ac62520]
  - @aws-amplify/client-config@0.1.1-alpha.1
  - @aws-amplify/backend-deployer@0.1.1-alpha.0

## 0.1.1-alpha.0

### Patch Changes

- 7296e9d: Initial publish
- Updated dependencies [7296e9d]
  - @aws-amplify/client-config@0.1.1-alpha.0
