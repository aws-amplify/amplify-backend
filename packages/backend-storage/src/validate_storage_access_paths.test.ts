import { describe, it } from 'node:test';
import { validateStorageAccessPaths } from './validate_storage_access_paths.js';
import assert from 'node:assert';
import { idPathToken } from './constants.js';

void describe('validateStorageAccessPaths', () => {
  void it('is a noop on valid paths', () => {
    validateStorageAccessPaths([
      '/foo/*',
      '/foo/bar/*',
      '/foo/baz/*',
      '/other/*',
      '/something/{id}/*',
      '/another/{id}/*',
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

  void it('throws on path that has "//" in it', () => {
    assert.throws(() => validateStorageAccessPaths(['/foo//bar/*']), {
      message: 'Path cannot contain "//". Found [/foo//bar/*].',
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
    assert.throws(() => validateStorageAccessPaths(['/foo/{id}/{id}/*']), {
      message: `The ${idPathToken} token can only appear once in a path. Found [/foo/{id}/{id}/*]`,
    });
  });

  void it('throws on path where owner token is not at the end', () => {
    assert.throws(() => validateStorageAccessPaths(['/foo/{id}/bar/*']), {
      message: `The ${idPathToken} token must be the path part right before the ending wildcard. Found [/foo/{id}/bar/*].`,
    });
  });

  void it('throws on path that starts with owner token', () => {
    assert.throws(() => validateStorageAccessPaths(['/{id}/*']), {
      message: `The ${idPathToken} token must not be the first path part. Found [/{id}/*].`,
    });
  });

  void it('throws on path that has owner token and other characters in single path part', () => {
    assert.throws(() => validateStorageAccessPaths(['/abc{id}/*']), {
      message: `A path part that includes the ${idPathToken} token cannot include any other characters. Found [/abc{id}/*].`,
    });
  });

  void it('throws on path that is a prefix of a path with an owner token', () => {
    assert.throws(() => validateStorageAccessPaths(['/foo/{id}/*', '/foo/*']), {
      message: `A path cannot be a prefix of another path that contains the ${idPathToken} token.`,
    });
    assert.throws(
      () => validateStorageAccessPaths(['/foo/bar/{id}/*', '/foo/*']),
      {
        message: `A path cannot be a prefix of another path that contains the ${idPathToken} token.`,
      }
    );
  });
});
