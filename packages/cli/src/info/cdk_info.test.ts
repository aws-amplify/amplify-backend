import * as assert from 'node:assert';
import * as test from 'node:test';

import { CdkInfoProvider } from './cdk_info.js';
import { execa } from 'execa';

void test.describe('CDK Info', () => {
  const cdkInfoProvider = new CdkInfoProvider();
  const mockValue: Awaited<ReturnType<typeof cdkInfoProvider.getCdkInfo>> = `
ℹ️ CDK Version: 2.110.1 (build 0d37f0d)
ℹ️ AWS environment variables:
  - AWS_SESSION_TOKEN = <redacted>
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
    const result = await cdkInfoProvider.getCdkInfo(
      execaMock as unknown as typeof execa
    );

    assert.deepStrictEqual(result, mockValue);
  });

  void test.it('formats info', () => {
    const expected = `
AWS environment variables:
  AWS_STS_REGIONAL_ENDPOINTS = regional
  AWS_NODEJS_CONNECTION_REUSE_ENABLED = 1
  AWS_SDK_LOAD_CONFIG = 1
CDK environment variables:
  CDK_DEBUG = true
  CDK_DISABLE_VERSION_CHECK = true
`.trim();

    const result = cdkInfoProvider.formatCdkInfo(mockValue);
    assert.strictEqual<string>(result, expected);
  });
});
