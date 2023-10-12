import { describe, it } from 'node:test';
import { generateCMSResourceFilesFromSchema } from './generate_cms_resources_from_schema.js';

void describe('generateCMSResourceFilesFromSchema', () => {
  void it('returns the expected resources', async () => {
    await generateCMSResourceFilesFromSchema(
      'type Todo @model { content: String! }'
    );
  });
});
