Private package that contains test implementations of some types that are used across tests in several packages.

Currently, the test implementation are copied from the real implementations in the @aws-amplify/backend package but that doesn't need to be the case going forward.
These are essentially mock implementations so the only thing that matters is that the test assertions are in sync with the mocked behavior
