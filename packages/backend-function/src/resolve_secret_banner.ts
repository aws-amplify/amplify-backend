/* The code in this line replaces placeholder text in environment variables for secrets with values fetched from SSM, this is a noop if there are no secrets */
import { SSM } from '@aws-sdk/client-ssm';

/**
 * The body of this function will be used to resolve secrets for Lambda functions
 */
export const internalAmplifyFunctionBannerResolveSecrets = async (
  client?: SSM
) => {
  if (!client) {
    client = new SSM();
  }

  const envPathObj: Record<string, string> = JSON.parse(
    process.env.AMPLIFY_SECRET_PATHS ?? '{}'
  );
  const paths = Object.values(envPathObj);

  if (paths.length === 0) {
    return;
  }

  const response = await client.getParameters({
    Names: paths,
    WithDecryption: true,
  });
  if (response.Parameters && response.Parameters?.length > 0) {
    for (const parameter of response.Parameters) {
      for (const [env, path] of Object.entries(envPathObj)) {
        if (parameter.Name === path) {
          process.env[env] = parameter.Value;
        }
      }
    }
  }
};

await internalAmplifyFunctionBannerResolveSecrets();
