import path from 'path';

/**
 * Provides static methods for type definition conventions for path and ignore pattern
 */
export class FunctionTypeDefConventionProvider {
  /**
   * Constructor for FunctionTypeDefConventionProvider
   */
  constructor(
    private functionEntryPath: string,
    private functionName: string
  ) {}

  /**
   * Get the path to the type definition file
   */
  getFunctionTypeDefFilePath(): string {
    return `${path.dirname(this.functionEntryPath)}/amplify/${
      this.functionName
    }_env.ts`;
  }

  /**
   * Get the ignore pattern for type definition files
   */
  getFunctionTypeDefIgnorePattern(): string {
    return '**/amplify/*_env.ts';
  }
}
