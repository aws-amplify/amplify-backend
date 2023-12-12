import { describe, it } from 'node:test';
import assert from 'node:assert';
import { ApiReportParser } from './api_report_parser.js';
import { ApiUsageGenerator } from './api_usage_generator.js';
import { EOL } from 'os';

type UsageGeneratorTestCase = {
  description: string;
  apiReportCode: string;
  expectedApiUsage: string;
};

const testCases: Array<UsageGeneratorTestCase> = [
  {
    description: 'generates type usage',
    apiReportCode: `
export type SomeType = {
    someProperty: string;
};
    `,
    expectedApiUsage: `
import { SomeType } from 'samplePackageName';

type SomeTypeBaseline = {
    someProperty: string;
}
const SomeTypeUsageFunction = (someTypeFunctionParameter: SomeTypeBaseline) => {
    const someType: SomeType = someTypeFunctionParameter;
}
    `,
  },
  {
    description: 'generates enum usage',
    apiReportCode: `
export enum SomeEnum {
    SOME_MEMBER = "some-member"
}
    `,
    expectedApiUsage: `
import { SomeEnum } from 'samplePackageName';

let someEnumUsageVariable: SomeEnum;
someEnumUsageVariable = SomeEnum.SOME_MEMBER;
    `,
  },
  {
    description: 'generates import statement usage',
    apiReportCode: `
import { SomeType } from 'some-package';
    `,
    expectedApiUsage: `
import { SomeType } from 'some-package';
    `,
  },
  {
    description: 'generates const usage',
    apiReportCode: `
export const someConst: string;
    `,
    expectedApiUsage: `
import { someConst } from 'samplePackageName';
    `,
  },
  {
    description: 'generates arrow function usage',
    apiReportCode: `
export const someFunction: () => void;
    `,
    expectedApiUsage: `
import { someFunction } from 'samplePackageName';
    `,
  },
  {
    description: 'generates class usage',
    apiReportCode: `
export class SomeClass {
    constructor(someConstructorParameter: string);
    someMethod: () => void;
}
    `,
    expectedApiUsage: `
import { SomeClass } from 'samplePackageName';
    `,
  },
];

const nestInMarkdownCodeBlock = (apiReportCode: string) => {
  return `'\`\`\`ts'${EOL}${apiReportCode}${EOL}\`\`\`${EOL}`;
};

void describe('Api usage generator', () => {
  for (const testCase of testCases) {
    void it(testCase.description, () => {
      const apiReportAST = ApiReportParser.parse(
        nestInMarkdownCodeBlock(testCase.apiReportCode)
      );
      const apiUsage = new ApiUsageGenerator(
        'samplePackageName',
        apiReportAST
      ).generate();
      assert.strictEqual(apiUsage.trim(), testCase.expectedApiUsage.trim());
    });
  }
});
