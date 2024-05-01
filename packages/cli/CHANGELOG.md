# @aws-amplify/backend-cli

## 0.16.0

### Minor Changes

- 1f38466: Replace amplify command occurrences with ampx and related renaming
- f080dad: rename config generation options as outputs generation options
- a8bab09: throw error on amplify command with message to use ampx instead

### Patch Changes

- 694daaf: format.error to handle formating Error
- 694daaf: Add debug log for emitter errors
- 0934a1f: gracefully exit on usage data emit failure
- Updated dependencies [1f38466]
- Updated dependencies [694daaf]
- Updated dependencies [820bc5b]
  - @aws-amplify/backend-deployer@0.7.0
  - @aws-amplify/cli-core@0.7.0
  - @aws-amplify/client-config@0.9.7
  - @aws-amplify/sandbox@0.6.3
  - @aws-amplify/model-generator@0.8.0

## 0.15.0

### Minor Changes

- 255cc2c: top-level success & failure metrics for amplify commands

### Patch Changes

- ca58bc2: re-increment versions for PR# 1397
- Updated dependencies [ca58bc2]
  - @aws-amplify/client-config@0.9.6
  - @aws-amplify/sandbox@0.6.2

## 0.14.2

### Patch Changes

- a817f2d: Change the default client config version
- Updated dependencies [a817f2d]
  - @aws-amplify/client-config@0.9.5
  - @aws-amplify/sandbox@0.6.1

## 0.14.1

### Patch Changes

- 110cc45: Exposes the ampx binary for use with npx
- 8995e3b: refactor format.runner().amplifyCommand() into format.backendCliCommand()
- Updated dependencies [c93ecde]
- Updated dependencies [8995e3b]
- Updated dependencies [ce5a5ac]
  - @aws-amplify/client-config@0.9.4
  - @aws-amplify/cli-core@0.6.0
  - @aws-amplify/sandbox@0.6.0
  - @aws-amplify/backend-deployer@0.6.0
  - @aws-amplify/platform-core@0.5.1
  - @aws-amplify/backend-secret@0.4.6
  - @aws-amplify/deployed-backend-client@0.4.2
  - @aws-amplify/model-generator@0.7.1
  - @aws-amplify/schema-generator@0.2.1

## 0.14.0

### Minor Changes

- 9bef671: change generate config command to generate outputs

### Patch Changes

- Updated dependencies [d0f1452]
  - @aws-amplify/schema-generator@0.2.0
  - @aws-amplify/model-generator@0.7.0
  - @aws-amplify/form-generator@0.10.0
  - @aws-amplify/client-config@0.9.3
  - @aws-amplify/sandbox@0.5.5

## 0.13.0

### Minor Changes

- 33fc16f: add 'backend' as valid CLI command name

### Patch Changes

- Updated dependencies [c2c8910]
  - @aws-amplify/deployed-backend-client@0.4.1
  - @aws-amplify/client-config@0.9.2
  - @aws-amplify/model-generator@0.6.1
  - @aws-amplify/sandbox@0.5.4

## 0.12.1

### Patch Changes

- Updated dependencies [dca2a00]
- Updated dependencies [9ea3c38]
  - @aws-amplify/client-config@0.9.1
  - @aws-amplify/model-generator@0.6.0
  - @aws-amplify/form-generator@0.9.0
  - @aws-amplify/sandbox@0.5.3

## 0.12.0

### Minor Changes

- 54de5f7: Support --name option in `sandbox secret` commands
- b011701: add no-notice to info command
- 4995bda: Introduce initial iteration of access control mechanism between backend resources.
  The APIs and functioality are NOT final and are subject to change without notice.
- 5e12247: feat(client-config): Generate client configuration based on a unified JSON schema

### Patch Changes

