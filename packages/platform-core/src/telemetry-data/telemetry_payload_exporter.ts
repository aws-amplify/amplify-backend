import { ExportResult, ExportResultCode } from '@opentelemetry/core';
import { ReadableSpan } from '@opentelemetry/sdk-trace-base';
import https from 'https';
import isCI from 'is-ci';
import os from 'os';
import { v4 as uuidV4 } from 'uuid';
import { getUrl } from './get_telemetry_url';
import {
  TelemetryPayload,
  errorSchema,
  eventSchema,
  latencySchema,
  projectSchema,
  telemetryPayloadSchema,
} from './telemetry_payload';
import { latestPayloadVersion } from './constants';
import { getLocalProjectId } from './get_local_project_id';
import { AccountIdFetcher } from './account_id_fetcher';
import { RegionFetcher } from './region_fetcher';

/**
 * Maps data from span to payload and sends the payload
 */
export class TelemetryPayloadExporter {
  private isShutdown = false;
  private readonly sessionId = uuidV4();
  private readonly url = getUrl();
  private readonly accountIdFetcher = new AccountIdFetcher();
  private readonly regionFetcher = new RegionFetcher();
  private readonly targetDependencies = [
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
      const localProjectId = await getLocalProjectId();
      const accountId = await this.accountIdFetcher.fetch();
      const awsRegion = await this.regionFetcher.fetch();
      const emptyProject: TelemetryPayload['project'] = {
        dependencies: undefined,
      };
      const emptyLatency: TelemetryPayload['latency'] = {
        total: 0,
      };

      const unflattened = this.unflattenAttributes(span.attributes);

      const parsedDependencies: TelemetryPayload['project']['dependencies'] =
        unflattened.project?.dependencies
          ? JSON.parse(unflattened.project.dependencies)
          : undefined;
      const dependenciesToReport = parsedDependencies
        ? parsedDependencies.filter((dependency) =>
            this.targetDependencies.includes(dependency.name),
          )
        : undefined;

      const parsedEvent = eventSchema.parse(unflattened.event);
      const parsedProject = dependenciesToReport
        ? projectSchema.parse({ dependencies: dependenciesToReport })
        : emptyProject;
      const parsedLatency = unflattened.latency
        ? latencySchema.parse(unflattened.latency)
        : emptyLatency;
      const parsedError = unflattened.error
        ? errorSchema.parse(unflattened.error)
        : undefined;

      const payload: TelemetryPayload = telemetryPayloadSchema.parse({
        identifiers: {
          payloadVersion: latestPayloadVersion,
          sessionUuid: this.sessionId,
          eventId: uuidV4(),
          timestamp: new Date().toISOString(),
          localProjectId: localProjectId,
          accountId: accountId,
          awsRegion: awsRegion,
        },
        event: parsedEvent,
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
        project: parsedProject,
        latency: parsedLatency,
        error: parsedError,
      });
      return payload;
    } catch {
      // Don't propogate errors related to not being able to get telemetry payload
      return;
    }
  };

  // Helper to unflatten dot notation keys into nested objects
  private unflattenAttributes = (attributes: Record<string, unknown>) => {
    // handle whatever values are in span attributes
    // later this is parsed with the telemetry zod schema
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: Record<string, any> = {};

    for (const [key, value] of Object.entries(attributes)) {
      const parts = key.split('.');
      let current = result;

      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];

        if (i === parts.length - 1) {
          current[part] = value;
        } else {
          current[part] = current[part] || {};
          current = current[part];
        }
      }
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
