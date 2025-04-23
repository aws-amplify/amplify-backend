#!/usr/bin/env node
import {
  Span,
  context as openTelemetryContext,
  trace as openTelemetryTrace,
} from '@opentelemetry/api';
import { AsyncLocalStorageContextManager } from '@opentelemetry/context-async-hooks';
import {
  BasicTracerProvider,
  SimpleSpanProcessor,
} from '@opentelemetry/sdk-trace-base';
import { createMainParser } from './main_parser_factory.js';
import {
  attachUnhandledExceptionListeners,
  generateCommandFailureHandler,
} from './error_handler.js';
import { extractSubCommands } from './extract_sub_commands.js';
import {
  AmplifyFault,
  PackageJsonReader,
  TelemetryPayload,
  TelemetryPayloadExporterFactory,
  UsageDataEmitterFactory,
  setSpanAttributes,
  translateErrorToTelemetryErrorDetails,
} from '@aws-amplify/platform-core';
import { fileURLToPath } from 'node:url';
import { verifyCommandName } from './verify_command_name.js';
import { hideBin } from 'yargs/helpers';
import { PackageManagerControllerFactory, format } from '@aws-amplify/cli-core';
import { NoticesRenderer } from './notices/notices_renderer.js';
import { extractCommandInfo } from './extract_command_info.js';
import { DeepPartial } from '@aws-amplify/plugin-types';

const packageManagerController =
  new PackageManagerControllerFactory().getPackageManagerController();
const dependencies = await packageManagerController.tryGetDependencies();

const packageJson = new PackageJsonReader().read(
  fileURLToPath(new URL('../package.json', import.meta.url)),
);
const libraryVersion = packageJson.version;

if (libraryVersion == undefined) {
  throw new AmplifyFault('UnknownVersionFault', {
    message:
      'Library version cannot be determined. Check the library installation',
  });
}

const usageDataEmitter = await new UsageDataEmitterFactory().getInstance(
  libraryVersion,
  dependencies,
);

attachUnhandledExceptionListeners(usageDataEmitter);

const contextManager = new AsyncLocalStorageContextManager();
openTelemetryContext.setGlobalContextManager(contextManager);

const telemetryPayloadExporter =
  await new TelemetryPayloadExporterFactory().getInstance(dependencies);

openTelemetryTrace.setGlobalTracerProvider(
  new BasicTracerProvider({
    spanProcessors: [new SimpleSpanProcessor(telemetryPayloadExporter)],
  }),
);

const tracer = openTelemetryTrace.getTracer('amplify-backend');

await tracer.startActiveSpan('command', async (span: Span) => {
  const startTime = Date.now();

  verifyCommandName();

  const noticesRenderer = new NoticesRenderer(packageManagerController);
  const parser = createMainParser(libraryVersion, noticesRenderer);
  const errorHandler = generateCommandFailureHandler(parser, usageDataEmitter);
  const initTime = Date.now() - startTime;

  // Below is a workaround in order to send telemetry data when user force closes a prompt (e.g. with Ctrl+C)
  const handleAbortion = async (code: number) => {
    const data: DeepPartial<TelemetryPayload> = {
      event: {
        state: 'ABORTED',
        command: extractCommandInfo(parser) ?? { path: [], parameters: [] },
      },
      latency: {
        total: Date.now() - startTime,
        init: initTime,
      },
    };
    setSpanAttributes(span, data);
    span.end();
    // wait a little to try to have span be exported before ending the process
    await new Promise((resolve) => setTimeout(resolve, 200));
    process.exit(code);
  };
  process.on('beforeExit', (code) => void handleAbortion(code));

  try {
    await parser.parseAsync(hideBin(process.argv));
    const metricDimension: Record<string, string> = {};
    const subCommands = extractSubCommands(parser);

    if (subCommands) {
      metricDimension.command = subCommands;
    }

    await noticesRenderer.tryFindAndPrintApplicableNotices({
      event: 'postCommand',
    });
    await usageDataEmitter.emitSuccess({}, metricDimension);
    const data: DeepPartial<TelemetryPayload> = {
      event: {
        state: 'SUCCEEDED',
        command: extractCommandInfo(parser) ?? { path: [], parameters: [] },
      },
      latency: {
        total: Date.now() - startTime,
        init: initTime,
      },
    };
    setSpanAttributes(span, data);
    span.end();
  } catch (e) {
    if (e instanceof Error) {
      const data: DeepPartial<TelemetryPayload> = {
        event: {
          state: 'FAILED',
          command: extractCommandInfo(parser) ?? { path: [], parameters: [] },
        },
        latency: {
          total: Date.now() - startTime,
          init: initTime,
        },
        error: translateErrorToTelemetryErrorDetails(e),
      };
      setSpanAttributes(span, data);
      await noticesRenderer.tryFindAndPrintApplicableNotices({
        event: 'postCommand',
        error: e,
      });
      span.end();
      // wait a little to try to have span be exported before handling error and ending the process
      await new Promise((resolve) => setTimeout(resolve, 200));
      await errorHandler(format.error(e), e);
    }
  }
});
