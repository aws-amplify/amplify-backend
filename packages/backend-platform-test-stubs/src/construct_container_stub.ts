import { StackResolver } from './stack_resolver_stub.js';
import {
  BackendIdentifier,
  ConstructContainer,
  ConstructContainerEntryGenerator,
  ConstructFactory,
  ResourceProvider,
} from '@aws-amplify/plugin-types';
import { BackendSecretResolverStub } from './backend_secret_resolver_stub.js';
import { SsmEnvironmentEntriesGeneratorStub } from './ssm_environment_entries_generator_stub.js';
import { BackendIdScopedStableBackendIdentifiers } from './stable_backend_identifiers_stub.js';

/**
 * Stub implementation of ConstructContainer. Currently, it is the same as the implementation in @aws-amplify/backend but this doesn't need to be the case moving forward
 */
export class ConstructContainerStub implements ConstructContainer {
  // uses the CacheEntryGenerator as the map key. The value is what the generator returned the first time it was seen
  private readonly providerCache: Map<
    ConstructContainerEntryGenerator,
    ResourceProvider
  > = new Map();

  private readonly providerFactoryTokenMap: Record<string, ConstructFactory> =
    {};

  /**
   * Initialize the BackendBuildState with a root stack
   */
  constructor(private readonly stackResolver: StackResolver) {}

  /**
   * If generator has been seen before, the cached Construct instance is returned
   * Otherwise, the generator is called and the value is cached and returned
   */
  getOrCompute = (
    generator: ConstructContainerEntryGenerator
  ): ResourceProvider => {
    if (!this.providerCache.has(generator)) {
      const scope = this.stackResolver.getStackFor(generator.resourceGroupName);
      const backendId = getBackendIdentifierStub();
      const backendSecretResolver = new BackendSecretResolverStub(
        scope,
        backendId
      );
      const ssmEnvironmentEntriesGenerator =
        new SsmEnvironmentEntriesGeneratorStub(scope);
      const stableBackendIdentifiers =
        new BackendIdScopedStableBackendIdentifiers(backendId);
      this.providerCache.set(
        generator,
        generator.generateContainerEntry({
          scope,
          backendSecretResolver,
          ssmEnvironmentEntriesGenerator,
          stableBackendIdentifiers,
        })
      );
    }
    // safe because we checked for existence above
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return this.providerCache.get(generator)!;
  };

  /**
   * Gets a ConstructFactory that has previously been registered to a given token.
   * Returns undefined if no construct factory is found for the specified token.
   *
   * NOTE: The return type of this function cannot be guaranteed at compile time because factories are dynamically registered at runtime
   * The return type of the factory is a contract that must be negotiated by the entity that registers a token and the entity that retrieves a token.
   *
   * By convention, tokens should be the name of type T
   */
  getConstructFactory = <T extends ResourceProvider>(
    token: string
  ): ConstructFactory<T> | undefined => {
    if (token in this.providerFactoryTokenMap) {
      return this.providerFactoryTokenMap[token] as ConstructFactory<T>;
    }
    return;
  };

  /**
   * Register a ConstructFactory to a specified token. This ConstructFactory can be retrieved later using getConstructFactory
   * Throws if the token is already registered to a different factory
   */
  registerConstructFactory = (
    token: string,
    provider: ConstructFactory
  ): void => {
    if (
      token in this.providerFactoryTokenMap &&
      this.providerFactoryTokenMap[token] !== provider
    ) {
      throw new Error(
        `Token ${token} is already registered to a ProviderFactory`
      );
    }
    this.providerFactoryTokenMap[token] = provider;
  };
}

const getBackendIdentifierStub = (): BackendIdentifier => ({
  namespace: 'testBackendId',
  name: 'testEnvName',
  type: 'branch',
});
