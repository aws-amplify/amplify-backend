// The hosting construct, adapters, manifest, and build defaults are re-exported
// from `@aws-blocks/hosting` (see the shims in ./constructs, ./adapters,
// ./types, ./hosting_error). This package is pinned to the latest version
// published to the public npm registry (^0.1.1). The intended target is
// `^0.23.0`, which currently exists only in the internal mirror — bump the
// dependency in package.json once 0.23.0 is published to public npm (or once CI
// is configured with access to the internal registry).
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
} from '@aws-blocks/hosting';
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
