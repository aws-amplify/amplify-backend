import * as os from 'node:os';
import {
  blue,
  bold,
  cyan,
  dim,
  green,
  grey,
  red,
  underline,
} from 'kleur/colors';
import { AmplifyFault } from '@aws-amplify/platform-core';
import { getPackageManagerRunnerName } from '../package-manager-controller/get_package_manager_name.js';

/**
 * Formats various inputs into single string.
 */
export class Format {
  /**
   * Initialize with a package manager runner name. Defaults to attempting to load a value derived from environment variables.
   */
  constructor(
    private readonly packageManagerRunnerName = getPackageManagerRunnerName()
  ) {}
  normalizeBackendCommand = (command: string) => {
    if (command.length === 0) {
      throw new AmplifyFault('InvalidFormatFault', {
        message: 'The command must be non-empty',
      });
    }
    return cyan(`${this.packageManagerRunnerName} amplify ${command}`);
  };
  error = (message: string) => red(message);
  note = (message: string) => grey(message);
  command = (command: string) => cyan(command);
  highlight = (command: string) => cyan(command);
  success = (message: string) => green(message);
  sectionHeader = (header: string) => bold(blue(header));
  bold = (message: string) => bold(message);
  dim = (message: string) => dim(message);
  link = (link: string) => underline(blue(link));
  list = (lines: string[]) =>
    lines.map((line: string) => ` - ${line}`).join(os.EOL);
  indent = (message: string) => {
    if (message === '') {
      throw new Error('Message cannot be empty');
    }
    const spaces = '  '; // Two spaces for indentation
    return message
      .split(os.EOL)
      .map((line) => `${spaces}${line}`)
      .join(os.EOL);
  };
  record = (record: Record<string, string | number | Date>) =>
    Object.entries(record)
      .map(([key, value]) => `${key}: ${String(value)}`)
      .join(os.EOL);
}

export const format = new Format();
