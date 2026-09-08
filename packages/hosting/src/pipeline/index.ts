export {
  definePipeline,
  getStageConfig,
  withPipelineScope,
  findFile,
} from './pipeline_factory.js';
export { AmplifyPipelineConstruct } from './pipeline_construct.js';
export { DeployStage } from './deploy_stage.js';
export type { DeployStageProps } from './deploy_stage.js';
export type {
  BranchConfig,
  DefinePipelineProps,
  PipelineProps,
  PipelineSourceConfig,
  PipelineSynthConfig,
  PipelineStageConfig,
} from './types.js';

// Self-managed hosting secrets & config, re-exported so pipeline definitions can
// reference `secret('KEY')` / `config('KEY')` (e.g. `source.connectionArn`, a
// stage `config.domain`) without importing from a second entry point. Same
// markers and the same runtime `getSecret`/`getConfig` as `@aws-amplify/hosting`.
export {
  secret,
  config,
  getSecret,
  getConfig,
  isSecret,
  isConfig,
  isManagedValue,
} from '@aws-blocks/hosting';
export type {
  SecretValue,
  ConfigValue,
  ManagedValue,
  ManagedValueOptions,
  ValueKind,
  SecretStore,
} from '@aws-blocks/hosting';
