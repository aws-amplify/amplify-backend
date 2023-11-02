import { ArgumentsCamelCase } from 'yargs';
import { fromNodeProviderChain } from '@aws-sdk/credential-providers';
import { EOL } from 'os';
import { DEFAULT_PROFILE } from '@smithy/shared-ini-file-loader';

/**
 * The middleware to set the AWS profile environment variable. It also checks if the profile
 * credentials are available in the provider chain.
 */
export const profileMiddleWare = async <
  T extends { profile: string | undefined }
>(
  argv: ArgumentsCamelCase<T>
) => {
  if (argv.profile) {
    process.env.AWS_PROFILE = argv.profile;
  }

  try {
    await fromNodeProviderChain({
      ignoreCache: true,
    })();
  } catch (err) {
    throw new Error(
      `Failed to load aws credentials for profile '${
        argv.profile ?? DEFAULT_PROFILE
      }'.${EOL}To configure a new Amplify profile, proceed with "amplify configure profile".${EOL}To correct existing profile's credentials, proceed with "aws configure"`,
      {
        cause: err,
      }
    );
  }
};
