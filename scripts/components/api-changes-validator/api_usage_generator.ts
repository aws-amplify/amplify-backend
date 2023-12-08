import fsp from 'fs/promises';
import ts from 'typescript';
import { EOL } from 'os';

type Statements = {
  importStatement: string;
  usageStatement: string;
};

/**
 * Generates API usage using API.md definition.
 */
export class ApiUsageGenerator {
  /**
   * Creates generator.
   */
  constructor(
    private readonly targetPath: string,
    private readonly projectName: string,
    private readonly dependencyName: string,
    private readonly apiReportPath: string
  ) {}

  generate = async () => {
    const apiAST = await this.readAPIReportAsAST();
    const importStatements: Array<string> = [];
    const usageStatements: Array<string> = [];

    // go over top level statements and generate usage for them
    for (const statement of apiAST.statements) {
      const statementsForNode = this.generateStatementsForNode(statement);
      if (statementsForNode) {
        importStatements.push(statementsForNode.importStatement);
        usageStatements.push(statementsForNode.usageStatement);
      }
    }

    const content = `${importStatements.join(
      EOL
    )}${EOL}${EOL}${usageStatements.join(EOL)}${EOL}`;
    await fsp.writeFile(this.targetPath, content);
  };

  private generateStatementsForNode = (
    node: ts.Node
  ): Statements | undefined => {
    const ignoredNodes: Array<ts.SyntaxKind> = [
      ts.SyntaxKind.ImportDeclaration,
    ];
    if (ignoredNodes.includes(node.kind)) {
      return undefined;
    } else if (node.kind === ts.SyntaxKind.TypeAliasDeclaration) {
      const typeAliasDeclaration = node as ts.TypeAliasDeclaration;
      const typeName = typeAliasDeclaration.name.getText();
      const constName = this.toLowerCamelCase(typeName);
      return {
        importStatement: `import { ${typeName} } from '${this.dependencyName}';`,
        usageStatement: `export const ${constName}: ${typeName} | undefined = undefined;`,
      };
    } else if (node.kind === ts.SyntaxKind.EnumDeclaration) {
      const enumDeclaration = node as ts.EnumDeclaration;
      const enumName = enumDeclaration.name.getText();
      const constName = this.toLowerCamelCase(enumName);
      return {
        importStatement: `import { ${enumName} } from '${this.dependencyName}';`,
        usageStatement: `export const ${constName}: ${enumName} | undefined = undefined;`,
      };
    } else if (node.kind === ts.SyntaxKind.ClassDeclaration) {
      const classDeclaration = node as ts.ClassDeclaration;
      const className = classDeclaration.name?.getText();
      if (!className) {
        throw new Error('Class name is missing');
      }
      const constName = this.toLowerCamelCase(className);
      return {
        importStatement: `import { ${className} } from '${this.dependencyName}';`,
        usageStatement: `export const ${constName}: ${className} | undefined = undefined;`,
      };
    } else if (node.kind === ts.SyntaxKind.VariableStatement) {
      const variableStatement = node as ts.VariableStatement;
      if (variableStatement.declarationList.declarations.length != 1) {
        throw new Error('Unexpected variable declarations count');
      }
      const variableName =
        variableStatement.declarationList.declarations[0].name.getText();
      return {
        importStatement: `import { ${variableName} } from '${this.dependencyName}';`,
        usageStatement: `export const ${variableName}Usage: typeof ${variableName} | undefined = undefined;`,
      };
    }

    throw new Error(`Unrecognized node ${node.kind}`);
  };

  private toLowerCamelCase = (name: string): string => {
    return `${name?.substring(0, 1).toLowerCase()}${name?.substring(1)}`;
  };

  private readAPIReportAsAST = async (): Promise<ts.SourceFile> => {
    const codeSnippetStartToken = '```ts';
    const codeSnippetEndToken = '```';
    const apiReportContent = await fsp.readFile(this.apiReportPath, 'utf-8');
    const apiReportTypeScriptContent = apiReportContent.substring(
      apiReportContent.indexOf(codeSnippetStartToken) +
        codeSnippetStartToken.length,
      apiReportContent.lastIndexOf(codeSnippetEndToken)
    );
    return ts.createSourceFile(
      'API.md',
      apiReportTypeScriptContent,
      ts.ScriptTarget.ES2022,
      true,
      ts.ScriptKind.TS
    );
  };
}
