export type PathReplacements = PathReplacement[];

/**
 * Defines a source and destination path tuple.
 */
export type PathReplacement = {
  source: URL;
  destination: URL;
};
