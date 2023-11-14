import { v4 as uuid } from 'uuid';
import { AccountIdFetcher } from './account_id_fetcher.js';
import { DeploymentTimes, UsageData } from './usage_data.js';
import os from 'os';
import https from 'https';
import { getInstallationUuid } from './get_installation_id.js';
import { latestPayloadVersion } from './version_manager.js';
import { getUrl } from './get_usage_data_url.js';
import isCI from 'is-ci';
import { SerializableError } from './serializable_error.js';

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
    private readonly url = getUrl(),
    private readonly accountIdFetcher = new AccountIdFetcher()
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
      command,
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
      accountId: await this.accountIdFetcher.fetch(),
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
      payloadVersion: latestPayloadVersion,
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
