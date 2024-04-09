import {
  BackendIdentifier,
  StableBackendHashGetter,
} from '@aws-amplify/plugin-types';
import { createHash } from 'crypto';

const HASH_LENGTH = 20;

/**
 * Gets a stable hash value derived from BackendIdentifier
 */
export class BackendIdStableBackendHashGetterStub
  implements StableBackendHashGetter
{
  /**
   * Creates a StableBackendHashGetter instance.
   */
  constructor(private readonly backendId: BackendIdentifier) {}

  getStableBackendHash = (): string => this.hashFromBackendId();

  private hashFromBackendId = (): string =>
    createHash('sha512')
      .update(this.backendId.type)
      .update(this.backendId.namespace)
      .update(this.backendId.name)
      .digest('hex')
      .slice(0, HASH_LENGTH);
}
