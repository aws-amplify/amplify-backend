import fsp from 'fs/promises';
import { EOL } from 'os';

type ValidationResult = {
  status: 'pass' | 'fail';
  jsonPath: string;
  failureMessage?: string;
};

/**
 * Validates package lock file.
 */
export class PackageLockValidator {
  /**
   * A dictionary of functions that validate certain keys.
   */
  private readonly validationRules: Record<
    string,
    (jsonPath: string, value: unknown) => ValidationResult
  > = {
    resolved: (jsonPath: string, value: unknown): ValidationResult => {
      if (typeof value != 'string') {
        return {
          status: 'fail',
          jsonPath,
          failureMessage: `The ${jsonPath} property must be string, got ${typeof value}`,
        };
      }
      if (value.includes('localhost') || value.includes('127.0.0.1')) {
        return {
          status: 'fail',
          jsonPath,
          failureMessage: `The ${jsonPath} property value ${value} seems to point to localhost. Run 'npm run stop:npm-proxy && npm install' to recover`,
        };
      }
      return { status: 'pass', jsonPath };
    },
  };

  /**
   * Creates package lock validator.
   */
  constructor(private packageLockPath: string) {}

  /**
   * Walks the tree and validates nodes.
   * @returns array of validation results.
   */
  private walkTree = (
    node: Record<string, unknown>,
    keyPrefix: string
  ): Array<ValidationResult> => {
    const validationResults: Array<ValidationResult> = [];
    for (const [key, value] of Object.entries(node)) {
      const jsonPath = `${keyPrefix}.${key}`;
      const validationResult = this.validationRules[key]?.(jsonPath, value);
      if (validationResult) {
        validationResults.push(validationResult);
      }
      if (typeof value === 'object') {
        this.walkTree(value as Record<string, unknown>, jsonPath).forEach(
          (validationResult) => validationResults.push(validationResult)
        );
      }
    }
    return validationResults;
  };

  validate = async (): Promise<void> => {
    const packageLockContent = JSON.parse(
      await fsp.readFile(this.packageLockPath, 'utf-8')
    );
    const validationResults = this.walkTree(packageLockContent, '$root');
    const violations = validationResults.filter(
      (validationResults) => validationResults.status === 'fail'
    );
    if (violations.length > 0) {
      throw new Error(
        violations.map((violation) => violation.failureMessage).join(EOL)
      );
    }
  };
}