- 54c69c4: chore: rename the new client config file name
- 05c3c9b: Rename target format type and prop in model gen package
- 77079c6: Improve formatting of AmplifyErrors in the top-level error handler
- e90f066: support single sandbox deployment with --once flag
- a7ce946: cleanup instances where we use kebab case in yargs handler methods
- 21f6292: Force release to beta tag
- 3092906: chore: make all cli commands strict
- ffb358e: Added normalization logic for AWS environment variables
- beb1591: Update text to match sandbox default behavior
- fe46848: Allow passing clients in to client-config from browser context.
- b14b87e: Include secret name in the generated typescript data schema file
- 3e34244: use `format` to replace `color` and remove `color`.
- 592bd4f: refactor log abstraction in `client-config`, `form-generator`, and `model-generator` packages
- ee247fd: use printer from cli-core
- 937086b: require "resolution" in AmplifyUserError options
- acf28c1: Add support to generate typescript data schema from database schema
- d95ab02: dir options create the target dir if it does not exist
- 4cd282e: fix: populate top level region in the client config
- 7537216: Improve formatting of `sandbox secret list`
- e16b97f: chore: Surface pipeline-deploy command in CLI command help
- 4f66069: chore: create an empty configuration file during sandbox startup
- 1c52df1: chore: Adds a log message to inform the name of the sandbox being created/initialized
- Updated dependencies [6c6af9b]
- Updated dependencies [54c69c4]
- Updated dependencies [ab7533d]
- Updated dependencies [a01f6b9]
- Updated dependencies [8d73779]
- Updated dependencies [05c3c9b]
- Updated dependencies [1375e5b]
- Updated dependencies [74cbda0]
- Updated dependencies [f76e983]
- Updated dependencies [88c1b28]
- Updated dependencies [1e93535]
- Updated dependencies [8901779]
- Updated dependencies [7537216]
- Updated dependencies [baeb68f]
- Updated dependencies [77079c6]
- Updated dependencies [aec89f9]
- Updated dependencies [e90f066]
- Updated dependencies [e0ae60c]
- Updated dependencies [b0112e3]
- Updated dependencies [ef111b4]
- Updated dependencies [3998cd3]
- Updated dependencies [a494aca]
- Updated dependencies [27bcc97]
- Updated dependencies [4d47f63]
- Updated dependencies [79cff6d]
- Updated dependencies [fe46848]
- Updated dependencies [b14b87e]
- Updated dependencies [8d9a7a4]
- Updated dependencies [3e34244]
- Updated dependencies [394b72e]
- Updated dependencies [592bd4f]
- Updated dependencies [b0ba24d]
- Updated dependencies [615a3e6]
- Updated dependencies [e15e9be]
- Updated dependencies [ee247fd]
- Updated dependencies [8d9a7a4]
- Updated dependencies [060b6e5]
- Updated dependencies [aa90ba1]
- Updated dependencies [937086b]
- Updated dependencies [0d1b00e]
- Updated dependencies [cff84c0]
- Updated dependencies [acf28c1]
- Updated dependencies [2a69684]
- Updated dependencies [d95ab02]
- Updated dependencies [4995bda]
- Updated dependencies [4cd282e]
- Updated dependencies [edee8d7]
- Updated dependencies [a05933c]
- Updated dependencies [5e12247]
- Updated dependencies [4f66069]
- Updated dependencies [e3a537f]
- Updated dependencies [10c9447]
- Updated dependencies [415c4c1]
- Updated dependencies [1c52df1]
- Updated dependencies [b931980]
- Updated dependencies [73dcd6e]
- Updated dependencies [bb5a446]
- Updated dependencies [b0b4dea]
  - @aws-amplify/backend-deployer@0.5.1
  - @aws-amplify/platform-core@0.5.0
  - @aws-amplify/client-config@0.9.0
  - @aws-amplify/deployed-backend-client@0.4.0
  - @aws-amplify/backend-output-schemas@0.7.0
  - @aws-amplify/cli-core@0.5.0
  - @aws-amplify/model-generator@0.5.0
  - @aws-amplify/sandbox@0.5.2
  - @aws-amplify/form-generator@0.8.0
  - @aws-amplify/schema-generator@0.1.0
  - @aws-amplify/backend-secret@0.4.5

## 0.12.0-beta.22

### Patch Changes

- Updated dependencies [ef111b4]
  - @aws-amplify/platform-core@0.5.0-beta.7
  - @aws-amplify/backend-deployer@0.5.1-beta.8
  - @aws-amplify/backend-secret@0.4.5-beta.7
  - @aws-amplify/cli-core@0.5.0-beta.12
  - @aws-amplify/client-config@0.9.0-beta.15
  - @aws-amplify/deployed-backend-client@0.4.0-beta.10
  - @aws-amplify/model-generator@0.5.0-beta.12
  - @aws-amplify/sandbox@0.5.2-beta.19
  - @aws-amplify/schema-generator@0.1.0-beta.7

## 0.12.0-beta.21

### Patch Changes

- e90f066: support single sandbox deployment with --once flag
- fe46848: Allow passing clients in to client-config from browser context.
- 4f66069: chore: create an empty configuration file during sandbox startup
- Updated dependencies [e90f066]
- Updated dependencies [fe46848]
- Updated dependencies [4f66069]
  - @aws-amplify/sandbox@0.5.2-beta.18
  - @aws-amplify/deployed-backend-client@0.4.0-beta.9
  - @aws-amplify/model-generator@0.5.0-beta.11
  - @aws-amplify/client-config@0.9.0-beta.14

## 0.12.0-beta.20

### Patch Changes

- Updated dependencies [e15e9be]
- Updated dependencies [edee8d7]
- Updated dependencies [10c9447]
- Updated dependencies [73dcd6e]
- Updated dependencies [b0b4dea]
  - @aws-amplify/client-config@0.9.0-beta.13
  - @aws-amplify/deployed-backend-client@0.4.0-beta.8
  - @aws-amplify/schema-generator@0.1.0-beta.6
  - @aws-amplify/model-generator@0.5.0-beta.10
  - @aws-amplify/form-generator@0.8.0-beta.5
  - @aws-amplify/platform-core@0.5.0-beta.6
  - @aws-amplify/sandbox@0.5.2-beta.17
  - @aws-amplify/backend-deployer@0.5.1-beta.7
  - @aws-amplify/backend-secret@0.4.5-beta.6
  - @aws-amplify/cli-core@0.5.0-beta.11

## 0.12.0-beta.19

### Patch Changes

- Updated dependencies [1e93535]
- Updated dependencies [bb5a446]
  - @aws-amplify/backend-output-schemas@0.7.0-beta.1
  - @aws-amplify/client-config@0.9.0-beta.12
  - @aws-amplify/deployed-backend-client@0.4.0-beta.7
  - @aws-amplify/model-generator@0.5.0-beta.9
  - @aws-amplify/sandbox@0.5.2-beta.16

## 0.12.0-beta.18

### Patch Changes

- 54c69c4: chore: rename the new client config file name
- 3092906: chore: make all cli commands strict
- ffb358e: Added normalization logic for AWS environment variables
- e16b97f: chore: Surface pipeline-deploy command in CLI command help
- 1c52df1: chore: Adds a log message to inform the name of the sandbox being created/initialized
- Updated dependencies [6c6af9b]
- Updated dependencies [54c69c4]
- Updated dependencies [1375e5b]
- Updated dependencies [a494aca]
- Updated dependencies [aa90ba1]
- Updated dependencies [e3a537f]
- Updated dependencies [1c52df1]
  - @aws-amplify/backend-deployer@0.5.1-beta.6
  - @aws-amplify/platform-core@0.5.0-beta.5
  - @aws-amplify/client-config@0.9.0-beta.11
  - @aws-amplify/sandbox@0.5.2-beta.15
  - @aws-amplify/model-generator@0.5.0-beta.8
  - @aws-amplify/form-generator@0.8.0-beta.4
  - @aws-amplify/schema-generator@0.1.0-beta.5
  - @aws-amplify/cli-core@0.5.0-beta.10
  - @aws-amplify/backend-secret@0.4.5-beta.5
  - @aws-amplify/deployed-backend-client@0.4.0-beta.6

