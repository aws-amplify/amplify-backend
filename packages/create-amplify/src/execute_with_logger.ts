import { execa as _execa } from 'execa';
import { logger } from './logger.js';

/**
 * Abstracts the execution of a command and pipes outputs/errors to `logger.debug`
 */
export const executeWithDebugLogger = async (
  executable: string,
  args?: string[],
  execa = _execa
) => {
  try {
    const childProcess = execa(file, args, {
      stdin: 'inherit',
      cwd: process.cwd(),
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
