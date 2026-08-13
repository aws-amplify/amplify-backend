import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import {
  DeleteBucketCommand,
  DeleteObjectsCommand,
  ListObjectVersionsCommand,
  ListObjectVersionsCommandOutput,
  S3Client,
} from '@aws-sdk/client-s3';
import { S3BucketEmptier } from './s3_bucket_emptier.js';

type S3Response = Record<string, unknown>;

const buildS3Client = (
  handlers: {
    listObjectVersions?: Array<ListObjectVersionsCommandOutput>;
    deleteObjects?: Array<S3Response>;
    deleteBucket?: Array<S3Response | Error>;
  } = {},
) => {
  const listObjectVersionsResponses = [...(handlers.listObjectVersions ?? [])];
  const deleteObjectsResponses = [...(handlers.deleteObjects ?? [])];
  const deleteBucketResponses = [...(handlers.deleteBucket ?? [])];
  const send = mock.fn((command: unknown) => {
    if (command instanceof ListObjectVersionsCommand) {
      return Promise.resolve(listObjectVersionsResponses.shift() ?? {});
    }
    if (command instanceof DeleteObjectsCommand) {
      return Promise.resolve(deleteObjectsResponses.shift() ?? {});
    }
    if (command instanceof DeleteBucketCommand) {
      const response = deleteBucketResponses.shift();
      return response instanceof Error
        ? Promise.reject(response)
        : Promise.resolve(response ?? {});
    }
    return Promise.reject(new Error('Unexpected command'));
  });
  return { s3Client: { send } as unknown as S3Client, send };
};

const getCommandInputs = (
  send: ReturnType<typeof buildS3Client>['send'],
  commandType: unknown,
): Array<Record<string, unknown>> =>
  send.mock.calls
    .map((call) => call.arguments[0])
    .filter(
      (command) =>
        command instanceof (commandType as new (input: never) => object),
    )
    .map((command) => (command as { input: Record<string, unknown> }).input);

const getDeletedObjectCount = (input: Record<string, unknown>): number =>
  ((input.Delete as Record<string, unknown>).Objects as Array<unknown>).length;

const buildBucketNotEmptyError = (): Error => {
  const error = new Error('The bucket you tried to delete is not empty');
  error.name = 'BucketNotEmpty';
  return error;
};

