import { LogLevel } from '@aws-amplify/cli-core';
import { execa as _execa } from 'execa';
import { printer } from '../printer.js';

/**
 * Abstracts the execution of a command and pipes outputs/errors to `Printer.debug`
 */
export const executeWithDebugLogger = async (
  cwd: string,
  executable: string,
  args?: Readonly<string[]>,
  execa = _execa,
  options?: { env?: Record<string, string> }
) => {
  try {
    const childProcess = execa(executable, args, {
      stdin: 'inherit',
      cwd,
      ...options,
    });

    childProcess?.stdout?.on('data', (data: string) =>
      printer.log(data, LogLevel.DEBUG)
    );
    childProcess?.stderr?.on('data', (data: string) =>
      printer.log(data, LogLevel.DEBUG)
    );

    return await childProcess;
  } catch {
    throw new Error(
      `\`${executable}${
        args ? ' ' + args.join(' ') : ''
      }\` did not exit successfully. Rerun with --debug for more information.`
    );
  }
};
