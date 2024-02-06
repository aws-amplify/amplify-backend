import {
  SsmEnvironmentEntriesGenerator,
  SsmEnvironmentEntry,
} from '@aws-amplify/plugin-types';
import { IBucket } from 'aws-cdk-lib/aws-s3';

/**
 * Cache for environment entries.
 */
export class EnvironmentEntriesCache {
  private ssmEnvironmentEntries: SsmEnvironmentEntry[] | undefined;

  /**
   * Initialize with the SSM environment entries generator and the bucket.
   */
  constructor(
    private readonly ssmEnvironmentEntriesGenerator: SsmEnvironmentEntriesGenerator,
    private readonly bucket: IBucket
  ) {}

  public getSsmEnvironmentEntries = () => {
    if (!this.ssmEnvironmentEntries) {
      this.ssmEnvironmentEntries =
        this.ssmEnvironmentEntriesGenerator.generateSsmEnvironmentEntries(
          this.bucket,
          {
            STORAGE_BUCKET_NAME: this.bucket.bucketName,
          }
        );
    }
    return this.ssmEnvironmentEntries;
  };
}
