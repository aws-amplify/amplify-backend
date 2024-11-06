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
    errorMessage: 'ExpiredToken',
    expectedTopLevelErrorMessage:
      'The security token included in the request is invalid.',
    errorName: 'ExpiredTokenError',
    expectedDownstreamErrorMessage: 'ExpiredToken',
  },
  {
    errorMessage:
      'Error: The security token included in the request is expired',
    expectedTopLevelErrorMessage:
      'The security token included in the request is invalid.',
    errorName: 'ExpiredTokenError',
    expectedDownstreamErrorMessage:
      'Error: The security token included in the request is expired',
  },
  {
    errorMessage: 'Access Denied',
    expectedTopLevelErrorMessage:
      'The deployment role does not have sufficient permissions to perform this deployment.',
    errorName: 'AccessDeniedError',
    expectedDownstreamErrorMessage: 'Access Denied',
  },
  {
    errorMessage:
      `ReferenceError: var is not defined` +
      EOL +
      `    at lookup(/some_random/path.js: 1: 3005)`,
    expectedTopLevelErrorMessage:
      'Unable to build the Amplify backend definition.',
    errorName: 'SyntaxError',
    expectedDownstreamErrorMessage:
      `ReferenceError: var is not defined` +
      EOL +
      `    at lookup(/some_random/path.js: 1: 3005)`,
  },
  {
    errorMessage:
      `TypeError: Cannot read properties of undefined (reading 'post')` +
      EOL +
      `    at lookup(/some_random/path.js: 1: 3005)`,
    expectedTopLevelErrorMessage:
      'Unable to build the Amplify backend definition.',
    errorName: 'SyntaxError',
    expectedDownstreamErrorMessage:
      `TypeError: Cannot read properties of undefined (reading 'post')` +
      EOL +
      `    at lookup(/some_random/path.js: 1: 3005)`,
  },
  {
    errorMessage: `TypeError [ERR_INVALID_MODULE_SPECIFIER]: Invalid module ..../function/foo/resource.ts is not a valid package name imported from 
/Users/foo/Desktop/amplify-app/amplify/storage/foo/resource.ts
    at new NodeError (node:internal/errors:405:5)`,
    expectedTopLevelErrorMessage:
      'Unable to build the Amplify backend definition.',
    errorName: 'SyntaxError',
    expectedDownstreamErrorMessage: `TypeError [ERR_INVALID_MODULE_SPECIFIER]: Invalid module ..../function/foo/resource.ts is not a valid package name imported from 
/Users/foo/Desktop/amplify-app/amplify/storage/foo/resource.ts
    at new NodeError (node:internal/errors:405:5)`,
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
    errorMessage: `[31m  some-stack failed: The stack named some-stack failed to deploy: UPDATE_ROLLBACK_COMPLETE: Resource handler returned message: The code contains one or more errors. (Service: AppSync, Status Code: 400, Request ID: 12345) (RequestToken: 123, HandlerErrorCode: GeneralServiceException), Embedded stack <escaped ARN> was not successfully updated. Currently in UPDATE_ROLLBACK_IN_PROGRESS with reason: The following resource(s) failed to create: [resource1, resource2]. [39m`,
    expectedTopLevelErrorMessage: 'The CloudFormation deployment has failed.',
    errorName: 'CloudFormationDeploymentError',
    expectedDownstreamErrorMessage: `The stack named some-stack failed to deploy: UPDATE_ROLLBACK_COMPLETE: Resource handler returned message: The code contains one or more errors. (Service: AppSync, Status Code: 400, Request ID: 12345) (RequestToken: 123, HandlerErrorCode: GeneralServiceException), Embedded stack <escaped ARN> was not successfully updated. Currently in UPDATE_ROLLBACK_IN_PROGRESS with reason: The following resource(s) failed to create: [resource1, resource2]. [39m`,
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
      `[esbuild Error]: Expected identifier but found ")"` +
      EOL +
      `      at /Users/user/work-space/amplify-app/amplify/data/resource.ts:16:0`,
    expectedTopLevelErrorMessage:
      'Unable to build the Amplify backend definition.',
    errorName: 'ESBuildError',
    expectedDownstreamErrorMessage:
      `[esbuild Error]: Expected identifier but found ")"` +
      EOL +
      `      at /Users/user/work-space/amplify-app/amplify/data/resource.ts:16:0`,
  },
  {
    errorMessage:
      `✘ [ERROR] Could not resolve "$amplify/env/defaultNodeFunctions"` +
      EOL +
      EOL +
      `    amplify/func-src/handler.ts:1:20:` +
      EOL +
      `      1 │ ...t { env } from '$amplify/env/defaultNodeFunctions';` +
      EOL +
      `1 error`,
    expectedTopLevelErrorMessage:
      'Unable to build the Amplify backend definition.',
    errorName: 'ESBuildError',
    expectedDownstreamErrorMessage:
      `✘ [ERROR] Could not resolve "$amplify/env/defaultNodeFunctions"` +
      EOL +
      EOL +
      `    amplify/func-src/handler.ts:1:20:` +
      EOL +
      `      1 │ ...t { env } from '$amplify/env/defaultNodeFunctions';` +
      EOL +
      `1 error`,
  },
  {
    errorMessage:
      `Error [TransformError]: Transform failed with 1 error:` +
      EOL +
      `/Users/user/work-space/amplify-app/amplify/auth/resource.ts:48:4: ERROR: Expected "}" but found "email"` +
      EOL +
      `    at failureErrorWithLog (/Users/user/work-space/amplify-app/node_modules/tsx/node_modules/esbuild/lib/main.js:1472:15)`,
    expectedTopLevelErrorMessage:
      '/Users/user/work-space/amplify-app/amplify/auth/resource.ts:48:4: ERROR: Expected "}" but found "email"',
    errorName: 'ESBuildError',
    expectedDownstreamErrorMessage: undefined,
  },
  {
    errorMessage:
      `Error [TransformError]: Transform failed with 2 errors:` +
      EOL +
      `/Users/user/work-space/amplify-app/amplify/auth/resource.ts:48:4: ERROR: Multiple exports with the same name auth` +
      EOL +
      `/Users/user/work-space/amplify-app/amplify/auth/resource.ts:48:4: ERROR: The symbol auth has already been declared` +
      EOL +
      `    at failureErrorWithLog (/Users/user/work-space/amplify-app/node_modules/tsx/node_modules/esbuild/lib/main.js:1472:15)`,
    expectedTopLevelErrorMessage:
      `/Users/user/work-space/amplify-app/amplify/auth/resource.ts:48:4: ERROR: Multiple exports with the same name auth` +
      EOL +
      `/Users/user/work-space/amplify-app/amplify/auth/resource.ts:48:4: ERROR: The symbol auth has already been declared`,
    errorName: 'ESBuildError',
    expectedDownstreamErrorMessage: undefined,
  },
  {
    errorMessage:
      `some rubbish before` +
      EOL +
      `Error: some cdk synth error` +
      EOL +
      `    at lookup (/some_random/path.js:1:3005)` +
      EOL +
      `    at lookup2 (/some_random/path2.js:2:3005)`,
    expectedTopLevelErrorMessage:
      'Unable to build the Amplify backend definition.',
    errorName: 'BackendSynthError',
    expectedDownstreamErrorMessage:
      'Error: some cdk synth error' +
      EOL +
      '    at lookup (/some_random/path.js:1:3005)',
  },
  {
    errorMessage:
      `Error [ERR_MODULE_NOT_FOUND]: Cannot find module '/Users/user/work-space/shared_secret.js' imported from /Users/user/work-space/amplify-app/amplify/function.ts` +
      EOL +
      `      at __node_internal_captureLargerStackTrace (node:internal/errors:496:5)` +
      EOL +
      `      at new NodeError (node:internal/errors:405:5) {` +
      EOL +
      `    url: 'file:///Users/user/work-space/shared_secret.js',` +
      EOL +
      `    code: 'ERR_MODULE_NOT_FOUND'` +
      EOL +
      `  }` +
      EOL +
      `  ` +
      EOL +
      `  Node.js v18.19.0`,
    expectedTopLevelErrorMessage: 'Cannot find module',
    errorName: 'ModuleNotFoundError',
    expectedDownstreamErrorMessage: `[ERR_MODULE_NOT_FOUND]: Cannot find module '/Users/user/work-space/shared_secret.js' imported from /Users/user/work-space/amplify-app/amplify/function.ts${EOL}`,
  },
  {
    errorMessage:
      `Error: node:internal/modules/cjs/loader:1098` +
      EOL +
      `    const err = new Error('Cannot find module ');` +
      EOL +
      `                ^` +
      EOL +
      `  ` +
      EOL +
      `  Error: Cannot find module '/Users/user/work-space/amplify/resources/module.ts'` +
      EOL +
      `      at createEsmNotFoundErr (node:internal/modules/cjs/loader:1098:15)` +
      EOL +
      `    code: 'MODULE_NOT_FOUND',` +
      EOL +
      `  }` +
      EOL +
      `  ` +
      EOL +
      `  Node.js v18.17.1`,
    expectedTopLevelErrorMessage: 'Cannot find module',
    errorName: 'ModuleNotFoundError',
    expectedDownstreamErrorMessage: `Error: Cannot find module '/Users/user/work-space/amplify/resources/module.ts'`,
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
    errorMessage: `This CDK CLI is not compatible with the CDK library used by your application. Please upgrade the CLI to the latest version.
      (Cloud assembly schema version mismatch: Maximum schema version supported is 36.0.0, but found 36.1.1)`,
    expectedTopLevelErrorMessage:
      "Installed 'aws-cdk' is not compatible with installed 'aws-cdk-lib'.",
    errorName: 'CDKVersionMismatchError',
    expectedDownstreamErrorMessage: `This CDK CLI is not compatible with the CDK library used by your application. Please upgrade the CLI to the latest version.
      (Cloud assembly schema version mismatch: Maximum schema version supported is 36.0.0, but found 36.1.1)`,
  },
  {
    errorMessage: `[31m  amplify-some-stack failed: ValidationError: Stack:stack-arn is in UPDATE_ROLLBACK_FAILED state and can not be updated.`,
    expectedTopLevelErrorMessage:
      'The CloudFormation deployment failed due to amplify-some-stack being in UPDATE_ROLLBACK_FAILED state.',
    errorName: 'CloudFormationDeploymentError',
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
          new Error(errorMessage)
        );
        assert.equal(humanReadableError.message, expectedTopLevelErrorMessage);
        assert.equal(humanReadableError.name, expectedErrorName);
        expectedDownstreamErrorMessage &&
          assert.equal(
            humanReadableError.cause?.message,
            expectedDownstreamErrorMessage
          );
      });
    }
  );
});
