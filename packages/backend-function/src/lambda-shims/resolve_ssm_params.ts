/**
 * This code loads environment values from SSM and places them in their corresponding environment variables.
 * If there are no SSM environment values for this function, this is a noop.
 */
import type { SSM } from '@aws-sdk/client-ssm';
import type { SsmEnvVars } from '../function_env_translator.js';

/**
 * Reads SSM environment context from a known Amplify environment variable,
 * fetches values from SSM and places those values in the corresponding environment variables
 */
export const internalAmplifyFunctionResolveSsmParams = async (client?: SSM) => {
  const envPathObject: SsmEnvVars = JSON.parse(
    process.env.AMPLIFY_SSM_ENV_CONFIG ?? '{}'
  ); //these are the paths of the objects we are looking to reaolve
  const paths = Object.keys(envPathObject); //alters the DS of the paths so they are easier to match later on

  if (paths.length === 0) {
    return; //if there are no paths, we don't do anything
  }

  let actualSsmClient: SSM;
  if (client) {
    //if a client was passed to us, we assume the client
    actualSsmClient = client;
  } else {
    //otherwise to make a new client
    const ssmSdk = await import('@aws-sdk/client-ssm');
    actualSsmClient = new ssmSdk.SSM();
  }
  //up to here, I can probably just take and reuse for my thingy
  //here, onwards is going to be different
  const resolveSecrets = async (paths: string[]) => {
    //we take in the paths as an array of strings
    const response = await actualSsmClient.getParameters({
      Names: paths,
      WithDecryption: true,
    }); //get the paths the client knows about

    if (response.Parameters && response.Parameters.length > 0) {
      for (const parameter of response.Parameters) {
        //go through all the responses
        if (parameter.Name) {
          //if we have a name, try to find it in the envPathObjects
          const envKey = Object.keys(envPathObject).find(
            (key) => envPathObject[key].sharedPath === parameter.Name
          );
          const envName = envKey
            ? envPathObject[envKey].name
            : envPathObject[parameter.Name]?.name;
          process.env[envName] = parameter.Value; //set env var based on the object name we get
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
