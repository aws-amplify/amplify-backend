// `HostingError` now lives in `@aws-blocks/hosting`. Re-exported here so the
// `@aws-amplify/hosting/error` subpath — and the local glue that throws it
// (e.g. build/runner.ts) — keep working against the shared implementation.
export { HostingError } from '@aws-blocks/hosting/error';
