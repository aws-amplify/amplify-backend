import { GetParametersCommandOutput, SSM } from '@aws-sdk/client-ssm';

const resolveSsmParams = async (client?: SSM) => {
  const envPathObject: {
    [name: string]: {
      path: string;
      sharedPath?: string;
    };
  } = JSON.parse(process.env.AMPLIFY_SSM_ENV_CONFIG ?? '{}');
  const paths = Object.values(envPathObject).map((paths) => paths.path);

  if (paths.length === 0) {
    return;
  }

  let actualSsmClient: SSM;
  if (client) {
    actualSsmClient = client;
  } else {
    const ssmSdk = await import('@aws-sdk/client-ssm');
    actualSsmClient = new ssmSdk.SSM();
  }

  const chunkArray = <T>(array: T[], chunkSize: number): T[][] => {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  };

  const resolveSecrets = async (paths: string[]) => {
    const response = (
      await Promise.all(
        chunkArray(paths, 10).map(
          async (chunkedPaths) =>
            await actualSsmClient.getParameters({
              Names: chunkedPaths,
              WithDecryption: true,
            }),
        ),
      )
    ).reduce(
      (accumulator, res: GetParametersCommandOutput) => {
        accumulator.Parameters?.push(...(res.Parameters ?? []));
        accumulator.InvalidParameters?.push(...(res.InvalidParameters ?? []));
        return accumulator;
      },
      {
        Parameters: [],
        InvalidParameters: [],
      } as Partial<GetParametersCommandOutput>,
    );

    if (response.Parameters && response.Parameters.length > 0) {
      for (const parameter of response.Parameters) {
        if (parameter.Name) {
          const envKey = Object.keys(envPathObject).find(
            (key) =>
              envPathObject[key].sharedPath === parameter.Name ||
              envPathObject[key].path === parameter.Name,
          );
          if (envKey) {
            process.env[envKey] = parameter.Value;
          }
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

const ssmClient = new SSM();

export const handler = async () => {
  await resolveSsmParams(ssmClient);
  return {
    graphqlEndpoint: process.env.GRAPHQL_ENDPOINT,
    testSecret: process.env.TEST_SECRET,
  };
};
