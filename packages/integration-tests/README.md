# Integration Tests

This package contains two kind of tests:

1. In memory integration tests which run synthesis on tests projects and validate CDK assembly snapshots.
2. End-to-end tests which run full scenarios that may include deployments and therefore access to AWS account.

# In memory integration tests

To run these tests execute `npm run test` from the repository root (they run together with unit tests)
or `npm run test:dir packages/integration-tests/lib/test-in-memory` (to run them in isolation).

# End-to-end tests

## create-amplify tests

The create-amplify e2e suite tests the first-time installation and setup of a new amplify backend project. To run this suite, run
`npm run test:dir packages/integration-tests/lib/test-e2e/create_amplify.test.js`

## deployment tests

To run end-to-end deployment tests, credentials to an AWS account must be available on the machine. Any credentials that will be picked up by the
[default node credential provider](https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/setting-credentials-node.html) should work.
This include setting environment variables for a default profile.

To run this suite, run
`npm run test:dir packages/integration-tests/lib/test-e2e/deployment.test.js`

## backend-output tests

The backend-output e2e suite compares outputs from current codebase backend client to the backend client released on npm.

To run this suite, run
`npm run test:dir packages/integration-tests/lib/test-e2e/backend_output.test.js`
