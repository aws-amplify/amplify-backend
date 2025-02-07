import path from 'path';
import { fileURLToPath } from 'url';

/**
 * Wrapper around Error for serialization for usage metrics
 */
export class SerializableError {
  name: string;
  message: string;
  stack: string;

  // breakdown of filePathRegex:
  // (file:\/+)? -> matches optional file url prefix
  // (?:[a-zA-Z]:[\\/]|\/{2,3})?|[a-zA-Z]:\\|\/) -> matches Windows drive or unix prefix
  // (?:[\w.-]+[\\/])*[\w.-]+ -> matches nested directories and file name
  private filePathRegex =
    /(file:\/+(?:[a-zA-Z]:[\\/]|\/{2,3})?|[a-zA-Z]:\\|\/)(?:[\w.-]+[\\/])*[\w.-]+/g;
  private arnRegex =
    /arn:[a-z0-9][-.a-z0-9]{0,62}:[A-Za-z0-9][A-Za-z0-9_/.-]{0,62}:[A-Za-z0-9_/.-]{0,63}:[A-Za-z0-9_/.-]{0,63}:[A-Za-z0-9][A-Za-z0-9:_/+=,@.-]{0,1023}/g;

  /**
   * constructor for SerializableError
   */
  constructor(error: Error) {
    this.name =
      'code' in error && error.code
        ? this.sanitize(error.code as string)
        : error.name;
    this.message = this.anonymizePaths(this.sanitize(error.message));
    this.stack = this.anonymizePaths(error.stack ?? '');
  }

  private anonymizePaths = (str: string): string => {
    return str.replace(
      this.filePathRegex,
      (match) => this.processPaths([match])[0]
    );
  };

  private processPaths = (paths: string[]): string[] => {
    return paths.map((tracePath) => {
      let result = tracePath;
      if (this.isURLFilePath(result)) {
        result = fileURLToPath(result);
      }
      if (path.isAbsolute(result)) {
        return path.relative(process.cwd(), result);
      }

      return result;
    });
  };

  private removeARN = (str?: string): string => {
    return str?.replace(this.arnRegex, '<escaped ARN>') ?? '';
  };

  private sanitize = (str: string) => {
    return this.removeARN(str)?.replaceAll(/["❌]/g, '');
  };

  private isURLFilePath = (path: string): boolean => {
    try {
      new URL(path);
      return path.startsWith('file:');
    } catch {
      return false;
    }
  };
}
