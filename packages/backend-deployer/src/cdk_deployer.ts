import { execa } from 'execa';
import stream from 'stream';
import { UniqueBackendIdentifier } from '@aws-amplify/plugin-types';
import {
  BackendDeployer,
  DeployProps,
} from './cdk_deployer_singleton_factory.js';

const relativeBackendEntryPoint = 'amplify/backend.ts';

/**
 * Commands that can be invoked
 */
enum InvokableCommand {
  DEPLOY = 'deploy',
  DESTROY = 'destroy',
}

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
      '[SynthError]: Unable to parse CDK code. Check your backend definition in the `amplify` folder.',
  },
  {
    errorRegex: /ROLLBACK_(COMPLETE|FAILED)/,
    humanReadableError:
      '[CloudFormationFailure]: The CloudFormation deployment has failed. Find more information in the CloudFormation AWS Console for this stack.',
  },
];

const getHumanReadableErrorMessage = (error: Error): string | undefined => {
  const matchingError = knownErrors.find((knownError) =>
    knownError.errorRegex.test(error.message)
  );
  if (!matchingError) {
    return;
  }
  return `${matchingError.humanReadableError}`;
};

/**
 * Invokes CDK command via execa
 */
export class CDKDeployer implements BackendDeployer {
  /**
   * Invokes cdk deploy command
   */
  deploy = async (
    uniqueBackendIdentifier?: UniqueBackendIdentifier,
    deployProps?: DeployProps
  ) => {
    const cdkCommandArgs: string[] = [];
    if (deployProps?.hotswapFallback) {
      cdkCommandArgs.push('--hotswap-fallback');
    }
    if (deployProps?.method) {
      cdkCommandArgs.push(`--method=${deployProps.method}`);
    }
    await this.invoke(
      InvokableCommand.DEPLOY,
      uniqueBackendIdentifier,
      cdkCommandArgs
    );
  };

  /**
   * Invokes cdk destroy command
   */
  destroy = async (uniqueBackendIdentifier?: UniqueBackendIdentifier) => {
    await this.invoke(InvokableCommand.DESTROY, uniqueBackendIdentifier, [
      '--force',
    ]);
  };

  /**
   * Executes a CDK command
   */
  private invoke = async (
    invokableCommand: InvokableCommand,
    uniqueBackendIdentifier?: UniqueBackendIdentifier,
    additionalArguments?: string[]
  ) => {
    // Basic args
    const cdkCommandArgs = [
      'cdk',
      invokableCommand.toString(),
      // This is unfortunate. CDK writes everything to stderr without `--ci` flag and we need to differentiate between the two.
      // See https://github.com/aws/aws-cdk/issues/7717 for more details.
      '--ci',
      '--app',
      `'npx tsx ${relativeBackendEntryPoint}'`,
    ];

    // Add context information if available
    if (uniqueBackendIdentifier) {
      cdkCommandArgs.push(
        '--context',
        `backend-id=${uniqueBackendIdentifier.backendId as string}`,
        '--context',
        `branch-name=${uniqueBackendIdentifier.branchName as string}`
      );
    }

    if (additionalArguments) {
      cdkCommandArgs.push(...additionalArguments);
    }

    try {
      await this.executeChildProcess('npx', cdkCommandArgs);
    } catch (err) {
      throw new Error(
        getHumanReadableErrorMessage(err as Error) ?? (err as Error).message,
        { cause: err }
      );
    }
  };

  /**
   * Wrapper for the child process executor. Helps in unit testing as node:test framework
   * doesn't have capabilities to mock exported functions like `execa` as of right now.
   */
  executeChildProcess = async (command: string, cdkCommandArgs: string[]) => {
    // We let the stdout and stdin inherit and streamed to parent process but pipe
    // the stderr and use it to throw on failure. This is to prevent actual
    // actionable errors being hidden among the stdout. Moreover execa errors are
    // useless when calling CLIs unless you made execa calling error.
    let aggregatedStderr = '';
    const aggregatorStream = new stream.Writable();
    aggregatorStream._write = function (chunk, encoding, done) {
      aggregatedStderr += chunk;
      done();
    };
    const childProcess = execa(command, cdkCommandArgs, {
      stdin: 'inherit',
      stdout: 'inherit',
      stderr: 'pipe',
    });
    childProcess.stderr?.pipe(aggregatorStream);

    try {
      await childProcess;
    } catch (error) {
      // swallow execa error which is not really helpful, rather throw stderr
      throw new Error(aggregatedStderr);
    }
  };
}
