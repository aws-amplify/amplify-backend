// import https from 'https';
import isCI from 'is-ci';
import os from 'os';
import http from 'http';
import { v4 as uuid } from 'uuid';
import { Dependency } from "@aws-amplify/plugin-types";
import { TelemetryDataEmitter } from "./telemetry_data_emitter_factory";
import { ErrorDetails, LatencyDetails, TelemetryData, TelemetryEventState } from './telemetry_data';
import { AmplifyError } from '../errors';
import { getLocalProjectId } from './get_local_project_id';
import { latestPayloadVersion } from './constants';
import { RegionFetcher } from './region_fetcher';
import { SerializableError } from './serializable_error';
import { AccountIdFetcher } from './account_id_fetcher';
import { getUrl } from './get_telemetry_data_url';

/**
 *
 */
export class DefaultTelemetryDataEmitter implements TelemetryDataEmitter {
  private dependenciesToReport?: Array<Dependency>;
  
  /**
   * Constructor for TelemetryDataEmitter
   */
  constructor(
    private readonly dependencies?: Array<Dependency>,
    private readonly sessionUuid = uuid(),
    private readonly url = getUrl(),
    private readonly accountIdFetcher = new AccountIdFetcher(),
    private readonly regionFetcher = new RegionFetcher(),
  ) {
    const targetDependencies = [
      '@aws-amplify/ai-constructs',
      '@aws-amplify/auth-construct',
      '@aws-amplify/backend',
      '@aws-amplify/backend-ai',
      '@aws-amplify/backend-auth',
      '@aws-amplify/backend-cli',
      '@aws-amplify/backend-data',
      '@aws-amplify/backend-deployer',
      '@aws-amplify/backend-function',
      '@aws-amplify/backend-output-schemas',
      '@aws-amplify/backend-output-storage',
      '@aws-amplify/backend-secret',
      '@aws-amplify/backend-storage',
      '@aws-amplify/cli-core',
      '@aws-amplify/client-config',
      '@aws-amplify/deployed-backend-client',
      '@aws-amplify/form-generator',
      '@aws-amplify/model-generator',
      '@aws-amplify/platform-core',
      '@aws-amplify/plugin-types',
      '@aws-amplify/sandbox',
      '@aws-amplify/schema-generator',
      'aws-cdk',
      'aws-cdk-lib',
    ];

    this.dependenciesToReport = this.dependencies?.filter(dependency => targetDependencies.includes(dependency.name));
  }

  emitSuccess = async (
    metrics?: Record<string, number>,
    dimensions?: Record<string, string>,
  ) => {
    try {
      const data = await this.getTelemetryData({
        state: TelemetryEventState.SUCCEEDED,
        metrics,
        dimensions,
      });
      console.log(JSON.stringify(data, null, 2));
      await this.send(data);
      // eslint-disable-next-line amplify-backend-rules/no-empty-catch
    } catch {
      // Don't propagate errors related to not being able to send telemetry
    }
  };

  emitFailure = async (
    error: AmplifyError,
    metrics?: Record<string, number>,
    dimensions?: Record<string, string>,
  ) => {
    try {
      const data = await this.getTelemetryData({
        state: TelemetryEventState.FAILED,
        error,
        metrics,
        dimensions,
      });
      console.log(JSON.stringify(data, null, 2));
      await this.send(data);
      // eslint-disable-next-line amplify-backend-rules/no-empty-catch
    } catch {
      // Don't propagate errors related to not being able to send telemetry
    }
  };

  emitAbortion = async (
    metrics?: Record<string, number>,
    dimensions?: Record<string, string>,
  ) => {
    try {
      const data = await this.getTelemetryData({
        state: TelemetryEventState.ABORTED,
        metrics,
        dimensions,
      });
      console.log(JSON.stringify(data, null, 2));
      await this.send(data);
      // eslint-disable-next-line amplify-backend-rules/no-empty-catch
    } catch {
      // Don't propagate errors related to not being able to send telemetry
    }
  };

