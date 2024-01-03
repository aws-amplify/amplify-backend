#!/usr/bin/env node

import { hideBin } from 'yargs/helpers';
import { createMainParser } from './main_parser_factory.js';
import { handleError } from './error_handler.js';

const parser = createMainParser();

process.on('unhandledRejection', (reason) => {
  if (reason instanceof Error) {
    handleError(reason);
  } else if (typeof reason === 'string') {
    handleError(new Error(reason));
  } else {
    throw new Error(`Cannot handle rejection of type ${typeof reason}`);
  }
});

process.on('uncaughtException', (error) => {
  handleError(error);
});

await parser.parseAsync(hideBin(process.argv));
