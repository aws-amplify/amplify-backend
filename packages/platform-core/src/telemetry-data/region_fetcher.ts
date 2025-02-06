import { STSClient } from "@aws-sdk/client-sts";

const NO_REGION = 'NO_REGION';
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
    } catch (error) {
      return NO_REGION;
    }
  }
}