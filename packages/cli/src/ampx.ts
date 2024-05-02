#!/usr/bin/env node

import { hideBin } from 'yargs/helpers';
import { createMainParser } from './main_parser_factory.js';
import { attachUnhandledExceptionListeners } from './error_handler.js';
import { extractSubCommands } from './extract_sub_commands.js';
import {
  AmplifyFault,
  PackageJsonReader,
  UsageDataEmitterFactory,
} from '@aws-amplify/platform-core';
import { fileURLToPath } from 'node:url';
import { LogLevel, format, printer } from '@aws-amplify/cli-core';
import { verifyCommandName } from './verify_command_name.js';

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

const usageDataEmitter = await new UsageDataEmitterFactory().getInstance(
  libraryVersion
);

attachUnhandledExceptionListeners(usageDataEmitter);

verifyCommandName();

const parser = createMainParser(libraryVersion, usageDataEmitter);
await parser.parseAsync(hideBin(process.argv));

try {
  const metricDimension: Record<string, string> = {};
  const subCommands = extractSubCommands(parser);

  if (subCommands) {
    metricDimension.command = subCommands;
  }

  await usageDataEmitter.emitSuccess({}, metricDimension);
} catch (e) {
  if (e instanceof Error) {
    printer.log(format.error('Failed to emit usage metrics'), LogLevel.DEBUG);
    printer.log(format.error(e), LogLevel.DEBUG);
    if (e.stack) {
      printer.log(e.stack, LogLevel.DEBUG);
    }
  }
}
