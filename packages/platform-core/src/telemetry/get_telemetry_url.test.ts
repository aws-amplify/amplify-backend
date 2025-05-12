import { after, afterEach, before, describe, test } from 'node:test';
import assert from 'node:assert';
import url from 'node:url';

void describe('getUrl', () => {
  const originalAmplifyTelemetryEndpoint =
    process.env.AMPLIFY_BACKEND_TELEMETRY_TRACKING_ENDPOINT;
  before(() => {
    // unset AMPLIFY_BACKEND_TELEMETRY_TRACKING_ENDPOINT, we may be setting this variable in GitHub workflows
    delete process.env.AMPLIFY_BACKEND_TELEMETRY_TRACKING_ENDPOINT;
  });

  afterEach(() => {
    delete require.cache[require.resolve('./get_telemetry_url')];
  });

  after(() => {
    process.env.AMPLIFY_BACKEND_TELEMETRY_TRACKING_ENDPOINT =
      originalAmplifyTelemetryEndpoint;
  });

  void test('that prod URL is returned when the env for beta URL is not set', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
    const { getUrl } = require('./get_telemetry_url');
    assert.equal(
      url.format(getUrl()),
      'https://telemetry.cli.amplify.aws/metrics',
    );
  });

  void test('that BETA URL is returned when the env for beta URL is set', () => {
    process.env.AMPLIFY_BACKEND_TELEMETRY_TRACKING_ENDPOINT =
      'https://aws.amazon.com/amplify/';
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
    const { getUrl } = require('./get_telemetry_url');
    assert.equal(url.format(getUrl()), 'https://aws.amazon.com/amplify/');
  });
});
