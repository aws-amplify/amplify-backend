import { describe, it } from 'node:test';
import assert from 'node:assert';
import { CdkErrorMapper } from './cdk_error_mapper.js';

const testErrorMappings = [
  {
    errorMessage: 'UnknownError',
    expectedString: 'UnknownError',
  },
  {
    errorMessage: 'ExpiredToken',
    expectedString:
      '[ExpiredToken]: The security token included in the request is invalid.',
  },
  {
    errorMessage: 'Access Denied',
    expectedString:
      '[AccessDenied]: The deployment role does not have sufficient permissions to perform this deployment.',
  },
  {
    errorMessage: 'Has the environment been bootstrapped',
    expectedString:
      '[BootstrapFailure]: This AWS account and region has not been bootstrapped. Run `cdk bootstrap aws://{YOUR_ACCOUNT_ID}/{YOUR_REGION}` locally to resolve this.',
  },
  {
    errorMessage: 'amplify/backend.ts',
    expectedString:
      '[SynthError]: Unable to build Amplify backend. Check your backend definition in the `amplify` folder.',
  },
  {
    errorMessage: 'ROLLBACK_COMPLETE',
    expectedString:
      '[CloudFormationFailure]: The CloudFormation deployment has failed. Find more information in the CloudFormation AWS Console for this stack.',
  },
  {
    errorMessage: 'ROLLBACK_FAILED',
    expectedString:
      '[CloudFormationFailure]: The CloudFormation deployment has failed. Find more information in the CloudFormation AWS Console for this stack.',
  },
];

void describe('invokeCDKCommand', { concurrency: 1 }, () => {
  const cdkErrorMapper = new CdkErrorMapper();
  testErrorMappings.forEach(({ errorMessage, expectedString }) => {
    void it(`handles ${errorMessage} error`, () => {
      const humanReadableError = cdkErrorMapper.getHumanReadableError(
        new Error(errorMessage)
      );
      assert.equal(humanReadableError.message, expectedString);
      assert.equal((humanReadableError.cause as Error).message, errorMessage);
    });
  });
});
