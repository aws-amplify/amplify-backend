import { ArgumentsCamelCase } from 'yargs';
import { fromNodeProviderChain } from '@aws-sdk/credential-providers';
import { EOL } from 'os';

const profileSetupInstruction = `To configure a new Amplify profile, proceed with "amplify configure profile".${EOL}To correct existing profile's credentials, proceed with "aws configure"`;
/**
 * Contains middleware functions.
 */
export class CommandMiddleware {
  /**
   * Handles the profile option.
   */
  handleProfile = async <T extends { profile: string | undefined }>(
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
      let errMsg: string;
      if (argv.profile) {
        errMsg = `Failed to load aws credentials for profile '${argv.profile}'.${EOL}${profileSetupInstruction}`;
      } else {
        errMsg = `Failed to load default aws credentials.${EOL}Please refer to https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/setting-credentials-node.html.${EOL}${profileSetupInstruction}`;
      }
      throw new Error(errMsg, { cause: err });
    }
  };
}