## 0.12.0-beta.17

### Patch Changes

- 77079c6: Improve formatting of AmplifyErrors in the top-level error handler
- b14b87e: Include secret name in the generated typescript data schema file
- Updated dependencies [77079c6]
- Updated dependencies [b14b87e]
  - @aws-amplify/cli-core@0.5.0-beta.9
  - @aws-amplify/schema-generator@0.1.0-beta.4
  - @aws-amplify/sandbox@0.5.2-beta.14

## 0.12.0-beta.16

### Patch Changes

- Updated dependencies [f76e983]
- Updated dependencies [4d47f63]
  - @aws-amplify/form-generator@0.8.0-beta.3
  - @aws-amplify/cli-core@0.5.0-beta.8
  - @aws-amplify/sandbox@0.5.2-beta.13

## 0.12.0-beta.15

### Patch Changes

- a7ce946: cleanup instances where we use kebab case in yargs handler methods
- 592bd4f: refactor log abstraction in `client-config`, `form-generator`, and `model-generator` packages
- Updated dependencies [394b72e]
- Updated dependencies [592bd4f]
  - @aws-amplify/client-config@0.9.0-beta.10
  - @aws-amplify/model-generator@0.5.0-beta.7
  - @aws-amplify/form-generator@0.8.0-beta.2
  - @aws-amplify/sandbox@0.5.2-beta.12

## 0.12.0-beta.14

### Minor Changes

- 54de5f7: Support --name option in `sandbox secret` commands

### Patch Changes

- Updated dependencies [aec89f9]
- Updated dependencies [cff84c0]
- Updated dependencies [2a69684]
  - @aws-amplify/platform-core@0.5.0-beta.4
  - @aws-amplify/backend-deployer@0.5.1-beta.5
  - @aws-amplify/sandbox@0.5.2-beta.11
  - @aws-amplify/backend-secret@0.4.5-beta.4
  - @aws-amplify/cli-core@0.5.0-beta.7
  - @aws-amplify/client-config@0.9.0-beta.9
  - @aws-amplify/deployed-backend-client@0.4.0-beta.5
  - @aws-amplify/schema-generator@0.1.0-beta.3
  - @aws-amplify/model-generator@0.5.0-beta.6

## 0.12.0-beta.13

### Patch Changes

- Updated dependencies [8d73779]
- Updated dependencies [0d1b00e]
  - @aws-amplify/model-generator@0.5.0-beta.5
  - @aws-amplify/client-config@0.9.0-beta.8
  - @aws-amplify/cli-core@0.5.0-beta.6
  - @aws-amplify/sandbox@0.5.2-beta.10

## 0.12.0-beta.12

### Patch Changes

- d95ab02: dir options create the target dir if it does not exist
- 7537216: Improve formatting of `sandbox secret list`
- Updated dependencies [7537216]
- Updated dependencies [d95ab02]
  - @aws-amplify/cli-core@0.5.0-beta.5
  - @aws-amplify/client-config@0.9.0-beta.7
  - @aws-amplify/sandbox@0.5.2-beta.9

## 0.12.0-beta.11

### Patch Changes

- acf28c1: Add support to generate typescript data schema from database schema
- Updated dependencies [acf28c1]
  - @aws-amplify/schema-generator@0.1.0-beta.2

## 0.12.0-beta.10

### Minor Changes

- b011701: add no-notice to info command

## 0.12.0-beta.9

### Patch Changes

- 4cd282e: fix: populate top level region in the client config
- Updated dependencies [4cd282e]
  - @aws-amplify/client-config@0.9.0-beta.6
  - @aws-amplify/sandbox@0.5.2-beta.8

## 0.12.0-beta.8

### Minor Changes

- 5e12247: feat(client-config): Generate client configuration based on a unified JSON schema

### Patch Changes

- Updated dependencies [b0112e3]
- Updated dependencies [5e12247]
  - @aws-amplify/deployed-backend-client@0.4.0-beta.4
  - @aws-amplify/client-config@0.9.0-beta.5
  - @aws-amplify/platform-core@0.5.0-beta.3
  - @aws-amplify/model-generator@0.5.0-beta.4
  - @aws-amplify/sandbox@0.5.2-beta.7
  - @aws-amplify/backend-deployer@0.5.1-beta.4
  - @aws-amplify/backend-secret@0.4.5-beta.3
  - @aws-amplify/cli-core@0.5.0-beta.4

## 0.12.0-beta.7

### Patch Changes

- Updated dependencies [e0ae60c]
- Updated dependencies [a05933c]
  - @aws-amplify/cli-core@0.5.0-beta.3
  - @aws-amplify/backend-deployer@0.5.1-beta.3
  - @aws-amplify/sandbox@0.5.2-beta.6

## 0.12.0-beta.6

### Patch Changes

- 05c3c9b: Rename target format type and prop in model gen package
- beb1591: Update text to match sandbox default behavior
- 3e34244: use `format` to replace `color` and remove `color`.
- ee247fd: use printer from cli-core
- 937086b: require "resolution" in AmplifyUserError options
- Updated dependencies [05c3c9b]
- Updated dependencies [3e34244]
- Updated dependencies [ee247fd]
- Updated dependencies [937086b]
- Updated dependencies [b931980]
  - @aws-amplify/model-generator@0.5.0-beta.3
  - @aws-amplify/cli-core@0.5.0-beta.2
  - @aws-amplify/sandbox@0.5.2-beta.5
  - @aws-amplify/backend-deployer@0.5.1-beta.2
  - @aws-amplify/platform-core@0.5.0-beta.2
  - @aws-amplify/deployed-backend-client@0.4.0-beta.3
  - @aws-amplify/client-config@0.9.0-beta.4
  - @aws-amplify/backend-secret@0.4.5-beta.2

