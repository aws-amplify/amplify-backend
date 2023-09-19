import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';

/**
 * Handles fetching an object from an s3 bucket and parsing the object contents to a string
 */
export class S3StringObjectFetcher {
  /**
   * Creates an S3StringObjectFetcher with the provided s3 client
   */
  constructor(private s3Client: S3Client) {}

  private parseS3Uri = (uri: string): { bucket: string; key: string } => {
    const regex = new RegExp('s3://(.*?)/(.*)');
    const match = uri.match(regex);
    if (match?.length !== 3 || !match[1] || !match[2]) {
      throw new Error(
        'Could not identify bucket and key name for introspection schema'
      );
    }
    return {
      bucket: match[1],
      key: match[2],
    };
  };
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
      throw new Error('Error on parsing output schema');
    }
    return schema;
  };
}
