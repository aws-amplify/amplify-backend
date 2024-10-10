import ts from 'typescript';
import { EOL } from 'os';
import {
  NamespaceDefinitions,
  UsageStatementsGeneratorOutput,
} from './types.js';
import {
  ClassUsageStatementsGenerator,
  EnumUsageStatementsGenerator,
  ImportUsageStatementsGenerator,
  TypeUsageStatementsGenerator,
  VariableUsageStatementsGenerator,
} from './api_usage_statements_generators.js';
import { ImportStatementsRenderer } from './import_statements_renderer.js';
import { UsageStatementsRenderer } from './usage_statemets_renderer.js';

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
    private readonly apiReportAST: ts.SourceFile,
    private readonly excludedTypes: Array<string>
  ) {
    this.namespaceDefinitions = this.getNamespaceDefinitions();
  }

  generate = (): string => {
    const generatorOutputs: Array<UsageStatementsGeneratorOutput> = [];

    // go over top level statements and generate usage for them
    for (const statement of this.apiReportAST.statements) {
      const generatorOutputForNode = this.generateStatementsForNode(statement);
      if (generatorOutputForNode) {
        generatorOutputs.push(generatorOutputForNode);
      }
    }

    const importStatements = new ImportStatementsRenderer(
      generatorOutputs,
      this.namespaceDefinitions,
      this.packageName
    ).render();
    const usageStatements = new UsageStatementsRenderer(
      generatorOutputs,
      this.namespaceDefinitions
    ).render();

    return `${importStatements}${EOL}${EOL}${usageStatements}${EOL}`;
  };

  private generateStatementsForNode = (
    node: ts.Node
  ): UsageStatementsGeneratorOutput | undefined => {
    switch (node.kind) {
      case ts.SyntaxKind.ImportDeclaration:
        return new ImportUsageStatementsGenerator(
          node as ts.ImportDeclaration
        ).generate();
      case ts.SyntaxKind.TypeAliasDeclaration:
        return new TypeUsageStatementsGenerator(
          node as ts.TypeAliasDeclaration,
          this.packageName,
          this.excludedTypes
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
      namespaceNames: new Set<string>(),
      topLevelNamespaces: new Set<string>(),
      aliasedSymbols: new Map<string, string>(),
    };
    for (const statement of this.apiReportAST.statements) {
      if (statement.kind === ts.SyntaxKind.ModuleDeclaration) {
        const moduleDeclaration = statement as ts.ModuleDeclaration;
        const namespaceName = moduleDeclaration.name.getText();
        namespaceDefinitions.namespaceNames.add(namespaceName);
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
                  let symbolNameInApiView: string;
                  if (namedExport.propertyName) {
                    // If property name is present this means that
                    // API Extractor aliased type definition to avoid duplicate
                    // and exported from namespace as 'SomeType_2 as SomeType'
                    symbolNameInApiView = namedExport.propertyName.getText();
                    const exportedSymbolName = namedExport.name.getText();
                    namespaceDefinitions.aliasedSymbols.set(
                      symbolNameInApiView,
                      exportedSymbolName
                    );
                  } else {
                    symbolNameInApiView = namedExport.name.getText();
                  }
                  namespaceDefinitions.namespaceBySymbol.set(
                    symbolNameInApiView,
                    namespaceName
                  );
                }
              }
            }
          }
        }
      }
    }

    for (const namespaceName of namespaceDefinitions.namespaceNames) {
      if (!namespaceDefinitions.namespaceBySymbol.has(namespaceName)) {
        // Top level namespaces won't be included in mapping.
        namespaceDefinitions.topLevelNamespaces.add(namespaceName);
      }
    }

    return namespaceDefinitions;
  };
}
