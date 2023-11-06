import { describe, it } from 'node:test';
import assert from 'node:assert';
import { StackStatusMapper } from './stack_status_mapper.js';
import { StackStatus } from '@aws-sdk/client-cloudformation';
import { BackendDeploymentStatus } from '../deployed_backend_client_factory.js';

void describe('translateStackStatus', () => {
  const mapper = new StackStatusMapper();

  void it('translates deployed', async () => {
    const deployedStatuses = [
      StackStatus.CREATE_COMPLETE,
      StackStatus.IMPORT_COMPLETE,
      StackStatus.UPDATE_COMPLETE,
    ];
    const translated = deployedStatuses.map((status) =>
      mapper.translateStackStatus(status)
    );
    const assertion = translated.every(
      (status) => status === BackendDeploymentStatus.DEPLOYED
    );
    assert.equal(assertion, true);
  });

  void it('translates failed', async () => {
    const failedStatuses = [
      StackStatus.CREATE_FAILED,
      StackStatus.DELETE_FAILED,
      StackStatus.IMPORT_ROLLBACK_COMPLETE,
      StackStatus.IMPORT_ROLLBACK_FAILED,
      StackStatus.ROLLBACK_COMPLETE,
      StackStatus.ROLLBACK_FAILED,
      StackStatus.UPDATE_ROLLBACK_COMPLETE,
      StackStatus.UPDATE_ROLLBACK_FAILED,
      StackStatus.UPDATE_FAILED,
    ];
    const translated = failedStatuses.map((status) =>
      mapper.translateStackStatus(status)
    );
    const assertion = translated.every(
      (status) => status === BackendDeploymentStatus.FAILED
    );
    assert.equal(assertion, true);
  });

  void it('translates deploying', async () => {
    const deployingStatuses = [
      StackStatus.CREATE_IN_PROGRESS,
      StackStatus.IMPORT_IN_PROGRESS,
      StackStatus.IMPORT_ROLLBACK_IN_PROGRESS,
      StackStatus.REVIEW_IN_PROGRESS,
      StackStatus.ROLLBACK_IN_PROGRESS,
      StackStatus.UPDATE_COMPLETE_CLEANUP_IN_PROGRESS,
      StackStatus.UPDATE_IN_PROGRESS,
      StackStatus.UPDATE_ROLLBACK_COMPLETE_CLEANUP_IN_PROGRESS,
      StackStatus.UPDATE_ROLLBACK_IN_PROGRESS,
    ];
    const translated = deployingStatuses.map((status) =>
      mapper.translateStackStatus(status)
    );
    const assertion = translated.every(
      (status) => status === BackendDeploymentStatus.DEPLOYING
    );
    assert.equal(assertion, true);
  });

  void it('translates deleting', async () => {
    const deletedStatuses = [StackStatus.DELETE_IN_PROGRESS];
    const translated = deletedStatuses.map((status) =>
      mapper.translateStackStatus(status)
    );
    const assertion = translated.every(
      (status) => status === BackendDeploymentStatus.DELETING
    );
    assert.equal(assertion, true);
  });

  void it('translates deleted', async () => {
    const deletedStatuses = [StackStatus.DELETE_COMPLETE];
    const translated = deletedStatuses.map((status) =>
      mapper.translateStackStatus(status)
    );
    const assertion = translated.every(
      (status) => status === BackendDeploymentStatus.DELETED
    );
    assert.equal(assertion, true);
  });

  void it('translates unknown', async () => {
    const unknownStatuses = ['unknown', undefined];
    const translated = unknownStatuses.map((status) =>
      mapper.translateStackStatus(status)
    );
    const assertion = translated.every(
      (status) => status === BackendDeploymentStatus.UNKNOWN
    );
    assert.equal(assertion, true);
  });
});
