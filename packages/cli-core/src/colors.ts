// Simple utility to "color" the console output.
// Keeping it simple and avoiding using a 3p dep until needed

/**
 * Wraps a given string with a given color.
 * @param colorName - from the enum COLOR
 * @param message - string to be wrapped in the given color
 * @returns colored string
 */
export const color = (colorName: string, message: string) => {
  const colorValues: Iterable<readonly [string, string]> = [['red', '31m']];
  const colors = new Map(colorValues);
  if (!colors.get(colorName)) {
    throw new Error(`Invalid color name: ${colorName}`);
  }
  return `\x1b[${colors.get(colorName)}${message}\x1b[0m`;
};
