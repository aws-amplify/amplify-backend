import { AccountIdFetcher } from './account_id_fetcher';
import { GetCallerIdentityCommandOutput, STSClient } from '@aws-sdk/client-sts';
import { describe, mock, test } from 'node:test';
import assert from 'node:assert';
import { validate } from 'uuid';

void describe('AccountIdFetcher', async () => {
  void test('fetches a valid account UUID successfully', async () => {
    const mockSend = mock.method(STSClient.prototype, 'send', () =>
      Promise.resolve({
        Account: '123456789012',
      } as GetCallerIdentityCommandOutput)
    );

    const accountIdFetcher = new AccountIdFetcher(new STSClient({}));
    const accountId = await accountIdFetcher.fetch();

    assert.ok(validate(accountId), `${accountId} is not a valid UUID string`);
    mockSend.mock.resetCalls();
  });

  void test('returns no account ID when STS fails', async () => {
    const mockSend = mock.method(STSClient.prototype, 'send', () =>
      Promise.reject(new Error('STS error'))
    );

    const accountIdFetcher = new AccountIdFetcher(new STSClient({}));
    const accountId = await accountIdFetcher.fetch();

    assert.strictEqual(accountId, 'NO_ACCOUNT_ID');
    mockSend.mock.resetCalls();
  });

  void test('returns cached account UUID on subsequent calls', async () => {
    const mockSend = mock.method(STSClient.prototype, 'send', () =>
      Promise.resolve({
        Account: '123456789012',
      } as GetCallerIdentityCommandOutput)
    );

    const accountIdFetcher = new AccountIdFetcher(new STSClient({}));
    const accountId1 = await accountIdFetcher.fetch();
    const accountId2 = await accountIdFetcher.fetch();

    assert.strictEqual(accountId1, accountId2);

    // we only call the service once.
    assert.strictEqual(mockSend.mock.callCount(), 1);
    mockSend.mock.resetCalls();
  });

  void test('returns different account UUID based on account buckets', async () => {
    const mockSend = mock.method(STSClient.prototype, 'send', () =>
      Promise.resolve({
        Account: '123456789012',
      } as GetCallerIdentityCommandOutput)
    );

    // different accountIdFetcher to avoid returning cached account UUID
    const accountIdFetcher1 = new AccountIdFetcher(new STSClient({}));
    const accountIdFetcher2 = new AccountIdFetcher(new STSClient({}));

    const accountId1 = await accountIdFetcher1.fetch();
    mock.method(STSClient.prototype, 'send', () =>
      Promise.resolve({
        Account: '123456789901', // should fall in different account id bucket
      } as GetCallerIdentityCommandOutput)
    );
    const accountId2 = await accountIdFetcher2.fetch();

    assert.notStrictEqual(accountId1, accountId2);
    mockSend.mock.resetCalls();
  });
});
