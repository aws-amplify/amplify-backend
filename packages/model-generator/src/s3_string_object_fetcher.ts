import { GetObjectCommand, NoSuchBucket, S3Client } from '@aws-sdk/client-s3';

/**
 * Handles fetching an object from an s3 bucket and parsing the object contents to a string
 */
export class S3StringObjectFetcher {
  /**
   * Creates an S3StringObjectFetcher with the provided s3 client
   */
  constructor(private readonly s3Client: S3Client) {}

  /**
   * Fetches an s3 object and converts its contents to a string
   */
  fetch = async (uri: string) => {
    const { bucket, key } = this.parseS3Uri(uri);
    try {
      const getSchemaCommandResult = await this.s3Client.send(
        new GetObjectCommand({ Bucket: bucket, Key: key })
      );
      const schema = await getSchemaCommandResult.Body?.transformToString();
      if (!schema) {
        // eslint-disable-next-line amplify-backend-rules/prefer-amplify-errors
        throw new Error('Error on parsing output schema');
      }
      return schema;
    } catch (caught) {
      if (caught instanceof NoSuchBucket) {
        //eslint-disable-next-line amplify-backend-rules/prefer-amplify-errors
        throw new Error(`${caught.name} the bucket, ${bucket} does not exist. 
          Ensure that ${bucket} exists and contains its expected contents before trying this command again.\n
          To find the expected contents, create a new sandbox and investigate the contents of buckets with a similar name to this one.`);
      } else {
        throw caught;
      }
    }
  };

  private parseS3Uri = (uri: string): { bucket: string; key: string } => {
    const { hostname, pathname } = new URL(uri);
    return {
      bucket: hostname,
      key: pathname.replace('/', ''),
    };
  };
}
