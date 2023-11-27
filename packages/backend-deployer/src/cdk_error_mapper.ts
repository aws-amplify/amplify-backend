/**
 * Transforms CDK error messages to human readable ones
 */
export class CdkErrorMapper {
  private knownErrors: Array<{
    errorRegex: RegExp;
    humanReadableError: string;
  }> = [
    {
      errorRegex: /ExpiredToken/,
      humanReadableError:
        '[ExpiredToken]: The security token included in the request is invalid.',
    },
    {
      errorRegex: /Access Denied/,
      humanReadableError:
        '[AccessDenied]: The deployment role does not have sufficient permissions to perform this deployment.',
    },
    {
      errorRegex: /Has the environment been bootstrapped/,
      humanReadableError:
        '[BootstrapFailure]: This AWS account and region has not been bootstrapped. Run `cdk bootstrap aws://{YOUR_ACCOUNT_ID}/{YOUR_REGION}` locally to resolve this.',
    },
    {
      // the backend entry point file is referenced in the stack indicating a problem in customer code
      errorRegex: /amplify\/backend/,
      humanReadableError:
        '[SynthError]: Unable to build Amplify backend. Check your backend definition in the `amplify` folder.',
    },
    {
      errorRegex: /SyntaxError:(.*)\n/,
      humanReadableError:
        '[SyntaxError]: Unable to build Amplify backend. Check your backend definition in the `amplify` folder.',
    },
    {
      errorRegex: /Updates are not allowed for property/,
      humanReadableError:
        '[UpdateNotSupported]: The changes that you are trying to apply are not supported.',
    },
    {
      // This error originates from Cognito service when user tries to change UserPool attributes which is not allowed
      // https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-settings-attributes.html
      // Remapping to `UpdateNotSupported` will allow sandbox to prompt users for resetting their environment
      errorRegex:
        /Invalid AttributeDataType input, consider using the provided AttributeDataType enum/,
      humanReadableError:
        '[UpdateNotSupported]: User pool attributes cannot be changed after a user pool has been created.',
    },
    {
      // Note that the order matters, this should be the last as it captures generic CFN error
      errorRegex: /❌ Deployment failed: (.*)\n/,
      humanReadableError:
        '[CloudFormationFailure]: The CloudFormation deployment has failed. Find more information in the CloudFormation AWS Console for this stack.',
    },
  ];

  getHumanReadableError = (error: Error): Error => {
    const matchingError = this.knownErrors.find((knownError) =>
      knownError.errorRegex.test(error.message)
    );

    if (matchingError) {
      const underlyingMessage = error.message.match(matchingError.errorRegex);
      error.message =
        underlyingMessage && underlyingMessage.length == 2
          ? underlyingMessage[1]
          : error.message;
      return new Error(matchingError.humanReadableError, { cause: error });
    }
    return error;
  };
}
