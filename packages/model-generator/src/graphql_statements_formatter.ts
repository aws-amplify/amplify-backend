import * as prettier from 'prettier';

const CODEGEN_WARNING =
  'this is an auto generated file. This will be overwritten';
const LINE_DELIMITOR = '\n';

type Statements = Map<string, string>;
/**
 * Format the generated GraphQL statements based on frontend language type
 */
export class GraphQLStatementsFormatter {
  private lintOverrides: ([string, string] | string)[] = [];
  private headerComments: string[] = [];

  /**
   * Formats graphql statements for typescript
   */
  format = (statements: Statements): Promise<string> => {
    this.headerComments.push(CODEGEN_WARNING);
    this.lintOverrides.push(
      ...['/* tslint:disable */', '/* eslint-disable */']
    );
    return this.prettify(this.formatJS(statements));
  };

  private formatJS = (statements: Statements): string => {
    const lintOverridesBuffer = this.lintOverrides.join(LINE_DELIMITOR);
    const headerBuffer = this.headerComments
      .map((comment) => `// ${comment}`)
      .join(LINE_DELIMITOR);
    const formattedStatements: string[] = [];
    if (statements) {
      for (const [key, value] of statements) {
        formattedStatements.push(
          `export const ${key} = /* GraphQL */ \`${value}\``
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
    typescript: 'typescript',
  };

  private prettify = async (output: string): Promise<string> => {
    return prettier.format(output, {
      parser: GraphQLStatementsFormatter.parserMap.typescript,
    });
  };
}
