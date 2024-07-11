import { AccountIdFetcher } from './account_id_fetcher';
import { GetCallerIdentityCommandOutput, STSClient } from '@aws-sdk/client-sts';
import { describe, mock, test } from 'node:test';
import assert from 'node:assert';

void describe('AccountIdFetcher', async () => {
  void test('fetches account ID successfully', async () => {
    const mockSend = mock.method(STSClient.prototype, 'send', () =>
      Promise.resolve({
        Account: '123456789012',
      } as GetCallerIdentityCommandOutput)
    );

    const accountIdFetcher = new AccountIdFetcher(new STSClient({}));
    const accountId = await accountIdFetcher.fetch();

    assert.strictEqual(accountId, '123456789012');
    mockSend.mock.resetCalls();
  });

  void test('returns default account ID when STS fails', async () => {
    const mockSend = mock.method(STSClient.prototype, 'send', () =>
      Promise.reject(new Error('STS error'))
    );

    const accountIdFetcher = new AccountIdFetcher(new STSClient({}));
    const accountId = await accountIdFetcher.fetch();

    assert.strictEqual(accountId, 'NO_ACCOUNT_ID');
    mockSend.mock.resetCalls();
  });

  void test('returns cached account ID on subsequent calls', async () => {
    const mockSend = mock.method(STSClient.prototype, 'send', () =>
      Promise.resolve({
        Account: '123456789012',
      } as GetCallerIdentityCommandOutput)
    );

    const accountIdFetcher = new AccountIdFetcher(new STSClient({}));
    const accountId1 = await accountIdFetcher.fetch();
    const accountId2 = await accountIdFetcher.fetch();

    assert.strictEqual(accountId1, '123456789012');
    assert.strictEqual(accountId2, '123456789012');

    // we only call the service once.
    assert.strictEqual(mockSend.mock.callCount(), 1);
    mockSend.mock.resetCalls();
  });
});
