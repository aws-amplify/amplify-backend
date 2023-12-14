import { Construct } from 'constructs';
import { ConstructFactory } from './construct_factory.js';
import { BackendSecretResolver } from './backend_secret_resolver.js';
import { ResourceProvider } from './resource_provider.js';

/**
 * Initializes a CDK Construct in a given scope
 */
export type ConstructContainerEntryGenerator<T extends object = object> = {
  /**
   * A group name for this generator.
   * This is used by the cache to determine which stack to place the generated construct in
   */
  resourceGroupName: string;

  /**
   * Create a new instance of a CDK construct in the provided scope.
   */
  generateContainerEntry: (
    scope: Construct,
    backendSecretResolver: BackendSecretResolver
  ) => ResourceProvider<T>;
};

/**
 * Vends Constructs based on an initializer function
 */
export type ConstructContainer = {
  getOrCompute: (
    generator: ConstructContainerEntryGenerator
  ) => ResourceProvider;
  registerConstructFactory: (token: string, provider: ConstructFactory) => void;
  getConstructFactory: <T extends ResourceProvider>(
    token: string
  ) => ConstructFactory<T> | undefined;
};
