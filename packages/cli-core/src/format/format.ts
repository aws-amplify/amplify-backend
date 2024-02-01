import * as os from 'node:os';

/**
 * Provides formatting utilities.
 */
export const format = {
  list: (lines: string[]) =>
    lines.map((line: string) => ` - ${line}`).join(os.EOL),
  indent: (message: string) => {
    if (message === '') {
      return '';
    }
    const spaces = '  '; // Two spaces for indentation
    return message
      .split('\n')
      .map((line) => `${spaces}${line}`)
      .join(os.EOL);
  },
};
