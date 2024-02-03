/**
 * This code loads environment values from SSM and places them in their corresponding environment variables.
 * If there are no SSM environment values for this function, this is a noop.
 *
 * We include the cjs shim here because it is required for the ssm shim to work both in the lambda and in tests
 */
// cjs shim
import { createRequire } from 'node:module';
import path from 'node:path';
import url from 'node:url';
global.require = createRequire(import.meta.url);
global.__filename = url.fileURLToPath(import.meta.url);
global.__dirname = path.dirname(__filename);

// type imports that will be erased from the bundle output
import type { SSM } from 'aws-sdk';
import type { SsmEnvVars } from '../function_env_translator.js';

// aws-sdk v2 does not play nice with normal ESM imports so we have to use require here
// eslint-disable-next-line @typescript-eslint/no-var-requires
const aws = require('aws-sdk');

/**
 * Reads SSM environment context from a known Amplify environment variable,
 * fetches values from SSM and places those values in the corresponding environment variables
 */
export const internalAmplifyFunctionResolveSsmParams = async (
  client = new aws.SSM() as SSM
) => {
  const envPathObject: SsmEnvVars = JSON.parse(
    process.env.AMPLIFY_SSM_ENV_CONFIG ?? '{}'
  );
  const paths = Object.keys(envPathObject);

  if (paths.length === 0) {
    return;
  }

  const resolveSecrets = async (paths: string[]) => {
    const response = await client
      .getParameters({
        Names: paths,
        WithDecryption: true,
      })
      .promise();

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
    .filter((sharedParam) => !!sharedParam) as string[]; // this assertion is safe because we are filtering out undefined

  if (sharedPaths.length > 0) {
    await resolveSecrets(sharedPaths);
  }
};
