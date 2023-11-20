import { type ImportPathVerifier } from '@aws-amplify/plugin-types';

/**
 * Stub implementation of ImportPathVerifier
 */
export class ImportPathVerifierStub implements ImportPathVerifier {
  /**
   * @inheritDoc
   */
  verify = (): void => {
    // noop
  };
}
