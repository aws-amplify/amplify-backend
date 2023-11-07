import { SandboxBackendIdentifier } from '@aws-amplify/platform-core';
import { BackendIdentifierResolver } from '../../../backend-identifier/backend_identifier_resolver.js';
import { AppNameResolver } from '../../../backend-identifier/local_app_name_resolver.js';
import { SandboxIdResolver } from '../../sandbox/sandbox_id_resolver.js';

/**
 * Resolves the backend id when branch or stack is passed as an arg, otherwise returns a sandbox backend identifier
 */
export class BackendIdentifierResolverWithSandboxFallback extends BackendIdentifierResolver {
  /**
   * Accepts the sandbox id resolver as a parameter
   */
  constructor(
    appNameResolver: AppNameResolver,
    private sandboxIdResolver: SandboxIdResolver
  ) {
    super(appNameResolver);
  }
  /**
   * resolves the backend id, falling back to the sandbox id if there is an error
   */
  override resolve = async (args: {
    stack?: string | undefined;
    appId?: string | undefined;
    branch?: string | undefined;
  }) => {
    try {
      return await super.resolve(args);
    } catch (e) {
      return new SandboxBackendIdentifier(
        await this.sandboxIdResolver.resolve()
      );
    }
  };
}
