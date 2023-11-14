import { afterEach, describe, test } from 'node:test';
import assert from 'node:assert';
import { getUrl } from './get_usage_data_url';

void describe('getUrl', () => {
  afterEach(() => {
    delete process.env.AMPLIFY_CLI_BETA_USAGE_TRACKING_URL;
  });
  void test('that prod URL is returned when the env for beta URL is not set', () => {
    assert(getUrl(), 'https://api.cli.amplify.aws/v1.0/metrics');
  });

  void test('that BETA URL is returned when the env for beta URL is set', () => {
    process.env.AMPLIFY_CLI_BETA_USAGE_TRACKING_URL =
      'https://aws.amazon.com/amplify/';
    assert(getUrl(), 'https://aws.amazon.com/amplify/');
  });
});
