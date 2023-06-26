import { Construct } from 'constructs';
import { ConstructFactory } from './construct_factory.js';

/**
 * Initializes a CDK Construct in a given scope
 */
export type ConstructContainerEntryGenerator = {
  /**
   * A group name for this generator.
   * This is used by the cache to determine which stack to place the generated construct in
   */
  resourceGroupName: string;

  /**
   * Create a new instance of a CDK construct in the provided scope.
   */
  generateContainerEntry(scope: Construct): Construct;
};

/**
 * Vends Constructs based on an initializer function
 * TODO I'm not going to rename this type yet. Once we land on the approach here, I'll do the rename in a separate PR to avoid blowing up the diff
 */
export type ConstructContainer = {
  getOrCompute(generator: ConstructContainerEntryGenerator): Construct;
  registerConstructFactory(token: string, provider: ConstructFactory): void;
  getConstructFactory<T>(token: string): ConstructFactory<T>;
};
