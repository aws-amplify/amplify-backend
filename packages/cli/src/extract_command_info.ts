import { TelemetryPayload } from '@aws-amplify/platform-core';
import { Argv } from 'yargs';
import { resolveKnownCommand } from './known_commands.js';

/**
 * If the parser finished processing arguments, attempt to extract path and parameters information.
 *
 * The path only contains known command names; unrecognized arguments are recorded as a placeholder.
 * The parameters only contain option names declared for the matched command.
 */
export const extractCommandInfo = (
  yargs: Argv,
): TelemetryPayload['event']['command'] | undefined => {
  if (!yargs.parsed) {
    return undefined;
  }
  const argv = yargs.parsed.argv;
  const { path, declaredOptions } = resolveKnownCommand(argv._);
  const parameters = Object.keys(argv)
    .filter((key) => declaredOptions.has(key) && argv[key])
    .sort();

  return {
    path,
    parameters,
  };
};
