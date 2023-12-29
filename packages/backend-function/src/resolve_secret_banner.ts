import { SSM } from '@aws-sdk/client-ssm';

// const ssmClient = new SSM();

/**
 * The body of this function will be used to resolve secrets for Lambda functions
 */
export const resolveSecretBanner = async (client: any = undefined) => {
  const envArray = process.env.SECRET_PATH_ENV_VARS?.split(',');
  // if (envArray) {
  //   const response = await client.getParameters({
  //     Names: envArray.map((a) => process.env[a] ?? ''),
  //     WithDecryption: true,
  //   });
  //   if (response.Parameters && response.Parameters?.length > 0) {
  //     for (const parameter of response.Parameters) {
  //       for (const envName of envArray) {
  //         if (parameter.Name === process.env[envName]) {
  //           process.env[envName.replace('_PATH', '')] = parameter.Value;
  //         }
  //       }
  //     }
  //   }
  // }
};

await resolveSecretBanner();
