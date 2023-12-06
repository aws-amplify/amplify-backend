import path from 'path';
import { existsSync } from 'fs';
import * as fsp from 'fs/promises';
import ts from 'typescript';

type SymbolIdentifier = {
  readonly name: string;
  readonly parentName: string | undefined;
  readonly node: ts.Identifier;
};

class ApiTestValidator {
  private readonly apiReportFilePath: string;
  private readonly apiTestFilePath: string;
  constructor(private readonly packagePath: string) {
    this.apiReportFilePath = path.join(this.packagePath, 'API.md');
    this.apiTestFilePath = path.join(this.packagePath, 'src', 'api.test.ts');
  }

  validate = async () => {
    if (!existsSync(this.apiReportFilePath)) {
      // skip if package does not have API.md report
      return;
    }

    if (!existsSync(this.apiTestFilePath)) {
      throw new Error(
        `Package ${this.packagePath} is missing ${this.apiTestFilePath} file.`
      );
    }

    const apiAST = await this.readAPIReportAsAST();
    const expectedApiIdentifiers: Array<SymbolIdentifier> = [];
    this.collectSymbolIdentifiersRecursively(
      apiAST,
      expectedApiIdentifiers,
      this.expectedApiIdentifierFactory
    );

    const apiTestAST = ts.createSourceFile(
      'api.test.ts',
      await fsp.readFile(this.apiTestFilePath, 'utf-8'),
      ts.ScriptTarget.ES2022,
      true,
      ts.ScriptKind.TS
    );

    const identifiersUsedInTest: Array<SymbolIdentifier> = [];
    this.collectSymbolIdentifiersRecursively(
      apiTestAST,
      identifiersUsedInTest,
      this.testUsageApiIdentifierFactory
    );

    for (const expectedApiIdentifier of expectedApiIdentifiers) {
      if (
        !identifiersUsedInTest.find(
          (item) =>
            item.name === expectedApiIdentifier.name &&
            item.parentName === expectedApiIdentifier.parentName
        )
      ) {
        throw new Error(
          `API identifier ${expectedApiIdentifier.name} of ${
            expectedApiIdentifier.parentName ?? 'unknown parent'
          } is not used in ${this.apiTestFilePath}`
        );
      }
    }
  };

  private expectedApiIdentifierFactory = (
    node: ts.Identifier
  ): SymbolIdentifier => {
    let nodeKindToLookFor: ts.SyntaxKind | undefined;
    switch (node.parent.kind) {
      case ts.SyntaxKind.Parameter:
        nodeKindToLookFor = ts.SyntaxKind.VariableDeclaration;
        break;
      case ts.SyntaxKind.PropertySignature:
        nodeKindToLookFor = ts.SyntaxKind.TypeAliasDeclaration;
        break;
      case ts.SyntaxKind.EnumMember:
        nodeKindToLookFor = ts.SyntaxKind.EnumDeclaration;
        break;
      default:
        nodeKindToLookFor = undefined;
    }

    let parentName: string | undefined;
    if (nodeKindToLookFor) {
      let parent: ts.Node = node.parent;
      while (parent.kind !== nodeKindToLookFor) {
        parent = parent.parent;
      }

      switch (parent.kind) {
        case ts.SyntaxKind.TypeAliasDeclaration:
          parentName = (parent as ts.TypeAliasDeclaration).name.getText();
          break;
        case ts.SyntaxKind.VariableDeclaration:
          parentName = (parent as ts.VariableDeclaration).name.getText();
          break;
        case ts.SyntaxKind.EnumDeclaration:
          parentName = (parent as ts.EnumDeclaration).name.getText();
          break;
        default:
          throw new Error('Unexpected parent type');
      }

      if (!parentName) {
        throw new Error(
          `Expected to find parent of ${node.getText()}, but found none`
        );
      }
    }

    return { name: node.getText(), parentName, node };
  };

  private testUsageApiIdentifierFactory = (
    node: ts.Identifier
  ): SymbolIdentifier => {
    let nodeKindToLookFor: ts.SyntaxKind | undefined;
    const name = node.getText();
    switch (node.parent.kind) {
      case ts.SyntaxKind.CallExpression:
        nodeKindToLookFor = ts.SyntaxKind.CallExpression;
        break;
      case ts.SyntaxKind.PropertyAssignment:
        nodeKindToLookFor = ts.SyntaxKind.VariableDeclaration;
        break;
      case ts.SyntaxKind.PropertyAccessExpression:
        nodeKindToLookFor = ts.SyntaxKind.PropertyAccessExpression;
        break;
      default:
        nodeKindToLookFor = undefined;
    }

    let parentName: string | undefined;
    let parentExpected = true;
    if (nodeKindToLookFor) {
      let parent: ts.Node = node.parent;
      while (parent.kind !== nodeKindToLookFor) {
        parent = parent.parent;
      }

      switch (parent.kind) {
        case ts.SyntaxKind.CallExpression:
          parentName = (parent as ts.CallExpression).expression.getText();
          if (parentName === name) {
            // call expression is parent node for both parameters and method name
            // in case we're inspecting method name we reset parent
            parentName = undefined;
            parentExpected = false;
          }
          break;
        case ts.SyntaxKind.VariableDeclaration:
          parentName = (parent as ts.VariableDeclaration).type?.getText();
          break;
        case ts.SyntaxKind.PropertyAccessExpression:
          parentName = (
            parent as ts.PropertyAccessExpression
          ).expression.getText();
          break;
        default:
          throw new Error('Unexpected parent type');
      }

      if (parentExpected && !parentName) {
        throw new Error(
          `Expected to find parent of ${node.getText()}, but found none`
        );
      }
    }

    return { name, parentName, node };
  };

  private collectSymbolIdentifiersRecursively = (
    node: ts.Node,
    accumulator: Array<SymbolIdentifier>,
    symbolIdentifierFactory: (node: ts.Identifier) => SymbolIdentifier
  ) => {
    if (node.kind === ts.SyntaxKind.Identifier) {
      const name = node.getText();
      const isTSBuiltIn = ['Partial', 'Promise'].includes(name);
      const isIrrelevantUsage =
        node.parent && node.parent.kind === ts.SyntaxKind.ImportSpecifier;
      if (!isTSBuiltIn && !isIrrelevantUsage) {
        accumulator.push(symbolIdentifierFactory(node as ts.Identifier));
      }
    }

    ts.forEachChild(node, (child) =>
      this.collectSymbolIdentifiersRecursively(
        child,
        accumulator,
        symbolIdentifierFactory
      )
    );
  };

  private readAPIReportAsAST = async (): Promise<ts.SourceFile> => {
    const codeSnippetStartToken = '```ts';
    const codeSnippetEndToken = '```';
    const apiReportContent = await fsp.readFile(
      this.apiReportFilePath,
      'utf-8'
    );
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

//const allPackages = await glob('packages/*');
const allPackages = ['packages/client-config'];
for (const pkg of allPackages) {
  console.log(`Validating api tests of ${pkg}`);
  const validator = new ApiTestValidator(pkg);
  await validator.validate();
}
