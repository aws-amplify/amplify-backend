import { internalAmplifyFunctionBannerResolveSsmParams } from './resolve_ssm_params.js';

// populate the ssm environment variables
await internalAmplifyFunctionBannerResolveSsmParams();

const SSM_PARAMETER_REFRESH_MS = 1000 * 60; /* 1 minute */

// Schedule a refresh of the values.
// This ensures that values stabilize after deployment.
// And if a deployment is made that only affects SSM parameter values, this ensures those new values are picked up within the refresh rate
setInterval(() => {
  void internalAmplifyFunctionBannerResolveSsmParams();
}, SSM_PARAMETER_REFRESH_MS);
