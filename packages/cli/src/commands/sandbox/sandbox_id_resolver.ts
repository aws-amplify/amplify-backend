import { userInfo as _userInfo } from 'os';
import { NamespaceResolver } from '../../backend-identifier/local_namespace_resolver.js';
import { BackendIdentifier } from '@aws-amplify/plugin-types';

/**
 * Resolves an ID that can be used to uniquely identify sandbox environments
 */
export class SandboxBackendIdResolver {
  /**
   * Initialize with an appName resolver
   */
  constructor(
    private readonly namespaceResolver: NamespaceResolver,
    private readonly userInfo = _userInfo
  ) {}

  /**
   * Returns a concatenation of the resolved appName and the current username
   */
  resolve = async (identifier?: string): Promise<BackendIdentifier> => {
    const namespace = await this.namespaceResolver.resolve();
    const name = identifier || this.userInfo().username;

    return {
      namespace,
      name,
      type: 'sandbox',
    };
  };
}
