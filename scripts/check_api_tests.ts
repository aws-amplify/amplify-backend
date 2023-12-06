import path from 'path';
import { existsSync } from 'fs';
import * as fsp from 'fs/promises';
import ts from 'typescript';

type ApiSymbol = {
  readonly name: string;
  readonly parentName: string | undefined;
  readonly node: ts.Identifier;
};

type ExpectedApiSymbol = ApiSymbol & {
  readonly isOptional: boolean | undefined;
};

type TestUsageApiSymbol = ApiSymbol & {
  readonly usageSection: 'minApiUsage' | 'maxApiUsage';
};

/**
 * This class validates that API.md if exists has corresponding 'src/api.test.ts' file
 * and that symbols defined in API.md have adequate coverage.
 */
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
    const expectedApiIdentifiers: Array<ExpectedApiSymbol> = [];
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

    const identifiersUsedInTest: Array<TestUsageApiSymbol> = [];
    this.collectSymbolIdentifiersRecursively(
      apiTestAST,
      identifiersUsedInTest,
      this.testUsageApiIdentifierFactory
    );

    if (!identifiersUsedInTest.find((item) => item.name === 'minApiUsage')) {
      throw new Error(
        `${this.apiTestFilePath} must have 'minApiUsage' section.`
      );
    }

    if (!identifiersUsedInTest.find((item) => item.name === 'maxApiUsage')) {
      throw new Error(
        `${this.apiTestFilePath} must have 'maxApiUsage' section.`
      );
    }

    for (const expectedApiIdentifier of expectedApiIdentifiers) {
      const matchedIdentifiersUsedInTest = identifiersUsedInTest.filter(
        (item) =>
          item.name === expectedApiIdentifier.name &&
          item.parentName === expectedApiIdentifier.parentName
      );
      if (matchedIdentifiersUsedInTest.length === 0) {
        throw new Error(
          `API identifier ${expectedApiIdentifier.name} of ${
            expectedApiIdentifier.parentName ?? 'unknown parent'
          } is not used in ${this.apiTestFilePath}`
        );
      } else {
        if (expectedApiIdentifier.isOptional) {
          for (const matchedIdentifierUsedInTest of matchedIdentifiersUsedInTest) {
            if (matchedIdentifierUsedInTest.usageSection === 'minApiUsage') {
              throw new Error(
                `${matchedIdentifierUsedInTest.name} is optional and must not be used in minApiUsage section`
              );
            }
          }
        }
      }
    }
  };

  private expectedApiIdentifierFactory = (
    node: ts.Identifier
  ): ExpectedApiSymbol => {
    let apiParentNodeKindToLookFor: ts.SyntaxKind | undefined;
    let isOptional: boolean | undefined;
    const name = node.getText();
    if (node.parent.kind === ts.SyntaxKind.Parameter) {
      apiParentNodeKindToLookFor = ts.SyntaxKind.VariableDeclaration;
      const parameterDeclaration = node.parent as ts.ParameterDeclaration;
      if (
        parameterDeclaration.questionToken ||
        parameterDeclaration.initializer
      ) {
        isOptional = true;
      }
    } else if (node.parent.kind === ts.SyntaxKind.PropertySignature) {
      apiParentNodeKindToLookFor = ts.SyntaxKind.TypeAliasDeclaration;
      const propertySignature = node.parent as ts.PropertySignature;
      if (
        propertySignature.questionToken ||
        propertySignature.type?.getText().includes('undefined')
      ) {
        isOptional = true;
      }
    } else if (node.parent.kind === ts.SyntaxKind.EnumMember) {
      apiParentNodeKindToLookFor = ts.SyntaxKind.EnumDeclaration;
    }

    let parentName: string | undefined;
    if (apiParentNodeKindToLookFor) {
      let parent: ts.Node = node.parent;
      while (parent.kind !== apiParentNodeKindToLookFor) {
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

    return { name, parentName, node, isOptional };
  };

  private testUsageApiIdentifierFactory = (
    node: ts.Identifier
  ): TestUsageApiSymbol => {
    let apiParentNodeKindToLookFor: ts.SyntaxKind | undefined;
    const name = node.getText();
    switch (node.parent.kind) {
      case ts.SyntaxKind.CallExpression:
        apiParentNodeKindToLookFor = ts.SyntaxKind.CallExpression;
        break;
      case ts.SyntaxKind.PropertyAssignment:
        apiParentNodeKindToLookFor = ts.SyntaxKind.VariableDeclaration;
        break;
      case ts.SyntaxKind.PropertyAccessExpression:
        apiParentNodeKindToLookFor = ts.SyntaxKind.PropertyAccessExpression;
        break;
      default:
        apiParentNodeKindToLookFor = undefined;
    }

    let parentName: string | undefined;
    let parentExpected = true;
    if (apiParentNodeKindToLookFor) {
      let parent: ts.Node = node.parent;
      while (parent.kind !== apiParentNodeKindToLookFor) {
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

    let parent: ts.Node = node.parent;
    let usageSection: 'minApiUsage' | 'maxApiUsage' | undefined;
    while (parent) {
      if (parent.kind == ts.SyntaxKind.VariableDeclaration) {
        const parentName = (parent as ts.VariableDeclaration).name.getText();
        if (parentName === 'minApiUsage') {
          usageSection = 'minApiUsage';
        } else if (parentName === 'maxApiUsage') {
          usageSection = 'maxApiUsage';
        }
      }

      parent = parent.parent;
    }

    if (!usageSection) {
      throw new Error('Unable to find usage section');
    }

    return { name, parentName, node, usageSection };
  };

  private collectSymbolIdentifiersRecursively = (
    node: ts.Node,
    accumulator: Array<ApiSymbol>,
    symbolIdentifierFactory: (node: ts.Identifier) => ApiSymbol
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
