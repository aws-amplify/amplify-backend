import { describe, it } from 'node:test';
import assert from 'node:assert';
import { ArnParser } from './arn_parser.js';

void describe('arn parser', () => {
  const arnParser = new ArnParser();

  void it('returns undefined when it cannot find an account id, region', async () => {
    const { accountId, region } = arnParser.tryParseArn('hello world');
    assert.equal(accountId, undefined);
    assert.equal(region, undefined);
  });

  void it('finds the account id in a valid arn', async () => {
    const { accountId, region } = arnParser.tryParseArn(
      'arn:aws:iam:REGION:ACCOUNT_ID:role/roleName'
    );
    assert.equal(accountId, 'ACCOUNT_ID');
    assert.equal(region, 'REGION');
  });
});
