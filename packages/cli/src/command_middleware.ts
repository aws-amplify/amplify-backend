import { ArgumentsCamelCase } from 'yargs';
import { fromNodeProviderChain } from '@aws-sdk/credential-providers';
import { loadConfig } from '@smithy/node-config-provider';
import { NODE_REGION_CONFIG_OPTIONS } from '@aws-sdk/region-config-resolver';
import { AmplifyUserError } from '@aws-amplify/platform-core';

export const profileSetupInstruction = `To configure a new Amplify profile, use "npx amplify configure profile".`;

/**
 * Contains middleware functions.
 */
export class CommandMiddleware {
  /**
   * Ensure AWS credentials and region of the input profile (or 'default' if undefined) are available in the provider chain.
   * If the input profile is defined, the environment variable AWS_PROFILE will be set accordingly.
   */
  ensureAwsCredentialAndRegion = async <
    T extends { profile: string | undefined }
  >(
    argv: ArgumentsCamelCase<T>
  ) => {
    this.normalizeEnvironmentVariables();

    if (argv.profile) {
      process.env.AWS_PROFILE = argv.profile;
    }

    // Check credentials.
    try {
      await fromNodeProviderChain({
        ignoreCache: true,
      })();
    } catch (err) {
      const errorMessage = argv.profile
        ? `Failed to load AWS credentials for profile '${argv.profile}'`
        : 'Failed to load default AWS credentials';
      throw new AmplifyUserError(
        'InvalidCredentialError',
        {
          message: errorMessage,
          resolution: profileSetupInstruction,
        },
        err as Error
      );
    }

    // Check region.
    try {
      await loadConfig(NODE_REGION_CONFIG_OPTIONS, {
        ignoreCache: true,
      })();
    } catch (err) {
      const errorMessage = argv.profile
        ? `Failed to load AWS region for profile '${argv.profile}'`
        : 'Failed to load default AWS region';
      throw new AmplifyUserError(
        'InvalidCredentialError',
        {
          message: errorMessage,
          resolution: profileSetupInstruction,
        },
        err as Error
      );
    }
  };

  /**
   * The AWS CDK respects older CLI v1 variable names that are no longer supported in the
   * latest AWS SDK. Developers that use the older variables and switch between Amplify
   * and CDK tools will experience region mismatch failures when using Amplify tools. Variable
   * names known to cause such failures are normalized here for a better developer experience.
   */
  private normalizeEnvironmentVariables(): void {
    if (process.env.AWS_DEFAULT_PROFILE && !process.env.AWS_PROFILE) {
      process.env.AWS_PROFILE = process.env.AWS_DEFAULT_PROFILE;
    }
    if (process.env.AWS_DEFAULT_REGION && !process.env.AWS_REGION) {
      process.env.AWS_REGION = process.env.AWS_DEFAULT_REGION;
    }
  }
}
