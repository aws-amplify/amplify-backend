import * as fs from 'fs';
import * as path from 'path';

/**
 * Default file patterns to exclude from deployment.
 * Source maps, OS metadata, and build artifacts that should not be public.
 */
export const DEFAULT_EXCLUDE_PATTERNS = [
  '.map',       // Source maps
  '.DS_Store',  // macOS metadata
  'thumbs.db',  // Windows metadata
  '.tsbuildinfo', // TypeScript incremental build info
];

/**
 * Check whether a filename matches any of the given exclude patterns.
 * Patterns are matched as suffix (extension) or exact name comparisons.
 */
const matchesExcludePattern = (
  fileName: string,
  excludePatterns: string[],
): boolean => {
  const lowerName = fileName.toLowerCase();
  return excludePatterns.some((pattern) => {
    const lowerPattern = pattern.toLowerCase();
    // Exact match (e.g., '.DS_Store', 'thumbs.db')
    if (lowerName === lowerPattern) return true;
    // Suffix/extension match (e.g., '.map', '.tsbuildinfo')
    if (lowerPattern.startsWith('.') && lowerName.endsWith(lowerPattern)) return true;
    return false;
  });
};

export type CopyDirOptions = {
  /**
   * File name patterns to exclude. Matched by suffix or exact name.
   * Defaults to DEFAULT_EXCLUDE_PATTERNS if not provided.
   * Pass an empty array to copy everything.
   */
  excludePatterns?: string[];
};

/**
 * Copy a directory recursively with safety measures.
 * Uses Node.js built-in `cpSync` (stable since Node 16.7+) with `dereference: false`
 * to skip symbolic links atomically, preventing TOCTOU races.
 * @param src - source directory path
 * @param dest - destination directory path
 * @param options - optional configuration for excluding files
 */
export const copyDirRecursive = (
  src: string,
  dest: string,
  options?: CopyDirOptions,
): void => {
  const excludePatterns = options?.excludePatterns ?? DEFAULT_EXCLUDE_PATTERNS;

  fs.cpSync(src, dest, {
    recursive: true,
    dereference: false,
    filter: (source) => {
      const fileName = path.basename(source);
      // Always allow the root source directory itself
      if (source === src) return true;
      // Skip symlinks (cpSync with dereference:false copies them as-is; filter them out entirely)
      try {
        if (fs.lstatSync(source).isSymbolicLink()) return false;
      } catch {
        return false;
      }
      return !matchesExcludePattern(fileName, excludePatterns);
    },
  });
};
