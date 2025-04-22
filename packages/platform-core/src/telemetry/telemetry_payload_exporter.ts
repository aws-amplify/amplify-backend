import { ExportResult, ExportResultCode } from '@opentelemetry/core';
import { ReadableSpan } from '@opentelemetry/sdk-trace-base';
import https from 'https';
import isCI from 'is-ci';
import os from 'os';
import { v4 as uuidV4 } from 'uuid';
import { getUrl } from './get_telemetry_url';
import { TelemetryPayload, telemetryPayloadSchema } from './telemetry_payload';
import { latestPayloadVersion } from './constants';
import { getLocalProjectId } from './get_local_project_id';
import { AccountIdFetcher } from './account_id_fetcher';
import { RegionFetcher } from './region_fetcher';
import { Dependency } from '@aws-amplify/plugin-types';
import { TelemetryPayloadExporter } from './telemetry_payload_exporter_factory';

/**
 * Maps data from span to payload and sends the payload
 */
export class DefaultTelemetryPayloadExporter
  implements TelemetryPayloadExporter
{
  private isShutdown = false;
  private dependenciesToReport?: Array<Dependency>;

  /**
   * Constructor for DefaultTelemetryPayloadExporter
   */
  constructor(
    private readonly dependencies?: Array<Dependency>,
    private readonly payloadVersion = latestPayloadVersion,
    private readonly sessionId = uuidV4(),
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
      '@aws-amplify/seed',
      'aws-cdk',
      'aws-cdk-lib',
    ];

    this.dependenciesToReport = this.dependencies?.filter((dependency) =>
      targetDependencies.includes(dependency.name),
    );
  }

  export = async (
    spans: ReadableSpan[],
    resultCallback: (result: ExportResult) => void,
  ): Promise<void> => {
    if (this.isShutdown) {
      resultCallback({ code: ExportResultCode.FAILED });
      return;
    }

    try {
      await this.sendSpans(spans);
      resultCallback({ code: ExportResultCode.SUCCESS });
    } catch {
      resultCallback({ code: ExportResultCode.FAILED });
    }
  };

  shutdown = async (): Promise<void> => {
    this.isShutdown = true;
  };

  private sendSpans = async (spans: ReadableSpan[]) => {
    for (const span of spans) {
      try {
        const payload = await this.getTelemetryPayload(span);
        if (payload) {
          await this.send(payload);
        }
        // eslint-disable-next-line @aws-amplify/amplify-backend-rules/no-empty-catch
      } catch {
        // Don't propogate errors related to not being able to send telemetry
      }
    }
  };

  private getTelemetryPayload = async (
    span: ReadableSpan,
  ): Promise<TelemetryPayload | undefined> => {
    try {
      const unflattened = this.unflattenSpanAttributes(span.attributes);

      const payload: TelemetryPayload = telemetryPayloadSchema.parse({
        identifiers: {
          payloadVersion: this.payloadVersion,
          sessionUuid: this.sessionId,
          eventId: uuidV4(),
          timestamp: new Date().toISOString(),
          localProjectId: await getLocalProjectId(),
          accountId: await this.accountIdFetcher.fetch(),
          awsRegion: await this.regionFetcher.fetch(),
        },
        event: unflattened.event,
        environment: {
          os: {
            platform: os.platform(),
            release: os.release(),
          },
          shell: os.userInfo().shell ?? '',
          npmUserAgent: process.env.npm_config_user_agent ?? '',
          ci: isCI,
          memory: {
            total: os.totalmem(),
            free: os.freemem(),
          },
        },
        project: {
          dependencies: this.dependenciesToReport,
        },
        latency: unflattened.latency,
        error: unflattened.error,
      });
      return payload;
    } catch {
      // Don't propogate errors related to not being able to get telemetry payload
      return;
    }
  };

  // Helper to unflatten dot notation span attributes into telemetry payload
  private unflattenSpanAttributes = (attributes: Record<string, unknown>) => {
    // Using any here is safe because we parse the result with telemetry schema
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: any = {};

    for (const [flatKey, value] of Object.entries(attributes)) {
      const keys = flatKey.split('.');
      let current = result;

      keys.forEach((key, i) => {
        const isLast = i === keys.length - 1;
        const isArrayIndex = /^\d+$/.test(key);
        const index = isArrayIndex ? Number(key) : key;

        if (isLast) {
          if (isArrayIndex) {
            if (!Array.isArray(current)) {
              current = [];
            }
            current[index] = value;
          } else {
            current[key] = value;
          }
        } else {
          const nextKey = keys[i + 1];
          const nextIsArrayIndex = /^\d+$/.test(nextKey);

          if (isArrayIndex) {
            if (!Array.isArray(current)) {
              current = [];
            }
            if (!current[index]) {
              current[index] = nextIsArrayIndex ? [] : {};
            }
            current = current[index];
          } else {
            if (!(key in current)) {
              current[key] = nextIsArrayIndex ? [] : {};
            }
            current = current[key];
          }
        }
      });
    }
    return result;
  };

  private send = (data: TelemetryPayload) => {
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
