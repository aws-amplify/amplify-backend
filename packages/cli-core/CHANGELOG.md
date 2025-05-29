# @aws-amplify/cli-core

## 2.2.0

### Minor Changes

- 17fe9cb: pinning zod
- dd00ce1: zod upgrade

### Patch Changes

- Updated dependencies [3b4f18f]
- Updated dependencies [17fe9cb]
- Updated dependencies [dd00ce1]
  - @aws-amplify/platform-core@1.10.0

## 2.1.1

### Patch Changes

- 701bc20: switch to new version of telemetry
- Updated dependencies [701bc20]
- Updated dependencies [854aa25]
- Updated dependencies [d5a6553]
  - @aws-amplify/platform-core@1.9.0

## 2.1.0

### Minor Changes

- d09014b: integrate with aws cdk toolkit

### Patch Changes

- d09014b: fix pretty sandbox qa bugs
- d09014b: reroute stderr through printer and ensure printing is done around spinners
- 2857cf3: refactor type checks to use TS compiler APIs instead of tsc cli
- 9dc0916: Update error matching and parsing based on toolkit integration
- d09014b: After clearing console, move the cursor to the top of terminal
- d6b9286: adjust spinner time to ensure it renders deterministic amount of time
- d09014b: Use deployment started as a marker for assets published
- d8a7304: update api after bumping typescript
- d09014b: Move the spinner between timestamp and spinner text
- d09014b: Updates to pretty sandbox display
- 96fe987: Upgrade to cdk toolkit-lib and use new hotswap event markers
- Updated dependencies [8483297]
- Updated dependencies [baaaba9]
- Updated dependencies [d09014b]
- Updated dependencies [ece77e7]
- Updated dependencies [d09014b]
- Updated dependencies [d09014b]
- Updated dependencies [d8a7304]
  - @aws-amplify/platform-core@1.8.0

## 2.0.0

### Major Changes

- 8f59d16: integrate with aws cdk toolkit

### Patch Changes

- f9f31c7: fix pretty sandbox qa bugs
- f0d501e: reroute stderr through printer and ensure printing is done around spinners
- f62a1fd: After clearing console, move the cursor to the top of terminal
- e4383ec: Use deployment started as a marker for assets published
- 1d2b36f: Move the spinner between timestamp and spinner text
- 1d2b36f: Updates to pretty sandbox display
- Updated dependencies [8f59d16]
- Updated dependencies [0cc2de3]
- Updated dependencies [b2f9042]
  - @aws-amplify/platform-core@1.7.0

## 1.4.1

### Patch Changes

- 99f5d0b: lint and format with new version of prettier
- 32bcc0b: increase spinner time to more accurately capture spinner refreshes in unit tests
- Updated dependencies [99f5d0b]
- Updated dependencies [fad46a4]
- Updated dependencies [2102071]
  - @aws-amplify/platform-core@1.6.5

## 1.4.0

### Minor Changes

- af90a9b: Add notices schema

### Patch Changes

- Updated dependencies [dafb530]
- Updated dependencies [aec5e08]
  - @aws-amplify/platform-core@1.6.4

## 1.3.0

### Minor Changes

- 7348f29: Refactor printer to use ora and add two new APIs

### Patch Changes

