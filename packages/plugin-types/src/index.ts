export * from './backend_stack_creator.js';
export * from './backend_stack_resolver.js';
export * from './construct_container.js';
export * from './construct_factory.js';
export * from './output_retrieval_strategy.js';
export * from './output_storage_strategy.js';
export * from './auth_resources.js';
export * from './backend_output.js';
export * from './import_path_verifier.js';
export * from './resource_provider.js';
export * from './backend_secret_resolver.js';
export * from './function_resources.js';
export * from './amplify_function.js';
export * from './backend_identifier.js';
export * from './deployment_type.js';
export * from './resource_access_acceptor.js';
export * from './ssm_environment_entries_generator.js';
export * from './package_manager_controller.js';
export * from './deep_partial.js';
export * from './stable_backend_identifiers.js';
export * from './resource_name_validator.js';
export * from './aws_client_provider.js';

// This seems to work to dynamically type "seedable verticals" in defineSeed callback.
export type Seedable<T extends string> = {
  seedableAs: T;
};

// This attempt to smuggle schema type didn't work with compiler eventually throwing
// packages/backend-seed/src/index.ts:54:11 - error TS2589: Type instantiation is excessively deep and possibly infinite.
//
// 54         : V6Client<ClientSchema<TSchema>>;
//              ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//
// For this to work data-schema would also need to expose base types for ModelSchema typings.
export type SchemaSeedable<T extends string, TSchema> = Seedable<T> & {
  schema: TSchema;
};
