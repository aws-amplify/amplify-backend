import { describe, it } from 'node:test';
import { validateStorageAccessPaths } from './validate_storage_access_paths.js';
import assert from 'node:assert';
import { ownerPathPartToken } from './constants.js';

void describe('validateStorageAccessPaths', () => {
  void it('is a noop on valid paths', () => {
    validateStorageAccessPaths([
      '/foo/*',
      '/foo/bar/*',
      '/foo/baz/*',
      '/other/*',
      '/something/{owner}/*',
      '/another/{owner}/*',
    ]);
    // completing successfully indicates success
  });

  void it('throws on path that does not start with /', () => {
    assert.throws(() => validateStorageAccessPaths(['foo/*']), {
      message:
        'All storage access paths must start with "/" and end with "/*. Found [foo/*].',
    });
  });

  void it('throws on path that does not end with /*', () => {
    assert.throws(() => validateStorageAccessPaths(['/foo']), {
      message:
        'All storage access paths must start with "/" and end with "/*. Found [/foo].',
    });
  });

  void it('throws on path that has wildcards in the middle', () => {
    assert.throws(() => validateStorageAccessPaths(['/foo/*/bar/*']), {
      message: `Wildcards are only allowed as the final part of a path. Found [/foo/*/bar/*].`,
    });
  });

  void it('throws on path that has more that one other path that is a prefix of it', () => {
    assert.throws(
      () =>
        validateStorageAccessPaths(['/foo/*', '/foo/bar/*', '/foo/bar/baz/*']),
      {
        message:
          'For any given path, only one other path can be a prefix of it. Found [/foo/bar/baz/*] which has prefixes [/foo/*, /foo/bar/*].',
      }
    );
  });

  void it('throws on path that has multiple owner tokens', () => {
    assert.throws(
      () => validateStorageAccessPaths(['/foo/{owner}/{owner}/*']),
      {
        message: `The ${ownerPathPartToken} token can only appear once in a path. Found [/foo/{owner}/{owner}/*]`,
      }
    );
  });

  void it('throws on path where owner token is not at the end', () => {
    assert.throws(() => validateStorageAccessPaths(['/foo/{owner}/bar/*']), {
      message: `The ${ownerPathPartToken} token must be the path part right before the ending wildcard. Found [/foo/{owner}/bar/*].`,
    });
  });

  void it('throws on path that starts with owner token', () => {
    assert.throws(() => validateStorageAccessPaths(['/{owner}/*']), {
      message: `The ${ownerPathPartToken} token must not be the first path part. Found [/{owner}/*].`,
    });
  });

  void it('throws on path that has owner token and other characters in single path part', () => {
    assert.throws(() => validateStorageAccessPaths(['/abc{owner}/*']), {
      message: `A path part that includes the ${ownerPathPartToken} token cannot include any other characters. Found [/abc{owner}/*].`,
    });
  });

  void it('throws on path where owner token conflicts with wildcard in another path', () => {
    assert.throws(
      () => validateStorageAccessPaths(['/foo/{owner}/*', '/foo/*']),
      {
        message: `Wildcard conflict detected with an ${ownerPathPartToken} token.`,
      }
    );
  });
});
