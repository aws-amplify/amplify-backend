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
  namespaceNames: Array<string>;
  namespaceBySymbol: Map<string, string>;
};
