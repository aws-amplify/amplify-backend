#!/usr/bin/env node
import { createMainParser } from './main_parser_factory.js';
import {
  attachUnhandledExceptionListeners,
  generateCommandFailureHandler,
} from './error_handler.js';
import { extractSubCommands } from './extract_sub_commands.js';
import {
  AmplifyFault,
  LatencyDetails,
  PackageJsonReader,
  TelemetryDataEmitterFactory,
  UsageDataEmitterFactory,
} from '@aws-amplify/platform-core';
import { fileURLToPath } from 'node:url';
import { verifyCommandName } from './verify_command_name.js';
import { hideBin } from 'yargs/helpers';
import { PackageManagerControllerFactory, format } from '@aws-amplify/cli-core';
import { NoticesRenderer } from './notices/notices_renderer.js';
import { extractCommandInfo } from './extract_command_info.js';

const startTime = Date.now();

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

const packageManagerController =
  new PackageManagerControllerFactory().getPackageManagerController();
const dependencies = await packageManagerController.tryGetDependencies();

const usageDataEmitter = await new UsageDataEmitterFactory().getInstance(
  libraryVersion,
  dependencies,
);

const telemetryDataEmitter =
  await new TelemetryDataEmitterFactory().getInstance(dependencies);

attachUnhandledExceptionListeners(usageDataEmitter, telemetryDataEmitter);

verifyCommandName();

const noticesRenderer = new NoticesRenderer(packageManagerController);
const parser = createMainParser(
  libraryVersion,
  noticesRenderer,
  telemetryDataEmitter,
);

const initTime = Date.now() - startTime;

// Below is a workaround in order to send data to telemetry when user force closes a prompt (e.g. with Ctrl+C)
const handleAbortion = async (code: number) => {
  const totalTime = Date.now() - startTime;
  const latencyDetails: LatencyDetails = {
    total: totalTime,
    init: initTime,
  };
  await telemetryDataEmitter.emitAbortion(
    latencyDetails,
    extractCommandInfo(parser),
  );
  process.exit(code);
};
process.on('beforeExit', (code) => void handleAbortion(code));

try {
  await parser.parseAsync(hideBin(process.argv));
  const totalTime = Date.now() - startTime;
  const latencyDetails: LatencyDetails = {
    total: totalTime,
    init: initTime,
  };
  const metricDimension: Record<string, string> = {};
  const subCommands = extractSubCommands(parser);

  if (subCommands) {
    metricDimension.command = subCommands;
  }

  await noticesRenderer.tryFindAndPrintApplicableNotices({
    event: 'postCommand',
  });
  await usageDataEmitter.emitSuccess({}, metricDimension);
  await telemetryDataEmitter.emitSuccess(
    latencyDetails,
    extractCommandInfo(parser),
  );
} catch (e) {
  if (e instanceof Error) {
    const totalTime = Date.now() - startTime;
    const latencyDetails: LatencyDetails = {
      total: totalTime,
      init: initTime,
    };
    const errorHandler = generateCommandFailureHandler(
      parser,
      usageDataEmitter,
      telemetryDataEmitter,
      latencyDetails,
    );
    await noticesRenderer.tryFindAndPrintApplicableNotices({
      event: 'postCommand',
      error: e,
    });
    await errorHandler(format.error(e), e);
  }
}
