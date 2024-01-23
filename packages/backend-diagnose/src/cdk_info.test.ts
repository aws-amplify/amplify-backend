import * as assert from 'node:assert';
import * as test from 'node:test';

import { formatCdkInfo, getCdkInfo } from './cdk_info.js';
import { execa } from 'execa';
import { Printer } from '@aws-amplify/cli-core';

void test.describe('CDK Info', () => {
  const mockValue: Awaited<ReturnType<typeof getCdkInfo>> = `
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
      stderr: mockValue,
    });
  });

  void test.it('gets info', async () => {
    const result = await getCdkInfo(execaMock as unknown as typeof execa);

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

    Printer.print(mockValue);
    const result = formatCdkInfo(mockValue);
    Printer.print(result);
    assert.strictEqual<string>(result, expected);
  });
});
