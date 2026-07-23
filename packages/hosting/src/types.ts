// The public hosting type contract (`HostingProps`, `HostingResources`,
// `FrameworkType`) now lives in `@aws-blocks/hosting`. Re-exported here so the
// local glue (factory.ts) and the package's public API keep importing it from
// `./types.js` while the definitions are owned by aws-blocks.
export type {
  FrameworkType,
  HostingProps,
  HostingResources,
} from '@aws-blocks/hosting';
