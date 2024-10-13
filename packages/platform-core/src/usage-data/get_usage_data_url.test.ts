import { afterEach, describe, test } from 'node:test';
import assert from 'node:assert';
import url from 'node:url';

void describe('getUrl', () => {
  afterEach(() => {
    delete process.env.AMPLIFY_BACKEND_USAGE_TRACKING_ENDPOINT;
    delete require.cache[require.resolve('./get_usage_data_url')];
  });
  void test('that prod URL is returned when the env for beta URL is not set', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { getUrl } = require('./get_usage_data_url');
    assert.equal(
      url.format(getUrl()),
      'https://api.cli.amplify.aws/v1.0/metrics'
    );
  });

  void test('that BETA URL is returned when the env for beta URL is set', () => {
    process.env.AMPLIFY_BACKEND_USAGE_TRACKING_ENDPOINT =
      'https://aws.amazon.com/amplify/';
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { getUrl } = require('./get_usage_data_url');
    assert.equal(url.format(getUrl()), 'https://aws.amazon.com/amplify/');
  });
});
