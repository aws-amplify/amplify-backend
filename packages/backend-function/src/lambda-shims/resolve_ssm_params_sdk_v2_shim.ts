import { internalAmplifyFunctionResolveSsmParams } from './resolve_ssm_params_sdk_v2.js';

// populate the ssm environment variables
await internalAmplifyFunctionResolveSsmParams();

const SSM_PARAMETER_REFRESH_MS = 1000 * 60; // 1 minute

// Schedule a refresh of the values.
// This ensures that values stabilize after deployment.
// And if a deployment is made that only affects SSM parameter values, this ensures those new values are picked up within the refresh rate
setInterval(() => {
  void internalAmplifyFunctionResolveSsmParams();
}, SSM_PARAMETER_REFRESH_MS);