## 0.12.0-beta.5

### Patch Changes

- Updated dependencies [615a3e6]
  - @aws-amplify/sandbox@0.5.2-beta.4

## 0.12.0-beta.4

### Patch Changes

- Updated dependencies [3998cd3]
- Updated dependencies [79cff6d]
- Updated dependencies [8d9a7a4]
- Updated dependencies [b0ba24d]
- Updated dependencies [8d9a7a4]
  - @aws-amplify/cli-core@0.5.0-beta.1
  - @aws-amplify/client-config@0.9.0-beta.3
  - @aws-amplify/sandbox@0.5.2-beta.3

## 0.12.0-beta.3

### Patch Changes

- Updated dependencies [415c4c1]
  - @aws-amplify/deployed-backend-client@0.4.0-beta.2
  - @aws-amplify/client-config@0.8.1-beta.2
  - @aws-amplify/model-generator@0.4.1-beta.2
  - @aws-amplify/sandbox@0.5.2-beta.2

## 0.12.0-beta.2

### Minor Changes

- 4995bda: Introduce initial iteration of access control mechanism between backend resources.
  The APIs and functioality are NOT final and are subject to change without notice.

### Patch Changes

- Updated dependencies [ab7533d]
- Updated dependencies [a01f6b9]
- Updated dependencies [88c1b28]
- Updated dependencies [baeb68f]
- Updated dependencies [4995bda]
  - @aws-amplify/deployed-backend-client@0.4.0-beta.1
  - @aws-amplify/backend-output-schemas@0.7.0-beta.0
  - @aws-amplify/platform-core@0.5.0-beta.1
  - @aws-amplify/cli-core@0.4.1-beta.0
  - @aws-amplify/sandbox@0.5.2-beta.1
  - @aws-amplify/client-config@0.8.1-beta.1
  - @aws-amplify/model-generator@0.4.1-beta.1
  - @aws-amplify/backend-deployer@0.5.1-beta.1
  - @aws-amplify/backend-secret@0.4.5-beta.1

## 0.11.2-beta.1

### Patch Changes

- Updated dependencies [74cbda0]
- Updated dependencies [8901779]
  - @aws-amplify/backend-deployer@0.5.1-beta.0
  - @aws-amplify/platform-core@0.5.0-beta.0
  - @aws-amplify/form-generator@0.8.0-beta.1
  - @aws-amplify/sandbox@0.5.2-beta.0
  - @aws-amplify/backend-secret@0.4.5-beta.0
  - @aws-amplify/client-config@0.8.1-beta.0
  - @aws-amplify/deployed-backend-client@0.3.11-beta.0
  - @aws-amplify/model-generator@0.4.1-beta.0

## 0.11.2-beta.0

### Patch Changes

- 21f6292a1: Force release to beta tag
- Updated dependencies [27bcc979a]
  - @aws-amplify/form-generator@0.8.0-beta.0

## 0.11.1

### Patch Changes

- Updated dependencies [b1c3e0d49]
- Updated dependencies [6daae6be5]
  - @aws-amplify/client-config@0.8.0
  - @aws-amplify/sandbox@0.5.1

## 0.11.0

### Minor Changes

- b73d76a78: Support yarn 1, yarn 2+ and pnpm package managers
- 2a75b08dc: adds info commands that provides troubleshooting info

### Patch Changes

- Updated dependencies [85ced84f2]
- Updated dependencies [348717b55]
- Updated dependencies [b73d76a78]
- Updated dependencies [1814f1a69]
  - @aws-amplify/backend-output-schemas@0.6.0
  - @aws-amplify/client-config@0.7.0
  - @aws-amplify/backend-deployer@0.5.0
  - @aws-amplify/cli-core@0.4.0
  - @aws-amplify/sandbox@0.5.0
  - @aws-amplify/model-generator@0.4.0
  - @aws-amplify/deployed-backend-client@0.3.10
  - @aws-amplify/backend-secret@0.4.4
  - @aws-amplify/platform-core@0.4.4

## 0.10.0

### Minor Changes

- 4c1485aa4: print out file written for amplify generate commands
- fb07bafce: Refactor Printer class & deprecate Logger

### Patch Changes

- Updated dependencies [4c1485aa4]
- Updated dependencies [fb07bafce]
  - @aws-amplify/model-generator@0.3.0
  - @aws-amplify/form-generator@0.7.0
  - @aws-amplify/client-config@0.6.0
  - @aws-amplify/cli-core@0.3.0
  - @aws-amplify/sandbox@0.4.0

## 0.9.7

### Patch Changes

- f8112b6f3: If present, print error.cause.message in top-level error handler. This gives customers more debugging information when the error cause rather than the error contains the root cause of the issue.
- Updated dependencies [0809ad36d]
- Updated dependencies [618a2ea71]
  - @aws-amplify/platform-core@0.4.3
  - @aws-amplify/backend-output-schemas@0.5.2
  - @aws-amplify/client-config@0.5.3
  - @aws-amplify/backend-deployer@0.4.7
  - @aws-amplify/backend-secret@0.4.3
  - @aws-amplify/deployed-backend-client@0.3.9
  - @aws-amplify/sandbox@0.3.14
  - @aws-amplify/model-generator@0.2.7

## 0.9.6

### Patch Changes

