import { describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import {
  MAX_REDIRECTS_IN_FUNCTION,
  generateBuildIdAndRedirectFunctionCode,
  generateForwardedHostAndRedirectFunctionCode,
} from './defaults.js';

void describe('generateBuildIdAndRedirectFunctionCode', () => {
  void it('emits build-id rewrite logic when no redirects', () => {
    const code = generateBuildIdAndRedirectFunctionCode('mybuild-1');
    assert.match(code, /\/builds\/mybuild-1/);
    assert.match(code, /index\.html/);
    // Should not include redirect table when empty.
    assert.doesNotMatch(code, /__redirects/);
  });

  void it('embeds redirect table when redirects provided', () => {
    const code = generateBuildIdAndRedirectFunctionCode('mybuild-1', [
      { source: '/old', destination: '/new', statusCode: 302 },
    ]);
    assert.match(code, /__redirects/);
    assert.match(code, /\/old/);
    assert.match(code, /\/new/);
    assert.match(code, /302/);
  });

  void it('throws on invalid build ID', () => {
    assert.throws(() => generateBuildIdAndRedirectFunctionCode('bad/id', []), {
      message: /Build ID must be alphanumeric/,
    });
  });

  void it('throws on >MAX redirects', () => {
    const many = Array.from(
      { length: MAX_REDIRECTS_IN_FUNCTION + 1 },
      (_, i) => ({
        source: `/x${i}`,
        destination: '/y',
        statusCode: 302 as const,
      }),
    );
    assert.throws(
      () => generateBuildIdAndRedirectFunctionCode('mybuild-1', many),
      { message: /CloudFront Functions are limited/ },
    );
  });

  void it('throws on invalid status code', () => {
    assert.throws(
      () =>
        generateBuildIdAndRedirectFunctionCode('mybuild-1', [
          // @ts-expect-error testing runtime validation
          { source: '/old', destination: '/new', statusCode: 200 },
        ]),
      { message: /not a redirect status/ },
    );
  });
});

void describe('generateForwardedHostAndRedirectFunctionCode', () => {
  void it('emits forwarded-host logic by default', () => {
    const code = generateForwardedHostAndRedirectFunctionCode();
    assert.match(code, /x-forwarded-host/);
    assert.doesNotMatch(code, /__redirects/);
  });

  void it('embeds redirect table alongside forwarded-host', () => {
    const code = generateForwardedHostAndRedirectFunctionCode([
      { source: '/old/*', destination: '/new/*', statusCode: 308 },
    ]);
    assert.match(code, /x-forwarded-host/);
    assert.match(code, /__redirects/);
    assert.match(code, /308/);
  });
});

void describe('redirect runtime semantics (executed against the generated code)', () => {
  // Helper: extract the function body and run it with a stubbed event.
  const evalFn = (
    code: string,
  ): ((event: {
    request: { uri: string; headers?: Record<string, { value: string }> };
  }) => unknown) => {
    // The generated code defines `function handler(event) { ... }`.
    // Wrap in IIFE that returns the handler.
    // eslint-disable-next-line @typescript-eslint/no-implied-eval, no-new-func
    return new Function(`${code}\nreturn handler;`)() as never;
  };

  void it('exact match returns 30x', () => {
    const code = generateForwardedHostAndRedirectFunctionCode([
      { source: '/old', destination: '/new', statusCode: 301 },
    ]);
    const handler = evalFn(code);
    const result = handler({ request: { uri: '/old', headers: {} } }) as {
      statusCode?: number;
      headers?: { location: { value: string } };
    };
    assert.equal(result.statusCode, 301);
    assert.equal(result.headers?.location.value, '/new');
  });

  void it('non-matching URI passes through (no redirect)', () => {
    const code = generateForwardedHostAndRedirectFunctionCode([
      { source: '/old', destination: '/new', statusCode: 301 },
    ]);
    const handler = evalFn(code);
    const result = handler({
      request: {
        uri: '/something-else',
        headers: { host: { value: 'x.example.com' } },
      },
    }) as {
      uri?: string;
      statusCode?: number;
      headers?: Record<string, { value: string }>;
    };
    // The handler should return the request (with x-forwarded-host attached).
    // No statusCode means it fell through.
    assert.equal(result.statusCode, undefined);
    assert.equal(result.headers?.['x-forwarded-host']?.value, 'x.example.com');
  });

  void it('suffix wildcard matches and tail is forwarded', () => {
    const code = generateForwardedHostAndRedirectFunctionCode([
      { source: '/old/*', destination: '/new/*', statusCode: 308 },
    ]);
    const handler = evalFn(code);
    const result = handler({
      request: { uri: '/old/foo/bar', headers: {} },
    }) as {
      statusCode?: number;
      headers?: { location: { value: string } };
    };
    assert.equal(result.statusCode, 308);
    assert.equal(result.headers?.location.value, '/new/foo/bar');
  });

  void it('suffix wildcard with non-wildcard destination drops the tail', () => {
    const code = generateForwardedHostAndRedirectFunctionCode([
      { source: '/old/*', destination: '/about', statusCode: 302 },
    ]);
    const handler = evalFn(code);
    const result = handler({
      request: { uri: '/old/anything', headers: {} },
    }) as {
      headers?: { location: { value: string } };
    };
    assert.equal(result.headers?.location.value, '/about');
  });
});
