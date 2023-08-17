import { z } from 'zod';

const AwsAppsyncAuthenticationType = z.enum([
  'API_KEY',
  'AWS_LAMBDA',
  'AWS_IAM',
  'OPENID_CONNECT',
  'AMAZON_COGNITO_USER_POOLS',
]);
export type AwsAppsyncAuthenticationType = z.infer<
  typeof AwsAppsyncAuthenticationType
>;

export const graphqlOutputSchema = z.object({
  version: z.literal('1'),
  payload: z.object({
    awsAppsyncRegion: z.string(),
    awsAppsyncApiEndpoint: z.string(),
    awsAppsyncAuthenticationType: AwsAppsyncAuthenticationType,
    awsAppsyncApiKey: z.string().optional(),
    awsAppsyncApiId: z.string(),
  }),
});
