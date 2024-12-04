import { afterEach, beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { StorageOutputsAspect } from './storage_outputs_aspect.js';
import { AmplifyStorage } from './construct.js';
import { BackendOutputStorageStrategy } from '@aws-amplify/plugin-types';
import { StorageOutput } from '@aws-amplify/backend-output-schemas';
import { App, Stack } from 'aws-cdk-lib';
import { IConstruct } from 'constructs';
import { AmplifyUserError } from '@aws-amplify/platform-core';
import { StorageAccessDefinitionOutput } from './private_types.js';

void describe('StorageOutputsAspect', () => {
  let app: App;
  let stack: Stack;
  let outputStorageStrategy: BackendOutputStorageStrategy<StorageOutput>;
  let aspect: StorageOutputsAspect;
  const addBackendOutputEntryMock = mock.fn();
  const appendToBackendOutputListMock = mock.fn();

  beforeEach(() => {
    app = new App();
    stack = new Stack(app);
    outputStorageStrategy = {
      addBackendOutputEntry: addBackendOutputEntryMock,
      appendToBackendOutputList: appendToBackendOutputListMock,
    };
  });

  afterEach(() => {
    addBackendOutputEntryMock.mock.resetCalls();
    appendToBackendOutputListMock.mock.resetCalls();
  });

  void describe('visit', () => {
    void it('should store the storage outputs if the node is an AmplifyStorage construct', () => {
      const node = new AmplifyStorage(stack, 'test', { name: 'testName' });
      aspect = new StorageOutputsAspect(outputStorageStrategy);
      aspect.visit(node);

      assert.equal(addBackendOutputEntryMock.mock.callCount(), 1);
      assert.equal(appendToBackendOutputListMock.mock.callCount(), 1);
    });

    void it('should not store the storage outputs if the node is not an AmplifyStorage construct', () => {
      const node: IConstruct = {} as IConstruct;

      aspect.visit(node);

      assert.equal(addBackendOutputEntryMock.mock.callCount(), 0);
      assert.equal(appendToBackendOutputListMock.mock.callCount(), 0);
    });

    void it('should only traverse the siblings once to store the outputs', () => {
      const node = new AmplifyStorage(stack, 'test', { name: 'testName' });
      new AmplifyStorage(stack, 'test2', {
        name: 'testName2',
        isDefault: true,
      });
      aspect = new StorageOutputsAspect(outputStorageStrategy);

      aspect.visit(node);

      assert.equal(addBackendOutputEntryMock.mock.callCount(), 1);
      assert.equal(appendToBackendOutputListMock.mock.callCount(), 2);
    });
  });

  void describe('storeOutput', () => {
    void it('should store the output if the storage is default', () => {
      const node = new AmplifyStorage(stack, 'test', {
        name: 'testName',
        isDefault: true,
      });
      aspect = new StorageOutputsAspect(outputStorageStrategy);
      aspect.visit(node);

      assert.equal(
        addBackendOutputEntryMock.mock.calls[0].arguments[0],
        'AWS::Amplify::Storage'
      );
      assert.equal(
        addBackendOutputEntryMock.mock.calls[0].arguments[1].payload
          .storageRegion,
        Stack.of(node).region
      );
      assert.equal(
        appendToBackendOutputListMock.mock.calls[0].arguments[0],
        'AWS::Amplify::Storage'
      );
      assert.equal(
        appendToBackendOutputListMock.mock.calls[0].arguments[1].payload
          .buckets,
        JSON.stringify({
          name: node.name,
          bucketName: node.resources.bucket.bucketName,
          storageRegion: Stack.of(node).region,
        })
      );
    });

    void it('should store the output if the storage is non-default and it is the only bucket', () => {
      const node = new AmplifyStorage(stack, 'test', { name: 'testName' });
      aspect = new StorageOutputsAspect(outputStorageStrategy);
      aspect.visit(node);

      assert.equal(
        addBackendOutputEntryMock.mock.calls[0].arguments[0],
        'AWS::Amplify::Storage'
      );
      assert.equal(
        addBackendOutputEntryMock.mock.calls[0].arguments[1].payload
          .storageRegion,
        Stack.of(node).region
      );
      assert.equal(
        addBackendOutputEntryMock.mock.calls[0].arguments[1].payload.bucketName,
        node.resources.bucket.bucketName
      );
      assert.equal(
        appendToBackendOutputListMock.mock.calls[0].arguments[0],
        'AWS::Amplify::Storage'
      );
      assert.equal(
        appendToBackendOutputListMock.mock.calls[0].arguments[1].payload
          .buckets,
        JSON.stringify({
          name: node.name,
          bucketName: node.resources.bucket.bucketName,
          storageRegion: Stack.of(node).region,
        })
      );
    });

    void it('should add access paths if the storage has access rules configured', () => {
      const accessDefinition = {
        'path/*': {
          authenticated: ['get', 'list', 'write', 'delete'],
          guest: ['get', 'list'],
        },
      };
      const node = new AmplifyStorage(stack, 'test', { name: 'testName' });
      node.addAccessDefinition(
        accessDefinition as StorageAccessDefinitionOutput
      );
      aspect = new StorageOutputsAspect(outputStorageStrategy);
      aspect.visit(node);

      assert.equal(
        addBackendOutputEntryMock.mock.calls[0].arguments[0],
        'AWS::Amplify::Storage'
      );
      assert.equal(
        addBackendOutputEntryMock.mock.calls[0].arguments[1].payload
          .storageRegion,
        Stack.of(node).region
      );
      assert.equal(
        addBackendOutputEntryMock.mock.calls[0].arguments[1].payload.bucketName,
        node.resources.bucket.bucketName
      );
      assert.equal(
        appendToBackendOutputListMock.mock.calls[0].arguments[0],
        'AWS::Amplify::Storage'
      );
      assert.equal(
        appendToBackendOutputListMock.mock.calls[0].arguments[1].payload
          .buckets,
        JSON.stringify({
          name: node.name,
          bucketName: node.resources.bucket.bucketName,
          storageRegion: Stack.of(node).region,
          paths: accessDefinition,
        })
      );
    });
  });

  void describe('Validate', () => {
    void it('should throw if there is no default bucket', () => {
      const node = new AmplifyStorage(stack, 'test', { name: 'testName' });
      new AmplifyStorage(stack, 'test2', { name: 'testName2' });
      aspect = new StorageOutputsAspect(outputStorageStrategy);

      assert.throws(
        () => {
          aspect.visit(node);
        },
        (err: AmplifyUserError) => {
          assert.equal(err.name, 'NoDefaultStorageError');
          assert.equal(
            err.message,
            'No default storage set in the Amplify project.'
          );
          return true;
        }
      );
    });

    void it('should throw if there is more than one default bucket', () => {
      const node = new AmplifyStorage(stack, 'test', {
        name: 'testName',
        isDefault: true,
      });
      new AmplifyStorage(stack, 'test2', {
        name: 'testName2',
        isDefault: true,
      });
      aspect = new StorageOutputsAspect(outputStorageStrategy);

      assert.throws(
        () => {
          aspect.visit(node);
        },
        (err: AmplifyUserError) => {
          assert.equal(err.name, 'MultipleDefaultStorageError');
          assert.equal(
            err.message,
            'More than one default storage set in the Amplify project.'
          );
          return true;
        }
      );
    });
  });
});
