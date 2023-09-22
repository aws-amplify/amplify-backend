import { z } from 'zod';

export const AwsAppsyncAuthenticationZodEnum = z.enum([
  'API_KEY',
  'AWS_LAMBDA',
  'AWS_IAM',
  'OPENID_CONNECT',
  'AMAZON_COGNITO_USER_POOLS',
]);
export type AwsAppsyncAuthenticationType = z.infer<
  typeof AwsAppsyncAuthenticationZodEnum
>;

export const graphqlOutputSchema = z.object({
  version: z.literal('1'),
  payload: z.object({
    awsAppsyncRegion: z.string(),
    awsAppsyncApiEndpoint: z.string(),
    awsAppsyncAuthenticationType: AwsAppsyncAuthenticationZodEnum,
    awsAppsyncApiKey: z.string().optional(),
    awsAppsyncApiId: z.string(),
    amplifyApiModelSchemaS3Uri: z.string(),
  }),
});
