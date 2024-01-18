#!/usr/bin/env node

import { hideBin } from 'yargs/helpers';
import { createMainParser } from './main_parser_factory.js';
import { attachUnhandledExceptionListeners } from './error_handler.js';

attachUnhandledExceptionListeners();

const parser = await createMainParser();

await parser.parseAsync(hideBin(process.argv));
