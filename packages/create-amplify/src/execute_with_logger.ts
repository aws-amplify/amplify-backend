import { execa as _execa } from 'execa';
import { logger } from './logger.js';

/**
 * Abstracts the execution of a command and pipes outputs/errors to `logger.debug`
 */
export const executeWithDebugLogger = async (
  cwd: string,
  executable: string,
  args?: string[] | Readonly<string[]>,
  execa = _execa
) => {
  try {
    const childProcess = execa(executable, args, {
      stdin: 'inherit',
      cwd,
    });

    childProcess?.stdout?.on('data', (data) => logger.debug(data));
    childProcess?.stderr?.on('data', (data) => logger.debug(data));

    await childProcess;
  } catch {
    throw new Error(
      `\`${executable}${
        args ? ' ' + args.join(' ') : ''
      }\` did not exit successfully. Rerun with --debug for more information.`
    );
  }
};