- cdb5156: Bumps [@inquirer/prompts](https://github.com/SBoudrias/Inquirer.js) from 3.3.2 to 7.3.2.
- f6171a2: update start spinner api to accept the id instead of generating a new

## 1.2.4

### Patch Changes

- bc07307: Update code with Eslint@8 compliant
- Updated dependencies [bc07307]
  - @aws-amplify/platform-core@1.6.2

## 1.2.3

### Patch Changes

- ff2f2ce: fixed violations to cause propagation lint rule

## 1.2.2

### Patch Changes

- 2dab201: Report cdk versions
- Updated dependencies [2dab201]
  - @aws-amplify/platform-core@1.6.0

## 1.2.1

### Patch Changes

- 0cf5c26: add a required input prompt for use in region input
- f6ba240: Upgrade execa
- Updated dependencies [cfdc854]
- Updated dependencies [65abf6a]
  - @aws-amplify/platform-core@1.3.0

## 1.2.0

### Minor Changes

- c3c3057: update ctrl+c behavior to always print guidance to delete and exit with no prompt

## 1.1.3

### Patch Changes

- 8dd7286: fixed errors in plugin-types and cli-core along with any extraneous dependencies in other packages

## 1.1.2

### Patch Changes

- 36feb29: prevent CTRL+C handling for pnpm
- Updated dependencies [3c698e0]
- Updated dependencies [320a86d]
  - @aws-amplify/platform-core@1.0.5

## 1.1.1

### Patch Changes

- 697bc8a: Prevent CTRL-C handling for yarn classic package manager
- Updated dependencies [c784e40]
  - @aws-amplify/platform-core@1.0.3

## 1.1.0

### Minor Changes

- 8f23287: feat: add support for function logs streaming to sandbox

## 1.0.0

### Major Changes

- 51195e2: Major version bump for all public pacakges.

### Patch Changes

- Updated dependencies [51195e2]
  - @aws-amplify/platform-core@1.0.0

## 0.7.0

### Minor Changes

- 1f38466: Replace amplify command occurrences with ampx and related renaming

### Patch Changes

- 694daaf: format.error to handle formating Error

## 0.6.0

### Minor Changes

- 8995e3b: refactor format.runner().amplifyCommand() into format.backendCliCommand()

### Patch Changes

- Updated dependencies [ce5a5ac]
  - @aws-amplify/platform-core@0.5.1

## 0.5.0

### Minor Changes

- 7537216: Move record formatting from printer to formatter
- 77079c6: Improve formatting of AmplifyErrors in the top-level error handler
- 3e34244: use `format` to replace `color` and remove `color`.
- b0ba24d: Generate type definition file for static environment variables for functions
- 0d1b00e: Update generated env package location and use the $ symbol

### Patch Changes

- a01f6b9: fix pnpm Command "tsc" not found
- baeb68f: fix yarn classic error Command "tsc" not found.
- e0ae60c: initialize tsconfig file from object template rather than IPC call
- 3998cd3: Fix how paths is added to tsconfig
- 4d47f63: Improved error message when attempting to run amplify directly
- 8d9a7a4: add error message for PNPM on windows
- ee247fd: use printer from cli-core
- 8d9a7a4: update PackageManagerControllerFactory to take Operation System platform information optionally
- 937086b: require "resolution" in AmplifyUserError options
- 1c52df1: chore: Adds a log message to inform the name of the sandbox being created/initialized
- Updated dependencies [6c6af9b]
- Updated dependencies [ab7533d]
- Updated dependencies [74cbda0]
- Updated dependencies [aec89f9]
- Updated dependencies [ef111b4]
- Updated dependencies [937086b]
- Updated dependencies [2a69684]
- Updated dependencies [4995bda]
- Updated dependencies [5e12247]
- Updated dependencies [b0b4dea]
  - @aws-amplify/platform-core@0.5.0

## 0.5.0-beta.12

### Patch Changes

- Updated dependencies [ef111b4]
  - @aws-amplify/platform-core@0.5.0-beta.7

## 0.5.0-beta.11

### Patch Changes

- Updated dependencies [b0b4dea]
  - @aws-amplify/platform-core@0.5.0-beta.6

## 0.5.0-beta.10

### Patch Changes

- 1c52df1: chore: Adds a log message to inform the name of the sandbox being created/initialized
- Updated dependencies [6c6af9b]
  - @aws-amplify/platform-core@0.5.0-beta.5

## 0.5.0-beta.9

### Minor Changes

- 77079c6: Improve formatting of AmplifyErrors in the top-level error handler

## 0.5.0-beta.8

### Patch Changes

- 4d47f63: Improved error message when attempting to run amplify directly

## 0.5.0-beta.7

### Patch Changes

- Updated dependencies [aec89f9]
- Updated dependencies [2a69684]
  - @aws-amplify/platform-core@0.5.0-beta.4

## 0.5.0-beta.6

### Minor Changes

- 0d1b00e: Update generated env package location and use the $ symbol

## 0.5.0-beta.5

### Minor Changes

- 7537216: Move record formatting from printer to formatter

## 0.5.0-beta.4

### Patch Changes

- Updated dependencies [5e12247]
  - @aws-amplify/platform-core@0.5.0-beta.3

## 0.5.0-beta.3

### Patch Changes

- e0ae60c: initialize tsconfig file from object template rather than IPC call

## 0.5.0-beta.2

### Minor Changes

- 3e34244: use `format` to replace `color` and remove `color`.

### Patch Changes

- ee247fd: use printer from cli-core
- 937086b: require "resolution" in AmplifyUserError options
- Updated dependencies [937086b]
  - @aws-amplify/platform-core@0.5.0-beta.2

## 0.5.0-beta.1

### Minor Changes

- b0ba24d: Generate type definition file for static environment variables for functions

### Patch Changes

- 3998cd3: Fix how paths is added to tsconfig
- 8d9a7a4: add error message for PNPM on windows
- 8d9a7a4: update PackageManagerControllerFactory to take Operation System platform information optionally

## 0.4.1-beta.0

### Patch Changes

- a01f6b9: fix pnpm Command "tsc" not found
- baeb68f: fix yarn classic error Command "tsc" not found.

## 0.4.0

### Minor Changes

- b73d76a78: Support yarn 1, yarn 2+ and pnpm package managers

## 0.3.0

### Minor Changes

- fb07bafce: Refactor Printer class & deprecate Logger

## 0.2.0

### Minor Changes

- ff08a94b: Add 'amplify configure' command.

## 0.1.0

### Minor Changes

- 915c0325: Offer to reset the sandbox if a non deployable change is detected

### Patch Changes

- 76ba7929: chore: reformat yargs error display
- 675f4283: Move prompter in create_amplify to cli-core package

## 0.1.0-alpha.4

### Patch Changes

- 76ba7929: chore: reformat yargs error display

## 0.1.0-alpha.3

### Patch Changes

- 675f4283: Move prompter in create_amplify to cli-core package

## 0.1.0-alpha.2

### Minor Changes

- 915c0325: Offer to reset the sandbox if a non deployable change is detected
