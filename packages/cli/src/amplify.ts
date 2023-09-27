#!/usr/bin/env node --no-warnings

import { hideBin } from 'yargs/helpers';
import * as process from 'process';
import { createMainParser } from './main_parser_factory.js';

const parser = createMainParser();

await parser.parseAsync(hideBin(process.argv));
