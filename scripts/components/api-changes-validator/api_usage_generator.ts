import ts from 'typescript';
import { EOL } from 'os';
import { UsageStatements } from './types.js';
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
  /**
   * Creates generator.
   */
  constructor(
    private readonly latestPackageName: string,
    private readonly apiReportAST: ts.SourceFile
  ) {}

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

    return `${importStatements.join(EOL)}${EOL}${EOL}${usageStatements.join(
      EOL
    )}${EOL}`;
  };

  private generateStatementsForNode = (
    node: ts.Node
  ): UsageStatements | undefined => {
    if (node.kind === ts.SyntaxKind.ImportDeclaration) {
      return new ImportUsageStatementsGenerator(
        node as ts.ImportDeclaration
      ).generate();
    } else if (node.kind === ts.SyntaxKind.TypeAliasDeclaration) {
      return new TypeUsageStatementsGenerator(
        node as ts.TypeAliasDeclaration,
        this.latestPackageName
      ).generate();
    } else if (node.kind === ts.SyntaxKind.EnumDeclaration) {
      return new EnumUsageStatementsGenerator(
        node as ts.EnumDeclaration,
        this.latestPackageName
      ).generate();
    } else if (node.kind === ts.SyntaxKind.ClassDeclaration) {
      return new ClassUsageStatementsGenerator(
        node as ts.ClassDeclaration,
        this.latestPackageName
      ).generate();
    } else if (node.kind === ts.SyntaxKind.VariableStatement) {
      return new VariableUsageStatementsGenerator(
        node as ts.VariableStatement,
        this.latestPackageName
      ).generate();
    }

    console.log(
      `Warning: usage generator encountered unrecognized syntax kind ${node.kind}`
    );

    return undefined;
  };
}
