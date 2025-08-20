import { describe, it } from 'node:test';
import {
  InternalStorageAction,
  StorageAccessPolicyFactory,
  StoragePath,
} from './storage_access_policy_factory.js';
import { App, Stack } from 'aws-cdk-lib';
import { Bucket } from 'aws-cdk-lib/aws-s3';

import assert from 'node:assert';

void describe('StorageAccessPolicyFactory', () => {
  void it('creates policy with allow permissions', () => {
    const app = new App();
    const stack = new Stack(app);
    const bucket = new Bucket(stack, 'TestBucket');
    const factory = new StorageAccessPolicyFactory(bucket);

    const permissions = new Map<
      InternalStorageAction,
      { allow: Set<StoragePath>; deny: Set<StoragePath> }
    >();

    permissions.set('get', {
      allow: new Set(['photos/*' as StoragePath]),
      deny: new Set(),
    });

    const policy = factory.createPolicy(permissions);
    assert.ok(policy);
    assert.equal(policy.document.statementCount, 1);
  });

  void it('creates policy with list permissions', () => {
    const app = new App();
    const stack = new Stack(app);
    const bucket = new Bucket(stack, 'TestBucket');
    const factory = new StorageAccessPolicyFactory(bucket);

    const permissions = new Map<
      InternalStorageAction,
      { allow: Set<StoragePath>; deny: Set<StoragePath> }
    >();

    permissions.set('list', {
      allow: new Set(['photos/*' as StoragePath]),
      deny: new Set(),
    });

    const policy = factory.createPolicy(permissions);
    assert.ok(policy);
    assert.equal(policy.document.statementCount, 1);
  });

  void it('creates policy with deny permissions', () => {
    const app = new App();
    const stack = new Stack(app);
    const bucket = new Bucket(stack, 'TestBucket');
    const factory = new StorageAccessPolicyFactory(bucket);

    const permissions = new Map<
      InternalStorageAction,
      { allow: Set<StoragePath>; deny: Set<StoragePath> }
    >();

    permissions.set('write', {
      allow: new Set(['public/*' as StoragePath]),
      deny: new Set(['private/*' as StoragePath]),
    });

    const policy = factory.createPolicy(permissions);
    assert.ok(policy);
    assert.equal(policy.document.statementCount, 2); // One allow, one deny
  });

  void it('throws error for empty permissions', () => {
    const app = new App();
    const stack = new Stack(app);
    const bucket = new Bucket(stack, 'TestBucket');
    const factory = new StorageAccessPolicyFactory(bucket);

    const permissions = new Map();

    assert.throws(() => {
      factory.createPolicy(permissions);
    }, /At least one permission must be specified/);
  });
});
