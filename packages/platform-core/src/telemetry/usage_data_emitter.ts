import { v4 as uuid } from 'uuid';
import { getAccountId } from './get_account_id.js';
import { DeploymentTimes, SerializableError, UsageData } from './usage_data.js';
import os from 'os';
import https from 'https';
import { getInstallationUuid } from './get_installation_id.js';
import { getLatestPayloadVersion } from './version_manager.js';
import { getUrl } from './get_usage_data_url.js';
import isCI from 'is-ci';

/**
 * Entry point for sending usage data metrics
 */
export class UsageDataEmitter {
  /**
   * Constructor for UsageDataEmitter
   */
  constructor(
    private readonly libraryVersion: string,
    private readonly sessionUuid = uuid(),
    private readonly url = getUrl()
  ) {}

  emitSuccess = async (
    command: string,
    deploymentTimes?: DeploymentTimes,
    hotswapped?: boolean
  ) => {
    const data = await this.getUsageData({
      state: 'SUCCEEDED',
      deploymentTimes,
      hotswapped,
      command
    });
    await this.send(data);
  };

  emitFailure = async (command: string, error: Error) => {
    const data = await this.getUsageData({ state: 'FAILED', error, command });
    await this.send(data);
  };

  private getUsageData = async (options: {
    state: string;
    command: string;
    error?: Error;
    deploymentTimes?: DeploymentTimes;
    hotswapped?: boolean;
  }) => {
    return {
      accountId: await getAccountId(),
      sessionUuid: this.sessionUuid,
      installationUuid: await getInstallationUuid(),
      amplifyCliVersion: this.libraryVersion,
      timestamp: new Date().toISOString(),
      error: options.error ? new SerializableError(options.error) : undefined,
      downstreamException:
        options.error &&
        options.error.cause &&
        options.error.cause instanceof Error
          ? new SerializableError(options.error.cause)
          : undefined,
      payloadVersion: getLatestPayloadVersion(),
      osPlatform: os.platform(),
      osRelease: os.release(),
      nodeVersion: process.versions.node,
      state: options.state,
      input: { command: options.command, plugin: 'Gen2' },
      codePathDurations: {
        totalDuration: options.deploymentTimes?.totalTime
          ? Math.round(options.deploymentTimes?.totalTime)
          : undefined,
        platformStartup: options.deploymentTimes?.synthesisTime
          ? Math.round(options.deploymentTimes?.synthesisTime)
          : undefined,
      },
      isCi: isCI,
    };
  };

  private send = (data: UsageData) => {
    return new Promise<void>((resolve) => {
      console.log(data);
      const payload: string = JSON.stringify(data);
      const req = https.request({
        hostname: this.url.hostname,
        port: this.url.port,
        path: this.url.path,
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'content-length': payload.length,
        },
      }, (res) => {
        res.on('data', console.log);
      });
      req.on('error', () => {
        /* noop */
      });
      req.setTimeout(2000, () => {
        // 2 seconds
        resolve();
      });

      req.write(payload);
      req.end(() => {
        resolve();
      });
    });
  };
}
