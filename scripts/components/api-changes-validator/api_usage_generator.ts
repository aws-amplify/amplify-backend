import fsp from 'fs/promises';
import ts from 'typescript';
import { EOL } from 'os';

type Statements = {
  importStatement?: string;
  usageStatement?: string;
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
        if (statementsForNode.importStatement) {
          importStatements.push(statementsForNode.importStatement);
        }
        if (statementsForNode.usageStatement) {
          usageStatements.push(statementsForNode.usageStatement);
        }
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
    if (node.kind === ts.SyntaxKind.ImportDeclaration) {
      // Imports in API.md reference types from dependencies used in public API symbols.
      // Therefore, we can just copy them as is.
      return {
        importStatement: node.getText(),
      };
    } else if (node.kind === ts.SyntaxKind.TypeAliasDeclaration) {
      const typeAliasDeclaration = node as ts.TypeAliasDeclaration;
      const typeName = typeAliasDeclaration.name.getText();
      const constName = this.toLowerCamelCase(typeName);
      const genericTypeParameters = this.createGenericTypeParametersStatement(
        typeAliasDeclaration.typeParameters
      );
      const baselineTypeName = `${typeName}Baseline`;
      const functionParameterName = `${constName}FunctionParameter`;
      // declare type with same content under different name.
      let usageStatement = `type ${baselineTypeName} = ${typeAliasDeclaration.type.getText()}${EOL}`;
      // add statement that checks if old type can be assigned to new type.
      usageStatement += `const ${typeName}UsageFunction = (${functionParameterName}: ${baselineTypeName}) => {${EOL}`;
      usageStatement += `    const ${constName}: ${typeName} = ${functionParameterName};${EOL}`;
      usageStatement += `}${EOL}`;
      return {
        importStatement: `import { ${typeName} } from '${this.dependencyName}';`,
        usageStatement,
      };
    } else if (node.kind === ts.SyntaxKind.EnumDeclaration) {
      const enumDeclaration = node as ts.EnumDeclaration;
      const enumName = enumDeclaration.name.getText();
      const varName = `${this.toLowerCamelCase(enumName)}UsageVariable`;
      let usageStatement = `let ${varName}: ${enumName};${EOL}`;
      for (const enumMember of enumDeclaration.members) {
        usageStatement += `${varName} = ${enumName}.${enumMember.name.getText()};${EOL}`;
      }
      return {
        importStatement: `import { ${enumName} } from '${this.dependencyName}';`,
        usageStatement,
      };
    }

    return undefined;
  };

  private createGenericTypeParametersStatement = (
    typeParameters?: ts.NodeArray<ts.TypeParameterDeclaration>
  ): string => {
    if (!typeParameters || typeParameters.length === 0) {
      return '';
    }
    const parametersWithoutDefaults = typeParameters.filter(
      (parameter) => !parameter.default
    );
    if (parametersWithoutDefaults.length === 0) {
      return '';
    }
    const statements: Array<string> = [];
    for (const typeParameter of parametersWithoutDefaults) {
      if (typeParameter.constraint) {
        statements.push(typeParameter.constraint.getText());
      } else {
        statements.push('string');
      }
    }
    return `<${statements.join(', ')}>`;
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
