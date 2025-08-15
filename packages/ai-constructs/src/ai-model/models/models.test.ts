import { describe, it } from 'node:test';
import assert from 'node:assert';
import modelsJson from './models.json';
import { AiModelsManifest } from '../ai_model_types';

void describe('models.json', () => {
  void it('parses into AiModelsManifest type without errors', () => {
    assert.doesNotThrow(() => {
      const data: AiModelsManifest = modelsJson as AiModelsManifest;
      assert.ok(data.schemaVersion);
      assert.ok(data.lastUpdated);
      assert.ok(data.regionGroups);
      assert.ok(data.models);
    });
  });

  void it('has valid structure', () => {
    const data = modelsJson as AiModelsManifest;

    // Check regionGroups
    assert.ok(
      Object.keys(data.regionGroups).length > 0,
      'Should have region groups',
    );
    for (const [geography, regions] of Object.entries(data.regionGroups)) {
      assert.ok(typeof geography === 'string', 'Geography should be string');
      assert.ok(Array.isArray(regions), 'Regions should be array');
      assert.ok(regions.length > 0, 'Should have regions in geography');
    }

    // Check models
    assert.ok(Object.keys(data.models).length > 0, 'Should have models');
    for (const [modelId, entry] of Object.entries(data.models)) {
      assert.ok(typeof modelId === 'string', 'Model ID should be string');
      assert.ok(entry.geographies, 'Model should have geographies');

      for (const [geo, mapping] of Object.entries(entry.geographies)) {
        assert.ok(typeof geo === 'string', 'Geography should be string');
        assert.ok(
          Array.isArray(mapping.supportsCriFrom),
          'supportsCriFrom should be array',
        );
        assert.ok(
          Array.isArray(mapping.requiresCriIn),
          'requiresCriIn should be array',
        );
      }
    }
  });
});
