// The hosting construct, adapters, manifest, and build defaults are re-exported
// from `@aws-blocks/hosting` (see the shims in ./constructs, ./adapters,
// ./types, ./hosting_error). This package tracks the latest version published to
// the public npm registry (^0.2.0).
//
// As of 0.2.0 the package `.` entry is the CDK-free value API
// (`secret`/`config`/`getSecret`/`getConfig`); the hosting/manifest types moved
// to the `./constructs` entry, so they are re-exported from there below.
export { BackendHosting, defineHosting, HostingResult } from './factory.js';
export type { FrameworkType, HostingProps, HostingResources } from './types.js';
export type {
  DeployManifest,
  RouteBehavior,
  ComputeResource,
  CacheConfig,
  ImageConfig,
  MiddlewareConfig,
  Redirect,
  Rewrite,
  CustomHeader,
} from '@aws-blocks/hosting/constructs';
export type {
  FrameworkAdapterFn,
  NextjsAdapterOptions,
} from './adapters/index.js';
export { HostingError } from './hosting_error.js';
export {
  AmplifyHostingConstruct,
  generateBuildId,
  generateBuildIdFunctionCode,
} from './constructs/hosting_construct.js';
export type {
  AmplifyHostingConstructProps,
  HostingDomainConfig,
  HostingWafConfig,
  SkewProtectionConfig,
} from './constructs/hosting_construct.js';
export { definePipeline, getStageConfig } from './pipeline/index.js';
export { AmplifyPipelineConstruct } from './pipeline/index.js';
export type {
  DefinePipelineProps,
  PipelineProps,
  PipelineSourceConfig,
  PipelineSynthConfig,
  PipelineStageConfig,
  BranchConfig,
} from './pipeline/types.js';
