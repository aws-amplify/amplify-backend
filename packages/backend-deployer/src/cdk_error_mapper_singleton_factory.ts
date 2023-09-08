import { CdkErrorMapper } from './cdk_error_mapper.js';

/**
 * Factory to create a backend deployer
 */
export class CdkErrorMapperFactory {
  private static instance: CdkErrorMapper | undefined;

  /**
   * Returns a single instance of CdkErrorMapper
   */
  static getInstance = (): CdkErrorMapper => {
    if (!CdkErrorMapperFactory.instance) {
      CdkErrorMapperFactory.instance = new CdkErrorMapper();
    }
    return CdkErrorMapperFactory.instance;
  };
}
