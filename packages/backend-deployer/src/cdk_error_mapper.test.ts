import { describe, it } from 'node:test';
import assert from 'node:assert';
import { CdkErrorMapper } from './cdk_error_mapper.js';

const testErrorMappings = [
  {
    errorMessage: 'UnknownError',
    expectedTopLevelErrorMessage: 'UnknownError',
    expectedDownstreamErrorMessage: undefined,
  },
  {
    errorMessage: 'ExpiredToken',
    expectedTopLevelErrorMessage:
      '[ExpiredToken]: The security token included in the request is invalid.',
    expectedDownstreamErrorMessage: 'ExpiredToken',
  },
  {
    errorMessage: 'Access Denied',
    expectedTopLevelErrorMessage:
      '[AccessDenied]: The deployment role does not have sufficient permissions to perform this deployment.',
    expectedDownstreamErrorMessage: 'Access Denied',
  },
  {
    errorMessage: 'Has the environment been bootstrapped',
    expectedTopLevelErrorMessage:
      '[BootstrapFailure]: This AWS account and region has not been bootstrapped. Run `cdk bootstrap aws://{YOUR_ACCOUNT_ID}/{YOUR_REGION}` locally to resolve this.',
    expectedDownstreamErrorMessage: 'Has the environment been bootstrapped',
  },
  {
    errorMessage: 'amplify/backend.ts',
    expectedTopLevelErrorMessage:
      '[SynthError]: Unable to build Amplify backend. Check your backend definition in the `amplify` folder.',
    expectedDownstreamErrorMessage: 'amplify/backend.ts',
  },
  {
    errorMessage: '❌ Deployment failed: something bad happened\n',
    expectedTopLevelErrorMessage:
      '[CloudFormationFailure]: The CloudFormation deployment has failed. Find more information in the CloudFormation AWS Console for this stack.',
    expectedDownstreamErrorMessage: 'something bad happened',
  },
  {
    errorMessage:
      'CFN error happened: Updates are not allowed for property: some property',
    expectedTopLevelErrorMessage:
      '[UpdateNotSupported]: The changes that you are trying to apply are not supported.',
    expectedDownstreamErrorMessage:
      'CFN error happened: Updates are not allowed for property: some property',
  },
  {
    errorMessage:
      'CFN error happened: Invalid AttributeDataType input, consider using the provided AttributeDataType enum',
    expectedTopLevelErrorMessage:
      '[UpdateNotSupported]: User pool attributes cannot be changed after a user pool has been created.',
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
      expectedDownstreamErrorMessage,
    }) => {
      void it(`handles ${errorMessage} error`, () => {
        const humanReadableError = cdkErrorMapper.getHumanReadableError(
          new Error(errorMessage)
        );
        assert.equal(humanReadableError.message, expectedTopLevelErrorMessage);
        expectedDownstreamErrorMessage &&
          assert.equal(
            (humanReadableError.cause as Error).message,
            expectedDownstreamErrorMessage
          );
      });
    }
  );
});
