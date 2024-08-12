export type UsageStatements = {
  importStatement?: string;
  usageStatement?: string;
};

export type UsageStatementsGenerator = {
  /**
   * Generates usage statements
   */
  generate: () => UsageStatements;
};

export type NamespaceDefinitions = {
  topLevelNamespaces: Set<string>;
  namespaceNames: Set<string>;
  namespaceBySymbol: Map<string, string>;
};
