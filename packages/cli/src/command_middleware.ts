import { ArgumentsCamelCase } from 'yargs';
import { fromNodeProviderChain } from '@aws-sdk/credential-providers';
import { loadConfig } from '@smithy/node-config-provider';
import { NODE_REGION_CONFIG_OPTIONS } from '@aws-sdk/region-config-resolver';
import { AmplifyUserError } from '@aws-amplify/platform-core';
import { Printer } from '@aws-amplify/cli-core';

export const profileSetupInstruction = `To configure a new Amplify profile, use "npx amplify configure profile".`;

/**
 * Contains middleware functions.
 */
export class CommandMiddleware {
  /**
   * Creates command middleware.
   */
  constructor(private readonly printer: Printer) {}

  /**
   * Ensure AWS credentials and region of the input profile (or 'default' if undefined) are available in the provider chain.
   * If the input profile is defined, the environment variable AWS_PROFILE will be set accordingly.
   */
  ensureAwsCredentialAndRegion = async <
    T extends { profile: string | undefined }
  >(
    argv: ArgumentsCamelCase<T>
  ) => {
    /**
     * The AWS CDK respects older CLI v1 variable names that are no longer supported in the
     * latest AWS SDK. Developers that use the older variables and switch between Amplify
     * and CDK tools will experience region mismatch failures when using Amplify tools. Variable
     * names known to cause such failures are mapped here for a better developer experience.
     */
    this.mapEnvironmentVariables('AWS_DEFAULT_REGION', 'AWS_REGION');
    this.mapEnvironmentVariables('AWS_DEFAULT_PROFILE', 'AWS_PROFILE');

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
   * Maps one environment variable name to the other
   */
  private mapEnvironmentVariables(
    legacyName: string,
    preferredName: string
  ): void {
    if (!process.env[legacyName]) {
      return;
    }
    if (process.env[preferredName]) {
      this.printer.log(
        `Both the legacy '${legacyName}' and preferred '${preferredName}' environment variables detected. Using '${preferredName}'`
      );
      return;
    }
    this.printer.log(
      `Legacy environment variable '${legacyName}' detected. Mapping to '${preferredName}'`
    );
    process.env[preferredName] = process.env[legacyName];
  }
}
