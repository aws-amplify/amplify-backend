#!/usr/bin/env node

import { hideBin } from 'yargs/helpers';
import { createMainParser } from './main_parser_factory.js';
import { attachUnhandledExceptionListeners } from './error_handler.js';
import {
  PackageJsonReader,
  UsageDataEmitterFactory,
} from '@aws-amplify/platform-core';
import { fileURLToPath } from 'node:url';

const packageJson = new PackageJsonReader().read(
  fileURLToPath(new URL('../package.json', import.meta.url))
);
const libraryVersion = packageJson.version ?? '';

const usageDataEmitter = await new UsageDataEmitterFactory().getInstance(
  libraryVersion
);

attachUnhandledExceptionListeners(usageDataEmitter);

const parser = createMainParser(usageDataEmitter);

await parser
  .parseAsync(hideBin(process.argv))
  .then(async (argv) =>
    usageDataEmitter.emitSuccess({}, { command: argv._.join(' ') })
  );
