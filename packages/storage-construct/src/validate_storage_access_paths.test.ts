import { describe, it } from 'node:test';
import { validateStorageAccessPaths } from './validate_storage_access_paths.js';
import assert from 'node:assert';

void describe('validateStorageAccessPaths', () => {
  void it('validates correct paths', () => {
    const validPaths = [
      'public/*',
      'private/{entity_id}/*',
      'photos/thumbnails/*',
      'documents/shared/*',
    ];

    // Should not throw
    validateStorageAccessPaths(validPaths);
  });

  void it('throws error for paths starting with /', () => {
    const invalidPaths = ['/public/*'];

    assert.throws(() => {
      validateStorageAccessPaths(invalidPaths);
    }, /Storage access paths must not start with/);
  });

  void it('throws error for paths not ending with /*', () => {
    const invalidPaths = ['public/files'];

    assert.throws(() => {
      validateStorageAccessPaths(invalidPaths);
    }, /Storage access paths must end with/);
  });

  void it('throws error for paths with double slashes', () => {
    const invalidPaths = ['public//files/*'];

    assert.throws(() => {
      validateStorageAccessPaths(invalidPaths);
    }, /Path cannot contain/);
  });

  void it('throws error for wildcards not at end', () => {
    const invalidPaths = ['public/*/files/*'];

    assert.throws(() => {
      validateStorageAccessPaths(invalidPaths);
    }, /Wildcards are only allowed as the final part/);
  });

  void it('throws error for too many prefix relationships', () => {
    const invalidPaths = [
      'foo/*',
      'foo/bar/*',
      'foo/bar/baz/*', // This has 2 prefixes (foo and foo/bar)
    ];

    assert.throws(() => {
      validateStorageAccessPaths(invalidPaths);
    }, /only one other path can be a prefix/);
  });

  void it('validates owner token rules', () => {
    const validOwnerPaths = [
      'private/{entity_id}/*',
      'users/documents/{entity_id}/*',
    ];

    // Should not throw
    validateStorageAccessPaths(validOwnerPaths);
  });

  void it('throws error for multiple entity_id tokens', () => {
    const invalidPaths = ['users/{entity_id}/docs/{entity_id}/*'];

    assert.throws(() => {
      validateStorageAccessPaths(invalidPaths);
    }, /token can only appear once/);
  });

  void it('throws error for entity_id not before wildcard', () => {
    const invalidPaths = ['users/{entity_id}/docs/files/*'];

    assert.throws(() => {
      validateStorageAccessPaths(invalidPaths);
    }, /must be the path part right before the ending wildcard/);
  });

  void it('throws error for entity_id at start of path', () => {
    const invalidPaths = ['{entity_id}/*'];

    assert.throws(() => {
      validateStorageAccessPaths(invalidPaths);
    }, /must not be the first path part/);
  });

  void it('throws error for entity_id with other characters', () => {
    const invalidPaths = ['users/user{entity_id}/*'];

    assert.throws(() => {
      validateStorageAccessPaths(invalidPaths);
    }, /cannot include any other characters/);
  });

  void it('throws error for prefix of owner path', () => {
    const invalidPaths = [
      'users/*',
      'users/{entity_id}/*', // users/* is a prefix of this owner path
    ];

    assert.throws(() => {
      validateStorageAccessPaths(invalidPaths);
    }, /cannot be a prefix of another path that contains/);
  });
});
