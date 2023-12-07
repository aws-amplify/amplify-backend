import path from 'path';
import { existsSync } from 'fs';
import * as fsp from 'fs/promises';
import ts from 'typescript';
import { glob } from 'glob';

type ApiSymbol = {
  readonly name: string;
  readonly parentName: string | undefined;
  readonly node: ts.Identifier;
};

type ExpectedApiSymbolUsagePredicate = (
  testUsageSymbol: TestUsageApiSymbol
) => boolean;

type ExpectedApiSymbol = ApiSymbol & {
  readonly isOptional: boolean | undefined;
  readonly description: string;
  readonly usagePredicate: ExpectedApiSymbolUsagePredicate;
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
        (item) => expectedApiIdentifier.usagePredicate(item)
      );
      if (matchedIdentifiersUsedInTest.length === 0) {
        throw new Error(expectedApiIdentifier.description);
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
  ): ExpectedApiSymbol | undefined => {
    let isOptional: boolean | undefined;
    const name = node.getText();
    let usagePredicate: ExpectedApiSymbolUsagePredicate | undefined;
    let parentName: string | undefined;
    let description: string | undefined;
    if (
      node.parent.kind === ts.SyntaxKind.TypeReference &&
      ['Partial', 'Promise'].includes(name)
    ) {
      // Skip built in types
      return undefined;
    } else if (node.parent.kind === ts.SyntaxKind.Parameter) {
      const parent = this.findParentNode(
        node,
        ts.SyntaxKind.VariableDeclaration,
        ts.SyntaxKind.Constructor
      );
      switch (parent.kind) {
        case ts.SyntaxKind.VariableDeclaration:
          parentName = (parent as ts.VariableDeclaration).name.getText();
          description = `Parameter ${name} of function ${parentName} must be used`;
          usagePredicate = (testUsageSymbol): boolean => {
            if (
              testUsageSymbol.node.parent.kind === ts.SyntaxKind.CallExpression
            ) {
              const callExpression = testUsageSymbol.node
                .parent as ts.CallExpression;
              const isFunctionNameMatching =
                callExpression.expression.getText() === parentName;
              const isUsingArgument =
                callExpression.arguments.find(
                  (arg) => arg.getText() === name
                ) !== undefined;
              return isFunctionNameMatching && isUsingArgument;
            }
            return false;
          };
          break;
        case ts.SyntaxKind.Constructor:
          parentName = (
            parent as ts.ConstructorDeclaration
          ).parent.name?.getText();
          if (!parentName) {
            throw new Error('Class name not found');
          }
          description = `Parameter ${name} of ${parentName}'s constructor must be used`;
          usagePredicate = (testUsageSymbol): boolean => {
            if (
              testUsageSymbol.node.parent.kind === ts.SyntaxKind.NewExpression
            ) {
              return (
                (
                  testUsageSymbol.node.parent as ts.NewExpression
                ).expression.getText() === parentName
              );
            }
            return false;
          };
          break;
        default:
          throw new Error('Unexpected parent');
      }
      const parameterDeclaration = node.parent as ts.ParameterDeclaration;
      if (
        parameterDeclaration.questionToken ||
        parameterDeclaration.initializer
      ) {
        isOptional = true;
      }
    } else if (node.parent.kind === ts.SyntaxKind.PropertySignature) {
      const parent = this.findParentNode(
        node,
        ts.SyntaxKind.TypeAliasDeclaration
      );
      parentName = (parent as ts.TypeAliasDeclaration).name.getText();
      description = `Property ${name} of type ${parentName} must be used`;
      usagePredicate = (testUsageSymbol): boolean => {
        if (
          testUsageSymbol.name === name &&
          (testUsageSymbol.node.parent.kind ===
            ts.SyntaxKind.PropertyAssignment ||
            testUsageSymbol.node.parent.kind ===
              ts.SyntaxKind.ShorthandPropertyAssignment)
        ) {
          const parentVariableDeclaration = this.tryFindParentNode(
            testUsageSymbol.node,
            ts.SyntaxKind.VariableDeclaration
          );
          if (parentVariableDeclaration) {
            return (
              (
                parentVariableDeclaration as ts.VariableDeclaration
              ).type?.getText() === parentName
            );
          }
        }
        return false;
      };
      const propertySignature = node.parent as ts.PropertySignature;
      if (
        propertySignature.questionToken ||
        propertySignature.type?.getText().includes('undefined')
      ) {
        isOptional = true;
      }
    } else if (node.parent.kind === ts.SyntaxKind.EnumMember) {
      const parent = this.findParentNode(node, ts.SyntaxKind.EnumDeclaration);
      parentName = (parent as ts.EnumDeclaration).name.getText();
      description = `Member ${name} of enum ${parentName} must be used`;
      usagePredicate = (testUsageSymbol): boolean => {
        if (
          testUsageSymbol.name === name &&
          testUsageSymbol.node.parent.kind ===
            ts.SyntaxKind.PropertyAccessExpression
        ) {
          const propertyAccessExpression = testUsageSymbol.node
            .parent as ts.PropertyAccessExpression;
          return (
            propertyAccessExpression.name.getText() === name &&
            propertyAccessExpression.expression.getText() === parentName
          );
        }
        return false;
      };
    } else if (
      node.parent.kind === ts.SyntaxKind.ExpressionWithTypeArguments &&
      node.parent.parent.kind === ts.SyntaxKind.HeritageClause
    ) {
      parentName = (
        node.parent.parent.parent as ts.ClassDeclaration
      ).name?.getText();
      if (!parentName) {
        throw new Error('Class name not found');
      }
      description = `Class ${parentName} must be assignable to ${name}`;
      usagePredicate = (testUsageSymbol): boolean => {
        if (
          testUsageSymbol.node.parent.kind === ts.SyntaxKind.VariableDeclaration
        ) {
          const variableDeclaration = testUsageSymbol.node
            .parent as ts.VariableDeclaration;
          const isDeclaringSuperType =
            variableDeclaration.type?.getText() === name;
          const isInitializerCallingConstructor =
            variableDeclaration.initializer?.kind ===
            ts.SyntaxKind.NewExpression;
          if (isDeclaringSuperType && isInitializerCallingConstructor) {
            return (
              (
                variableDeclaration.initializer as ts.NewExpression
              ).expression.getText() === parentName
            );
          }
        }
        return false;
      };
    } else if (
      node.parent.kind === ts.SyntaxKind.TypeReference &&
      (
        [
          ts.SyntaxKind.IntersectionType,
          ts.SyntaxKind.Parameter,
          ts.SyntaxKind.PropertySignature,
          ts.SyntaxKind.TypeReference,
        ] as Array<ts.SyntaxKind>
      ).includes(node.parent.parent.kind)
    ) {
      // Skip type algebra, parameter type declaration, property type declaration, etc.
      return undefined;
    } else if (
      node.parent.kind === ts.SyntaxKind.TypeAliasDeclaration ||
      node.parent.kind === ts.SyntaxKind.TypeReference
    ) {
      description = `Type ${name} must be used`;
      usagePredicate = (testUsageSymbol): boolean => {
        if (
          testUsageSymbol.node.parent.kind === ts.SyntaxKind.VariableDeclaration
        ) {
          return (
            (
              testUsageSymbol.node.parent as ts.VariableDeclaration
            ).type?.getText() === name
          );
        }
        return false;
      };
    } else if (node.parent.kind === ts.SyntaxKind.ClassDeclaration) {
      description = `Class ${name} must be used`;
      usagePredicate = (testUsageSymbol): boolean => {
        if (testUsageSymbol.node.parent.kind === ts.SyntaxKind.NewExpression) {
          return (
            (
              testUsageSymbol.node.parent as ts.NewExpression
            ).expression.getText() === name
          );
        }
        return false;
      };
    } else if (node.parent.kind === ts.SyntaxKind.EnumDeclaration) {
      description = `Enum ${name} must be used`;
      usagePredicate = (testUsageSymbol): boolean => {
        if (
          testUsageSymbol.name === name &&
          testUsageSymbol.node.parent.kind ===
            ts.SyntaxKind.PropertyAccessExpression
        ) {
          return (
            (
              testUsageSymbol.node.parent as ts.PropertyAccessExpression
            ).expression.getText() === name
          );
        }
        return false;
      };
    } else if (node.parent.kind === ts.SyntaxKind.VariableDeclaration) {
      description = `Function ${name} must be used`;
      usagePredicate = (testUsageSymbol): boolean => {
        if (testUsageSymbol.node.parent.kind === ts.SyntaxKind.CallExpression) {
          return (
            (
              testUsageSymbol.node.parent as ts.CallExpression
            ).expression.getText() === name
          );
        }
        return false;
      };
    } else {
      throw new Error(`Unknown symbol encountered ${name}`);
    }

    if (!usagePredicate) {
      throw new Error('Usage predicate is missing');
    }

    if (!description) {
      throw new Error('Description is missing');
    }

    return { name, parentName, node, isOptional, usagePredicate, description };
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
      case ts.SyntaxKind.ShorthandPropertyAssignment:
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
      const parent = this.findParentNode(node, apiParentNodeKindToLookFor);

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

  private tryFindParentNode = (
    node: ts.Node,
    ...possibleParentSyntaxKinds: ts.SyntaxKind[]
  ): ts.Node | undefined => {
    let parent: ts.Node | undefined = node.parent;
    const possibleParentSyntaxKindsSet: Set<ts.SyntaxKind> = new Set(
      possibleParentSyntaxKinds
    );
    while (parent && !possibleParentSyntaxKindsSet.has(parent.kind)) {
      parent = parent.parent;
    }

    return parent;
  };

  private findParentNode = (
    node: ts.Node,
    ...possibleParentSyntaxKinds: ts.SyntaxKind[]
  ): ts.Node => {
    const parent: ts.Node | undefined = this.tryFindParentNode(
      node,
      ...possibleParentSyntaxKinds
    );
    if (!parent) {
      throw new Error('Parent not found');
    }
    return parent;
  };

  private collectSymbolIdentifiersRecursively = (
    node: ts.Node,
    accumulator: Array<ApiSymbol>,
    symbolIdentifierFactory: (node: ts.Identifier) => ApiSymbol | undefined
  ) => {
    if (node.kind === ts.SyntaxKind.Identifier) {
      const isUsedInImports =
        this.tryFindParentNode(node, ts.SyntaxKind.ImportSpecifier) !==
        undefined;
      if (!isUsedInImports) {
        const item = symbolIdentifierFactory(node as ts.Identifier);
        if (item) {
          accumulator.push(item);
        }
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

let allPackages = await glob('packages/*');
allPackages = allPackages.slice(0, 1);
allPackages.unshift('packages/client-config');
// allPackages = ['packages/storage-construct'];
for (const pkg of allPackages) {
  console.log(`Validating api tests of ${pkg}`);
  const validator = new ApiTestValidator(pkg);
  await validator.validate();
}
