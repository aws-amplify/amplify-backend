import { fromIni } from '@aws-sdk/credential-providers';
import { loadSharedConfigFiles } from '@smithy/shared-ini-file-loader';

const E2E_TOOLING_PROFILE = 'e2e-tooling';

const E2E_TOOLING_REGION = process.env.CI
  ? (await loadSharedConfigFiles()).configFile?.[E2E_TOOLING_PROFILE]?.region
  : undefined;

// When running in CI/CD, load the e2e tooling credentials from the 'e2e-tooling' profile
// When running locally, load credentials using the default credential provider
// We load credentials for e2e-tooling from a separate profile so that we can isolate permissions required to run Gen2 commands
// vs permissions required to orchestrate test setup, teardown, and assertions.

export const e2eToolingClientConfig = process.env.CI
  ? {
      credentials: fromIni({ profile: E2E_TOOLING_PROFILE }),
      region: E2E_TOOLING_REGION,
    }
  : {};