  private getTelemetryData = async (options: {
    state: TelemetryEventState,
    metrics?: Record<string, number>,
    dimensions?: Record<string, string>,
    error?: AmplifyError,
  }): Promise<TelemetryData> => {
    return {
      identifiers: {
        payloadVersion: latestPayloadVersion,
        sessionUuid: this.sessionUuid,
        eventId: uuid(),
        timestamp: new Date().toISOString(),
        localProjectId: await getLocalProjectId(),
        accountId: await this.accountIdFetcher.fetch(),
        awsRegion: await this.regionFetcher.fetch(),
      },
      event: {
        state: options.state,
        command: this.translateDimensionsToCommandData(options.dimensions),
      },
      environment: {
        os: {
          platform: os.platform(),
          release: os.release(),
        },
        shell: os.userInfo().shell ?? '',
        npmUserAgent: process.env.npm_config_user_agent ?? '',
        ci: isCI,
        memory: {
          /* eslint-disable spellcheck/spell-checker */
          total: os.totalmem(),
          free: os.freemem(),
          /* eslint-enable spellcheck/spell-checker */
        },
      },
      project: {
        dependencies: this.dependenciesToReport,
      },
      latency: this.translateMetricsToLatencyData(options.metrics, options.dimensions),
      error: this.translateAmplifyErrorToErrorData(options.error),
    };
  };

  private send = (data: TelemetryData) => {
      return new Promise<void>((resolve) => {
        const payload: string = JSON.stringify(data);
        const req = http.request({ // rotp TODO: change this back to https
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

  private translateDimensionsToCommandData = (
    dimensions?: Record<string, string>
  ) => {
    let path = '';
    let parameters = '';
    if (dimensions) {
      for (const [name, data] of Object.entries(dimensions)) {
        if (name === 'subCommands') {
          path = data;
        }
        if (name === 'options') {
          parameters = data;
        }
      }
    }

    return { path: path.split(' '), parameters: parameters.split(' ') };
  };

  private translateAmplifyErrorToErrorData = (
    error?: Error,
  ): ErrorDetails | undefined => {
    if (!error) {
      return undefined;
    }
    let currentError: Error | undefined = error;
    let errorDetails: ErrorDetails | undefined;

    try {
      while (currentError) {
        const serializedError = new SerializableError(currentError);
        const errorDetail: ErrorDetails = {
          name: serializedError.name,
          message: serializedError.message,
          stack: serializedError.stack ?? '',
        };
  
        if (errorDetails) {
          // this reverses the nesting so lowest level error is the top level error in our telemetry
          errorDetail.cause = errorDetails;
        }
  
        errorDetails = errorDetail;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        currentError = (currentError as any).cause;
      }
    } catch {
      // Don't propogate errors related to not being able to translate to error data, return what was collected
      return errorDetails;
    }

    return errorDetails;
  };

  private translateMetricsToLatencyData = (
    metrics?: Record<string, number>,
    dimensions?: Record<string, string>,
  ): LatencyDetails => {
    const isSandboxEvent = dimensions ? dimensions.subCommands.includes('SandboxEvent') : false;
    let total = 0;
    let init;
    let synthesis;
    let deployment;
    let hotSwap;

    if (metrics) {
      // go through metrics, convert from seconds to milliseconds if from sandbox event and truncate decimals
      for (const [name, data] of Object.entries(metrics)) {
        if (name === 'totalTime') {
          total = isSandboxEvent && !isNaN(data) ? Math.trunc(data * 1000) : data;
        }
        if (name === 'initTime') {
          init = isSandboxEvent && !isNaN(data) ? Math.trunc(data * 1000) : data;
        }
        if (name === 'synthesisTime') {
          synthesis = isSandboxEvent && !isNaN(data) ? Math.trunc(data * 1000) : data;
        }
        if (name === 'deploymentTime') {
          deployment = isSandboxEvent && !isNaN(data) ? Math.trunc(data * 1000) : data;
        }
        if (name === 'hotSwapTime') {
          hotSwap = isSandboxEvent && !isNaN(data) ? Math.trunc(data * 1000) : data;
        }
      }
    }

    return {
      total,
      init,
      synthesis,
      deployment,
      hotSwap,
    };
  };
}