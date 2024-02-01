import * as os from 'node:os';

/**
 * Formats various inputs into single string.
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
      .split(os.EOL)
      .map((line) => `${spaces}${line}`)
      .join(os.EOL);
  },
};
