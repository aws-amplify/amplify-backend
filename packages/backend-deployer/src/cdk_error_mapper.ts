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
        '[SynthError]: Unable to build Amplify backend. Check your backend definition in the `amplify` folder.',
    },
    {
      errorRegex: /ROLLBACK_(COMPLETE|FAILED)/,
      humanReadableError:
        '[CloudFormationFailure]: The CloudFormation deployment has failed. Find more information in the CloudFormation AWS Console for this stack.',
    },
  ];

  getHumanReadableError = (error: Error): Error => {
    const matchingError = this.knownErrors.find((knownError) =>
      knownError.errorRegex.test(error.message)
    );

    return new Error(matchingError?.humanReadableError || error.message, {
      cause: error,
    });
  };
}
