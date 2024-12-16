import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';

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
    const getSchemaCommandResult = await this.s3Client.send(
      new GetObjectCommand({ Bucket: bucket, Key: key })
    );
    const schema = await getSchemaCommandResult.Body?.transformToString();
    if (!schema) {
      // eslint-disable-next-line amplify-backend-rules/prefer-amplify-errors
      throw new Error('Error on parsing output schema');
    }
    return schema;
  };

  private parseS3Uri = (uri: string): { bucket: string; key: string } => {
    const { hostname, pathname } = new URL(uri);
    return {
      bucket: hostname,
      key: pathname.replace('/', ''),
    };
  };
}
