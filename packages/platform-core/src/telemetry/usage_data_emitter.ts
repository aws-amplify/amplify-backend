import { v4 as uuid } from 'uuid';
import { AccountIdFetcher } from './account_id_fetcher.js';
import { UsageData } from './usage_data.js';
import os from 'os';
import https from 'https';
import { getInstallationUuid } from './get_installation_id.js';
import { latestPayloadVersion } from './constants.js';
import { getUrl } from './get_usage_data_url.js';
import isCI from 'is-ci';
import { SerializableError } from './serializable_error.js';

/**
 * Entry point for sending usage data metrics
 */
export class DefaultUsageDataEmitter {
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
    metrics?: Record<string, number>,
    dimensions?: Record<string, string>
  ) => {
    const data = await this.getUsageData({
      state: 'SUCCEEDED',
      metrics,
      dimensions,
    });
    await this.send(data);
  };

  emitFailure = async (error: Error, dimensions?: Record<string, string>) => {
    const data = await this.getUsageData({
      state: 'FAILED',
      error,
      dimensions,
    });
    await this.send(data);
  };

  private getUsageData = async (options: {
    state: string;
    metrics?: Record<string, number>;
    dimensions?: Record<string, string>;
    error?: Error;
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
      codePathDurations: this.translateMetricsToUsageData(options.metrics),
      input: this.translateDimensionsToUsageData(options.dimensions),
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

  private translateMetricsToUsageData = (metrics?: Record<string, number>) => {
    if (!metrics) return {};
    let totalDuration, platformStartup;
    for (const [name, data] of Object.entries(metrics)) {
      if (name === 'totalTime') {
        totalDuration = Math.round(data);
      } else if (name === 'synthesisTime') {
        platformStartup = Math.round(data);
      }
    }
    return { totalDuration, platformStartup };
  };

  private translateDimensionsToUsageData = (
    dimensions?: Record<string, string>
  ) => {
    let command = '';
    if (dimensions) {
      for (const [name, data] of Object.entries(dimensions)) {
        if (name === 'command') {
          command = data;
        }
      }
    }
    return { command, plugin: 'Gen2' };
  };
}
