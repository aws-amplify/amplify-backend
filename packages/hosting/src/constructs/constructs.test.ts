import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  generateBuildIdFunctionCode,
  generateBuildId,
} from './hosting-construct.js';

void describe('generateBuildIdFunctionCode', () => {
  void it('generates CF Function code containing the build ID', () => {
    const buildId = 'test123abc';
    const code = generateBuildIdFunctionCode(buildId);

    assert.ok(code.includes('function handler(event)'));
    assert.ok(code.includes(`/builds/${buildId}`));
    assert.ok(code.includes('request.uri'));
    assert.ok(code.includes('return request'));
  });

  void it('builds a different function for each build ID', () => {
    const code1 = generateBuildIdFunctionCode('build-a');
    const code2 = generateBuildIdFunctionCode('build-b');

    assert.notStrictEqual(code1, code2);
    assert.ok(code1.includes('/builds/build-a'));
    assert.ok(code2.includes('/builds/build-b'));
  });
});

void describe('generateBuildId', () => {
  void it('generates a non-empty string', () => {
    const buildId = generateBuildId();
    assert.ok(buildId.length > 0);
  });

  void it('generates unique IDs across calls', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 10; i++) {
      ids.add(generateBuildId());
    }
    // Due to random suffix, all 10 should be unique
    assert.ok(ids.size === 10);
  });

  void it('generates base-36 encoded string with hyphen separator', () => {
    const buildId = generateBuildId();
    // format: {timestamp}-{random}, both base-36
    assert.ok(/^[0-9a-z]+-[0-9a-z]+$/.test(buildId));
  });
});
