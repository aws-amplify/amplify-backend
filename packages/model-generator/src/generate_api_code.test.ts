import assert from 'assert';
import { describe, it } from 'node:test';
import { GenerateApiCodeProps, generateApiCode } from './generate_api_code.js';

void describe('generateAPICode', () => {
  void describe('graphql-codegen', () => undefined);
  void describe('modelgen', () => undefined);
  void describe('introspection', () => undefined);

  void it('throws error on unknown format', async () => {
    const props = {
      format: 'unsupported',
      stackName: 'stack_name',
    } as unknown as GenerateApiCodeProps;
    await assert.rejects(() => generateApiCode(props));
  });
});
