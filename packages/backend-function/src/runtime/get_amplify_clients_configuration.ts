import { NamingConverter } from '@aws-amplify/platform-core';
import {
  GetObjectCommand,
  NoSuchKey,
  S3Client,
  S3ServiceException,
} from '@aws-sdk/client-s3';

const dataKeyNameContent = '_MODEL_INTROSPECTION_SCHEMA_KEY';
const dataBucketNameContent = '_MODEL_INTROSPECTION_SCHEMA_BUCKET_NAME';
const dataEndpointNameContent = '_GRAPHQL_ENDPOINT';

export type DataClientEnv = {
  /* eslint-disable @typescript-eslint/naming-convention */
  AWS_ACCESS_KEY_ID: string;
  AWS_SECRET_ACCESS_KEY: string;
  AWS_SESSION_TOKEN: string;
  AWS_REGION: string;
  AMPLIFY_DATA_DEFAULT_NAME: string;
  /* eslint-enable @typescript-eslint/naming-convention */
} & Record<string, unknown>;

type DataEnvExtension = {
  dataBucket: string;
  dataKey: string;
  dataEndpoint: string;
};

type ExtendedAmplifyClientEnv = DataClientEnv & DataEnvExtension;

const isAmplifyClientEnv = (env: object): env is DataClientEnv => {
  return (
    'AWS_ACCESS_KEY_ID' in env &&
    typeof env.AWS_ACCESS_KEY_ID === 'string' &&
    'AWS_SECRET_ACCESS_KEY' in env &&
    typeof env.AWS_SECRET_ACCESS_KEY === 'string' &&
    'AWS_SESSION_TOKEN' in env &&
    typeof env.AWS_SESSION_TOKEN === 'string' &&
    'AWS_REGION' in env &&
    typeof env.AWS_REGION === 'string' &&
    'AMPLIFY_DATA_DEFAULT_NAME' in env &&
    typeof env.AMPLIFY_DATA_DEFAULT_NAME === 'string'
  );
};

/* eslint-disable @typescript-eslint/naming-convention */
export type ResourceConfig = {
  API: {
    GraphQL: {
      endpoint: string;
      region: string;
      defaultAuthMode: 'iam';
      // Using `any` to avoid reproducing 100+ lines of typing to match the expected shape defined in aws-amplify:
      // https://github.com/aws-amplify/amplify-js/blob/main/packages/core/src/singleton/API/types.ts#L143-L153
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      modelIntrospection: any;
    };
  };
};
/* eslint-enable @typescript-eslint/naming-convention */

const getResourceConfig = (
  env: ExtendedAmplifyClientEnv,
  modelIntrospectionSchema: object
): ResourceConfig => {
  return {
    API: {
      GraphQL: {
        endpoint: env.dataEndpoint,
        region: env.AWS_REGION,
        defaultAuthMode: 'iam' as const,
        modelIntrospection: modelIntrospectionSchema,
      },
    },
  };
};

export type LibraryOptions = {
  /* eslint-disable-next-line @typescript-eslint/naming-convention */
  Auth: {
    credentialsProvider: {
      getCredentialsAndIdentityId: () => Promise<{
        credentials: {
          accessKeyId: string;
          secretAccessKey: string;
          sessionToken: string;
        };
      }>;
      clearCredentialsAndIdentityId: () => void;
    };
  };
};

const getLibraryOptions = (env: DataClientEnv): LibraryOptions => {
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

export type InvalidConfig = unknown & {
  invalidType: 'Some of the AWS environment variables needed to configure Amplify are missing. Check the sandbox output for an error with resolution guidance.';
};

export type DataClientError = {
  resourceConfig: InvalidConfig;
  libraryOptions: InvalidConfig;
};

export type DataClientConfig = {
  resourceConfig: ResourceConfig;
  libraryOptions: LibraryOptions;
};

export type DataClientReturn<T> = T extends DataClientEnv
  ? DataClientConfig
  : DataClientError;

const extendEnv = (
  env: DataClientEnv & Record<string, unknown>,
  dataName: string
): ExtendedAmplifyClientEnv => {
  const bucketName = `${dataName}${dataBucketNameContent}`;
  const keyName = `${dataName}${dataKeyNameContent}`;
  const endpointName = `${dataName}${dataEndpointNameContent}`;
  if (
    !(
      bucketName in env &&
      keyName in env &&
      endpointName in env &&
      typeof env[bucketName] === 'string' &&
      typeof env[keyName] === 'string' &&
      typeof env[endpointName] === 'string'
    )
  ) {
    throw new Error(
      `The data environment variables are malformed. env=${JSON.stringify(env)}`
    );
  }

  const dataBucket = env[bucketName] as string;
  const dataKey = env[keyName] as string;
  const dataEndpoint = env[endpointName] as string;

  return {
    ...env,
    dataBucket,
    dataKey,
    dataEndpoint,
  };
};

/**
 * Generate the `resourceConfig` and `libraryOptions` need to configure
 * Amplify for the data client in a lambda.
 *
 * Your function needs to be granted resource access on your schema for this to work
 * `a.schema(...).authorization((allow) => [a.resource(myFunction)])`
 * @param env - The environment variables for the data client
 * @returns An object containing the `resourceConfig` and `libraryOptions`
 */
export const getAmplifyDataClientConfig = async <T>(
  env: T,
  s3Client?: S3Client
): Promise<DataClientReturn<T>> => {
  if (!s3Client) {
    s3Client = new S3Client();
  }
  if (env === null || typeof env !== 'object') {
    throw new Error(`Invalid environment variables: ${JSON.stringify(env)}`);
  }

  if (!isAmplifyClientEnv(env)) {
    return { resourceConfig: {}, libraryOptions: {} } as DataClientReturn<T>;
  }

  const dataName = new NamingConverter().toScreamingSnakeCase(
    env.AMPLIFY_DATA_DEFAULT_NAME
  );
  const extendedEnv = extendEnv(env, dataName);

  let modelIntrospectionSchema: object;

  try {
    const response = await s3Client.send(
      new GetObjectCommand({
        Bucket: extendedEnv.dataBucket,
        Key: extendedEnv.dataKey,
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

  const resourceConfig = getResourceConfig(
    extendedEnv,
    modelIntrospectionSchema
  );

  return { resourceConfig, libraryOptions } as DataClientReturn<T>;
};
