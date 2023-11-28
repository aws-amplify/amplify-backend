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
      'Unable to build Amplify backend. Check your backend definition in the `amplify` folder.',
    errorName: 'SyntaxError',
    expectedDownstreamErrorMessage: 'ReferenceError: var is not defined\n',
  },
  {
    errorMessage: 'Has the environment been bootstrapped',
    expectedTopLevelErrorMessage:
      'This AWS account and region has not been bootstrapped. Run `cdk bootstrap aws://{YOUR_ACCOUNT_ID}/{YOUR_REGION}` locally to resolve this.',
    errorName: 'BootstrapNotDetectedError',
    expectedDownstreamErrorMessage: 'Has the environment been bootstrapped',
  },
  {
    errorMessage: 'Amplify Backend not found in amplify/backend.ts',
    expectedTopLevelErrorMessage:
      'Backend definition could not be found in amplify directory',
    errorName: 'FileConventionError',
    expectedDownstreamErrorMessage:
      'Amplify Backend not found in amplify/backend.ts',
  },
  {
    errorMessage: 'Amplify Auth must be defined in amplify/auth/resource.ts',
    expectedTopLevelErrorMessage:
      'File name or path for backend definition are incorrect',
    errorName: 'FileConventionError',
    expectedDownstreamErrorMessage:
      'Amplify Auth must be defined in amplify/auth/resource.ts',
  },
  {
    errorMessage: 'amplify/backend.ts',
    expectedTopLevelErrorMessage:
      'Unable to build Amplify backend. Check your backend definition in the `amplify` folder.',
    errorName: 'BackendBuildError',
    expectedDownstreamErrorMessage: 'amplify/backend.ts',
  },
  {
    errorMessage:
      'Overall error message had other stuff before ❌ Deployment failed: something bad happened\n and after',
    expectedTopLevelErrorMessage:
      'The CloudFormation deployment has failed. Find more information in the CloudFormation AWS Console for this stack.',
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
            humanReadableError.downstreamError?.message,
            expectedDownstreamErrorMessage
          );
      });
    }
  );
});
