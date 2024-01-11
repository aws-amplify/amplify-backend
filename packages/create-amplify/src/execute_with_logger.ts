import { Printer } from '@aws-amplify/cli-core';
import { execa as _execa } from 'execa';

/**
 * Abstracts the execution of a command and pipes outputs/errors to `Printer.debug`
 */
export const executeWithDebugLogger = async (
  cwd: string,
  executable: string,
  args?: string[],
  execa = _execa
) => {
  try {
    const childProcess = execa(executable, args, {
      stdin: 'inherit',
      cwd,
    });

    childProcess?.stdout?.on('data', (data: string) => Printer.debug(data));
    childProcess?.stderr?.on('data', (data: string) => Printer.debug(data));

    await childProcess;
  } catch {
    throw new Error(
      `\`${executable}${
        args ? ' ' + args.join(' ') : ''
      }\` did not exit successfully. Rerun with --debug for more information.`
    );
  }
};
