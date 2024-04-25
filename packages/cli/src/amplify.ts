#!/usr/bin/env node

import { hideBin } from 'yargs/helpers';
import { createMainParser } from './main_parser_factory.js';
import { attachUnhandledExceptionListeners } from './error_handler.js';
import { extractSubCommands } from './extract_subcommands.js';
import {
  AmplifyFault,
  PackageJsonReader,
  UsageDataEmitterFactory,
} from '@aws-amplify/platform-core';
import { fileURLToPath } from 'node:url';

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

const parser = createMainParser(libraryVersion, usageDataEmitter);
await parser.parseAsync(hideBin(process.argv));

try {
  await usageDataEmitter.emitSuccess(
    {},
    { command: extractSubCommands(parser) }
  );
  // eslint-disable-next-line amplify-backend-rules/no-empty-catch
} catch (e) {
  /* empty */
}
