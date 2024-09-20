import { SandboxBackendIdResolver } from '../commands/sandbox/sandbox_id_resolver.js';
import {
  BackendIdentifierParameters,
  BackendIdentifierResolver,
} from './backend_identifier_resolver.js';

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
   * resolves to deployed backend id, falling back to the sandbox id if stack or appId and branch inputs are not provided
   */
  resolveDeployedBackendIdentifier = async (
    args: BackendIdentifierParameters
  ) => {
    if (args.stack || args.appId || args.branch) {
      return this.defaultResolver.resolveDeployedBackendIdentifier(args);
    }

    return this.fallbackResolver.resolve();
  };
  /**
   * Resolves deployed backend id to backend id, falling back to the sandbox id if stack or appId and branch inputs are not provided
   */
  resolveBackendIdentifier = async (args: BackendIdentifierParameters) => {
    if (args.stack || args.appId || args.branch) {
      return this.defaultResolver.resolveBackendIdentifier(args);
    }

    return this.fallbackResolver.resolve();
  };
}