- a06caf599: add @aws-amplify/backend-deployer as a dependency to @aws-amplify/cli
  - @aws-amplify/backend-deployer@0.4.6
  - @aws-amplify/backend-secret@0.4.2
  - @aws-amplify/platform-core@0.4.2
  - @aws-amplify/sandbox@0.3.13
  - @aws-amplify/client-config@0.5.2
  - @aws-amplify/deployed-backend-client@0.3.8
  - @aws-amplify/model-generator@0.2.6

## 0.9.5

### Patch Changes

- 04f067837: Implement consistent dependency declaration check. Bumped dependencies where necessary.
- Updated dependencies [04f067837]
  - @aws-amplify/deployed-backend-client@0.3.7
  - @aws-amplify/backend-output-schemas@0.5.1
  - @aws-amplify/model-generator@0.2.5
  - @aws-amplify/backend-secret@0.4.1
  - @aws-amplify/form-generator@0.6.1
  - @aws-amplify/client-config@0.5.1
  - @aws-amplify/platform-core@0.4.1
  - @aws-amplify/sandbox@0.3.12

## 0.9.4

### Patch Changes

- 7f7191375: Create directory if does not exists when configuring profile
- 8d31af7c4: Create ~/.aws/config and ~/.aws/credentials files using owner read/write only. This is consistent with how the AWS CLI configures these files.
- 23b1f36e0: added npx prefix to profile setup command instructions
- Updated dependencies [5678ab4d4]
- Updated dependencies [5678ab4d4]
  - @aws-amplify/platform-core@0.4.0
  - @aws-amplify/backend-secret@0.4.0
  - @aws-amplify/deployed-backend-client@0.3.6
  - @aws-amplify/sandbox@0.3.11

## 0.9.3

### Patch Changes

- 8688aa00f: Classify package json parsing errors as user errors
- 74846bd26: gracefully handle errors that occur during a process event handler
- 8d0b999ad: add --config-out-dir to pipeline-deploy command
- Updated dependencies [8688aa00f]
- Updated dependencies [6a1c252e1]
- Updated dependencies [6a1c252e1]
- Updated dependencies [e5da97e37]
  - @aws-amplify/platform-core@0.3.4
  - @aws-amplify/backend-output-schemas@0.5.0
  - @aws-amplify/client-config@0.5.0
  - @aws-amplify/backend-secret@0.3.4
  - @aws-amplify/deployed-backend-client@0.3.5
  - @aws-amplify/model-generator@0.2.4
  - @aws-amplify/sandbox@0.3.10

## 0.9.2

### Patch Changes

- db775ad6e: Refactor error handling, introduce two new AmplifyErrors
- cd672baca: require backend identifier in deployer, remove redundant deploymentType parameter
- Updated dependencies [db775ad6e]
- Updated dependencies [cd672baca]
- Updated dependencies [d2c3baa7e]
  - @aws-amplify/platform-core@0.3.2
  - @aws-amplify/sandbox@0.3.7
  - @aws-amplify/deployed-backend-client@0.3.4
  - @aws-amplify/backend-secret@0.3.2

## 0.9.1

### Patch Changes

- 43d09b642: fix: update package.json metadata
- Updated dependencies [f081c223c]
  - @aws-amplify/form-generator@0.6.0

## 0.9.0

### Minor Changes

- aabe5dd61: Bump to minor version for usage data consent

### Patch Changes

- 590662ae5: Change secret name argument in secret commands to kebab-case
- 85e619116: Added subcommands under configure data tracking preferences
- 85e619116: integrate usage data tracking consent with usage-data-emitter
- Updated dependencies [aabe5dd61]
- Updated dependencies [5f336ffbb]
- Updated dependencies [8258926a0]
- Updated dependencies [85e619116]
  - @aws-amplify/platform-core@0.3.0
  - @aws-amplify/model-generator@0.2.3
  - @aws-amplify/backend-secret@0.3.1
  - @aws-amplify/deployed-backend-client@0.3.3
  - @aws-amplify/sandbox@0.3.5

## 0.8.1

### Patch Changes

- f1717d9c9: Remove input validations on generate commands so they fall back to the stack id
- ef3f5eb50: Update account setup URL
- Updated dependencies [c47e03e20]
- Updated dependencies [cc8b66cd9]
  - @aws-amplify/client-config@0.4.2
  - @aws-amplify/form-generator@0.5.0
  - @aws-amplify/sandbox@0.3.4

## 0.8.0

### Minor Changes

- dce8a0eb6: Defaults to the sandbox identifier when no branch or stack is passed in the CLI

### Patch Changes

- 4fee488eb: chore: avoid crashing sandbox on failing to retrieve metadata
- cb855dfa5: chore: refactor packageJsonReader and generate installationIds from hostname
- d81af85df: `amplify --version` returns correct version.
  Disable subcommands `--version`.
- Updated dependencies [4fee488eb]
- Updated dependencies [730afd8fe]
- Updated dependencies [cb855dfa5]
  - @aws-amplify/deployed-backend-client@0.3.2
  - @aws-amplify/sandbox@0.3.3
  - @aws-amplify/platform-core@0.2.2

## 0.7.1

### Patch Changes

- 70685f36b: Add usage data metrics
- Updated dependencies [70685f36b]
- Updated dependencies [50934da02]
  - @aws-amplify/platform-core@0.2.1
  - @aws-amplify/sandbox@0.3.2
  - @aws-amplify/client-config@0.4.1

## 0.7.0

### Minor Changes

- fc71c4902: Change the default directory for models in form generation

### Patch Changes

- 79ac13997: client config generation respects sandbox format option
- 869a84926: Update profile error messages and a profile configure URL.
- 79ac13997: Rename sandbox format to config-format
- 79ac13997: Change sandbox out-dir to config-out-dir and client config generation respects config-out-dir option
- Updated dependencies [fc71c4902]
  - @aws-amplify/form-generator@0.4.0

