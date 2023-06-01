/**
 * data backend plugin
 */
declare module 'aws-amplify-backend/data' {
  export { a } from '@aws-amplify/type-beast';

  type ResourceConfig = {
    schema: import('@aws-amplify/type-beast').SchemaDefinition;
  };

  type ResourceDefinition = {
    // ... resolved resource definition
  };

  export function defineResource(config: ResourceConfig): ResourceDefinition;
}
