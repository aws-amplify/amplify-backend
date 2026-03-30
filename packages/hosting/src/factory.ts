import * as path from 'path';
import { AmplifyUserError } from '@aws-amplify/platform-core';
import {
  ConstructContainerEntryGenerator,
  ConstructFactory,
  ConstructFactoryGetInstanceProps,
  ResourceProvider,
} from '@aws-amplify/plugin-types';
import { HostingProps, HostingResources } from './types.js';
import { AmplifyHostingGenerator } from './generator.js';

export type BackendHosting = ResourceProvider<HostingResources>;

/**
 * Extract the caller frame from a stack trace.
 * Skips internal frames (Error, constructor, defineHosting) to find the
 * user's call site — the location where defineHosting() was invoked.
 */
const getCallerFrame = (stack: string | undefined): string | undefined => {
  if (!stack) return undefined;
  const lines = stack.split('\n');
  // Skip frames from this file (factory.ts) to find the external caller
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('at ')) continue;
    if (trimmed.includes('factory.ts') || trimmed.includes('factory.js'))
      continue;
    return trimmed;
  }
  return undefined;
};

/**
 * Singleton factory for AmplifyHosting that can be used in Amplify project files.
 *
 * Exported for testing purpose only & should NOT be exported out of the package.
 */
export class AmplifyHostingFactory implements ConstructFactory<BackendHosting> {
  // Publicly writable for testing (reset between tests).
  static factoryCount = 0;
  static lastInstance: AmplifyHostingFactory | undefined;
  private static creationCallerFrame: string | undefined;

  readonly provides = 'HostingResources';

  private generator: ConstructContainerEntryGenerator;

  /**
   * Set the properties that will be used to initialize hosting.
   */
  constructor(
    private readonly props: HostingProps,
    private readonly importStack = new Error().stack,
  ) {
    if (AmplifyHostingFactory.factoryCount > 0) {
      const callerFrame = getCallerFrame(importStack);
      // Same call site = two-phase deploy re-evaluation via tsImport
      if (
        AmplifyHostingFactory.lastInstance &&
        AmplifyHostingFactory.creationCallerFrame === callerFrame
      ) {
        return AmplifyHostingFactory.lastInstance;
      }
      // Different call site = actual duplicate defineHosting() call
      throw new AmplifyUserError('MultipleSingletonResourcesError', {
        message:
          'Multiple `defineHosting` calls are not allowed within an Amplify backend',
        resolution: 'Remove all but one `defineHosting` call',
      });
    }
    AmplifyHostingFactory.factoryCount++;
    AmplifyHostingFactory.lastInstance = this;
    AmplifyHostingFactory.creationCallerFrame = getCallerFrame(importStack);
  }

  /**
   * Get a singleton instance of AmplifyHosting.
   */
  getInstance = (
    getInstanceProps: ConstructFactoryGetInstanceProps,
  ): BackendHosting => {
    const { constructContainer, importPathVerifier, resourceNameValidator } =
      getInstanceProps;
    importPathVerifier?.verify(
      this.importStack,
      path.join('amplify', 'hosting', 'resource'),
      'Amplify Hosting must be defined in amplify/hosting/resource.ts',
    );
    if (this.props.name) {
      resourceNameValidator?.validate(this.props.name);
    }
    if (!this.generator) {
      this.generator = new AmplifyHostingGenerator(
        this.props,
        getInstanceProps,
      );
    }
    return constructContainer.getOrCompute(this.generator) as BackendHosting;
  };
}

/**
 * Provide the settings that will be used for frontend hosting.
 * @see https://docs.amplify.aws/hosting/
 */
export const defineHosting = (
  props: HostingProps = {},
): ConstructFactory<BackendHosting> =>
  new AmplifyHostingFactory(props, new Error().stack);