## 0.6.1

### Patch Changes

- 957ba93db: Fix a profile middleware unit test
- 01ebbc497: handle client config formats used in mobile app development
- Updated dependencies [07b0dfc9f]
- Updated dependencies [01ebbc497]
  - @aws-amplify/backend-output-schemas@0.4.0
  - @aws-amplify/client-config@0.4.0
  - @aws-amplify/deployed-backend-client@0.3.1
  - @aws-amplify/model-generator@0.2.2
  - @aws-amplify/sandbox@0.3.1

## 0.6.0

### Minor Changes

- 71a63a16: Change stack naming strategy to include deployment type as a suffix

### Patch Changes

- 316590c0: Validate aws region config. Besides, remove help output from the credential and region validation error.
- Updated dependencies [71a63a16]
  - @aws-amplify/deployed-backend-client@0.3.0
  - @aws-amplify/backend-output-schemas@0.3.0
  - @aws-amplify/backend-secret@0.3.0
  - @aws-amplify/client-config@0.3.0
  - @aws-amplify/platform-core@0.2.0
  - @aws-amplify/sandbox@0.3.0
  - @aws-amplify/model-generator@0.2.1

## 0.5.0

### Minor Changes

- ab715666: Remove deprecated sandbox parameters for form generation

## 0.4.0

### Minor Changes

- 6ff17d64: Add 'profile' option to applicable commands

### Patch Changes

- Updated dependencies [68dc91e3]
  - @aws-amplify/platform-core@0.1.4
  - @aws-amplify/sandbox@0.2.4

## 0.3.1

### Patch Changes

- 4ad1db95: Gracefully handle Crtl+C error during CLI prompting

## 0.3.0

### Minor Changes

- ff08a94b: Add 'amplify configure' command.

### Patch Changes

- a216255e: Add successfulDeletion event to remove amplify configuration on deletion
- Updated dependencies [ff08a94b]
- Updated dependencies [863dc241]
- Updated dependencies [a216255e]
  - @aws-amplify/cli-core@0.2.0
  - @aws-amplify/form-generator@0.3.0
  - @aws-amplify/client-config@0.2.1
  - @aws-amplify/sandbox@0.2.1

## 0.2.0

### Minor Changes

- 348b3783: Added form generation event to sandbox
- 98b17069: Provides sandbox secret CLI commands
- 2216d37d: 1. Remove version from the backend secret feature. 2. Use max(secret_last_updated) to trigger secret fetcher.
- 56fbcc5f: Generated typescript codegen by default, and add type defaults as well
- 3fd21230: Removes event hook that runs formgen after sandbox deployment.
- 319e62bb: Add bootstrap detection in sandbox
- 0b2d50da: Add form generation interface
- ee3d55fe: Add event handlers for Sandbox
- 6ec93aed: Add generate graphql-client-code command with mocked implementation
- 2bd14d48: Adds profile option to sandbox command
- ac625207: adds pipeline-deploy command
- 2b18af15: Add model filtering to form generation
- b4f82717: Create a new deployed-backend-client package that provides a convenient interface for retrieving stack outputs
- 1a19914d: By default, artifacts render in ./{ui-components,graphql}

### Patch Changes

