import { describe, it } from 'node:test';
import assert from 'node:assert';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { sep } from 'node:path';
import { Validator } from 'jsonschema';

const schemaPath = fileURLToPath(
  new URL('./schema_v1.5.json', import.meta.url),
).replace(`${sep}lib${sep}`, `${sep}src${sep}`);

const loadSchema = async (): Promise<object> =>
  JSON.parse(await readFile(schemaPath, 'utf-8'));

void describe('schema_v1.5 notifications', () => {
  void it('accepts an Amazon Connect-only notifications block (no Pinpoint fields)', async () => {
    const schema = await loadSchema();
    const outputs = {
      version: '1.5',
      notifications: {
        amazon_connect: {
          aws_region: 'us-east-1',
          endpoint: 'https://abc123.execute-api.us-east-1.amazonaws.com',
        },
      },
    };
    const result = new Validator().validate(outputs, schema);
    assert.deepStrictEqual(result.errors, []);
  });

  void it('accepts a Pinpoint notifications block', async () => {
    const schema = await loadSchema();
    const outputs = {
      version: '1.5',
      notifications: {
        aws_region: 'us-east-1',
        amazon_pinpoint_app_id: 'app-id',
        channels: ['APNS'],
      },
    };
    const result = new Validator().validate(outputs, schema);
    assert.deepStrictEqual(result.errors, []);
  });

  void it('rejects a notifications block with neither Pinpoint fields nor amazon_connect', async () => {
    const schema = await loadSchema();
    const outputs = {
      version: '1.5',
      notifications: {
        aws_region: 'us-east-1',
      },
    };
    const result = new Validator().validate(outputs, schema);
    assert.ok(result.errors.length > 0);
  });
});
