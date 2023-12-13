# Integration Tests

This package contains two kind of tests:

1. In memory integration tests which run synthesis on tests projects and validate CDK assembly snapshots.
2. End-to-end tests which run full scenarios that may include deployments and therefore access to AWS account.

# In memory integration tests

To run these tests execute `npm run test` from repository root (they run together with unit tests)
or `npm run test:dir packages/integration-tests/lib/test-in-memory` (to run them in isolation).

CDK assembly snapshot comparison can be disabled by setting environment variable
`AMPLIFY_BACKEND_TESTS_DISABLE_INTEGRATION_SNAPSHOTS_COMPARISON` to `true`.
This is useful in case dependency version updates are part of testing scenario (e.g. canary tests).

# End-to-end tests

To run these tests a credential to AWS account is required. Our components leverage
[credential provider chain](https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/setting-credentials-node.html)
therefore any strategy to set credentials that is compatible should work (e.g. setting environment variables or default profile).

When credentials are set up run `npm run e2e` from repository root to run end-to-end tests.