void describe('S3BucketEmptier', () => {
  void it('deletes all object versions and delete markers, then the bucket', async () => {
    const { s3Client, send } = buildS3Client({
      listObjectVersions: [
        {
          Versions: [{ Key: 'a', VersionId: 'v1' }],
          DeleteMarkers: [{ Key: 'a', VersionId: 'v2' }],
          IsTruncated: false,
          $metadata: {},
        },
      ],
    });

    await new S3BucketEmptier(s3Client, () => {}).emptyAndDelete('test-bucket');

    assert.deepStrictEqual(getCommandInputs(send, DeleteObjectsCommand), [
      {
        Bucket: 'test-bucket',
        Delete: {
          Objects: [
            { Key: 'a', VersionId: 'v1' },
            { Key: 'a', VersionId: 'v2' },
          ],
          Quiet: true,
        },
      },
    ]);
    assert.deepStrictEqual(getCommandInputs(send, DeleteBucketCommand), [
      { Bucket: 'test-bucket' },
    ]);
  });

  void it('leaves the bucket in place when it is only emptied', async () => {
    const { s3Client, send } = buildS3Client({
      listObjectVersions: [
        {
          Versions: [{ Key: 'a', VersionId: 'v1' }],
          IsTruncated: false,
          $metadata: {},
        },
      ],
    });

    await new S3BucketEmptier(s3Client, () => {}).empty('test-bucket');

    assert.deepStrictEqual(getCommandInputs(send, DeleteObjectsCommand), [
      {
        Bucket: 'test-bucket',
        Delete: {
          Objects: [{ Key: 'a', VersionId: 'v1' }],
          Quiet: true,
        },
      },
    ]);
    assert.deepStrictEqual(getCommandInputs(send, DeleteBucketCommand), []);
  });

  void it('paginates on both key marker and version id marker', async () => {
    const { s3Client, send } = buildS3Client({
      listObjectVersions: [
        {
          Versions: [{ Key: 'a', VersionId: 'v1' }],
          IsTruncated: true,
          NextKeyMarker: 'a',
          NextVersionIdMarker: 'v1',
          $metadata: {},
        },
        {
          Versions: [{ Key: 'a', VersionId: 'v2' }],
          IsTruncated: true,
          NextKeyMarker: 'b',
          NextVersionIdMarker: undefined,
          $metadata: {},
        },
        {
          Versions: [{ Key: 'c', VersionId: 'v3' }],
          IsTruncated: false,
          $metadata: {},
        },
      ],
    });

    await new S3BucketEmptier(s3Client, () => {}).emptyAndDelete('test-bucket');

    assert.deepStrictEqual(getCommandInputs(send, ListObjectVersionsCommand), [
      {
        Bucket: 'test-bucket',
        KeyMarker: undefined,
        VersionIdMarker: undefined,
      },
      { Bucket: 'test-bucket', KeyMarker: 'a', VersionIdMarker: 'v1' },
      { Bucket: 'test-bucket', KeyMarker: 'b', VersionIdMarker: undefined },
    ]);
    assert.strictEqual(getCommandInputs(send, DeleteObjectsCommand).length, 3);
  });

  void it('deletes objects in batches of 1000', async () => {
    const versions = Array.from({ length: 1001 }, (_, index) => ({
      Key: `key-${index}`,
      VersionId: 'v1',
    }));
    const { s3Client, send } = buildS3Client({
      listObjectVersions: [
        { Versions: versions, IsTruncated: false, $metadata: {} },
      ],
    });

    await new S3BucketEmptier(s3Client, () => {}).emptyAndDelete('test-bucket');

    const deleteObjectsInputs = getCommandInputs(send, DeleteObjectsCommand);
    assert.strictEqual(deleteObjectsInputs.length, 2);
    assert.deepStrictEqual(
      deleteObjectsInputs.map((input) => getDeletedObjectCount(input)),
      [1000, 1],
    );
  });

  void it('throws if the delete objects response reports errors', async () => {
    const { s3Client, send } = buildS3Client({
      listObjectVersions: [
        {
          Versions: [{ Key: 'a', VersionId: 'v1' }],
          IsTruncated: false,
          $metadata: {},
        },
      ],
      deleteObjects: [
        { Errors: [{ Key: 'a', Code: 'AccessDenied', Message: 'nope' }] },
      ],
    });

    await assert.rejects(
      () =>
        new S3BucketEmptier(s3Client, () => {}).emptyAndDelete('test-bucket'),
      (error: Error) => {
        assert.ok(error.message.includes('Failed to delete 1 object(s)'));
        assert.ok(error.message.includes('AccessDenied'));
        return true;
      },
    );
    assert.strictEqual(getCommandInputs(send, DeleteBucketCommand).length, 0);
  });

  void it('empties the bucket again and retries when the bucket is not empty', async () => {
    const emptyPage: ListObjectVersionsCommandOutput = {
      IsTruncated: false,
      $metadata: {},
    };
    const { s3Client, send } = buildS3Client({
      listObjectVersions: [
        emptyPage,
        {
          Versions: [{ Key: 'written-during-cleanup', VersionId: 'v1' }],
          IsTruncated: false,
          $metadata: {},
        },
      ],
      deleteBucket: [buildBucketNotEmptyError(), {}],
    });

    await new S3BucketEmptier(s3Client, () => {}).emptyAndDelete('test-bucket');

    assert.strictEqual(
      getCommandInputs(send, ListObjectVersionsCommand).length,
      2,
    );
    assert.strictEqual(getCommandInputs(send, DeleteObjectsCommand).length, 1);
    assert.strictEqual(getCommandInputs(send, DeleteBucketCommand).length, 2);
  });

  void it('does not retry the bucket deletion on other failures', async () => {
    const { s3Client, send } = buildS3Client({
      listObjectVersions: [{ IsTruncated: false, $metadata: {} }],
      deleteBucket: [new Error('AccessDenied')],
    });

    await assert.rejects(
      () =>
        new S3BucketEmptier(s3Client, () => {}).emptyAndDelete('test-bucket'),
      (error: Error) => {
        assert.strictEqual(error.message, 'AccessDenied');
        return true;
      },
    );
    assert.strictEqual(getCommandInputs(send, DeleteBucketCommand).length, 1);
  });
});
