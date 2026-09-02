// The public hosting type contract (`HostingProps`, `HostingResources`,
// `FrameworkType`) now lives in `@aws-blocks/hosting/constructs`. Re-exported
// here so the local glue (factory.ts) and the package's public API keep
// importing it from `./types.js` while the definitions are owned by aws-blocks.
//
// As of `@aws-blocks/hosting` 0.2.0 the package `.` entry is the CDK-free value
// API (`secret`/`config`); the hosting/manifest types moved to the
// `./constructs` entry.
export type {
  FrameworkType,
  HostingProps,
  HostingResources,
} from '@aws-blocks/hosting/constructs';
