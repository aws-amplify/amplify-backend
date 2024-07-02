import { CloudFormationClient } from '@aws-sdk/client-cloudformation';
import { AmplifyClient } from '@aws-sdk/client-amplify';
import * as fs from 'fs/promises';
import { BackendOutputClientFactory } from '@aws-amplify/deployed-backend-client';

const outputsFile = new URL('./outputs.json', import.meta.url);

const e2eToolingClientConfig = JSON.parse(process.argv[2]);

const cloudFormationClient = new CloudFormationClient(e2eToolingClientConfig);

const amplifyClient = new AmplifyClient(e2eToolingClientConfig);

const backendOutputClient = BackendOutputClientFactory.getInstance({
  getAmplifyClient: () => amplifyClient,
  getCloudFormationClient: () => cloudFormationClient,
});

if (!process.env.backendIdentifier) {
  throw new Error('Unable to get backendIdentifier');
}
try {
  const outputs = await backendOutputClient.getOutput(
    JSON.parse(process.env.backendIdentifier)
  );

  await fs.writeFile(outputsFile, JSON.stringify(outputs, null, 2));
} catch (e) {
  const errorMessage = e instanceof Error ? e.message : '';
  throw new Error(`Failed to get backend outputs. ${errorMessage}`);
}
