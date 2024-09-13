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

           The convention in 'index.internal.ts' files is as follows.
           Assume that package exports 'someEntryPoint/someSubEntryPoint' pointing to 'someSubEntryPoint.js' (arbitrary file).
           'index.internal.ts' should:
           1. 'import * as __exports__someEntryPoint__someSubEntryPoint from './someSubEntryPoint.js'
           2. export { __exports__someEntryPoint__someSubEntryPoint }
           3. Where:
              1. __exports__ indicates this workaround to our tooling (e.g. this code)
              2. __ is a convention to express nesting and is translated to /
         */
        const entryPointPath = namespaceName
          .replace('__export__', '') // strip prefix
          .replaceAll('__', '/'); // replace __ with /
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
