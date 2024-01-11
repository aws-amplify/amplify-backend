import yargs from 'yargs';
import * as process from 'process';

export const processArguments = await yargs(process.argv.slice(2)).options({
  'cdk-version': {
    type: 'string',
    default: '^2',
  },
  debug: {
    type: 'boolean',
    default: false,
  },
}).argv;
