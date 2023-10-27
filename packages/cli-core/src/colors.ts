// Simple utility to "color" the console output.
// Keeping it simple and avoiding using a 3p dep until needed

/**
 * Enum for colors that clients can use
 * Use standard ANSI escape codes https://en.wikipedia.org/wiki/ANSI_escape_code#Colors
 */
export enum COLOR {
  RED = '31m',
}

/**
 * Wraps a given string with a given color.
 * @param colorName - from the enum COLOR
 * @param message - string to be wrapped in the given color
 * @returns colored string
 */
export const color = (colorName: COLOR, message: string) =>
  `\x1b[${colorName}${message}\x1b[0m`;
