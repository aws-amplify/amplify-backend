import { Construct } from 'constructs';

/**
 * Functional interface for construct builders. All objects in the backend definition must implement this interface.
 */
export type ConstructBuilder<BuildResult extends Construct> = {
  build(scope: Construct, name: string): BuildResult;
};