- e233eab6: make default amplifyconfig format json, change js format to mjs, and add dart format
- 23fc5b13: Lint fixes
- 813cdfb0: Extract BackendIdentifierResolver into its own class
- 7141c188: chore: validate that the profile can vend credentials before moving on
- c3383926: Run npm init as part of create-amplify if necessary. List aws-cdk as a peerDependency of sandbox. Fix sandbox stack naming and lookup
- 7853b00a: Make CLI options kebab case
- b2b0c2da: force version bump
- ed841e3e: fix: pipeline deploy passes the required parameter to the deployer
- 7296e9d9: Initial publish
- 4fd18b12: fix: change 'out' to 'outDir'
- 75d90a57: add `format` option to sandbox. Rename `out` option to `outDir`.
- 76ba7929: chore: reformat yargs error display
- 915c0325: Offer to reset the sandbox if a non deployable change is detected
- df25ec57: Remove short circuit logic in client config generation event
- 4f3c1711: update backend-deployer dependency
- 0765e494: fix(cli): Sanitize app names generated from package json
- 3bda96ff: update methods to use arrow notation
- caaf1fee: Add model and form generation outputs to watch exclusions
- 01320d4b: add `amplify generate config --format` option
- d84f92c0: make pipeline-deploy cmd generate config
- bb3bf89a: add backend metadata manager
- fcc7d389: Enable type checking during deployment
- 512f0778: move UniqueBackendIdentifier to platform-core package
- 6ba66d9b: fix: ctrl-c behavior for sandbox
- Updated dependencies [2bbf3f20]
- Updated dependencies [f0ef7c6a]
- Updated dependencies [e233eab6]
- Updated dependencies [92950f99]
- Updated dependencies [23fc5b13]
- Updated dependencies [e9c0c9b5]
- Updated dependencies [47bfb317]
- Updated dependencies [ac3df080]
- Updated dependencies [98b17069]
- Updated dependencies [c3383926]
- Updated dependencies [642e8d55]
- Updated dependencies [c78daa11]
- Updated dependencies [b2b0c2da]
- Updated dependencies [a351b261]
- Updated dependencies [1817c55c]
- Updated dependencies [2216d37d]
- Updated dependencies [baa7a905]
- Updated dependencies [1a87500d]
- Updated dependencies [b48dae80]
- Updated dependencies [56fbcc5f]
- Updated dependencies [7296e9d9]
- Updated dependencies [53779253]
- Updated dependencies [5585f473]
- Updated dependencies [233adaba]
- Updated dependencies [75d90a57]
- Updated dependencies [76ba7929]
- Updated dependencies [915c0325]
- Updated dependencies [b40d2d7b]
- Updated dependencies [c5d18967]
- Updated dependencies [ad73f897]
- Updated dependencies [675f4283]
- Updated dependencies [c03a2f8c]
- Updated dependencies [b40d2d7b]
- Updated dependencies [3bda96ff]
- Updated dependencies [319e62bb]
- Updated dependencies [ee3d55fe]
- Updated dependencies [7103735b]
- Updated dependencies [395c8f0d]
- Updated dependencies [08601278]
- Updated dependencies [1cefbdd4]
- Updated dependencies [2bd14d48]
- Updated dependencies [ce008a2c]
- Updated dependencies [01320d4b]
- Updated dependencies [36d93e46]
- Updated dependencies [ac625207]
- Updated dependencies [aee0a52d]
- Updated dependencies [8f99476e]
- Updated dependencies [4d411b67]
- Updated dependencies [d1295912]
- Updated dependencies [f46f69fb]
- Updated dependencies [b1da9601]
- Updated dependencies [bb3bf89a]
- Updated dependencies [2b18af15]
- Updated dependencies [407a09ff]
- Updated dependencies [47456c26]
- Updated dependencies [0b029cb5]
- Updated dependencies [b4f82717]
- Updated dependencies [f2394dbe]
- Updated dependencies [5b9aac15]
- Updated dependencies [fcc7d389]
- Updated dependencies [05f97b26]
- Updated dependencies [d925b097]
- Updated dependencies [2525b582]
- Updated dependencies [1a6dd467]
- Updated dependencies [f75fa531]
- Updated dependencies [f6618771]
- Updated dependencies [4664e675]
- Updated dependencies [f201c94a]
- Updated dependencies [5c1d9de8]
- Updated dependencies [512f0778]
- Updated dependencies [e0e1488b]
- Updated dependencies [883d9da7]
- Updated dependencies [59f5ea24]
  - @aws-amplify/client-config@0.2.0
  - @aws-amplify/deployed-backend-client@0.2.0
  - @aws-amplify/model-generator@0.2.0
  - @aws-amplify/backend-output-schemas@0.2.0
  - @aws-amplify/backend-secret@0.2.0
  - @aws-amplify/sandbox@0.2.0
  - @aws-amplify/form-generator@0.2.0
  - @aws-amplify/cli-core@0.1.0
  - @aws-amplify/platform-core@0.1.1

## 0.2.0-alpha.15

### Patch Changes

- 76ba7929: chore: reformat yargs error display
- Updated dependencies [f0ef7c6a]
- Updated dependencies [47bfb317]
- Updated dependencies [76ba7929]
  - @aws-amplify/deployed-backend-client@0.2.0-alpha.11
  - @aws-amplify/model-generator@0.2.0-alpha.7
  - @aws-amplify/cli-core@0.1.0-alpha.4

## 0.2.0-alpha.14

### Patch Changes

- 7141c188: chore: validate that the profile can vend credentials before moving on
- Updated dependencies [8f99476e]
  - @aws-amplify/sandbox@0.2.0-alpha.18

## 0.2.0-alpha.13

### Patch Changes

- e233eab6: make default amplifyconfig format json, change js format to mjs, and add dart format
- Updated dependencies [e233eab6]
- Updated dependencies [4664e675]
  - @aws-amplify/client-config@0.2.0-alpha.12
  - @aws-amplify/sandbox@0.2.0-alpha.17

## 0.2.0-alpha.12

### Minor Changes

- 3fd21230: Removes event hook that runs formgen after sandbox deployment.

### Patch Changes

- df25ec57: Remove short circuit logic in client config generation event
- Updated dependencies [1817c55c]
- Updated dependencies [675f4283]
- Updated dependencies [08601278]
- Updated dependencies [aee0a52d]
- Updated dependencies [4d411b67]
- Updated dependencies [883d9da7]
  - @aws-amplify/form-generator@0.2.0-alpha.4
  - @aws-amplify/cli-core@0.1.0-alpha.3
  - @aws-amplify/sandbox@0.2.0-alpha.16
  - @aws-amplify/deployed-backend-client@0.2.0-alpha.9
  - @aws-amplify/backend-output-schemas@0.2.0-alpha.7

## 0.2.0-alpha.11

### Minor Changes

- 56fbcc5f: Generated typescript codegen by default, and add type defaults as well

### Patch Changes

- Updated dependencies [56fbcc5f]
  - @aws-amplify/model-generator@0.2.0-alpha.6

## 0.2.0-alpha.10

### Patch Changes

- fcc7d389: Enable type checking during deployment
- Updated dependencies [fcc7d389]
  - @aws-amplify/sandbox@0.2.0-alpha.15

## 0.2.0-alpha.9

### Patch Changes

- 915c0325: Offer to reset the sandbox if a non deployable change is detected
- Updated dependencies [e9c0c9b5]
- Updated dependencies [915c0325]
  - @aws-amplify/deployed-backend-client@0.2.0-alpha.8
  - @aws-amplify/cli-core@0.1.0-alpha.2
  - @aws-amplify/platform-core@0.1.1-alpha.3
  - @aws-amplify/sandbox@0.2.0-alpha.14

## 0.2.0-alpha.8

### Minor Changes

- 1a19914d: By default, artifacts render in ./{ui-components,graphql}

### Patch Changes

- Updated dependencies [2bbf3f20]
  - @aws-amplify/client-config@0.2.0-alpha.11
  - @aws-amplify/sandbox@0.2.0-alpha.13

## 0.2.0-alpha.7

### Patch Changes

