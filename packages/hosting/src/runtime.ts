// CDK-free runtime entry for self-managed hosting values. SSR/route/Lambda code
// imports `getSecret` / `getConfig` from here (`@aws-amplify/hosting/runtime`)
// so the runtime bundle never pulls in `aws-cdk-lib` — the package `.` entry
// also exports `defineHosting` and the CDK constructs, which must not reach a
// server bundle. These are re-exported verbatim from `@aws-blocks/hosting`'s
// CDK-free value API.
export { getSecret, getConfig } from '@aws-blocks/hosting';
export type {
  SecretKey,
  ConfigKey,
  SecretValueOf,
  ConfigValueOf,
  HostingSecretRegistry,
  HostingConfigRegistry,
} from '@aws-blocks/hosting';
