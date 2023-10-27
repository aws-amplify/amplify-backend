import { COLOR, color } from '../colors.js';
import { EOL } from 'os';

export type RecordValue = string | number | string[] | Date;

/**
 * The class that pretty prints to the console.
 */
export class Printer {
  /**
   * Print an object/record to console.
   */
  static printRecord = <T extends Record<string | number, RecordValue>>(
    object: T
  ): void => {
    let message = '';
    const entries = Object.entries(object);
    entries.forEach(([key, val]) => {
      message = message.concat(` ${key}: ${val as string}${EOL}`);
    });
    console.log(message);
  };

  /**
   * Prints an array of objects/records to console.
   */
  static printRecords = <T extends Record<string | number, RecordValue>>(
    objects: T[]
  ): void => {
    for (const obj of objects) {
      this.printRecord(obj);
    }
  };

  /**
   * Prints a given message with colors to console
   */
  static printWithColor = (colorName: COLOR, message: string) => {
    console.log(color(colorName, message));
  };

  /**
   * Prints a new line to console
   */
  static printANewLine = () => {
    console.log('\n');
  };
}
