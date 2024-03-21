import ts from 'typescript';
import { EOL } from 'os';
import { NamespaceDefinitions, UsageStatements } from './types.js';
import {
  ClassUsageStatementsGenerator,
  EnumUsageStatementsGenerator,
  ImportUsageStatementsGenerator,
  TypeUsageStatementsGenerator,
  VariableUsageStatementsGenerator,
} from './api_usage_statements_generators.js';

/**
 * Generates API usage using API.md definition.
 */
export class ApiUsageGenerator {
  private readonly namespaceDefinitions: NamespaceDefinitions;

  /**
   * Creates generator.
   */
  constructor(
    private readonly packageName: string,
    private readonly apiReportAST: ts.SourceFile
  ) {
    this.namespaceDefinitions = this.getNamespaceDefinitions();
  }

  generate = (): string => {
    const importStatements: Array<string> = [];
    const usageStatements: Array<string> = [];

    // go over top level statements and generate usage for them
    for (const statement of this.apiReportAST.statements) {
      const statementsForNode = this.generateStatementsForNode(statement);
      if (statementsForNode) {
        if (statementsForNode.importStatement) {
          importStatements.push(statementsForNode.importStatement);
        }
        if (statementsForNode.usageStatement) {
          usageStatements.push(statementsForNode.usageStatement);
        }
      }
    }

    for (const namespaceName of this.namespaceDefinitions.namespaceNames) {
      importStatements.push(
        `import { ${namespaceName} } from '${this.packageName}';`
      );
    }

    return `${importStatements.join(EOL)}${EOL}${EOL}${usageStatements.join(
      EOL
    )}${EOL}`;
  };

  private generateStatementsForNode = (
    node: ts.Node
  ): UsageStatements | undefined => {
    switch (node.kind) {
      case ts.SyntaxKind.ImportDeclaration:
        return new ImportUsageStatementsGenerator(
          node as ts.ImportDeclaration
        ).generate();
      case ts.SyntaxKind.TypeAliasDeclaration:
        return new TypeUsageStatementsGenerator(
          node as ts.TypeAliasDeclaration,
          this.packageName,
          this.namespaceDefinitions
        ).generate();
      case ts.SyntaxKind.EnumDeclaration:
        return new EnumUsageStatementsGenerator(
          node as ts.EnumDeclaration,
          this.packageName
        ).generate();
      case ts.SyntaxKind.ClassDeclaration:
        return new ClassUsageStatementsGenerator(
          node as ts.ClassDeclaration,
          this.packageName
        ).generate();
      case ts.SyntaxKind.VariableStatement:
        return new VariableUsageStatementsGenerator(
          node as ts.VariableStatement,
          this.packageName
        ).generate();
      default:
        console.log(
          `Warning: usage generator encountered unrecognized syntax kind ${node.kind}`
        );

        return undefined;
    }
  };

  /**
   * This method scans top level AST statements to find namespaces and symbols exported via namespace.
   */
  private getNamespaceDefinitions = (): NamespaceDefinitions => {
    const namespaceDefinitions: NamespaceDefinitions = {
      namespaceBySymbol: new Map<string, string>(),
      namespaceNames: [],
    };
    for (const statement of this.apiReportAST.statements) {
      if (statement.kind === ts.SyntaxKind.ModuleDeclaration) {
        const moduleDeclaration = statement as ts.ModuleDeclaration;
        const namespaceName = moduleDeclaration.name.getText();
        namespaceDefinitions.namespaceNames.push(namespaceName);
        if (moduleDeclaration.body?.kind === ts.SyntaxKind.ModuleBlock) {
          const moduleBody = moduleDeclaration.body as ts.ModuleBlock;
          for (const moduleBodyStatement of moduleBody.statements) {
            if (moduleBodyStatement.kind === ts.SyntaxKind.ExportDeclaration) {
              const exportDeclaration =
                moduleBodyStatement as ts.ExportDeclaration;
              if (
                exportDeclaration.exportClause?.kind ===
                ts.SyntaxKind.NamedExports
              ) {
                const namedExports =
                  exportDeclaration.exportClause as ts.NamedExports;
                for (const namedExport of namedExports.elements) {
                  const symbolName = namedExport.name.getText();
                  namespaceDefinitions.namespaceBySymbol.set(
                    symbolName,
                    namespaceName
                  );
                }
              }
            }
          }
        }
      }
    }

    return namespaceDefinitions;
  };
}
