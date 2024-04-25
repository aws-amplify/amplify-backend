import {
  AmplifyError,
  AmplifyErrorClassification,
  AmplifyFault,
  AmplifyUserError,
} from '@aws-amplify/platform-core';
import { BackendDeployerOutputFormatter } from './types.js';

/**
 * Transforms CDK error messages to human readable ones
 */
export class CdkErrorMapper {
  private placeHolder = 'PLACEHOLDER';

  /**
   * Instantiate with a formatter that will be used for formatting CLI commands in error messages
   */
  constructor(private readonly formatter: BackendDeployerOutputFormatter) {}

  getAmplifyError = (
    error: Error
  ): AmplifyError<CDKDeploymentError | string> => {
    let underlyingError: Error | undefined = error;

    // Check if there was an Amplify error thrown during child process execution
    const amplifyError = AmplifyError.fromStderr(error.message);
    if (amplifyError) {
      return amplifyError;
    }

    const matchingError = this.getKnownErrors().find((knownError) =>
      knownError.errorRegex.test(error.message)
    );

    if (matchingError) {
      // Extract meaningful contextual information if available
      const matchGroups = error.message.match(matchingError.errorRegex);

      if (matchGroups && matchGroups.length > 1) {
        // If the contextual information can be used in the error message use it, else consider it as a downstream cause
        if (
          matchingError.humanReadableErrorMessage.includes(this.placeHolder)
        ) {
          matchingError.humanReadableErrorMessage =
            matchingError.humanReadableErrorMessage.replace(
              this.placeHolder,
              matchGroups[1] // matching group instead of the matching string
            );
          // reset the stderr dump in the underlying error
          underlyingError = undefined;
        } else {
          underlyingError.message = matchGroups[0];
        }
      }

      return matchingError.classification === 'ERROR'
        ? new AmplifyUserError(
            matchingError.errorName,
            {
              message: matchingError.humanReadableErrorMessage,
              resolution: matchingError.resolutionMessage,
            },
            underlyingError
          )
        : new AmplifyFault(
            matchingError.errorName,
            {
              message: matchingError.humanReadableErrorMessage,
              resolution: matchingError.resolutionMessage,
            },
            underlyingError
          );
    }
    return AmplifyError.fromError(error);
  };

