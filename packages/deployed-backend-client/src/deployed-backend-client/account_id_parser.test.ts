import { describe, it } from 'node:test';
import assert from 'node:assert';
import { AccountIdParser } from './account_id_parser.js';

void describe('account id parser', () => {
  const accountIdParser = new AccountIdParser();

  void it('returns undefined when it cannot find an account id', async () => {
    const accountId = accountIdParser.tryFromArn('hello world');
    assert.equal(accountId, undefined);
  });

  void it('finds the account id in a valid arn', async () => {
    const accountId = accountIdParser.tryFromArn(
      'arn:aws:iam::ACCOUNT_ID:role/roleName'
    );
    assert.equal(accountId, 'ACCOUNT_ID');
  });
});
