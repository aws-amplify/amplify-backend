import { RegionFetcher } from './region_fetcher';
import { STSClient } from '@aws-sdk/client-sts';
import { describe, mock, test } from 'node:test';
import assert from 'node:assert';

void describe('RegionFetcher', async () => {
  void test('fetches region successfully', async () => {
    const regionFetcher = new RegionFetcher(new STSClient({ region: 'us-east-1' }));
    const region = await regionFetcher.fetch();

    assert.strictEqual(region, 'us-east-1');
  });

  void test('returns default region when STS fails', async () => {
    const stsClient = new STSClient();
    mock.method(stsClient.config, 'region', () => Promise.reject(new Error('STS error')));
    const regionFetcher = new RegionFetcher(stsClient);
    const region = await regionFetcher.fetch();

    assert.strictEqual(region, 'NO_REGION');
  });

  void test('returns cached region on subsequent calls', async () => {
    const regionFetcher = new RegionFetcher(new STSClient({ region: 'us-east-1' }));
    const region1 = await regionFetcher.fetch();
    const region2 = await regionFetcher.fetch();

    assert.strictEqual(region1, 'us-east-1');
    assert.strictEqual(region2, 'us-east-1');
  });
});
