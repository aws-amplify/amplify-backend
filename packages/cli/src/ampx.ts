#!/usr/bin/env node
import { createMainParser } from './main_parser_factory.js';
import {
  attachUnhandledExceptionListeners,
  generateCommandFailureHandler,
} from './error_handler.js';
import { extractSubCommands } from './extract_sub_commands.js';
import {
  AmplifyFault,
  PackageJsonReader,
  TelemetryDataEmitterFactory,
  UsageDataEmitterFactory,
} from '@aws-amplify/platform-core';
import { fileURLToPath } from 'node:url';
import { verifyCommandName } from './verify_command_name.js';
import { hideBin } from 'yargs/helpers';
import { PackageManagerControllerFactory, format } from '@aws-amplify/cli-core';
import { extractCommandInfo } from './extract_command_info.js';

const startTime = Date.now();

const packageJson = new PackageJsonReader().read(
  fileURLToPath(new URL('../package.json', import.meta.url))
);
const libraryVersion = packageJson.version;

if (libraryVersion == undefined) {
  throw new AmplifyFault('UnknownVersionFault', {
    message:
      'Library version cannot be determined. Check the library installation',
  });
}

const dependencies = await new PackageManagerControllerFactory()
  .getPackageManagerController()
  .tryGetDependencies();

const usageDataEmitter = await new UsageDataEmitterFactory().getInstance(
  libraryVersion,
  dependencies
);

const telemetryDataEmitter =
  await new TelemetryDataEmitterFactory().getInstance(dependencies);

attachUnhandledExceptionListeners(usageDataEmitter, telemetryDataEmitter);

verifyCommandName();

const parser = createMainParser(libraryVersion);

const initTime = Date.now() - startTime;

// Below is a workaround in order to send data to telemetry when user force closes a prompt (ie with Ctrl+C)
// without the counter we would send both success and abort data.
// Trying to do await telemetryDataEmitter.emitAbortion in errorHandler ends up with:
// Warning: Detected unsettled top-level await
let telemetryEmitCount = 0;
// eslint-disable-next-line @typescript-eslint/no-misused-promises
process.on('beforeExit', async (code) => {
  if (telemetryEmitCount !== 0) {
    process.exit(code);
  }
  const totalTime = Date.now() - startTime;
  await telemetryDataEmitter.emitAbortion(
    { totalTime, initTime },
    extractCommandInfo(parser)
  );
  process.exit(code);
});

try {
  await parser.parseAsync(hideBin(process.argv));
  const totalTime = Date.now() - startTime;
  const metricDimension: Record<string, string> = {};
  const subCommands = extractSubCommands(parser);

  if (subCommands) {
    metricDimension.command = subCommands;
  }

  await usageDataEmitter.emitSuccess({}, metricDimension);
  await telemetryDataEmitter.emitSuccess(
    { totalTime, initTime },
    extractCommandInfo(parser)
  );
  telemetryEmitCount++;
} catch (e) {
  if (e instanceof Error) {
    const totalTime = Date.now() - startTime;
    const errorHandler = generateCommandFailureHandler(
      parser,
      usageDataEmitter,
      telemetryDataEmitter,
      { totalTime, initTime }
    );
    await errorHandler(format.error(e), e);
  }
}
