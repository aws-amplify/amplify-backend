import { SandboxBackendIdResolver } from '../commands/sandbox/sandbox_id_resolver.js';
import { BackendIdentifierResolver } from './backend_identifier_resolver.js';

/**
 * Resolves the backend id when branch or stack is passed as an arg, otherwise returns a sandbox backend identifier
 */
export class BackendIdentifierResolverWithFallback
  implements BackendIdentifierResolver
{
  /**
   * Accepts the sandbox id resolver as a parameter
   */
  constructor(
    private defaultResolver: BackendIdentifierResolver,
    private fallbackResolver: SandboxBackendIdResolver
  ) {}
  /**
   * resolves the backend id, falling back to the sandbox id if there is an error
   */
  public resolve = async (
    ...args: Parameters<BackendIdentifierResolver['resolve']>
  ) => {
    return (
      (await this.defaultResolver.resolve(...args)) ??
      (await this.fallbackResolver.resolve())
    );
  };
}
