/* The code in this line replaces placeholder text in environment variables for secrets with values fetched from SSM, this is a noop if there are no secrets */
import { SSM } from '@aws-sdk/client-ssm';

/**
 * The body of this function will be used to resolve secrets for Lambda functions
 */
export const internalAmplifyFunctionBannerResolveSecrets = async (
  client?: SSM
) => {
  const envPathObj: Record<string, string> = JSON.parse(
    process.env.AMPLIFY_SECRET_PATHS ?? '{}'
  );
  const sharedEnvPathObj: Record<string, string> = JSON.parse(
    process.env.AMPLIFY_SHARED_SECRET_PATHS ?? '{}'
  );
  const paths = Object.values(envPathObj);
  const sharedPaths = Object.values(sharedEnvPathObj);

  if (paths.length === 0 && sharedPaths.length === 0) {
    return;
  }

  const resolveSecrets = async (
    paths: string[],
    envPathObject: Record<string, string>
  ) => {
    if (!client) {
      client = new SSM();
    }

    const response = await client.getParameters({
      Names: paths,
      WithDecryption: true,
    });

    if (response.Parameters && response.Parameters.length > 0) {
      for (const parameter of response.Parameters) {
        for (const [env, path] of Object.entries(envPathObject)) {
          if (parameter.Name === path) {
            process.env[env] = parameter.Value;
          }
        }
      }
    }

    return response;
  };

  const response = await resolveSecrets(paths, envPathObj);

  if (response.InvalidParameters && response.InvalidParameters.length > 0) {
    const pathsToResolve: string[] = [];
    for (const invalidParameter of response.InvalidParameters) {
      const env = Object.keys(envPathObj).find(
        (env) => envPathObj[env] === invalidParameter
      );
      if (env) {
        pathsToResolve.push(sharedEnvPathObj[env]);
      }
    }
    await resolveSecrets(pathsToResolve, sharedEnvPathObj);
  }
};

await internalAmplifyFunctionBannerResolveSecrets();
