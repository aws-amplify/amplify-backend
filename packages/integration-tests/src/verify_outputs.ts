import { CloudFormationClient } from '@aws-sdk/client-cloudformation';
import { e2eToolingClientConfig } from './e2e_tooling_client_config.js';
import { AmplifyClient } from '@aws-sdk/client-amplify';
import * as fs from 'fs/promises';
import { BackendOutputClientFactory } from '@aws-amplify/deployed-backend-client';

const { region, credentials } = e2eToolingClientConfig;

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
