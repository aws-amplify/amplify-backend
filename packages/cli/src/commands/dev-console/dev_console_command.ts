import { CommandModule } from 'yargs';
import express from 'express';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { Server } from 'socket.io';
import {
  WebConsolePrinter,
  askAI,
  embedAndStoreCode,
  format,
  minimumLogLevel,
} from '@aws-amplify/cli-core';
import {
  BackendLocator,
  PackageJsonReader,
  TagName,
} from '@aws-amplify/platform-core';
import {
  CloudWatchLogEventMonitor,
  LambdaFunctionLogStreamer,
  SandboxSingletonFactory,
} from '@aws-amplify/sandbox';
import { LocalNamespaceResolver } from '../../backend-identifier/local_namespace_resolver.js';
import { SDKProfileResolverProvider } from '../../sdk_profile_resolver_provider.js';
import { SandboxBackendIdResolver } from '../sandbox/sandbox_id_resolver.js';
import {
  BackendOutputClientFactory,
  DeployedBackendClientFactory,
} from '@aws-amplify/deployed-backend-client';
import { S3Client } from '@aws-sdk/client-s3';
import { AmplifyClient } from '@aws-sdk/client-amplify';
import { CloudFormationClient } from '@aws-sdk/client-cloudformation';
import {
  GetFunctionCommand,
  InvokeCommand,
  LambdaClient,
} from '@aws-sdk/client-lambda';
import { CloudWatchLogsClient } from '@aws-sdk/client-cloudwatch-logs';

/**
 * Root command to start dev console.
 */
export class DevConsoleCommand implements CommandModule<object> {
  /**
   * @inheritDoc
   */
  readonly command: string;

  /**
   * @inheritDoc
   */
  readonly describe: string;

  /**
   * Root command to configure Amplify.
   */
  constructor(private readonly lambdaClient = new LambdaClient()) {
    this.command = 'dev';
    this.describe = 'Starts a dev console command';
  }

  /**
   * @inheritDoc
   */
  handler = async (): Promise<void> => {
    const app = express();
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    const server = createServer(app);
    const io = new Server(server);

    app.get('/', (req, res) => {
      res.sendFile(
        join(dirname(fileURLToPath(import.meta.url)), 'console.html'),
      );
    });

    // Index all customer code (TBD in future, all amplify code)
    await embedAndStoreCode(dirname(new BackendLocator().locate()));

    const sandboxBackendIdPartsResolver = new SandboxBackendIdResolver(
      new LocalNamespaceResolver(new PackageJsonReader()),
    );

    const backendId = await sandboxBackendIdPartsResolver.resolve();

    const printer = new WebConsolePrinter(minimumLogLevel, io);
    const sandboxFactory = new SandboxSingletonFactory(
      sandboxBackendIdPartsResolver.resolve,
      new SDKProfileResolverProvider().resolve,
      printer,
      format,
    );

    const backendClient = new DeployedBackendClientFactory().getInstance({
      getS3Client: () => new S3Client(),
      getAmplifyClient: () => new AmplifyClient(),
      getCloudFormationClient: () => new CloudFormationClient(),
    });

    const functionStreamer = new LambdaFunctionLogStreamer(
      new LambdaClient(),
      new CloudWatchLogEventMonitor(new CloudWatchLogsClient(), printer),
      BackendOutputClientFactory.getInstance(),
      printer,
    );

    io.on('connection', (socket) => {
      socket.on('DeploymentCompleted', async () => {
        const data = await backendClient.getBackendMetadata(backendId);
        if (data.functionConfigurations) {
          data.functionConfigurations = await Promise.all(
            data.functionConfigurations.map(async (functionConfiguration) => {
              const getFunctionResponse = await this.lambdaClient.send(
                new GetFunctionCommand({
                  FunctionName: functionConfiguration.functionName,
                }),
              );
              return {
                ...functionConfiguration,
                friendlyName: getFunctionResponse.Tags?.[TagName.FRIENDLY_NAME],
              };
            }),
          );
        }

        io.emit('deployedBackendResources', data);
      });

      socket.on('startStreamingLogs', async (data) => {
        await functionStreamer.startStreamingLogs(backendId, {
          logsFilters: [data],
          enabled: true,
        });
      });

      socket.on('aiQuestion', async (data) => {
        const response = await askAI(data);
        printer.logMarkdown(response, 'AIMessage');
      });

      socket.on('executeFunction', async (data) => {
        const output = await this.lambdaClient.send(
          new InvokeCommand({
            FunctionName: data.functionName,
            LogType: 'None',
            InvocationType: 'RequestResponse',
            Payload: JSON.stringify(data.payload),
          }),
        );
        io.emit('functionExecutionResult', {
          functionName: data.functionName,
          output: output.Payload?.transformToString('utf-8'),
        });
      });
    });

    server.listen(3000, () => {
      // eslint-disable-next-line no-console
      console.log('server running at http://localhost:3000');
    });

    await new Promise((resolve) => {
      setTimeout(resolve, 2000);
    });

    const sandbox = await sandboxFactory.getInstance();
    await sandbox.start({});
    return;
  };
}
