import * as os from 'node:os';

/**
 * Provides formatting utilities.
 */
export const format = {
  list: (lines: string[]) =>
    lines.map((line: string) => ` - ${line}`).join(os.EOL),
  indent: (message: string, indentLevel: number) => {
    if (indentLevel < 0) {
      return message;
    }
    const spaces = ' '.repeat(indentLevel);
    return message
      .split('\n')
      .map((line) => `${spaces}${line}`)
      .join('\n');
  },
};
