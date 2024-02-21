/**
 * Provides methods for type definition conventions for path and path pattern
 */
export class FunctionTypeDefConventionProvider {
  /**
   * Constructor for FunctionTypeDefConventionProvider
   */
  constructor(private functionName: string) {}

  /**
   * Get the path to the type definition file
   */
  getFunctionTypeDefFilePath(): string {
    return `${process.cwd()}/.amplify/function-env/${this.functionName}.ts`;
  }

  /**
   * Get the path pattern for type definition files
   */
  getFunctionTypeDefPathPattern(): string {
    return '../.amplify/function-env/*';
  }
}
