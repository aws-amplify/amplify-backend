#!/usr/bin/env node

import { hideBin } from 'yargs/helpers';
import { createMainParser } from './main_parser_factory.js';
import { attachUnhandledExceptionListeners } from './error_handler.js';
import { verifyCommandName } from './verify_command_name.js';

attachUnhandledExceptionListeners();

verifyCommandName();

const parser = createMainParser();

await parser.parseAsync(hideBin(process.argv));
