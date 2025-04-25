import { STSClient } from '@aws-sdk/client-sts';

/**
 * Retrieves AWS region of the user
 */
export class RegionFetcher {
  private regionPromise?: Promise<string>;

  /**
   * constructor for RegionFetcher
   */
  constructor(private readonly stsClient = new STSClient()) {}
  fetch = async () => {
    if (this.regionPromise) {
      return await this.regionPromise;
    }
    try {
      this.regionPromise = this.stsClient.config.region();
      return await this.regionPromise;
    } catch {
      return;
    }
  };
}
