import path from 'path';

/**
 * Provides static methods for type definition conventions for path and ignore pattern
 */
export class FunctionTypeDefConventionProvider {
  /**
   * Get the path to the type definition file
   */
  static getFunctionTypeDefFilePath(
    functionEntryPath: string,
    functionName: string
  ): string {
    return `${path.dirname(functionEntryPath)}/amplify/${functionName}_env.ts`;
  }

  /**
   * Get the ignore pattern for type definition files
   */
  static getFunctionTypeDefIgnorePattern(): string {
    // returns '**/<typeDefParentFolderName>/*<typeDefFileNameSuffix>.ts'
    return this.getFunctionTypeDefFilePath('**/*', '*');
  }
}
