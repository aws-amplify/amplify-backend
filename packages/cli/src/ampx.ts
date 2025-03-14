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
  UsageDataEmitterFactory,
} from '@aws-amplify/platform-core';
import { fileURLToPath } from 'node:url';
import { verifyCommandName } from './verify_command_name.js';
import { hideBin } from 'yargs/helpers';
import { PackageManagerControllerFactory, format } from '@aws-amplify/cli-core';
import { NoticesRenderer } from './notices/notices_renderer.js';

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

attachUnhandledExceptionListeners(usageDataEmitter);

verifyCommandName();

const noticesRenderer = new NoticesRenderer(packageManagerController);
const parser = createMainParser(libraryVersion, noticesRenderer);
const errorHandler = generateCommandFailureHandler(parser, usageDataEmitter);

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
} catch (e) {
  if (e instanceof Error) {
    await noticesRenderer.tryFindAndPrintApplicableNotices({
      event: 'postCommand',
      error: e,
    });
    await errorHandler(format.error(e), e);
  }
}
