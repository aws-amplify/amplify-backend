import assert from 'assert';
import { describe, it } from 'node:test';
import { GenerateApiCodeProps, generateApiCode } from './generate_api_code.js';

describe('generateAPICode', () => {
  describe('graphql-codegen', () => undefined);
  describe('modelgen', () => undefined);
  describe('introspection', () => undefined);

  it('throws error on unknown format', async () => {
    const props = {
      format: 'unsupported',
      stackName: 'stack_name',
    } as unknown as GenerateApiCodeProps;
    await assert.rejects(() => generateApiCode(props));
  });
});
