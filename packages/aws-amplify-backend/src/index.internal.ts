/*
 Api-extractor does not ([yet](https://github.com/microsoft/rushstack/issues/1596)) support multiple package entry points
 Because this package has submodule exports, we are working around this issue by including that export here and directing api-extract to this entry point instead
 This allows api-extractor to pick up the submodule exports in its analysis
 */

export * from './index.js';
export * from './auth/index.js';
export * from './function/index.js';
export * from './graphql/index.js';
export * from './storage/index.js';
