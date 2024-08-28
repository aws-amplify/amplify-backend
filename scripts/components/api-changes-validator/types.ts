export type SymbolDescriptor = {
  symbolName: string;
};

export type UsageStatementsGeneratorOutput =
  | {
      symbolDescriptor?: undefined;
      importStatement?: string;
      usageStatement?: string;
    }
  | {
      symbolDescriptor?: SymbolDescriptor;
      importStatement?: undefined;
      usageStatement?: string;
    };

export type UsageStatementsGenerator = {
  /**
   * Generates usage statements
   */
  generate: () => UsageStatementsGeneratorOutput;
};

export type NamespaceDefinitions = {
  topLevelNamespaces: Set<string>;
  namespaceNames: Set<string>;
  namespaceBySymbol: Map<string, string>;
  aliasedSymbols: Map<string, string>;
};
