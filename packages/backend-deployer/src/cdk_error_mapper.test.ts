import { describe, it } from 'node:test';
import assert from 'node:assert';
import { CdkErrorMapper } from './cdk_error_mapper.js';

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
    errorMessage: 'Access Denied',
    expectedTopLevelErrorMessage:
      'The deployment role does not have sufficient permissions to perform this deployment.',
    errorName: 'AccessDeniedError',
    expectedDownstreamErrorMessage: 'Access Denied',
  },
  {
    errorMessage: 'ReferenceError: var is not defined\n',
    expectedTopLevelErrorMessage:
      'Unable to build the Amplify backend definition.',
    errorName: 'SyntaxError',
    expectedDownstreamErrorMessage: 'ReferenceError: var is not defined\n',
  },
  {
    errorMessage: 'Has the environment been bootstrapped',
    expectedTopLevelErrorMessage:
      'This AWS account and region has not been bootstrapped.',
    errorName: 'BootstrapNotDetectedError',
    expectedDownstreamErrorMessage: 'Has the environment been bootstrapped',
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
      'Overall error message had other stuff before ❌ Deployment failed: something bad happened\n and after',
    expectedTopLevelErrorMessage: 'The CloudFormation deployment has failed.',
    errorName: 'CloudFormationDeploymentError',
    expectedDownstreamErrorMessage:
      '❌ Deployment failed: something bad happened\n',
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
    errorMessage: `[esbuild Error]: Expected identifier but found ")"
      at /Users/user/work-space/amplify-app/amplify/data/resource.ts:16:0`,
    expectedTopLevelErrorMessage:
      'Unable to build the Amplify backend definition.',
    errorName: 'ESBuildError',
    expectedDownstreamErrorMessage: `[esbuild Error]: Expected identifier but found ")"\n      at /Users/user/work-space/amplify-app/amplify/data/resource.ts:16:0`,
  },
  {
    errorMessage: `Error [ERR_MODULE_NOT_FOUND]: Cannot find module '/Users/user/work-space/shared_secret.js' imported from /Users/user/work-space/amplify-app/amplify/function.ts
      at __node_internal_captureLargerStackTrace (node:internal/errors:496:5)
      at new NodeError (node:internal/errors:405:5)
      at finalizeResolution (node:internal/modules/esm/resolve:327:11)
      at moduleResolve (node:internal/modules/esm/resolve:980:10)
      at defaultResolve (node:internal/modules/esm/resolve:1193:11)
      at nextResolve (node:internal/modules/esm/hooks:864:28)
      at d (file:///Users/user/work-space/amplify-app/node_modules/tsx/dist/esm/index.mjs:5:34)
      at O (file:///Users/user/work-space/amplify-app/node_modules/tsx/dist/esm/index.mjs:5:1162)
      at async nextResolve (node:internal/modules/esm/hooks:864:22)
      at async Hooks.resolve (node:internal/modules/esm/hooks:302:24)
      at async handleMessage (node:internal/modules/esm/worker:196:18) {
    url: 'file:///Users/user/work-space/shared_secret.js',
    code: 'ERR_MODULE_NOT_FOUND'
  }
  
  Node.js v18.19.0`,
    expectedTopLevelErrorMessage: 'Cannot find module',
    errorName: 'ModuleNotFoundError',
    expectedDownstreamErrorMessage: `[ERR_MODULE_NOT_FOUND]: Cannot find module '/Users/user/work-space/shared_secret.js' imported from /Users/user/work-space/amplify-app/amplify/function.ts\n`,
  },
];

void describe('invokeCDKCommand', { concurrency: 1 }, () => {
  const cdkErrorMapper = new CdkErrorMapper();
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
