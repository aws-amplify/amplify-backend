import * as os from 'node:os';
import { blue, bold, cyan, underline } from 'kleur/colors';

/**
 * Formats various inputs into single string.
 */
export const format = {
  runner: (binaryRunner: string) => ({
    amplifyCommand: (command: string) => {
      if (command === '') {
        throw new Error('Command cannot be empty');
      }
      return cyan(`${binaryRunner} amplify ${command}`);
    },
  }),
  sectionHeader: (header: string) => bold(blue(header)),
  link: (link: string) => underline(blue(link)),
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
