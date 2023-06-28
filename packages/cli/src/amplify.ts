#!/usr/bin/env node

import { hideBin } from 'yargs/helpers';
import * as process from 'process';
import { createMainParser } from './main_parser_factory.js';

const parser = createMainParser();

parser.parse(hideBin(process.argv));
