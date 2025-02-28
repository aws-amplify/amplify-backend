import * as os from 'node:os';
import {
  Colorize,
  blue,
  bold,
  cyan,
  dim,
  green,
  grey,
  magenta,
  red,
  underline,
  yellow,
} from 'kleur/colors';
import { AmplifyError, AmplifyFault } from '@aws-amplify/platform-core';
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

  normalizeAmpxCommand = (command: string) => {
    if (command.length === 0) {
      throw new AmplifyFault('InvalidFormatFault', {
        message: 'The command must be non-empty',
      });
    }
    return this.cyan(`${this.packageManagerRunnerName} ampx ${command}`);
  };

  error = (error: string | Error | unknown): string => {
    if (error instanceof Error) {
      let message = `${this.red(this.bold(`[${error.name}]`))} ${
        error.message
      }`;

      if (typeof error?.cause === 'object' && !!error.cause) {
        message =
          message +
          this.indent(os.EOL + `Caused by: ${this.error(error.cause)}`);
      }

      if (AmplifyError.isAmplifyError(error) && error.resolution) {
        message =
          message +
          os.EOL +
          `${format.success('Resolution')}: ${error.resolution}`;
      }

      if (AmplifyError.isAmplifyError(error) && error.details) {
        message = message + os.EOL + `Details: ${error.details}`;
      }

      return message;
    } else if (typeof error === 'string') {
      return this.red(error);
    }
    try {
      return this.red(JSON.stringify(error, null, 2));
    } catch (e) {
      return this.red('Unknown error') + os.EOL + this.error(e);
    }
  };

  note = (message: string) => this.grey(message);

  command = (command: string) => this.cyan(command);

  highlight = (command: string) => this.cyan(command);

  success = (message: string) => this.green(message);

  sectionHeader = (header: string) => this.bold(this.blue(header));

  bold = (message: string) => this.applyOnAllLines(bold, message);

  dim = (message: string) => this.applyOnAllLines(dim, message);

  link = (link: string) => underline(this.blue(link));

  list = (lines: string[]) =>
    lines.map((line: string) => ` - ${line}`).join(os.EOL);

  indent = (message: string) => {
    if (message === '') {
      throw new Error('Message cannot be empty');
    }
    const spaces = '  '; // Two spaces for indentation
    return this.applyOnAllLines((line: string) => `${spaces}${line}`, message);
  };

  record = (record: Record<string, string | number | Date>) =>
    Object.entries(record)
      .map(([key, value]) => `${key}: ${String(value)}`)
      .join(os.EOL);

  color = (message: string, colorName: ColorName) =>
    this.applyOnAllLines(colors[colorName], message);

  private applyOnAllLines = (
    mapFunction: (line: string) => string,
    message: string
  ): string => {
    return message && message.split(os.EOL).map(mapFunction).join(os.EOL);
  };

  // Primary colors
  private cyan = (command: string) => this.applyOnAllLines(cyan, command);
  private blue = (command: string) => this.applyOnAllLines(blue, command);
  private red = (message: string) => this.applyOnAllLines(red, message);
  private green = (message: string) => this.applyOnAllLines(green, message);
  private grey = (message: string) => this.applyOnAllLines(grey, message);
}

// Map to connect colorName to kleur color
const colors: Record<ColorName, Colorize> = {
  Green: green,
  Yellow: yellow,
  Blue: blue,
  Magenta: magenta,
  Cyan: cyan,
  Red: red,
};

export const colorNames = [
  'Green',
  'Yellow',
  'Blue',
  'Magenta',
  'Cyan',
  'Red',
] as const;

export type ColorName = (typeof colorNames)[number];

export const format = new Format();
