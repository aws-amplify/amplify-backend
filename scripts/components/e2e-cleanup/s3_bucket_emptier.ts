import {
  DeleteBucketCommand,
  DeleteObjectsCommand,
  ListObjectVersionsCommand,
  ListObjectVersionsCommandOutput,
  ObjectIdentifier,
  S3Client,
} from '@aws-sdk/client-s3';

const MAX_OBJECTS_PER_DELETE_REQUEST = 1000;

/**
 * Empties and deletes S3 buckets.
 *
 * Test buckets are versioned, therefore removing the current version of every object
 * is not enough to make a bucket removable. All object versions and all delete markers
 * must be removed, otherwise `DeleteBucket` fails with `BucketNotEmpty`.
 */
export class S3BucketEmptier {
  /**
   * Creates S3 bucket emptier.
   */
  constructor(
    private readonly s3Client: S3Client,
    private readonly log: (message: string) => void = console.log,
  ) {}

  /**
   * Removes all object versions and delete markers from the bucket and then deletes the bucket.
   *
   * Bucket emptiness is eventually consistent and a concurrently running test may still be
   * writing to the bucket, so a `BucketNotEmpty` failure is retried once after emptying again.
   * @throws if any object or the bucket itself could not be deleted.
   */
  emptyAndDelete = async (bucketName: string): Promise<void> => {
    await this.empty(bucketName);
    try {
      await this.s3Client.send(new DeleteBucketCommand({ Bucket: bucketName }));
    } catch (error) {
      if (!this.isBucketNotEmptyError(error)) {
        throw error;
      }
      this.log(
        `Bucket ${bucketName} was not empty when deleting it. Emptying it again.`,
      );
      await this.empty(bucketName);
      await this.s3Client.send(new DeleteBucketCommand({ Bucket: bucketName }));
    }
  };

  /**
   * Removes all object versions and delete markers from the bucket, leaving the bucket in place.
   *
   * Unblocks a CloudFormation stack whose bucket delete failed with `BucketNotEmpty`. The bucket
   * itself is left to CloudFormation, so that its record of the resource stays intact and the
   * retried stack deletion can complete normally.
   * @throws if any object could not be deleted.
   */
  empty = async (bucketName: string): Promise<void> => {
    let keyMarker: string | undefined = undefined;
    let versionIdMarker: string | undefined = undefined;
    let isTruncated = false;
    do {
      const listObjectVersionsResponse: ListObjectVersionsCommandOutput =
        await this.s3Client.send(
          new ListObjectVersionsCommand({
            Bucket: bucketName,
            KeyMarker: keyMarker,
            VersionIdMarker: versionIdMarker,
          }),
        );
      const objectsToDelete: Array<ObjectIdentifier> = [
        ...(listObjectVersionsResponse.Versions ?? []),
        ...(listObjectVersionsResponse.DeleteMarkers ?? []),
      ]
        .filter((s3Object) => s3Object.Key !== undefined)
        .map((s3Object) => ({
          Key: s3Object.Key as string,
          VersionId: s3Object.VersionId,
        }));
      await this.deleteObjects(bucketName, objectsToDelete);
      // A single key can have more versions than fit in one page. Resuming with the key marker
      // alone skips the remaining versions of that key, hence the version id marker is required.
      keyMarker = listObjectVersionsResponse.NextKeyMarker;
      versionIdMarker = listObjectVersionsResponse.NextVersionIdMarker;
      isTruncated = listObjectVersionsResponse.IsTruncated === true;
    } while (isTruncated);
  };

  private deleteObjects = async (
    bucketName: string,
    objectsToDelete: Array<ObjectIdentifier>,
  ): Promise<void> => {
    for (
      let offset = 0;
      offset < objectsToDelete.length;
      offset += MAX_OBJECTS_PER_DELETE_REQUEST
    ) {
      const batch = objectsToDelete.slice(
        offset,
        offset + MAX_OBJECTS_PER_DELETE_REQUEST,
      );
      // DeleteObjects is a partial success API. Failures are reported in the response
      // instead of throwing, and silently ignoring them keeps the bucket from being deleted.
      const deleteObjectsResponse = await this.s3Client.send(
        new DeleteObjectsCommand({
          Bucket: bucketName,
          Delete: { Objects: batch, Quiet: true },
        }),
      );
      const errors = deleteObjectsResponse.Errors ?? [];
      if (errors.length > 0) {
        throw new Error(
          `Failed to delete ${errors.length} object(s) from ${bucketName} bucket. ${errors
            .slice(0, 5)
            .map((error) => `${error.Key}: ${error.Code} ${error.Message}`)
            .join('; ')}`,
        );
      }
    }
  };

  private isBucketNotEmptyError = (error: unknown): boolean =>
    error instanceof Error &&
    (error.name === 'BucketNotEmpty' ||
      error.message.includes('BucketNotEmpty'));
}
