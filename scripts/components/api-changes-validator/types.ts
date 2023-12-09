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
