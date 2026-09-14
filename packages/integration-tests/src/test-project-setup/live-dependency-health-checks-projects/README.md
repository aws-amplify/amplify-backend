Projects in this directory are meant for `live-dependency-health-checks` (aka canaries).

1. These projects must not be used in e2e tests to provide deep functional coverage.
2. These projects must be lightweight to provide fast runtime and stability.
3. These projects must cover only P0 scenarios we care most. (That are not covered by "getting started" flow, aka `create-amplify`).
