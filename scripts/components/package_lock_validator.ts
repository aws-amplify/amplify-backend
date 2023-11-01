import fsp from 'fs/promises';
import { EOL } from 'os';

/**
 * Validates package lock file.
 */
export class PackageLockValidator {
  /**
   * A dictionary of functions that validate certain keys.
   * If value is valid function should return undefined,
   * otherwise a string that describes violation.
   */
  private readonly validationRules: Record<
    string,
    (jsonPath: string, value: unknown) => string | undefined
  > = {
    resolved: (jsonPath: string, value: unknown) => {
      if (typeof value != 'string') {
        return `The ${jsonPath} property must be string, got ${typeof value}`;
      }
      if (value.includes('localhost') || value.includes('127.0.0.1')) {
        return `The ${jsonPath} property value ${value} seems to point to localhost. Run 'npm run stop:npm-proxy && npm install' to recover`;
      }
      return undefined;
    },
  };

  /**
   * Creates package lock validator.
   */
  constructor(private packageLockPath: string) {}

  /**
   * Walks the tree and validates nodes.
   * @returns array of violations
   */
  private walkTree = (
    node: Record<string, unknown>,
    keyPrefix: string
  ): Array<string> => {
    const violations: Array<string> = [];
    for (const [key, value] of Object.entries(node)) {
      const jsonPath = `${keyPrefix}.${key}`;
      const violation = this.validationRules[key]?.(jsonPath, value);
      if (violation) {
        violations.push(violation);
      }
      if (typeof value === 'object') {
        this.walkTree(value as Record<string, unknown>, jsonPath).forEach(
          (violation) => violations.push(violation)
        );
      }
    }
    return violations;
  };

  validate = async (): Promise<void> => {
    const packageLockContent = JSON.parse(
      await fsp.readFile(this.packageLockPath, 'utf-8')
    );
    const violations = this.walkTree(packageLockContent, '$root');
    if (violations.length > 0) {
      throw new Error(violations.join(EOL));
    }
  };
}
