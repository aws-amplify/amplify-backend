import { describe, it } from 'node:test';
import assert from 'node:assert';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { sep } from 'node:path';
import { Validator } from 'jsonschema';

const schemaPath = fileURLToPath(
  new URL('./schema_v1.4.json', import.meta.url),
).replace(`${sep}lib${sep}`, `${sep}src${sep}`);

const loadSchema = async (): Promise<object> =>
  JSON.parse(await readFile(schemaPath, 'utf-8'));

void describe('schema_v1.4 notifications', () => {
  void it('accepts a Customer Profiles-only notifications block (no Pinpoint fields)', async () => {
    const schema = await loadSchema();
    const outputs = {
      version: '1.4',
      notifications: {
        amazon_connect_customer_profiles: {
          aws_region: 'us-east-1',
          endpoint: 'https://profile.us-east-1.amazonaws.com',
        },
      },
    };
    const result = new Validator().validate(outputs, schema);
    assert.deepStrictEqual(result.errors, []);
  });

  void it('accepts a Pinpoint notifications block', async () => {
    const schema = await loadSchema();
    const outputs = {
      version: '1.4',
      notifications: {
        aws_region: 'us-east-1',
        amazon_pinpoint_app_id: 'app-id',
        channels: ['APNS'],
      },
    };
    const result = new Validator().validate(outputs, schema);
    assert.deepStrictEqual(result.errors, []);
  });

  void it('rejects a Pinpoint block missing the required Pinpoint fields', async () => {
    const schema = await loadSchema();
    const outputs = {
      version: '1.4',
      notifications: {
        aws_region: 'us-east-1',
      },
    };
    const result = new Validator().validate(outputs, schema);
    assert.ok(result.errors.length > 0);
  });
});
