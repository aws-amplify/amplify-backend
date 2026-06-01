import { describe, it } from 'node:test';
import assert from 'node:assert';
import { normalizeBasePath, prependBasePath } from './basepath.js';

void describe('normalizeBasePath', () => {
  void it('returns undefined for undefined', () => {
    assert.strictEqual(normalizeBasePath(undefined), undefined);
  });

  void it('returns undefined for empty string', () => {
    assert.strictEqual(normalizeBasePath(''), undefined);
  });

  void it('returns undefined for "/"', () => {
    assert.strictEqual(normalizeBasePath('/'), undefined);
  });

  void it('drops trailing slash', () => {
    assert.strictEqual(normalizeBasePath('/app/'), '/app');
  });

  void it('preserves a value with leading slash and no trailing', () => {
    assert.strictEqual(normalizeBasePath('/app'), '/app');
  });

  void it('prepends leading slash when missing', () => {
    assert.strictEqual(normalizeBasePath('app'), '/app');
  });

  void it('handles nested path', () => {
    assert.strictEqual(normalizeBasePath('/foo/bar/'), '/foo/bar');
  });

  void it('trims whitespace', () => {
    assert.strictEqual(normalizeBasePath('  /app  '), '/app');
  });
});

void describe('prependBasePath', () => {
  void it('returns the pattern unchanged when basePath is undefined', () => {
    assert.strictEqual(prependBasePath(undefined, '/foo/*'), '/foo/*');
  });

  void it('returns the pattern unchanged when basePath is empty string', () => {
    assert.strictEqual(prependBasePath('', '/foo/*'), '/foo/*');
  });

  void it('prepends basePath to a slash-prefixed pattern', () => {
    assert.strictEqual(prependBasePath('/app', '/foo/*'), '/app/foo/*');
  });

  void it('prepends basePath to a pattern without leading slash', () => {
    assert.strictEqual(prependBasePath('/app', 'foo'), '/app/foo');
  });

  void it('handles root pattern "/"', () => {
    assert.strictEqual(prependBasePath('/app', '/'), '/app/');
  });

  void it('handles empty pattern', () => {
    assert.strictEqual(prependBasePath('/app', ''), '/app/');
  });

  void it('handles wildcard pattern', () => {
    assert.strictEqual(prependBasePath('/app', '/*'), '/app/*');
  });

  void it('handles nested basePath', () => {
    assert.strictEqual(prependBasePath('/foo/bar', '/baz'), '/foo/bar/baz');
  });
});
