import { fileURLToPath } from 'url';

/**
 * Regex that pulls out the path from a stack trace line. Works for both unix and windows paths and cjs and esm loaders
 *
 * For ESM loaders in TS files or CJS loaders
 * The line is something like "at SymbolName (/some/path/to/project/root/backend/auth.ts:3:21)"
 * or on Windows "at SymbolName (C:\some\path\to\project\root\backend\auth.ts:3:21)"
 *
 * For ESM loaders in JS files
 * The line is something like "at file:///some/path/to/project/root/backend/auth.ts:14:28"
 * or on Windows " at file:///C:\some\path\to\project\root\backend\auth.ts:3:21"
 *
 * This regex pulls out the file path into the "filepath" named matching group
 * In the above examples that would be "/some/path/to/project/root/backend/auth.ts" or "C:\some\path\to\project\root\backend\auth.ts"
 *
 * Instead of combining both matches with single regex, we create two to keep it simple and manageable.
 *
 */
const extractFilePathFromStackTraceLineRegexes = [
  /\((?<filepath>(\w:)?[^:]*)[:\d]*\)/,
  /at (?<filepath>.*\.\w[^:\d]*)[:\d]*/,
];

/**
 * Extracts a file path from a given stack trace line
 */
export class FilePathExtractor {
  /**
   * Constructor for FilePathExtractor
   */
  constructor(private readonly stackTraceLine: string) {}

  extract = () => {
    for (const regex of extractFilePathFromStackTraceLineRegexes) {
      const match = this.stackTraceLine.match(regex);
      if (match?.groups?.filepath) {
        return this.standardizePath(match?.groups?.filepath);
      }
    }
    return undefined;
  };

  // The input can be either a file path or a file URL. If it's a file URL, convert it to the path.
  private standardizePath = (maybeUrl: string): string => {
    try {
      const url = new URL(maybeUrl);
      if (url.protocol === 'file:') {
        return fileURLToPath(url);
      }
      return maybeUrl;
    } catch {
      return maybeUrl;
    }
  };
}
