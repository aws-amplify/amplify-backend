import { execa as _execa } from 'execa';
import { logger } from './logger.js';

/**
 * Abstracts the execution of a command and pipes outputs/errors to `logger.debug`
 */
export const executeWithLogger = async (
  execa = _execa,
  projectRoot: string,
  file: string,
  args?: string[]
) => {
  try {
    const childProcess = execa(file, args, {
      stdin: 'inherit',
      cwd: projectRoot,
    });

    childProcess?.stdout?.on('data', (data) => logger.debug(data));
    childProcess?.stderr?.on('data', (data) => logger.debug(data));

    await childProcess;
  } catch {
    throw new Error(
      `\`${file}${
        args ? ' ' + args.join(' ') : ''
      }\` did not exit successfully.`
    );
  }
};
