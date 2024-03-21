import {
  AmplifyError,
  AmplifyErrorClassification,
  AmplifyFault,
  AmplifyUserError,
} from '@aws-amplify/platform-core';
/**
 * Transforms CDK error messages to human readable ones
 */
export class CdkErrorMapper {
  private knownErrors: Array<{
    errorRegex: RegExp;
    humanReadableErrorMessage: string;
    resolutionMessage: string;
    errorName: CDKDeploymentError;
    classification: AmplifyErrorClassification;
  }> = [
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
      errorRegex: /(SyntaxError|ReferenceError):(.*)\n/,
      humanReadableErrorMessage:
        'Unable to build the Amplify backend definition.',
      resolutionMessage:
        'Check your backend definition in the `amplify` folder for syntax and type errors.',
      errorName: 'SyntaxError',
      classification: 'ERROR',
    },
    {
      errorRegex: /\[ERR_MODULE_NOT_FOUND\]:(.*)\n/,
      humanReadableErrorMessage: 'Cannot find module',
      resolutionMessage:
        'Check your backend definition in the `amplify` folder for missing file or package imports. Try running npm or yarn install.',
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
      // "Catch all" the backend entry point file is referenced in the stack indicating a problem in customer code
      errorRegex: /amplify\/backend/,
      humanReadableErrorMessage: 'Unable to build Amplify backend.',
      resolutionMessage:
        'Check your backend definition in the `amplify` folder for syntax and type errors.',
      errorName: 'BackendBuildError',
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

  getAmplifyError = (
    error: Error
  ): AmplifyError<CDKDeploymentError | string> => {
    // Check if there was an Amplify error thrown during child process execution
    const amplifyError = AmplifyError.fromStderr(error.message);
    if (amplifyError) {
      return amplifyError;
    }

    const matchingError = this.knownErrors.find((knownError) =>
      knownError.errorRegex.test(error.message)
    );

    if (matchingError) {
      // Extract meaningful contextual information if available
      const underlyingMessage = error.message.match(matchingError.errorRegex);
      error.message =
        underlyingMessage && underlyingMessage.length > 1
          ? underlyingMessage[0]
          : error.message;

      return matchingError.classification === 'ERROR'
        ? new AmplifyUserError(
            matchingError.errorName,
            {
              message: matchingError.humanReadableErrorMessage,
              resolution: matchingError.resolutionMessage,
            },
            error
          )
        : new AmplifyFault(
            matchingError.errorName,
            {
              message: matchingError.humanReadableErrorMessage,
              resolution: matchingError.resolutionMessage,
            },
            error
          );
    }
    return AmplifyError.fromError(error);
  };
}

export type CDKDeploymentError =
  | 'AccessDeniedError'
  | 'BackendBuildError'
  | 'BootstrapNotDetectedError'
  | 'CFNUpdateNotSupportedError'
  | 'CloudFormationDeploymentError'
  | 'MultipleSandboxInstancesError'
  | 'ESBuildError'
  | 'ExpiredTokenError'
  | 'FileConventionError'
  | 'FileConventionError'
  | 'ModuleNotFoundError'
  | 'SyntaxError';
