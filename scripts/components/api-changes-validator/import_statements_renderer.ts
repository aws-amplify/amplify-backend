import {
  NamespaceDefinitions,
  UsageStatementsGeneratorOutput,
} from './types.js';
import { EOL } from 'os';

/**
 * Renders import statements.
 */
export class ImportStatementsRenderer {
  /**
   * Creates import statements renderer.
   */
  constructor(
    private readonly generatorOutputs: Array<UsageStatementsGeneratorOutput>,
    private readonly namespaceDefinitions: NamespaceDefinitions,
    private readonly packageName: string
  ) {}
  render = (): string => {
    const importStatements: Array<string> = [];
    for (const generatorOutput of this.generatorOutputs) {
      if (generatorOutput.importStatement) {
        importStatements.push(generatorOutput.importStatement);
      } else if (generatorOutput.symbolDescriptor) {
        if (
          !this.namespaceDefinitions.namespaceBySymbol.has(
            generatorOutput.symbolDescriptor.symbolName
          )
        ) {
          importStatements.push(
            `import { ${generatorOutput.symbolDescriptor.symbolName} } from '${this.packageName}';`
          );
        }
      }
    }

    for (const namespaceName of this.namespaceDefinitions.topLevelNamespaces) {
      if (namespaceName.startsWith('__export__')) {
        /*
           Api-extractor does not ([yet](https://github.com/microsoft/rushstack/issues/1596)) support multiple package entry points
           To work around this we use 'index.internal.ts' files where we export entry points as namespaces.
           Api validator uses special naming convention for these special exports and converts them into start imports
           so that they look like imported namespace.
         */
        const entryPointPath = namespaceName.replace('__export__', '');
        importStatements.push(
          `import * as ${namespaceName} from '${this.packageName}/${entryPointPath}';`
        );
      } else {
        importStatements.push(
          `import { ${namespaceName} } from '${this.packageName}';`
        );
      }
    }

    return importStatements.join(EOL);
  };
}
