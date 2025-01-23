import { userInfo as _userInfo } from 'os';
import { NamespaceResolver } from './namespace_resolver.js';
import { BackendIdentifier } from '@aws-amplify/plugin-types';

//not using this anymore
//stole this from ../packages/cli/src/commands/sandbox/sandbox_id_resolver.ts for the POC

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
