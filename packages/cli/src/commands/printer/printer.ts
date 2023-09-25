import { EOL } from 'os';

/**
 * The class that pretty prints to the console.
 */
export class Printer {
  /**
   * Print an object/record to console.
   */
  static printRecord = <T extends Record<string | number, string | number>>(
    object: T
  ): void => {
    let message = '';
    const entries = Object.entries(object);
    entries.forEach(([key, val]) => {
      message = message.concat(` ${key}: ${val}${EOL}`);
    });
    console.log(message);
  };

  /**
   * Prints an array of objects/records to console.
   */
  static printRecords = <T extends Record<string | number, string | number>>(
    objects: T[]
  ): void => {
    for (const obj of objects) {
      this.printRecord(obj);
    }
  };
}
