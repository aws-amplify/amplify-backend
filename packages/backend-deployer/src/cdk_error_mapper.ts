import {
  AmplifyError,
  AmplifyErrorClassification,
  AmplifyErrorType,
  AmplifyFault,
  AmplifyLibraryFaultType,
  AmplifyUserError,
  AmplifyUserErrorType,
} from '@aws-amplify/platform-core';

/**
 * Transforms CDK error messages to human readable ones
 */
export class CdkErrorMapper {
  private knownErrors: Array<{
    errorRegex: RegExp;
    humanReadableErrorMessage: string;
    errorName: AmplifyErrorType;
    classification: AmplifyErrorClassification;
  }> = [
    {
      errorRegex: /ExpiredToken/,
      humanReadableErrorMessage:
        'The security token included in the request is invalid.',
      errorName: 'ExpiredTokenError',
      classification: 'ERROR',
    },
    {
      errorRegex: /Access Denied/,
      humanReadableErrorMessage:
        'The deployment role does not have sufficient permissions to perform this deployment.',
      errorName: 'AccessDeniedError',
      classification: 'ERROR',
    },
    {
      errorRegex: /Has the environment been bootstrapped/,
      humanReadableErrorMessage:
        'This AWS account and region has not been bootstrapped. Run `cdk bootstrap aws://{YOUR_ACCOUNT_ID}/{YOUR_REGION}` locally to resolve this.',
      errorName: 'BootstrapNotDetectedError',
      classification: 'ERROR',
    },
    {
      errorRegex: /(SyntaxError|ReferenceError):(.*)\n/,
      humanReadableErrorMessage:
        'Unable to build Amplify backend. Check your backend definition in the `amplify` folder.',
      errorName: 'SyntaxError',
      classification: 'ERROR',
    },
    {
      errorRegex: /Amplify Backend not found in/,
      humanReadableErrorMessage:
        'Backend definition could not be found in amplify directory',
      errorName: 'FileConventionError',
      classification: 'ERROR',
    },
    {
      errorRegex: /Amplify (.*) must be defined in (.*)/,
      humanReadableErrorMessage:
        'File name or path for backend definition are incorrect',
      errorName: 'FileConventionError',
      classification: 'ERROR',
    },
    {
      // the backend entry point file is referenced in the stack indicating a problem in customer code
      errorRegex: /amplify\/backend/,
      humanReadableErrorMessage:
        'Unable to build Amplify backend. Check your backend definition in the `amplify` folder.',
      errorName: 'BackendBuildError',
      classification: 'ERROR',
    },
    {
      errorRegex: /Updates are not allowed for property/,
      humanReadableErrorMessage:
        'The changes that you are trying to apply are not supported.',
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
      errorName: 'CFNUpdateNotSupportedError',
      classification: 'ERROR',
    },
    {
      // Note that the order matters, this should be the last as it captures generic CFN error
      errorRegex: /❌ Deployment failed: (.*)\n/,
      humanReadableErrorMessage:
        'The CloudFormation deployment has failed. Find more information in the CloudFormation AWS Console for this stack.',
      errorName: 'CloudFormationDeploymentError',
      classification: 'ERROR',
    },
  ];

  getAmplifyError = (error: Error): AmplifyError => {
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
            matchingError.errorName as AmplifyUserErrorType,
            { message: matchingError.humanReadableErrorMessage },
            error
          )
        : new AmplifyFault(
            matchingError.errorName as AmplifyLibraryFaultType,
            { message: matchingError.humanReadableErrorMessage },
            error
          );
    }
    return AmplifyError.fromError(error);
  };
}
