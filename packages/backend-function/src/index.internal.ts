export * from './index.js';
// eslint-disable-next-line @typescript-eslint/naming-convention
import * as __export__runtime from './runtime/index.js';

/*
 Api-extractor does not ([yet](https://github.com/microsoft/rushstack/issues/1596)) support multiple package entry points
 Because this package has a submodule export, we are working around this issue by including that export here and directing api-extract to this entry point instead
 This allows api-extractor to pick up the submodule exports in its analysis
 */
export { __export__runtime };
