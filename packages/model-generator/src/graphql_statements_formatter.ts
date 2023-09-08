import * as prettier from 'prettier';
import os from 'os';

const CODEGEN_WARNING =
  'This is an auto generated file. Edits will be overwritten.';
const LINE_DELIMITOR = os.EOL;

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
    return this.formatJS(statements);
  };

  private formatJS = async (statements: Statements): Promise<string> => {
    const lintOverridesBuffer = this.lintOverrides.join(LINE_DELIMITOR);
    const headerBuffer = this.headerComments
      .map((comment) => `// ${comment}`)
      .join(LINE_DELIMITOR);
    const formattedStatements: string[] = [];
    for (const [key, value] of statements) {
      formattedStatements.push(
        `export const ${key} = /* GraphQL */ \`${value}\``
      );
    }
    const formattedOutput = [
      lintOverridesBuffer,
      headerBuffer,
      LINE_DELIMITOR,
      ...formattedStatements,
    ].join(LINE_DELIMITOR);
    return prettier.format(formattedOutput, {
      parser: GraphQLStatementsFormatter.parserMap.typescript,
    });
  };

  private static parserMap = {
    typescript: 'typescript',
  };
}
