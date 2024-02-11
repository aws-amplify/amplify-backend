// This is a terrible, horrible, no good, very bad hack to invoke the SSM parameter resolution code into the lambda function
// If we need to put anything else here, and I mean ANYTHING, then we need a different strategy

// we can't type check this file because we can't import the internalAmplifyFunctionResolveSsmParams symbol without creating a duplicate symbol in the bundled lambda code
// eslint-disable-next-line @typescript-eslint/ban-ts-comment, spellcheck/spell-checker
// @ts-nocheck
await internalAmplifyFunctionResolveSsmParams();

const SSM_PARAMETER_REFRESH_MS = 1000 * 60;

setInterval(() => {
  void internalAmplifyFunctionResolveSsmParams();
}, SSM_PARAMETER_REFRESH_MS);
