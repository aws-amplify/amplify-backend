import _isCI from 'is-ci';
import { ArgumentsCamelCase, Argv, CommandModule } from 'yargs';
import { BackendDeployer } from '@aws-amplify/backend-deployer';

export type PipelineDeployCommandOptions = {
  branch: string;
  appId: string;
};

const knownErrors: Array<{ errorRegex: RegExp; humanReadableError: string }> = [
  {
    errorRegex: /ExpiredToken/,
    humanReadableError:
      '[ExpiredToken]: The security token included in the request is invalid.',
  },
  {
    errorRegex: /Access Denied/,
    humanReadableError:
      '[AccessDenied]: The service role linked to this branch does not have sufficient permissions to perform this deployment. Configure the service role in the settings for this branch.',
  },
  {
    errorRegex: /Has the environment been bootstrapped/,
    humanReadableError:
      '[BootstrapFailure]: This AWS account is not bootstrapped. Run `cdk bootstrap aws://{YOUR_ACCOUNT_ID}/{YOUR_REGION}` locally to resolve this.',
  },
  {
    // the backend entry point file is referenced in the stack indicating a problem in customer code
    errorRegex: /amplify\/backend.ts/,
    humanReadableError:
      '[SynthError]: Unable to parse CDK code. This is usually due to invalid CloudFormation code in `./amplify/backend.ts`',
  },
  {
    errorRegex: /ROLLBACK_COMPLETE/,
    humanReadableError:
      '[CloudformationFailure]: The CloudFormation deployment has failed. Find more information in the CloudFormation AWS Console for this stack.',
  },
];

const getHumanReadableErrorMessage = (error: Error) => {
  const matchingError = knownErrors.find((knownError) =>
    knownError.errorRegex.test(error.message)
  );
  if (!matchingError) {
    return error.message;
  }
  return `${matchingError.humanReadableError}`;
};

/**
 * An entry point for deploy command.
 */
export class PipelineDeployCommand
  implements CommandModule<object, PipelineDeployCommandOptions>
{
  /**
   * @inheritDoc
   */
  readonly command: string;

  /**
   * @inheritDoc
   */
  readonly describe: false;

  /**
   * Creates top level entry point for deploy command.
   */
  constructor(
    private readonly backendDeployer: BackendDeployer,
    private readonly isCiEnvironment: typeof _isCI = _isCI
  ) {
    this.command = 'pipeline-deploy';
    // use false for a hidden command
    this.describe = false;
  }

  /**
   * @inheritDoc
   */
  handler = (
    args: ArgumentsCamelCase<PipelineDeployCommandOptions>
  ): Promise<void> => {
    if (!this.isCiEnvironment) {
      throw new Error(
        'It looks like this command is being run outside of a CI/CD workflow. To deploy locally use `amplify sandbox` instead.'
      );
    }

    const uniqueBackendIdentifier = {
      backendId: args.appId,
      branchName: args.branch,
    };

    return this.backendDeployer.deploy(uniqueBackendIdentifier).catch((e) => {
      throw new Error(getHumanReadableErrorMessage(e));
    });
  };

  builder = (yargs: Argv): Argv<PipelineDeployCommandOptions> => {
    return yargs
      .option('branch', {
        describe: 'Name of the git branch being deployed',
        demandOption: true,
        type: 'string',
        array: false,
      })
      .option('appId', {
        describe: 'The appId of the target Amplify app',
        demandOption: true,
        type: 'string',
        array: false,
      });
  };
}
