import { describe, it } from 'node:test';
import assert from 'node:assert';
import { ArnParser } from './arn_parser.js';

void describe('arn parser', () => {
  const accountIdParser = new ArnParser();

  void it('returns undefined when it cannot find an account id', async () => {
    const accountId = accountIdParser.tryAccountIdFromArn('hello world');
    assert.equal(accountId, undefined);
  });

  void it('finds the account id in a valid arn', async () => {
    const accountId = accountIdParser.tryAccountIdFromArn(
      'arn:aws:iam:REGION:ACCOUNT_ID:role/roleName'
    );
    assert.equal(accountId, 'ACCOUNT_ID');
  });

  void it('returns undefined when it cannot find an region', async () => {
    const accountId = accountIdParser.tryRegionFromArn('hello world');
    assert.equal(accountId, undefined);
  });

  void it('finds the region in a valid arn', async () => {
    const accountId = accountIdParser.tryRegionFromArn(
      'arn:aws:iam:REGION:ACCOUNT_ID:role/roleName'
    );
    assert.equal(accountId, 'REGION');
  });
});
