import { CloudFormationClient } from '@aws-sdk/client-cloudformation';
import { AmplifyClient } from '@aws-sdk/client-amplify';
import * as fs from 'fs/promises';
import { BackendOutputClientFactory } from '@aws-amplify/deployed-backend-client';

const region = process.env.AWS_REGION;
const credentials = {
  accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? '',
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? '',
  sessionToken: process.env.AWS_SESSION_TOKEN ?? '',
};

const cloudFormationClient = new CloudFormationClient({
  region,
  credentials,
});

const amplifyClient = new AmplifyClient({
  region,
  credentials,
});

const backendOutputClient = BackendOutputClientFactory.getInstance({
  getAmplifyClient: () => amplifyClient,
  getCloudFormationClient: () => cloudFormationClient,
});

const backendIdentifier = process.env.backendIdentifier ?? '{}';
const outputs = await backendOutputClient.getOutput(
  JSON.parse(backendIdentifier)
);

await fs.writeFile('outputs.json', JSON.stringify(outputs));
