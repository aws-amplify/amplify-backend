export * from './amplify_stack.js';
export * from './nested_stack_resolver.js';
export * from './singleton_construct_container.js';
export * from './backend-output/stack_metadata_output_storage_strategy.js';

// If client config generation is pulled into its own package, this would be the export from that package
export { ClientConfig } from './client-config-generator/client_config_generator.js';
export * from './client-config-generator/generate_client_config.js';
