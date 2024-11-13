import {
  GetObjectCommand,
  NoSuchKey,
  S3Client,
  S3ServiceException,
} from '@aws-sdk/client-s3';

type DataClientEnv = {
  /* eslint-disable @typescript-eslint/naming-convention */
  AMPLIFY_DATA_GRAPHQL_ENDPOINT: string;
  AMPLIFY_DATA_MODEL_INTROSPECTION_SCHEMA_BUCKET_NAME: string;
  AMPLIFY_DATA_MODEL_INTROSPECTION_SCHEMA_KEY: string;
  AWS_ACCESS_KEY_ID: string;
  AWS_SECRET_ACCESS_KEY: string;
  AWS_SESSION_TOKEN: string;
  AWS_REGION: string;
  /* eslint-enable @typescript-eslint/naming-convention */
};

const isDataClientEnv = (env: unknown): env is DataClientEnv => {
  return (
    env !== null &&
    typeof env === 'object' &&
    'AMPLIFY_DATA_MODEL_INTROSPECTION_SCHEMA_BUCKET_NAME' in env &&
    'AMPLIFY_DATA_MODEL_INTROSPECTION_SCHEMA_KEY' in env &&
    'AWS_ACCESS_KEY_ID' in env &&
    'AWS_SECRET_ACCESS_KEY' in env &&
    'AWS_SESSION_TOKEN' in env &&
    'AWS_REGION' in env &&
    'AMPLIFY_DATA_GRAPHQL_ENDPOINT' in env &&
    typeof env.AMPLIFY_DATA_MODEL_INTROSPECTION_SCHEMA_BUCKET_NAME ===
      'string' &&
    typeof env.AMPLIFY_DATA_MODEL_INTROSPECTION_SCHEMA_KEY === 'string' &&
    typeof env.AWS_ACCESS_KEY_ID === 'string' &&
    typeof env.AWS_SECRET_ACCESS_KEY === 'string' &&
    typeof env.AWS_SESSION_TOKEN === 'string' &&
    typeof env.AWS_REGION === 'string' &&
    typeof env.AMPLIFY_DATA_GRAPHQL_ENDPOINT === 'string'
  );
};

const getResourceConfig = (
  env: DataClientEnv,
  modelIntrospectionSchema: object
) => {
  return {
    API: {
      GraphQL: {
        endpoint: env.AMPLIFY_DATA_GRAPHQL_ENDPOINT,
        region: env.AWS_REGION,
        defaultAuthMode: 'iam' as const,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        modelIntrospection: modelIntrospectionSchema as any,
      },
    },
  };
};

const getLibraryOptions = (env: DataClientEnv) => {
  return {
    Auth: {
      credentialsProvider: {
        getCredentialsAndIdentityId: async () => ({
          credentials: {
            accessKeyId: env.AWS_ACCESS_KEY_ID,
            secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
            sessionToken: env.AWS_SESSION_TOKEN,
          },
        }),
        clearCredentialsAndIdentityId: () => {
          /* noop */
        },
      },
    },
  };
};

type InvalidConfig = unknown & {
  invalidType: 'This function needs to be granted `authorization((allow) => [allow.resource(fcn)])` on the data schema.';
};

type DataClientError = {
  resourceConfig: InvalidConfig;
  libraryOptions: InvalidConfig;
};

type DataClientConfig = {
  resourceConfig: ReturnType<typeof getResourceConfig>;
  libraryOptions: ReturnType<typeof getLibraryOptions>;
};

type DataClientReturn<T> = T extends DataClientEnv
  ? DataClientConfig
  : DataClientError;

/**
 * Generate the `resourceConfig` and `libraryOptions` need to configure
 * Amplify for the data client in a lambda.
 *
 * Your function needs to be granted resource access on your schema for this to work
 * `a.schema(...).authorization((allow) => [a.resource(myFunction)])`
 * @param env - The environment variables for the data client
 * @returns An object containing the `resourceConfig` and `libraryOptions`
 */
export const getAmplifyClientsConfiguration = async <T>(
  env: T
): Promise<DataClientReturn<T>> => {
  const s3Client = new S3Client();
  return getAmplifyClientsConfigurationRetriever(env, s3Client);
};

/**
 * The implementation of `getAmplifyClientsConfiguration` that allows you to pass in an S3 client for testing purposes
 * @param env - The environment variables for the data client
 * @param s3Client - The S3 client to use for retrieving the schema
 * @returns An object containing the `resourceConfig` and `libraryOptions`
 */
export const getAmplifyClientsConfigurationRetriever = async <T>(
  env: T,
  s3Client: S3Client
): Promise<DataClientReturn<T>> => {
  if (!isDataClientEnv(env)) {
    // TEST
    return { resourceConfig: {}, libraryOptions: {} } as DataClientReturn<T>;
  }
  let modelIntrospectionSchema: object;

  try {
    const response = await s3Client.send(
      new GetObjectCommand({
        Bucket: env.AMPLIFY_DATA_MODEL_INTROSPECTION_SCHEMA_BUCKET_NAME,
        Key: env.AMPLIFY_DATA_MODEL_INTROSPECTION_SCHEMA_KEY,
      })
    );
    const modelIntrospectionSchemaJson =
      await response.Body?.transformToString();
    modelIntrospectionSchema = JSON.parse(modelIntrospectionSchemaJson ?? '{}');
  } catch (caught) {
    if (caught instanceof NoSuchKey) {
      throw new Error(
        'Error retrieving the schema from S3. Please confirm that your project has a `defineData` included in the `defineBackend` definition.'
      );
    } else if (caught instanceof S3ServiceException) {
      throw new Error(
        `Error retrieving the schema from S3. You may need to grant this function authorization on the schema. ${caught.name}: ${caught.message}.`
      );
    } else {
      throw caught;
    }
  }

  const libraryOptions = getLibraryOptions(env);

  const resourceConfig = getResourceConfig(env, modelIntrospectionSchema);

  return { resourceConfig, libraryOptions } as DataClientReturn<T>;
};
