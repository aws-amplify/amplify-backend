import * as prettier from 'prettier';

const CODEGEN_WARNING =
  'this is an auto generated file. This will be overwritten';
const LINE_DELIMITOR = '\n';

type Statements = [string, string][];
/**
 * Utility class to format the generated GraphQL statements based on frontend language type
 */
export class GraphQLStatementsFormatter {
  private lintOverrides: any[] = [];
  private headerComments: string[] = [];
  /**
   *
   */
  constructor(
    private language: keyof typeof GraphQLStatementsFormatter.parserMap = 'graphql',
  ) {}

  format = (statements: Statements) => {
    switch (this.language) {
      case 'javascript':
        this.headerComments.push(CODEGEN_WARNING);
        this.lintOverrides.push('/* eslint-disable */');
        return this.prettify(this.formatJS(statements));
      case 'typescript':
        this.headerComments.push(CODEGEN_WARNING);
        this.lintOverrides.push(
          ...['/* tslint:disable */', '/* eslint-disable */'],
        );
        return this.prettify(this.formatJS(statements));
      case 'flow':
        this.headerComments.push('@flow', CODEGEN_WARNING);
        return this.prettify(this.formatJS(statements));
      default:
        this.headerComments.push(CODEGEN_WARNING);
        return this.prettify(this.formatGraphQL(statements));
    }
  };

  private formatGraphQL = (statements: Statements) => {
    const headerBuffer = this.headerComments
      .map((comment) => `# ${comment}`)
      .join(LINE_DELIMITOR);
    const statementsBuffer = statements
      ? [...statements.values()].join(LINE_DELIMITOR)
      : '';
    const formattedOutput = [
      headerBuffer,
      LINE_DELIMITOR,
      statementsBuffer,
    ].join(LINE_DELIMITOR);
    return formattedOutput;
  };

  private formatJS = (statements: Statements): string => {
    const lintOverridesBuffer = this.lintOverrides.join(LINE_DELIMITOR);
    const headerBuffer = this.headerComments
      .map((comment) => `// ${comment}`)
      .join(LINE_DELIMITOR);
    const formattedStatements = [];
    if (statements) {
      for (const [key, value] of statements) {
        formattedStatements.push(
          `export const ${key} = /* GraphQL */ \`${value}\``,
        );
      }
    }
    const formattedOutput = [
      lintOverridesBuffer,
      headerBuffer,
      LINE_DELIMITOR,
      ...formattedStatements,
    ].join(LINE_DELIMITOR);
    return formattedOutput;
  };

  private static parserMap = {
    javascript: 'babel',
    graphql: 'graphql',
    typescript: 'typescript',
    flow: 'flow',
    angular: 'graphql',
  };

  private prettify = (output: string) => {
    return prettier.format(output, {
      parser: GraphQLStatementsFormatter.parserMap[this.language || 'graphql'],
    });
  };
}
