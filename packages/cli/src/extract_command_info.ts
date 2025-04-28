import { TelemetryPayload } from '@aws-amplify/platform-core';
import { Argv } from 'yargs';

/**
 * If the parser finished processing arguments, attempt to extract path and parameters information
 */
export const extractCommandInfo = (
  yargs: Argv,
): TelemetryPayload['event']['command'] | undefined => {
  if (!yargs.parsed) {
    return undefined;
  }
  const argv = yargs.parsed.argv;
  const path = argv._.map((arg) => arg.toString());
  const parameters: string[] = [];
  // keys that are in yargs.parsed.argv that we want to filter when getting parameters
  const ignoredArgvKeys = ['_', '$0'];
  Object.keys(argv)
    .filter((key) => !ignoredArgvKeys.includes(key) && argv[key])
    .sort()
    .forEach((option) => parameters.push(option));

  return {
    path: path,
    parameters: parameters,
  };
};
