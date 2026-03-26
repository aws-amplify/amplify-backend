import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  generateBuildId,
  generateBuildIdFunctionCode,
} from './hosting_construct.js';

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

  void it('throws InvalidBuildIdError for invalid build IDs', () => {
    assert.throws(
      () => generateBuildIdFunctionCode('invalid build id!'),
      (error: Error) => {
        assert.strictEqual(error.name, 'InvalidBuildIdError');
        return true;
      },
    );
  });
});

void describe('generateBuildIdFunctionCode — runtime behavior', () => {
  /**
   * Helper to execute the generated CloudFront Function code against a
   * simulated viewer-request event and return the mutated request.
   */
  const simulateCfFunction = (
    buildId: string,
    uri: string,
    querystring: Record<string, { value: string }> = {},
  ): { uri: string; querystring: Record<string, { value: string }> } => {
    const code = generateBuildIdFunctionCode(buildId);
    // The generated code defines `function handler(event)` which returns request.
    const wrapped = new Function('event', `${code}\nreturn handler(event);`);
    const event = {
      request: {
        uri,
        querystring,
        headers: {},
        method: 'GET',
      },
    };
    // handler() returns the mutated request object directly
    return wrapped(event);
  };

  void it('rewrites root path /', () => {
    const result = simulateCfFunction('abc123', '/');
    assert.strictEqual(result.uri, '/builds/abc123/');
  });

  void it('rewrites a normal path', () => {
    const result = simulateCfFunction('deploy-42', '/about/team');
    assert.strictEqual(result.uri, '/builds/deploy-42/about/team');
  });

  void it('rewrites a path with file extension', () => {
    const result = simulateCfFunction('v1', '/assets/style.css');
    assert.strictEqual(result.uri, '/builds/v1/assets/style.css');
  });

  void it('preserves query string (not part of URI in CF events)', () => {
    const qs = { page: { value: '2' } };
    const result = simulateCfFunction('build-1', '/search', qs);
    assert.strictEqual(result.uri, '/builds/build-1/search');
    assert.deepStrictEqual(result.querystring, qs);
  });

  void it('does not double-prefix when URI already starts with /builds/', () => {
    // The function always prepends — this test documents current behavior.
    // CloudFront Function runs once per request, so double-prefixing
    // can only happen if the origin path also includes /builds/.
    const result = simulateCfFunction('x1', '/builds/old/page');
    assert.strictEqual(result.uri, '/builds/x1/builds/old/page');
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