  private getKnownErrors = (): Array<{
    errorRegex: RegExp;
    humanReadableErrorMessage: string;
    resolutionMessage: string;
    errorName: CDKDeploymentError;
    classification: AmplifyErrorClassification;
  }> => [
    {
      errorRegex: /ExpiredToken/,
      humanReadableErrorMessage:
        'The security token included in the request is invalid.',
      resolutionMessage: 'Ensure your local AWS credentials are valid.',
      errorName: 'ExpiredTokenError',
      classification: 'ERROR',
    },
    {
      errorRegex: /Access Denied/,
      humanReadableErrorMessage:
        'The deployment role does not have sufficient permissions to perform this deployment.',
      resolutionMessage:
        'Ensure your deployment role has the AmplifyBackendDeployFullAccess role along with any additional permissions required to deploy your backend definition.',
      errorName: 'AccessDeniedError',
      classification: 'ERROR',
    },
    {
      errorRegex: /Has the environment been bootstrapped/,
      humanReadableErrorMessage:
        'This AWS account and region has not been bootstrapped.',
      resolutionMessage:
        'Run `cdk bootstrap aws://{YOUR_ACCOUNT_ID}/{YOUR_REGION}` locally to resolve this.',
      errorName: 'BootstrapNotDetectedError',
      classification: 'ERROR',
    },
    {
      errorRegex: /(SyntaxError|ReferenceError|TypeError):((?:.|\n)*?at .*)/,
      humanReadableErrorMessage:
        'Unable to build the Amplify backend definition.',
      resolutionMessage:
        'Check your backend definition in the `amplify` folder for syntax and type errors.',
      errorName: 'SyntaxError',
      classification: 'ERROR',
    },
    {
      errorRegex: /Unable to resolve AWS account to use/,
      humanReadableErrorMessage:
        'Unable to resolve AWS account to use. It must be either configured when you define your CDK Stack, or through the environment',
      resolutionMessage:
        'You can retry your last request as this is most likely a transient issue: https://github.com/aws/aws-cdk/issues/24744. If the error persists ensure your local AWS credentials are valid.',
      errorName: 'CDKResolveAWSAccountError',
      classification: 'ERROR',
    },
    {
      errorRegex: /EACCES(.*)/,
      humanReadableErrorMessage: 'File permissions error',
      resolutionMessage:
        'Check that you have the right access permissions to the mentioned file',
      errorName: 'FilePermissionsError',
      classification: 'ERROR',
    },
    {
      errorRegex:
        /\[ERR_MODULE_NOT_FOUND\]:(.*)\n|Error: Cannot find module (.*)/,
      humanReadableErrorMessage: 'Cannot find module',
      resolutionMessage:
        'Check your backend definition in the `amplify` folder for missing file or package imports. Try installing them with your package manager.',
      errorName: 'ModuleNotFoundError',
      classification: 'ERROR',
    },
    {
      // Truncate the cdk error message's second line (Invoke the CLI in sequence, or use '--output' to synth into different directories.)
      errorRegex:
        /Another CLI (.*) is currently(.*)\. |Other CLIs (.*) are currently reading from(.*)\. /,
      humanReadableErrorMessage: 'Multiple sandbox instances detected.',
      resolutionMessage:
        'Make sure only one instance of sandbox is running for this project',
      errorName: 'MultipleSandboxInstancesError',
      classification: 'ERROR',
    },
    {
      // Also extracts the first line in the stack where the error happened
      errorRegex: /\[esbuild Error\]: ((?:.|\n)*?at .*)/,
      humanReadableErrorMessage:
        'Unable to build the Amplify backend definition.',
      resolutionMessage:
        'Check your backend definition in the `amplify` folder for syntax and type errors.',
      errorName: 'ESBuildError',
      classification: 'ERROR',
    },
    {
      errorRegex: /Amplify Backend not found in/,
      humanReadableErrorMessage:
        'Backend definition could not be found in amplify directory.',
      resolutionMessage: 'Ensure that the amplify/backend.(ts|js) file exists',
      errorName: 'FileConventionError',
      classification: 'ERROR',
    },
    {
      errorRegex: /Amplify (.*) must be defined in (.*)/,
      humanReadableErrorMessage:
        'File name or path for backend definition are incorrect.',
      resolutionMessage: 'Ensure that the amplify/backend.(ts|js) file exists',
      errorName: 'FileConventionError',
      classification: 'ERROR',
    },
    {
      errorRegex: /Updates are not allowed for property/,
      humanReadableErrorMessage:
        'The changes that you are trying to apply are not supported.',
      resolutionMessage:
        'The resources referenced in the error message must be deleted and recreated to apply the changes.',
      errorName: 'CFNUpdateNotSupportedError',
      classification: 'ERROR',
    },
    {
      // This error originates from Cognito service when user tries to change UserPool attributes which is not allowed
      // https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-settings-attributes.html
      // Remapping to `UpdateNotSupported` will allow sandbox to prompt users for resetting their environment
      errorRegex:
        /Invalid AttributeDataType input, consider using the provided AttributeDataType enum/,
      humanReadableErrorMessage:
        'User pool attributes cannot be changed after a user pool has been created.',
      resolutionMessage:
        'To change these attributes, remove `defineAuth` from your backend, deploy, then add it back. Note that removing `defineAuth` and deploying will delete any users stored in your UserPool.',
      errorName: 'CFNUpdateNotSupportedError',
      classification: 'ERROR',
    },
    {
      // Error: .* is printed to stderr during cdk synth
      // Also extracts the first line in the stack where the error happened
      errorRegex: /^Error: (.*\n.*at.*)/m,
      humanReadableErrorMessage:
        'Unable to build the Amplify backend definition.',
      resolutionMessage:
        'Check your backend definition in the `amplify` folder for syntax and type errors.',
      errorName: 'BackendSynthError',
      classification: 'ERROR',
    },
    {
      // "Catch all": the backend entry point file is referenced in the stack indicating a problem in customer code
      errorRegex: /amplify\/backend/,
      humanReadableErrorMessage: 'Unable to build Amplify backend.',
      resolutionMessage:
        'Check your backend definition in the `amplify` folder for syntax and type errors.',
      errorName: 'BackendBuildError',
      classification: 'ERROR',
    },
    {
      // We capture the parameter name to show relevant error message
      errorRegex:
        /Failed to retrieve backend secret (.*) for.*ParameterNotFound/,
      humanReadableErrorMessage: `The secret ${this.placeHolder} specified in the backend does not exist.`,
      resolutionMessage: `Create secrets using the command ${this.formatter.normalizeBackendCommand(
        'sandbox secret set'
      )}. For more information, see https://docs.amplify.aws/gen2/deploy-and-host/sandbox-environments/features/#set-secrets`,
      errorName: 'SecretNotSetError',
      classification: 'ERROR',
    },
    {
      // Note that the order matters, this should be the last as it captures generic CFN error
      errorRegex: /❌ Deployment failed: (.*)\n/,
      humanReadableErrorMessage: 'The CloudFormation deployment has failed.',
      resolutionMessage:
        'Find more information in the CloudFormation AWS Console for this stack.',
      errorName: 'CloudFormationDeploymentError',
      classification: 'ERROR',
    },
  ];
}

export type CDKDeploymentError =
  | 'AccessDeniedError'
  | 'BackendBuildError'
  | 'BackendSynthError'
  | 'BootstrapNotDetectedError'
  | 'CDKResolveAWSAccountError'
  | 'CFNUpdateNotSupportedError'
  | 'CloudFormationDeploymentError'
  | 'FilePermissionsError'
  | 'MultipleSandboxInstancesError'
  | 'ESBuildError'
  | 'ExpiredTokenError'
  | 'FileConventionError'
  | 'FileConventionError'
  | 'ModuleNotFoundError'
  | 'SecretNotSetError'
  | 'SyntaxError';
