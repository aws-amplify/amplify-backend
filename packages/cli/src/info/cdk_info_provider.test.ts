import * as assert from 'node:assert';
import * as test from 'node:test';
import { execa } from 'execa';
import { CdkInfoProvider } from './cdk_info_provider.js';

void test.describe('CDK Info', () => {
  const mockValue: string = `
ℹ️ CDK Version: 2.110.1 (build 0d37f0d)
ℹ️ AWS environment variables:
  - AWS_SESSION_TOKEN = <redacted>
  - AWS_SECRET_ACCESS_KEY = <redacted>
  - AWS_ACCESS_KEY_ID = <redacted>
  - AWS_STS_REGIONAL_ENDPOINTS = regional
  - AWS_NODEJS_CONNECTION_REUSE_ENABLED = 1
  - AWS_SDK_LOAD_CONFIG = 1
ℹ️ CDK environment variables:
  - CDK_DEBUG = true
  - CDK_DISABLE_VERSION_CHECK = true
`.trim();

  const execaMock = test.mock.fn(() => {
    return Promise.resolve({
      all: mockValue,
      stderr: mockValue,
    });
  });

  void test.it('gets info', async () => {
    const cdkInfoProvider = new CdkInfoProvider(
      execaMock as unknown as typeof execa
    );
    const result = await cdkInfoProvider.getCdkInfo();
    const expected = `
AWS environment variables:
  AWS_STS_REGIONAL_ENDPOINTS = regional
  AWS_NODEJS_CONNECTION_REUSE_ENABLED = 1
  AWS_SDK_LOAD_CONFIG = 1
CDK environment variables:
  CDK_DEBUG = true
  CDK_DISABLE_VERSION_CHECK = true
`.trim();

    assert.strictEqual<string>(result, expected);
  });
});
