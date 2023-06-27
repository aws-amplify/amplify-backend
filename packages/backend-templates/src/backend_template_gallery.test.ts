import { describe, it } from 'node:test';
import path from 'path';
import url from 'url';
import { LocalDirectoryBackendTemplateGallery } from './backend_template_gallery.js';
import assert from 'node:assert';

describe('backend template gallery', () => {
  const testTemplatesDirectory = path.resolve(
    url.fileURLToPath(new URL('.', import.meta.url)),
    '..',
    'src',
    'test_utils',
    'test_templates'
  );

  const templateGallery = new LocalDirectoryBackendTemplateGallery(
    testTemplatesDirectory
  );

  it('lists available templates', async () => {
    const templates = await templateGallery.listBackendTemplates();

    assert.equal(templates.length, 3);
    assert.equal(templates[0].name, 'test_template1');
    assert.equal(templates[1].name, 'test_template2');
    assert.equal(templates[2].name, 'test_template3');
  });
});
