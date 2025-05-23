import { describe, it } from 'node:test';
import assert from 'node:assert';
import { CdkErrorMapper } from './cdk_error_mapper.js';
import { BackendDeployerOutputFormatter } from './types.js';
import { EOL } from 'os';

const formatterStub: BackendDeployerOutputFormatter = {
  normalizeAmpxCommand: () => 'test command',
};

const testErrorMappings = [
  {
    errorMessage: 'UnknownError',
    expectedTopLevelErrorMessage: 'Error: UnknownError',
    errorName: 'UnknownFault',
    expectedDownstreamErrorMessage: undefined,
  },
  {
    errorMessage:
      'ExpiredToken: The security token included in the request is expired',
    expectedTopLevelErrorMessage:
      'The security token included in the request is invalid.',
    errorName: 'ExpiredTokenError',
    expectedDownstreamErrorMessage:
      'ExpiredToken: The security token included in the request is expired',
  },
  {
    errorMessage: 'The security token included in the request is expired',
    expectedTopLevelErrorMessage:
      'The security token included in the request is invalid.',
    errorName: 'ExpiredTokenError',
    expectedDownstreamErrorMessage:
      'The security token included in the request is expired',
  },
  {
    errorMessage:
      'InvalidClientTokenId: The security token included in the request is invalid',
    expectedTopLevelErrorMessage:
      'The security token included in the request is invalid.',
    errorName: 'ExpiredTokenError',
    expectedDownstreamErrorMessage:
      'The security token included in the request is invalid',
  },
  {
    errorMessage: 'Access Denied',
    expectedTopLevelErrorMessage:
      'The deployment role does not have sufficient permissions to perform this deployment.',
    errorName: 'AccessDeniedError',
    expectedDownstreamErrorMessage: 'Access Denied',
  },
  {
    errorMessage: 'Has the environment been bootstrapped',
    expectedTopLevelErrorMessage:
      'This AWS account and region has not been bootstrapped.',
    errorName: 'BootstrapNotDetectedError',
    expectedDownstreamErrorMessage: 'Has the environment been bootstrapped',
  },
  {
    errorMessage: 'Is account 12345 bootstrapped',
    expectedTopLevelErrorMessage:
      'This AWS account and region has not been bootstrapped.',
    errorName: 'BootstrapNotDetectedError',
    expectedDownstreamErrorMessage: 'Is account 12345 bootstrapped',
  },
  {
    errorMessage: 'Is this account bootstrapped',
    expectedTopLevelErrorMessage:
      'This AWS account and region has not been bootstrapped.',
    errorName: 'BootstrapNotDetectedError',
    expectedDownstreamErrorMessage: 'Is this account bootstrapped',
  },
  {
    errorMessage:
      // eslint-disable-next-line spellcheck/spell-checker
      "This CDK deployment requires bootstrap stack version '6', but during the confirmation via SSM parameter /cdk-bootstrap/hnb659fds/version the following error occurred: AccessDeniedException",
    expectedTopLevelErrorMessage:
      'Unable to detect CDK bootstrap stack due to permission issues.',
    errorName: 'BootstrapDetectionError',
    expectedDownstreamErrorMessage:
      // eslint-disable-next-line spellcheck/spell-checker
      "This CDK deployment requires bootstrap stack version '6', but during the confirmation via SSM parameter /cdk-bootstrap/hnb659fds/version the following error occurred: AccessDeniedException",
  },
  {
    errorMessage:
      "This CDK deployment requires bootstrap stack version '6', found '5'. Please run 'cdk bootstrap'.",
    expectedTopLevelErrorMessage:
      'This AWS account and region has outdated CDK bootstrap stack.',
    errorName: 'BootstrapOutdatedError',
    expectedDownstreamErrorMessage:
      "This CDK deployment requires bootstrap stack version '6', found '5'. Please run 'cdk bootstrap'.",
  },
  {
    errorMessage: 'Amplify Backend not found in amplify/backend.ts',
    expectedTopLevelErrorMessage:
      'Backend definition could not be found in amplify directory.',
    errorName: 'FileConventionError',
    expectedDownstreamErrorMessage:
      'Amplify Backend not found in amplify/backend.ts',
  },
  {
    errorMessage: 'Amplify Auth must be defined in amplify/auth/resource.ts',
    expectedTopLevelErrorMessage:
      'File name or path for backend definition are incorrect.',
    errorName: 'FileConventionError',
    expectedDownstreamErrorMessage:
      'Amplify Auth must be defined in amplify/auth/resource.ts',
  },
  {
    errorMessage: 'amplify/backend.ts',
    expectedTopLevelErrorMessage: 'Unable to build Amplify backend.',
    errorName: 'BackendBuildError',
    expectedDownstreamErrorMessage: 'amplify/backend.ts',
  },
  {
    errorMessage:
      `Overall error message had other stuff before ❌ Deployment failed: something bad happened` +
      EOL +
      ` and after`,
    expectedTopLevelErrorMessage: 'The CloudFormation deployment has failed.',
    errorName: 'CloudFormationDeploymentError',
    expectedDownstreamErrorMessage: `Deployment failed: something bad happened${EOL}`,
  },
  {
    errorMessage:
      `[31m  Deployment failed: Error: The stack named something-fancy failed creation, it may need to be manually deleted from the AWS console: ROLLBACK_COMPLETE: Illegal character in authority at index 8: https://bedrock-runtime.us- east-1.amazonaws.com (Service: AWSAppSync; Status Code: 400; Error Code: BadRequestException;)` +
      EOL +
      ` and after`,
    expectedTopLevelErrorMessage: 'The CloudFormation deployment has failed.',
    errorName: 'CloudFormationDeploymentError',
    expectedDownstreamErrorMessage: `Deployment failed: Error: The stack named something-fancy failed creation, it may need to be manually deleted from the AWS console: ROLLBACK_COMPLETE: Illegal character in authority at index 8: https://bedrock-runtime.us- east-1.amazonaws.com (Service: AWSAppSync; Status Code: 400; Error Code: BadRequestException;)${EOL}`,
  },
  {
    errorMessage: `Received response status [FAILED] from custom resource. Message returned: Failed to retrieve backend secret 'non-existent-secret' for 'project-name'. Reason: {"cause":{"name":"ParameterNotFound","$fault":"client"},"__type":"ParameterNotFound","message":"UnknownError"},"httpStatusCode":400,"name":"SecretError"}`,
    expectedTopLevelErrorMessage: `The secret 'non-existent-secret' specified in the backend does not exist.`,
    errorName: 'SecretNotSetError',
    expectedDownstreamErrorMessage: undefined,
  },
  {
    errorMessage: `[31m  some-stack failed: The stack named some-stack failed to deploy: UPDATE_ROLLBACK_COMPLETE: Resource handler returned message: Some amazing error message (Service: AppSync, Status Code: 400, Request ID: 12345) (RequestToken: 123, HandlerErrorCode: GeneralServiceException), Embedded stack <escaped ARN> was not successfully updated. Currently in UPDATE_ROLLBACK_IN_PROGRESS with reason: The following resource(s) failed to create: [resource1, resource2]. [39m`,
    expectedTopLevelErrorMessage: 'The CloudFormation deployment has failed.',
    errorName: 'CloudFormationDeploymentError',
    expectedDownstreamErrorMessage: `The stack named some-stack failed to deploy: UPDATE_ROLLBACK_COMPLETE: Resource handler returned message: Some amazing error message (Service: AppSync, Status Code: 400, Request ID: 12345) (RequestToken: 123, HandlerErrorCode: GeneralServiceException), Embedded stack <escaped ARN> was not successfully updated. Currently in UPDATE_ROLLBACK_IN_PROGRESS with reason: The following resource(s) failed to create: [resource1, resource2]. [39m`,
  },
  {
    errorMessage: `[31m  some-stack failed: The stack named some-stack failed creation, it may need to be manually deleted from the AWS console: ROLLBACK_COMPLETE`,
    expectedTopLevelErrorMessage: 'The CloudFormation deployment has failed.',
    errorName: 'CloudFormationDeploymentError',
    expectedDownstreamErrorMessage: `The stack named some-stack failed creation, it may need to be manually deleted from the AWS console: ROLLBACK_COMPLETE`,
  },
  {
    errorMessage:
      'CFN error happened: Updates are not allowed for property: some property',
    expectedTopLevelErrorMessage:
      'The changes that you are trying to apply are not supported.',
    errorName: 'CFNUpdateNotSupportedError',
    expectedDownstreamErrorMessage:
      'CFN error happened: Updates are not allowed for property: some property',
  },
  {
    errorMessage:
      'CFN error happened: Invalid AttributeDataType input, consider using the provided AttributeDataType enum',
    expectedTopLevelErrorMessage:
      'User pool attributes cannot be changed after a user pool has been created.',
    errorName: 'CFNUpdateNotSupportedError',
    expectedDownstreamErrorMessage:
      'CFN error happened: Invalid AttributeDataType input, consider using the provided AttributeDataType enum',
  },
  {
    errorMessage:
      "Another CLI (PID=22981) is currently synthing to .amplify/artifacts/cdk.out. Invoke the CLI in sequence, or use '--output' to synth into different directories.",
    expectedTopLevelErrorMessage: 'Multiple sandbox instances detected.',
    errorName: 'MultipleSandboxInstancesError',
    expectedDownstreamErrorMessage:
      'Another CLI (PID=22981) is currently synthing to .amplify/artifacts/cdk.out. ',
  },
  {
    errorMessage:
      "Some random cdk log Other CLIs (PID=68436) are currently reading from .amplify/artifacts/cdk.out. Invoke the CLI in sequence, or use '--output' to synth into different directories.Some random cdk log",
    expectedTopLevelErrorMessage: 'Multiple sandbox instances detected.',
    errorName: 'MultipleSandboxInstancesError',
    expectedDownstreamErrorMessage:
      'Other CLIs (PID=68436) are currently reading from .amplify/artifacts/cdk.out. ',
  },
  {
    errorMessage:
      'Unable to resolve AWS account to use. It must be either configured when you define your CDK Stack, or through the environment',
    expectedTopLevelErrorMessage:
      'Unable to resolve AWS account to use. It must be either configured when you define your CDK Stack, or through the environment',
    errorName: 'CDKResolveAWSAccountError',
    expectedDownstreamErrorMessage:
      'Unable to resolve AWS account to use. It must be either configured when you define your CDK Stack, or through the environment',
  },
  {
    errorMessage: `EACCES: permission denied, unlink '.amplify/artifacts/cdk.out/synth.lock'`,
    expectedTopLevelErrorMessage: 'File permissions error',
    errorName: 'FilePermissionsError',
    expectedDownstreamErrorMessage: `EACCES: permission denied, unlink '.amplify/artifacts/cdk.out/synth.lock'`,
  },
  {
    errorMessage: `[31mEPERM: operation not permitted, rename 'C:/Users/someUser/.amplify/artifacts/cdk.out/synth.lock.6785_1' → 'C:/Users/someUser/amplify/artifacts/cdk.out/synth.lock' [31m`,
    expectedTopLevelErrorMessage: `Not permitted to rename file: 'C:/Users/someUser/.amplify/artifacts/cdk.out/synth.lock.6785_1'`,
    errorName: 'FilePermissionsError',
    expectedDownstreamErrorMessage: undefined,
  },
  {
    errorMessage: `[31mEPERM: operation not permitted, unlink '.amplify/artifacts/cdk.out/read.4276_1.lock' [31m`,
    expectedTopLevelErrorMessage: `Operation not permitted on file: '.amplify/artifacts/cdk.out/read.4276_1.lock'`,
    errorName: 'FilePermissionsError',
    expectedDownstreamErrorMessage: undefined,
  },
  {
    errorMessage: `[31mEPERM: operation not permitted, open '.amplify/artifacts/cdk.out/synth.lock.6785_1' [31m`,
    expectedTopLevelErrorMessage: `Operation not permitted on file: '.amplify/artifacts/cdk.out/synth.lock.6785_1'`,
    errorName: 'FilePermissionsError',
    expectedDownstreamErrorMessage: undefined,
  },
  {
    errorMessage: `Could not create output directory .amplify/artifacts/cdk.out (EPERM: operation not permitted, mkdir '.amplify/artifacts/cdk.out')`,
    expectedTopLevelErrorMessage: `Not permitted to create the directory '.amplify/artifacts/cdk.out'`,
    errorName: 'FilePermissionsError',
    expectedDownstreamErrorMessage: undefined,
  },
  {
    errorMessage: `This CDK CLI is not compatible with the CDK library used by your application. Please upgrade the CLI to the latest version.
      (Cloud assembly schema version mismatch: Maximum schema version supported is 36.0.0, but found 36.1.1)`,
    expectedTopLevelErrorMessage:
      "Installed 'aws-cdk' is not compatible with installed 'aws-cdk-lib'.",
    errorName: 'CDKVersionMismatchError',
    expectedDownstreamErrorMessage: `This CDK CLI is not compatible with the CDK library used by your application. Please upgrade the CLI to the latest version.
      (Cloud assembly schema version mismatch: Maximum schema version supported is 36.0.0, but found 36.1.1)`,
  },
  {
    errorMessage: `error Command cdk not found. Did you mean cdl?`,
    expectedTopLevelErrorMessage: 'Unable to detect cdk installation',
    errorName: 'CDKNotFoundError',
    expectedDownstreamErrorMessage: `error Command cdk not found. Did you mean cdl?`,
  },
  {
    errorMessage: `Cannot find module './myModule'`,
    expectedTopLevelErrorMessage: 'Cannot find module',
    errorName: 'ModuleNotFoundError',
    expectedDownstreamErrorMessage: `Cannot find module './myModule'`,
  },
  {
    errorMessage: `[31mamplify-some-stack [34m failed: ValidationError: Stack:<stack-arn> is in UPDATE_ROLLBACK_FAILED state and can not be updated.`,
    expectedTopLevelErrorMessage:
      'The CloudFormation deployment failed due to amplify-some-stack being in UPDATE_ROLLBACK_FAILED state.',
    errorName: 'CloudFormationDeploymentError',
    expectedDownstreamErrorMessage: undefined,
  },
  {
    // eslint-disable-next-line spellcheck/spell-checker
    errorMessage: `[31mamplifysomestack [34m failed: ValidationError: Stack:<stack-arn> is in UPDATE_ROLLBACK_FAILED state and can not be updated.`,
    expectedTopLevelErrorMessage:
      // eslint-disable-next-line spellcheck/spell-checker
      'The CloudFormation deployment failed due to amplifysomestack being in UPDATE_ROLLBACK_FAILED state.',
    errorName: 'CloudFormationDeploymentError',
    expectedDownstreamErrorMessage: undefined,
  },
  {
    // eslint-disable-next-line spellcheck/spell-checker
    errorMessage: `[1mamplifysomebranch [22m failed: ValidationError: Stack [amplifysomebranch] cannot be deleted while TerminationProtection is enabled`,
    expectedTopLevelErrorMessage:
      // eslint-disable-next-line spellcheck/spell-checker
      'amplifysomebranch cannot be deleted because it has termination deployment enabled.',
    errorName: 'CloudFormationDeletionError',
    expectedDownstreamErrorMessage: undefined,
  },
  {
    errorMessage: `ENOENT: no such file or directory, open '.amplify/artifacts/cdk.out/manifest.json'`,
    expectedTopLevelErrorMessage:
      'The Amplify backend definition is missing `defineBackend` call.',
    errorName: 'MissingDefineBackendError',
    expectedDownstreamErrorMessage: undefined,
  },
  {
    errorMessage: `ENOENT: no such file or directory, open '.amplify\\artifacts\\cdk.out\\manifest.json'`,
    expectedTopLevelErrorMessage:
      'The Amplify backend definition is missing `defineBackend` call.',
    errorName: 'MissingDefineBackendError',
    expectedDownstreamErrorMessage: undefined,
  },
  {
    errorMessage: `User: <bootstrap-exec-role-arn> is not authorized to perform: lambda:GetLayerVersion on resource: <resource-arn> because no resource-based policy allows the lambda:GetLayerVersion action`,
    expectedTopLevelErrorMessage: 'Unable to get Lambda layer version',
    errorName: 'GetLambdaLayerVersionError',
    expectedDownstreamErrorMessage: undefined,
  },
  {
    errorMessage: `amplify-some-stack [22m failed: _ToolkitError: Found 2 problem(s) with the schema: The input value type 'string' is not present when resolving type 'TaskInput' [@78:1] The field type 'TaskInstanceStatus' is not present when resolving type 'Task' [@25:1]`,
    expectedTopLevelErrorMessage:
      '2 problem(s) have been found with your schema',
    errorName: 'SchemaError',
    expectedDownstreamErrorMessage: undefined,
  },
  {
    // eslint-disable-next-line spellcheck/spell-checker
    errorMessage: `Error: npm error code EJSONPARSE
npm error path /home/some-path/package.json
npm error JSON.parse Expected double-quoted property name in JSON at position 868 while parsing near ...sbuild\\: \\^0.20.2\\,\\n<<<<<<< HEAD\\n\\t\\t\\hl-j...
npm error JSON.parse Failed to parse JSON data.
npm error JSON.parse Note: package.json must be actual JSON, not just JavaScript.
npm error A complete log of this run can be found in: /home/some-path/.npm/_logs/2024-10-01T19_56_46_705Z-debug-0.log`,
    expectedTopLevelErrorMessage:
      'The /home/some-path/package.json is not a valid JSON.',
    errorName: 'InvalidPackageJsonError',
    expectedDownstreamErrorMessage: undefined,
  },
  {
    errorMessage: `Error: some-stack failed: ValidationError: User: <escaped ARN> is not authorized to perform: ssm:GetParameters on resource: <escaped ARN> because no identity-based policy allows the ssm:GetParameters action`,
    expectedTopLevelErrorMessage:
      'Unable to deploy due to insufficient permissions',
    errorName: 'AccessDeniedError',
    expectedDownstreamErrorMessage: undefined,
  },
  {
    errorMessage: `amplify-stack-user-sandbox failed: BadRequestException: The code contains one or more errors.`,
    expectedTopLevelErrorMessage:
      'A custom resolver used in your defineData contains one or more errors',
    errorName: 'AppSyncResolverSyntaxError',
    expectedDownstreamErrorMessage:
      'amplify-stack-user-sandbox failed: BadRequestException: The code contains one or more errors.',
  },
  {
    errorMessage: `Deployment failed: Error: The stack named amplify-stack-user-sandbox failed to deploy: UPDATE_ROLLBACK_COMPLETE: Resource handler returned message: The code contains one or more errors. (Service: AppSync, Status Code: 400,...`,
    expectedTopLevelErrorMessage:
      'A custom resolver used in your defineData contains one or more errors',
    errorName: 'AppSyncResolverSyntaxError',
    expectedDownstreamErrorMessage:
      'Deployment failed: Error: The stack named amplify-stack-user-sandbox failed to deploy: UPDATE_ROLLBACK_COMPLETE: Resource handler returned message: The code contains one or more errors. (Service: AppSync, Status Code: 400,...',
  },
  {
    errorMessage: `User: some:great:user is not authorized to perform: appsync:StartSchemaCreation on resource: arn:aws:appsync:us-east-1:235494812930:/v1/api/myApi`,
    expectedTopLevelErrorMessage:
      'Unable to deploy due to insufficient permissions',
    errorName: 'AccessDeniedError',
    expectedDownstreamErrorMessage: undefined,
  },
  {
    errorMessage: `StackName failed: AccessDenied: User: <escaped ARN> is not authorized to perform: cloudformation:ListExports because no identity-based policy allows the cloudformation:ListExports action`,
    expectedTopLevelErrorMessage:
      'Unable to deploy due to insufficient permissions',
    errorName: 'AccessDeniedError',
    expectedDownstreamErrorMessage: undefined,
  },
  {
    // eslint-disable-next-line spellcheck/spell-checker
    errorMessage: `[31m[1mamplify-user-sandbox-c71414864a[22m: fail: socket hang up[39m

[31mFailed to publish asset abc:current_account-current_region[39m`,
    expectedTopLevelErrorMessage: `CDK failed to publish assets`,
    errorName: 'CDKAssetPublishError',
    expectedDownstreamErrorMessage: undefined,
  },
  {
    errorMessage:
      'Failed to bundle asset assetName, bundle output is located at some rubbish',
    expectedTopLevelErrorMessage: `CDK failed to bundle your function code`,
    errorName: 'CDKAssetBundleError',
    expectedDownstreamErrorMessage: undefined,
  },
  {
    errorMessage:
      // eslint-disable-next-line spellcheck/spell-checker
      `Error: npm ERR! code ENOENT
npm ERR! syscall lstat
npm ERR! path /opt/homebrew/Cellar/node/22.2.0/lib
npm ERR! errno -2
npm ERR! enoent ENOENT: no such file or directory, lstat '/opt/homebrew/Cellar/node/22.2.0/lib'
npm ERR! enoent This is related to npm not being able to find a file.
npm ERR! enoent
`,
    expectedTopLevelErrorMessage:
      // eslint-disable-next-line spellcheck/spell-checker
      `NPM error occurred: npm ERR! code ENOENT
npm ERR! syscall lstat
npm ERR! path /opt/homebrew/Cellar/node/22.2.0/lib
npm ERR! errno -2
npm ERR! enoent ENOENT: no such file or directory, lstat '/opt/homebrew/Cellar/node/22.2.0/lib'
npm ERR! enoent This is related to npm not being able to find a file.
npm ERR! enoent`,
    errorName: 'CommonNPMError',
    expectedDownstreamErrorMessage: undefined,
  },
  {
    errorMessage:
      // eslint-disable-next-line spellcheck/spell-checker
      `Error: npm error code ENOENT
npm error syscall lstat
npm error path C:\\Users\testUser\\AppData\\Roaming\\npm
npm error errno -4058
npm error enoent ENOENT: no such file or directory, lstat 'C:\\Users\\testUser\\AppData\\Roaming\\npm'
npm error enoent This is related to npm not being able to find a file.
npm error enoent
`,
    expectedTopLevelErrorMessage:
      // eslint-disable-next-line spellcheck/spell-checker
      `NPM error occurred: npm error code ENOENT
npm error syscall lstat
npm error path C:\\Users\testUser\\AppData\\Roaming\\npm
npm error errno -4058
npm error enoent ENOENT: no such file or directory, lstat 'C:\\Users\\testUser\\AppData\\Roaming\\npm'
npm error enoent This is related to npm not being able to find a file.
npm error enoent`,
    errorName: 'CommonNPMError',
    expectedDownstreamErrorMessage: undefined,
  },
  {
    errorMessage: `[31m: destroy failed Error: The stack named amplify-some-stack is in a failed state. You may need to delete it from the AWS console : DELETE_FAILED (The following resource(s) failed to delete: [resource1, resource2]. )`,
    expectedTopLevelErrorMessage:
      'The CloudFormation deletion failed due to amplify-some-stack being in DELETE_FAILED state. Ensure all your resources are able to be deleted',
    errorName: 'CloudFormationDeletionError',
    expectedDownstreamErrorMessage: undefined,
  },
  {
    errorMessage: `Error: some-stack failed: InvalidParameterValueException: Unzipped size must be smaller than 262144000 bytes`,
    expectedTopLevelErrorMessage: 'Maximum Lambda size exceeded',
    errorName: 'LambdaMaxSizeExceededError',
    expectedDownstreamErrorMessage: undefined,
  },
  {
    errorMessage: `Error: some-stack failed: InvalidParameterValueException: Function code combined with layers exceeds the maximum allowed size of 262144000 bytes. The actual size is 306703523 bytes.`,
    expectedTopLevelErrorMessage: 'Maximum Lambda size exceeded',
    errorName: 'LambdaMaxSizeExceededError',
    expectedDownstreamErrorMessage: undefined,
  },
  {
    errorMessage: `Error: some-stack failed: InvalidParameterValueException: Uploaded file must be a non-empty zip`,
    expectedTopLevelErrorMessage: 'Lambda bundled into an empty zip',
    errorName: 'LambdaEmptyZipFault',
    expectedDownstreamErrorMessage: undefined,
  },
  {
    errorMessage: `Error: some-stack failed: ValidationError: Role role-arn is invalid or cannot be assumed`,
    expectedTopLevelErrorMessage:
      'Role role-arn is invalid or cannot be assumed',
    errorName: 'InvalidOrCannotAssumeRoleError',
    expectedDownstreamErrorMessage: undefined,
  },
  {
    errorMessage: `some-stack failed: ValidationError: Circular dependency between resources: [storage1, data1, function1] `,
    expectedTopLevelErrorMessage:
      'The CloudFormation deployment failed due to circular dependency found between nested stacks [storage1, data1, function1]',
    errorName: 'CloudformationStackCircularDependencyError',
    expectedDownstreamErrorMessage: undefined,
  },
  {
    errorMessage: `The stack named named-stack failed to deploy: UPDATE_ROLLBACK_COMPLETE: Circular dependency between resources: [resource1, resource2] `,
    expectedTopLevelErrorMessage:
      'The CloudFormation deployment failed due to circular dependency found between resources [resource1, resource2] in a single stack',
    errorName: 'CloudformationResourceCircularDependencyError',
    expectedDownstreamErrorMessage: undefined,
  },
  {
    errorMessage: `destroy failed Error: Stack [someStackArn] cannot be deleted while in status UPDATE_COMPLETE_CLEANUP_IN_PROGRESS`,
    expectedTopLevelErrorMessage:
      'Backend failed to be deleted since the previous deployment is still in progress.',
    errorName: 'DeleteFailedWhileDeploymentInProgressError',
    expectedDownstreamErrorMessage: undefined,
  },
  {
    errorMessage: 'connect ENOMEM 123.3.789.14:443 - Local (0.0.0.0:0)',
    expectedTopLevelErrorMessage:
      'Unable to connect to remote address 123.3.789.14 due to insufficient memory.',
    errorName: 'InsufficientMemorySpaceError',
    expectedDownstreamErrorMessage: undefined,
  },
  {
    errorMessage:
      "ENOENT: no such file or directory, open '/Users/myUser/nonExistingFile'",
    expectedTopLevelErrorMessage:
      "Failed to open '/Users/myUser/nonExistingFile'",
    errorName: 'FileNotFoundError',
    expectedDownstreamErrorMessage: undefined,
  },
  {
    errorMessage:
      "ENOENT: no such file or directory, open '/Users/myUser/.amplify/artifacts/cdk.out/manifest.json'",
    expectedTopLevelErrorMessage:
      'The Amplify backend definition is missing `defineBackend` call.',
    errorName: 'MissingDefineBackendError',
    expectedDownstreamErrorMessage: undefined,
  },
  {
    errorMessage:
      'Error: <escaped stack>: The request signature we calculated does not match the signature you provided. Check your AWS Secret Access Key and signing method. Consult the service documentation for details.',
    expectedTopLevelErrorMessage:
      'The request signature we calculated does not match the signature you provided.',
    errorName: 'RequestSignatureError',
    expectedDownstreamErrorMessage: undefined,
  },
];

void describe('invokeCDKCommand', { concurrency: 1 }, () => {
  const cdkErrorMapper = new CdkErrorMapper(formatterStub);
  testErrorMappings.forEach(
    ({
      errorMessage,
      expectedTopLevelErrorMessage,
      errorName: expectedErrorName,
      expectedDownstreamErrorMessage,
    }) => {
      void it(`handles ${errorMessage} error`, () => {
        const humanReadableError = cdkErrorMapper.getAmplifyError(
          new Error(errorMessage),
        );
        assert.equal(humanReadableError.name, expectedErrorName);
        assert.equal(humanReadableError.message, expectedTopLevelErrorMessage);
        expectedDownstreamErrorMessage &&
          assert.equal(
            humanReadableError.cause?.message,
            expectedDownstreamErrorMessage,
          );
      });
    },
  );
});
