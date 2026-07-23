// The framework-agnostic L3 hosting construct now lives in
// `@aws-blocks/hosting`. This module re-exports it so
// `@aws-amplify/hosting/constructs` keeps its public API.
//
// The construct is re-exported under the historical `AmplifyHostingConstruct`
// /`AmplifyHostingConstructProps` names that Amplify consumers (and the
// vanilla-CDK integration tests) import, while the implementation is owned by
// aws-blocks.
export {
  HostingConstruct as AmplifyHostingConstruct,
  generateBuildId,
  generateBuildIdFunctionCode,
} from '@aws-blocks/hosting/constructs';
export type {
  HostingConstructProps as AmplifyHostingConstructProps,
  HostingDomainConfig,
  HostingWafConfig,
  SkewProtectionConfig,
} from '@aws-blocks/hosting/constructs';
