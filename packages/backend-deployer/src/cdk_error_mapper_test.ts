import { describe, it } from 'node:test';
import assert from 'node:assert';
import { CdkErrorMapper } from './cdk_error_mapper.js';

const testErrorMappings = [
  {
    errorMessage: 'UnknownError',
    expectedRegex: new RegExp(''),
  },
  {
    errorMessage: 'ExpiredToken',
    expectedRegex: new RegExp(
      '\\[ExpiredToken\\]: The security token included in the request is invalid.'
    ),
  },
  {
    errorMessage: 'Access Denied',
    expectedRegex: new RegExp(
      '\\[AccessDenied\\]: The service role linked to this branch does not have sufficient permissions to perform this deployment. Configure the service role in the settings for this branch.'
    ),
  },
  {
    errorMessage: 'Has the environment been bootstrapped',
    expectedRegex: new RegExp(
      '\\[BootstrapFailure\\]: This AWS account is not bootstrapped. Run `cdk bootstrap aws://{YOUR_ACCOUNT_ID}/{YOUR_REGION}` locally to resolve this.'
    ),
  },
  {
    errorMessage: 'amplify/backend.ts',
    expectedRegex: new RegExp(
      '\\[SynthError\\]: Unable to parse CDK code. Check your backend definition in the `amplify` folder.'
    ),
  },
  {
    errorMessage: 'ROLLBACK_COMPLETE',
    expectedRegex: new RegExp(
      '\\[CloudFormationFailure\\]: The CloudFormation deployment has failed. Find more information in the CloudFormation AWS Console for this stack.'
    ),
  },
  {
    errorMessage: 'ROLLBACK_FAILED',
    expectedRegex: new RegExp(
      '\\[CloudFormationFailure\\]: The CloudFormation deployment has failed. Find more information in the CloudFormation AWS Console for this stack.'
    ),
  },
];

describe('invokeCDKCommand', { concurrency: 1 }, () => {
  const cdkErrorMapper = new CdkErrorMapper();
  testErrorMappings.forEach(({ errorMessage, expectedRegex }) => {
    it(`handles ${errorMessage} error`, () => {
      const humanReadableError = cdkErrorMapper.getHumanReadableErrorMessage(
        new Error(errorMessage)
      );
      assert.match(humanReadableError ?? '', expectedRegex);
    });
  });
});
