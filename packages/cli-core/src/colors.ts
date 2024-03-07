import { COLOR } from '@aws-amplify/plugin-types';
// Simple utility to "color" the console output.
// Keeping it simple and avoiding using a 3p dep until needed

/**
 * Wraps a given string with a given color.
 * @param colorName - from the enum COLOR
 * @param message - string to be wrapped in the given color
 * @returns colored string
 */
export const color = (colorName: COLOR, message: string) =>
  `\x1b[${colorName}${message}\x1b[0m`;
