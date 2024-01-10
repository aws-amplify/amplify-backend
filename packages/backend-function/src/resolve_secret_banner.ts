/* The code in this line replaces placeholder text in environment variables for secrets with values fetched from SSM, this is a noop if there are no secrets */
import { SSM } from '@aws-sdk/client-ssm';
import type { AmplifySecretPaths } from './function_env_translator.js';

/**
 * The body of this function will be used to resolve secrets for Lambda functions
 */
export const internalAmplifyFunctionBannerResolveSecrets = async (
  client = new SSM()
) => {
  const envPathObject: AmplifySecretPaths = JSON.parse(
    process.env.AMPLIFY_SECRET_PATHS ?? '{}'
  );
  const paths = Object.keys(envPathObject);

  if (paths.length === 0) {
    return;
  }

  const resolveSecrets = async (paths: string[]) => {
    const response = await client.getParameters({
      Names: paths,
      WithDecryption: true,
    });

    if (response.Parameters && response.Parameters.length > 0) {
      for (const parameter of response.Parameters) {
        if (parameter.Name) {
          const envKey = Object.keys(envPathObject).find(
            (key) => envPathObject[key].sharedPath === parameter.Name
          );
          const envName = envKey
            ? envPathObject[envKey].name
            : envPathObject[parameter.Name]?.name;
          process.env[envName] = parameter.Value;
        }
      }
    }

    return response;
  };

  const response = await resolveSecrets(paths);

  const sharedPaths = (response?.InvalidParameters || [])
    .map((invalidParam) => envPathObject[invalidParam].sharedPath)
    .filter((sharedParam) => !!sharedParam);

  if (sharedPaths.length > 0) {
    await resolveSecrets(sharedPaths);
  }
};

await internalAmplifyFunctionBannerResolveSecrets();
