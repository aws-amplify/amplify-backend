import { userInfo as _userInfo } from 'os';
import { NamespaceResolver } from '../../backend-identifier/local_namespace_resolver.js';
import { BackendIdentifierParts } from '@aws-amplify/plugin-types';

/**
 * Resolves an ID that can be used to uniquely identify sandbox environments
 */
export class SandboxBackendIdPartsResolver {
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
  resolve = async (): Promise<BackendIdentifierParts> => {
    const namespace = await this.namespaceResolver.resolve();
    const userName = this.userInfo().username;

    return {
      namespace: namespace.substring(0, 112 - userName.length - 1),
      instance: userName,
      type: 'sandbox',
    };
  };
}
