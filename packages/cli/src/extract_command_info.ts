import { Argv } from 'yargs';

/**
 * If the parser finished processing arguments, attempt to extract subcommand and option information
 */
export const extractCommandInfo = (yargs: Argv): { subCommands: string, options: string } | undefined => {
  if (!yargs.parsed) {
    return undefined;
  }

  const options: string[] = [];
  // keys that are in yargs.parsed.argv that we want to filter when getting options
  const ignoredArgvKeys = ['_', '$0'];
  const argv = yargs.parsed.argv;
  Object.keys(argv).filter(key => !ignoredArgvKeys.includes(key) && argv[key]).sort().forEach(option => options.push(option));

  return {
    subCommands: argv._.join(' '),
    options: options.join(' '),
  }
}