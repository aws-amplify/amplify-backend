import { STSClient } from '@aws-sdk/client-sts';

/**
 * Retrieves the AWS region of the user
 */
export class RegionFetcher {
  private region?: string;

  /**
   * constructor for RegionFetcher
   */
  constructor(private readonly stsClient = new STSClient()) {}
  fetch = async () => {
    if (this.region) {
      return this.region;
    }
    try {
      this.region = await this.stsClient.config.region();
      return this.region;
    } catch {
      return;
    }
  };
}
