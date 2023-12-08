/**
 * Provides reference to underlying CDK resources.
 *
 * Note: we have to use object as the generic construct rather than Record<string, unknown> so that interfaces will also satisfy the constraint
 * See: https://stackoverflow.com/questions/63617344/how-to-satisfy-the-constraint-of-recordstring-unknown-with-interface
 */
export type ResourceProvider<T extends object = object> = {
  resources: T;
};
