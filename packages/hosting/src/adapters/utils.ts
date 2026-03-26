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

export interface CopyDirOptions {
  /**
   * File name patterns to exclude. Matched by suffix or exact name.
   * Defaults to DEFAULT_EXCLUDE_PATTERNS if not provided.
   * Pass an empty array to copy everything.
   */
  excludePatterns?: string[];
}

/**
 * Copy a directory recursively with safety measures.
 *
 * - Skips symbolic links to prevent path traversal attacks
 * - Skips files matching exclude patterns (source maps, OS metadata, etc.)
 *
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

  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isSymbolicLink()) {
      continue; // Skip symlinks to prevent path traversal
    }
    if (matchesExcludePattern(entry.name, excludePatterns)) {
      continue; // Skip excluded files
    }
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath, options);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
};
