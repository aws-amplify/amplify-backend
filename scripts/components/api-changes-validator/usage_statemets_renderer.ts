import {
  NamespaceDefinitions,
  UsageStatementsGeneratorOutput,
} from './types.js';
import { EOL } from 'os';

/**
 * Renders usage statements.
 */
export class UsageStatementsRenderer {
  /**
   * Creates import statements renderer.
   */
  constructor(
    private readonly generatorOutputs: Array<UsageStatementsGeneratorOutput>,
    private readonly namespaceDefinitions: NamespaceDefinitions
  ) {}
  render = (): string => {
    let usageStatements = this.renderCombinedUsageStatements();
    usageStatements = this.applyNamespaces(usageStatements);
    return usageStatements;
  };

  private renderCombinedUsageStatements = (): string => {
    const usageStatements: Array<string> = [];
    for (const generatorOutput of this.generatorOutputs) {
      if (generatorOutput.usageStatement) {
        usageStatements.push(generatorOutput.usageStatement);
      }
    }
    return usageStatements.join(EOL);
  };

  /**
   * This function applies namespaces using a simple algorithm that
   * regex match and replace symbols in generated code with namespace prefix.
   *
   * This a cheap alternative to a proper but more expensive solution
   * that would involve inspecting symbols during generation.
   * Proper solution is expensive because we'd need to unpack every statement
   * that can contain these types like generic type arguments, function arguments, etc.
   * We do leverage fact that these snippets can be copied over from API extract verbatim in generators to simplify them.
   * Proper solution should be considered when this approach no longer works.
   */
  private applyNamespaces = (usageStatements: string): string => {
    for (const symbolName of this.namespaceDefinitions.namespaceBySymbol.keys()) {
      if (this.namespaceDefinitions.namespaceNames.has(symbolName)) {
        // skip namespaces
        continue;
      }
      let currentSymbolName: string | undefined = symbolName;
      const namespaceHierarchy: Array<string> = [];
      do {
        currentSymbolName =
          this.namespaceDefinitions.namespaceBySymbol.get(currentSymbolName);
        if (currentSymbolName) {
          namespaceHierarchy.unshift(currentSymbolName);
        }
      } while (currentSymbolName);
      const symbolAlias =
        this.namespaceDefinitions.aliasedSymbols.get(symbolName);
      let actualSymbolName = symbolName;
      if (symbolAlias) {
        actualSymbolName = symbolAlias;
      }
      const symbolWithNamespace = `${namespaceHierarchy.join(
        '.'
      )}.${actualSymbolName}`;

      // characters that can be found before or after symbol
      // this is to prevent partial matches in case one symbol's characters are subset of longer one
      const possibleSymbolPrefix = '[\\s\\,\\(<;]';
      const possibleSymbolSuffix = '[\\s\\,\\(\\)<>;\\.]';
      const regex = new RegExp(
        `(${possibleSymbolPrefix})(${symbolName})(${possibleSymbolSuffix})`,
        'g'
      );
      usageStatements = usageStatements.replaceAll(
        regex,
        `$1${symbolWithNamespace}$3`
      );
    }

    return usageStatements;
  };
}
