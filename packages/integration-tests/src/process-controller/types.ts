/**
 * Defines a source and destination path tuple for copying file(s) from one location to another
 */
export type CopyDefinition = {
  source: URL;
  destination: URL;
};