- 7853b00a: Make CLI options kebab case
- d84f92c0: make pipeline-deploy cmd generate config
- Updated dependencies [a351b261]
- Updated dependencies [f2394dbe]
- Updated dependencies [5b9aac15]
  - @aws-amplify/deployed-backend-client@0.2.0-alpha.7
  - @aws-amplify/backend-secret@0.2.0-alpha.6
  - @aws-amplify/platform-core@0.1.1-alpha.2

## 0.2.0-alpha.6

### Minor Changes

- 2216d37d: 1. Remove version from the backend secret feature. 2. Use max(secret_last_updated) to trigger secret fetcher.

### Patch Changes

- ed841e3e: fix: pipeline deploy passes the required parameter to the deployer
- Updated dependencies [2216d37d]
- Updated dependencies [36d93e46]
  - @aws-amplify/backend-secret@0.2.0-alpha.2
  - @aws-amplify/sandbox@0.2.0-alpha.8
  - @aws-amplify/deployed-backend-client@0.2.0-alpha.2
  - @aws-amplify/backend-output-schemas@0.2.0-alpha.5
  - @aws-amplify/model-generator@0.2.0-alpha.4
  - @aws-amplify/form-generator@0.2.0-alpha.3
  - @aws-amplify/client-config@0.2.0-alpha.8
  - @aws-amplify/platform-core@0.1.1-alpha.1

## 0.2.0-alpha.5

### Minor Changes

- 348b3783: Added form generation event to sandbox
- 98b17069: Provides sandbox secret CLI commands
- 319e62bb: Add bootstrap detection in sandbox
- 0b2d50da: Add form generation interface
- ee3d55fe: Add event handlers for Sandbox
- 2b18af15: Add model filtering to form generation

### Patch Changes

- 23fc5b13: Lint fixes
- 0765e494: fix(cli): Sanitize app names generated from package json
- caaf1fee: Add model and form generation outputs to watch exclusions
- bb3bf89a: add backend metadata manager
- 512f0778: move UniqueBackendIdentifier to platform-core package
- Updated dependencies [23fc5b13]
- Updated dependencies [98b17069]
- Updated dependencies [baa7a905]
- Updated dependencies [319e62bb]
- Updated dependencies [ee3d55fe]
- Updated dependencies [b1da9601]
- Updated dependencies [bb3bf89a]
- Updated dependencies [2b18af15]
- Updated dependencies [f6618771]
- Updated dependencies [512f0778]
  - @aws-amplify/model-generator@0.2.0-alpha.3
  - @aws-amplify/client-config@0.2.0-alpha.7
  - @aws-amplify/backend-secret@0.2.0-alpha.1
  - @aws-amplify/sandbox@0.2.0-alpha.7
  - @aws-amplify/form-generator@0.2.0-alpha.2
  - @aws-amplify/deployed-backend-client@0.2.0-alpha.1
  - @aws-amplify/backend-output-schemas@0.2.0-alpha.4
  - @aws-amplify/platform-core@0.1.1-alpha.0

## 0.2.0-alpha.4

### Minor Changes

- 6ec93aed: Add generate graphql-client-code command with mocked implementation
- 2bd14d48: Adds profile option to sandbox command
- b4f82717: Create a new deployed-backend-client package that provides a convenient interface for retrieving stack outputs

### Patch Changes

- 813cdfb0: Extract BackendIdentifierResolver into its own class
- 4fd18b12: fix: change 'out' to 'outDir'
- 75d90a57: add `format` option to sandbox. Rename `out` option to `outDir`.
- 1dada824: chore: Update eslint config to new flat config type
- Updated dependencies [92950f99]
- Updated dependencies [b48dae80]
- Updated dependencies [75d90a57]
- Updated dependencies [1dada824]
- Updated dependencies [1cefbdd4]
- Updated dependencies [2bd14d48]
- Updated dependencies [407a09ff]
- Updated dependencies [b4f82717]
- Updated dependencies [05f97b26]
- Updated dependencies [1a6dd467]
- Updated dependencies [f75fa531]
- Updated dependencies [5c1d9de8]
- Updated dependencies [e0e1488b]
  - @aws-amplify/model-generator@0.2.0-alpha.2
  - @aws-amplify/sandbox@0.2.0-alpha.6
  - @aws-amplify/client-config@0.2.0-alpha.6
  - @aws-amplify/deployed-backend-client@0.2.0-alpha.0

## 0.2.0-alpha.3

### Patch Changes

- b2b0c2d: force version bump
- Updated dependencies [b2b0c2d]
- Updated dependencies [395c8f0]
  - @aws-amplify/client-config@0.1.1-alpha.3
  - @aws-amplify/sandbox@0.1.1-alpha.3

## 0.2.0-alpha.2

### Patch Changes

- 3bda96f: update methods to use arrow notation
- Updated dependencies [3bda96f]
  - @aws-amplify/client-config@0.1.1-alpha.2
  - @aws-amplify/sandbox@0.1.1-alpha.2

## 0.2.0-alpha.1

### Minor Changes

- ac62520: adds pipeline-deploy command

### Patch Changes

- c338392: Run npm init as part of create-amplify if necessary. List aws-cdk as a peerDependency of sandbox. Fix sandbox stack naming and lookup
- 6ba66d9: fix: ctrl-c behavior for sandbox
- Updated dependencies [c338392]
- Updated dependencies [ac62520]
  - @aws-amplify/client-config@0.1.1-alpha.1
  - @aws-amplify/sandbox@0.1.1-alpha.1

## 0.1.1-alpha.0

### Patch Changes

- 7296e9d: Initial publish
- Updated dependencies [7296e9d]
  - @aws-amplify/client-config@0.1.1-alpha.0
  - @aws-amplify/sandbox@0.1.1-alpha.0
