import { LogLevel } from '../printer/printer.js';
import { ExecaMethod, execa as _execa } from 'execa';
import { printer } from '../printer.js';
import { ExecaOptions } from '@aws-amplify/plugin-types';

/**
 * Abstracts the execution of a command and pipes outputs/errors to `Printer.debug`
 */
export const executeWithDebugLogger = (
  cwd: string,
  executable: string,
  args?: Readonly<string[]>,
  execa = _execa,
  options?: ExecaOptions,
): ReturnType<ExecaMethod> => {
  try {
    const childProcess = execa(executable, args, {
      stdin: 'inherit',
      cwd,
      ...options,
    });

    childProcess?.stdout?.on('data', (data: string) =>
      printer.log(data, LogLevel.DEBUG),
    );
    childProcess?.stderr?.on('data', (data: string) =>
      printer.log(data, LogLevel.DEBUG),
    );

    return childProcess;
  } catch (err) {
    throw new Error(
      `\`${executable}${
        args ? ' ' + args.join(' ') : ''
      }\` did not exit successfully. Rerun with --debug for more information.`,
      { cause: err },
    );
  }
};
