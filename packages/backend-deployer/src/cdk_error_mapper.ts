import {
  AmplifyError,
  AmplifyErrorClassification,
  AmplifyFault,
  AmplifyUserError,
} from '@aws-amplify/platform-core';
import stripANSI from 'strip-ansi';
import { BackendDeployerOutputFormatter } from './types.js';

/**
 * Transforms CDK error messages to human readable ones
 */
export class CdkErrorMapper {
  private multiLineEolRegex = '[\r\n]+';
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

    const errorMessage = stripANSI(error.message);
    const matchingError = this.getKnownErrors().find((knownError) =>
      knownError.errorRegex.test(errorMessage)
    );

    if (matchingError) {
      // Extract meaningful contextual information if available
      const matchGroups = errorMessage.match(matchingError.errorRegex);

      if (matchGroups && matchGroups.length > 1) {
        // If the contextual information can be used in the error message use it, else consider it as a downstream cause
        if (matchGroups.groups) {
          for (const [key, value] of Object.entries(matchGroups.groups)) {
            const placeHolder = `{${key}}`;
            if (
              matchingError.humanReadableErrorMessage.includes(placeHolder) ||
              matchingError.resolutionMessage.includes(placeHolder)
            ) {
              matchingError.humanReadableErrorMessage =
                matchingError.humanReadableErrorMessage.replace(
                  placeHolder,
                  value
                );

              matchingError.resolutionMessage =
                matchingError.resolutionMessage.replace(placeHolder, value);
              // reset the stderr dump in the underlying error
              underlyingError = undefined;
            }
          }
          // remove any trailing EOL
          matchingError.humanReadableErrorMessage =
            matchingError.humanReadableErrorMessage.replace(
              new RegExp(`${this.multiLineEolRegex}$`),
              ''
            );
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
      errorRegex:
        /ExpiredToken|(Error|InvalidClientTokenId): The security token included in the request is (expired|invalid)/,
      humanReadableErrorMessage:
        'The security token included in the request is invalid.',
      resolutionMessage:
        "Please update your AWS credentials. You can do this by running `aws configure` or by updating your AWS credentials file. If you're using temporary credentials, you may need to obtain new ones.",
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
      errorRegex:
        /(Has the environment been bootstrapped)|(Is account \d+ bootstrapped)|(Is this account bootstrapped)/,
      humanReadableErrorMessage:
        'This AWS account and region has not been bootstrapped.',
      resolutionMessage:
        'Run `cdk bootstrap aws://{YOUR_ACCOUNT_ID}/{YOUR_REGION}` locally to resolve this.',
      errorName: 'BootstrapNotDetectedError',
      classification: 'ERROR',
    },
    {
      errorRegex:
        /This CDK deployment requires bootstrap stack version \S+, found \S+\. Please run 'cdk bootstrap'\./,
      humanReadableErrorMessage:
        'This AWS account and region has outdated CDK bootstrap stack.',
      resolutionMessage:
        'Run `cdk bootstrap aws://{YOUR_ACCOUNT_ID}/{YOUR_REGION}` locally to re-bootstrap.',
      errorName: 'BootstrapOutdatedError',
      classification: 'ERROR',
    },
    {
      errorRegex:
        /This CDK deployment requires bootstrap stack version \S+, but during the confirmation via SSM parameter \S+ the following error occurred: AccessDeniedException/,
      humanReadableErrorMessage:
        'Unable to detect CDK bootstrap stack due to permission issues.',
      resolutionMessage:
        "Ensure that AWS credentials have an IAM policy that grants read access to 'arn:aws:ssm:*:*:parameter/cdk-bootstrap/*' SSM parameters.",
      errorName: 'BootstrapDetectionError',
      classification: 'ERROR',
    },
    {
      errorRegex:
        /This CDK CLI is not compatible with the CDK library used by your application\. Please upgrade the CLI to the latest version\./,
      humanReadableErrorMessage:
        "Installed 'aws-cdk' is not compatible with installed 'aws-cdk-lib'.",
      resolutionMessage:
        "Make sure that version of 'aws-cdk' is greater or equal to version of 'aws-cdk-lib'",
      errorName: 'CDKVersionMismatchError',
      classification: 'ERROR',
    },
    {
      errorRegex: /Command cdk not found/,
      humanReadableErrorMessage: 'Unable to detect cdk installation',
      resolutionMessage:
        "Ensure dependencies in your project are installed with your package manager. For example, by running 'yarn install' or 'npm install'",
      errorName: 'CDKNotFoundError',
      classification: 'ERROR',
    },
    {
      errorRegex: new RegExp(
        `(SyntaxError|ReferenceError|TypeError)( \\[[A-Z_]+])?:((?:.|${this.multiLineEolRegex})*?at .*)`
      ),
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
        /EPERM: operation not permitted, rename (?<fileName>(.*)\/synth\.lock\.\S+) → '(.*)\/synth\.lock'/,
      humanReadableErrorMessage: 'Not permitted to rename file: {fileName}',
      resolutionMessage: `Try running the command again and ensure that only one instance of sandbox is running. If it still doesn't work check the permissions of '.amplify' folder`,
      errorName: 'FilePermissionsError',
      classification: 'ERROR',
    },
    {
      errorRegex: new RegExp(
        `\\[ERR_MODULE_NOT_FOUND\\]:(.*)${this.multiLineEolRegex}|Error: Cannot find module (.*)`
      ),
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
      errorRegex:
        /User:(.*) is not authorized to perform: lambda:GetLayerVersion on resource:(.*) because no resource-based policy allows the lambda:GetLayerVersion action/,
      humanReadableErrorMessage: 'Unable to get Lambda layer version',
      resolutionMessage:
        'Make sure layer ARNs are correct and layer regions match function region',
      errorName: 'GetLambdaLayerVersionError',
      classification: 'ERROR',
    },
    {
      //This has some overlap with "User:__ is not authorized to perform:__ on resource: __" - some resources cannot be deleted due to lack of permissions
      errorRegex:
        /The stack named (?<stackName>.*) is in a failed state. You may need to delete it from the AWS console : DELETE_FAILED \(The following resource\(s\) failed to delete: (?<resources>.*). \)/,
      humanReadableErrorMessage:
        'The CloudFormation deletion failed due to {stackName} being in DELETE_FAILED state. Ensure all your resources are able to be deleted',
      resolutionMessage:
        'The following resource(s) failed to delete: {resources}. Check the error message for more details and ensure your resources are in a state where they can be deleted. Check the CloudFormation AWS Console for this stack to find additional information.',
      errorName: 'CloudFormationDeletionError',
      classification: 'ERROR',
    },
    {
      errorRegex:
        /User:(.*) is not authorized to perform:(.*) on resource:(?<resource>.*) because no identity-based policy allows the (?<action>.*) action/,
      humanReadableErrorMessage:
        'Unable to deploy due to insufficient permissions',
      resolutionMessage:
        'Ensure you have permissions to call {action} for {resource}',
      errorName: 'AccessDeniedError',
      classification: 'ERROR',
    },
    {
      errorRegex:
        /User:(.*) is not authorized to perform:(?<action>.*) on resource:(?<resource>.*)/,
      humanReadableErrorMessage:
        'Unable to deploy due to insufficient permissions',
      resolutionMessage:
        'Ensure you have permissions to call {action} for {resource}',
      errorName: 'AccessDeniedError',
      classification: 'ERROR',
    },
    {
      // Also extracts the first line in the stack where the error happened
      errorRegex: new RegExp(
        `\\[esbuild Error\\]: ((?:.|${this.multiLineEolRegex})*?at .*)`
      ),
      humanReadableErrorMessage:
        'Unable to build the Amplify backend definition.',
      resolutionMessage:
        'Check your backend definition in the `amplify` folder for syntax and type errors.',
      errorName: 'ESBuildError',
      classification: 'ERROR',
    },
    {
      // Also extracts the first line in the stack where the error happened
      errorRegex: new RegExp(
        `[✘X] \\[ERROR\\] ((?:.|${this.multiLineEolRegex})*error.*)`
      ),
      humanReadableErrorMessage:
        'Unable to build the Amplify backend definition.',
      resolutionMessage:
        'Check your backend definition in the `amplify` folder for syntax and type errors.',
      errorName: 'ESBuildError',
      classification: 'ERROR',
    },
    {
      // If there are multiple errors, capture all lines containing the errors
      errorRegex: new RegExp(
        `(\\[TransformError\\]|Error): Transform failed with .* error(s?):${this.multiLineEolRegex}(?<esBuildErrorMessage>(.*ERROR:.*${this.multiLineEolRegex})+)`
      ),
      humanReadableErrorMessage: '{esBuildErrorMessage}',
      resolutionMessage:
        'Fix the above mentioned type or syntax error in your backend definition.',
      errorName: 'ESBuildError',
      classification: 'ERROR',
    },
    {
      // Captures other forms of transform error
      errorRegex: new RegExp(
        `Error \\[TransformError\\]:(${this.multiLineEolRegex}|\\s)?(?<esBuildErrorMessage>(.*(${this.multiLineEolRegex})?)+)`
      ),
      humanReadableErrorMessage: '{esBuildErrorMessage}',
      resolutionMessage:
        'Make sure esbuild is installed and is compatible with the platform you are currently using.',
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
      errorRegex: new RegExp(
        `npm error code EJSONPARSE${this.multiLineEolRegex}npm error path (?<filePath>.*/package\\.json)${this.multiLineEolRegex}(npm error (.*)${this.multiLineEolRegex})*`
      ),
      humanReadableErrorMessage: 'The {filePath} is not a valid JSON.',
      resolutionMessage: `Check package.json file and make sure it is a valid JSON.`,
      errorName: 'InvalidPackageJsonError',
      classification: 'ERROR',
    },
    {
      errorRegex: new RegExp(
        `(?<npmError>(npm error|npm ERR!) code ENOENT${this.multiLineEolRegex}((npm error|npm ERR!) (.*)${this.multiLineEolRegex})*)`
      ),
      humanReadableErrorMessage: 'NPM error occurred: {npmError}',
      resolutionMessage: `See https://docs.npmjs.com/common-errors for resolution.`,
      errorName: 'CommonNPMError',
      classification: 'ERROR',
    },
    {
      // Error: .* is printed to stderr during cdk synth
      // Also extracts the first line in the stack where the error happened
      errorRegex: new RegExp(
        `^Error: (.*${this.multiLineEolRegex}.*at.*)`,
        'm'
      ),
      humanReadableErrorMessage:
        'Unable to build the Amplify backend definition.',
      resolutionMessage:
        'Check your backend definition in the `amplify` folder for syntax and type errors.',
      errorName: 'BackendSynthError',
      classification: 'ERROR',
    },
    {
      // This happens when 'defineBackend' call is missing in customer's app.
      // 'defineBackend' creates CDK app in memory. If it's missing then no cdk.App exists in memory and nothing is rendered.
      // During 'cdk synth' CDK CLI attempts to read CDK assembly after calling customer's app.
      // But no files are rendered causing it to fail.
      errorRegex:
        /ENOENT: no such file or directory, open '\.amplify.artifacts.cdk\.out.manifest\.json'/,
      humanReadableErrorMessage:
        'The Amplify backend definition is missing `defineBackend` call.',
      resolutionMessage:
        'Check your backend definition in the `amplify` folder. Ensure that `amplify/backend.ts` contains `defineBackend` call.',
      errorName: 'MissingDefineBackendError',
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
        /Failed to retrieve backend secret (?<secretName>.*) for.*ParameterNotFound/,
      humanReadableErrorMessage: `The secret {secretName} specified in the backend does not exist.`,
      resolutionMessage: `Create secrets using the command ${this.formatter.normalizeAmpxCommand(
        'sandbox secret set'
      )}. For more information, see https://docs.amplify.aws/gen2/deploy-and-host/sandbox-environments/features/#set-secrets`,
      errorName: 'SecretNotSetError',
      classification: 'ERROR',
    },
    {
      errorRegex:
        /BadRequestException: The code contains one or more errors|The code contains one or more errors.*AppSync/,
      humanReadableErrorMessage: `A custom resolver used in your defineData contains one or more errors`,
      resolutionMessage: `Check for any syntax errors in your custom resolvers code.`,
      errorName: 'AppSyncResolverSyntaxError',
      classification: 'ERROR',
    },
    {
      errorRegex: new RegExp(
        `amplify-.*-(branch|sandbox)-.*fail: (?<publishFailure>.*)${this.multiLineEolRegex}.*Failed to publish asset`,
        'm'
      ),
      humanReadableErrorMessage: `CDK failed to publish assets due to '{publishFailure}'`,
      resolutionMessage: `Check the error message for more details.`,
      errorName: 'CDKAssetPublishError',
      classification: 'ERROR',
    },
    // Generic error printed by CDK. Order matters so keep this towards the bottom of this list
    {
      // Error: .* is printed to stderr during cdk synth
      // Also extracts the first line in the stack where the error happened
      errorRegex: new RegExp(
        `^Error: (.*${this.multiLineEolRegex}.*at.*)`,
        'm'
      ),
      humanReadableErrorMessage:
        'Unable to build the Amplify backend definition.',
      resolutionMessage:
        'Check your backend definition in the `amplify` folder for syntax and type errors.',
      errorName: 'BackendSynthError',
      classification: 'ERROR',
    },
    {
      errorRegex:
        /(?<stackName>amplify-[a-z0-9-]+)(.*) failed: ValidationError: Stack:(.*) is in (?<state>.*) state and can not be updated/,
      humanReadableErrorMessage:
        'The CloudFormation deployment failed due to {stackName} being in {state} state.',
      resolutionMessage:
        'Find more information in the CloudFormation AWS Console for this stack.',
      errorName: 'CloudFormationDeploymentError',
      classification: 'ERROR',
    },
    {
      // Note that the order matters, this should be the last as it captures generic CFN error
      errorRegex: new RegExp(
        `Deployment failed: (.*)${this.multiLineEolRegex}|The stack named (.*) failed (to deploy:|creation,) (.*)`
      ),
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
  | 'AppSyncResolverSyntaxError'
  | 'BackendBuildError'
  | 'BackendSynthError'
  | 'BootstrapNotDetectedError'
  | 'BootstrapDetectionError'
  | 'BootstrapOutdatedError'
  | 'CDKAssetPublishError'
  | 'CDKNotFoundError'
  | 'CDKResolveAWSAccountError'
  | 'CDKVersionMismatchError'
  | 'CFNUpdateNotSupportedError'
  | 'CloudFormationDeletionError'
  | 'CloudFormationDeploymentError'
  | 'CommonNPMError'
  | 'FilePermissionsError'
  | 'MissingDefineBackendError'
  | 'MultipleSandboxInstancesError'
  | 'ESBuildError'
  | 'ExpiredTokenError'
  | 'FileConventionError'
  | 'ModuleNotFoundError'
  | 'InvalidPackageJsonError'
  | 'SecretNotSetError'
  | 'SyntaxError'
  | 'GetLambdaLayerVersionError';
