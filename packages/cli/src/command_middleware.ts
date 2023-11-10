import { ArgumentsCamelCase } from 'yargs';
import { fromNodeProviderChain } from '@aws-sdk/credential-providers';
import { EOL } from 'os';
import { loadConfig } from '@smithy/node-config-provider';
import { NODE_REGION_CONFIG_OPTIONS } from '@aws-sdk/region-config-resolver';
import { InvalidCredentialError } from './error/credential_error.js';

export const profileSetupInstruction = `To configure a new Amplify profile, use "amplify configure profile".${EOL}To update an existing profile, use "aws configure"`;

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
    if (argv.profile) {
      process.env.AWS_PROFILE = argv.profile;
    }

    // Check credentials.
    try {
      await fromNodeProviderChain({
        ignoreCache: true,
      })();
    } catch (err) {
      let errMsg: string;
      if (argv.profile) {
        errMsg = `Failed to load aws credentials for profile '${argv.profile}'.${EOL}${profileSetupInstruction}`;
      } else {
        errMsg = `Failed to load default aws credentials.${EOL}Please refer to https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/setting-credentials-node.html.${EOL}${profileSetupInstruction}`;
      }
      throw new InvalidCredentialError(errMsg, { cause: err });
    }

    // Check region.
    try {
      await loadConfig(NODE_REGION_CONFIG_OPTIONS, {
        ignoreCache: true,
      })();
    } catch (err) {
      const errMsg = `${
        (err as Error).message
      }. Please refer to this page for region setting options:${EOL}https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/setting-region.html${EOL}${profileSetupInstruction}`;
      throw new InvalidCredentialError(errMsg, { cause: err });
    }
  };
}
