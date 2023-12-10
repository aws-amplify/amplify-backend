import { describe, it } from 'node:test';
import assert from 'node:assert';
import { ApiReportParser } from './api_report_parser.js';
import { ApiUsageGenerator } from './api_usage_generator.js';

type UsageGeneratorTestCase = {
  description: string;
  apiReport: string;
  expectedApiUsage: string;
};

const testCases: Array<UsageGeneratorTestCase> = [
  {
    description: 'generates type usage',
    apiReport: `
\`\`\`ts
export type SomeType = {
    someProperty: string;
};
\`\`\`
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
    apiReport: `
\`\`\`ts
export enum SomeEnum {
    SOME_MEMBER = "some-member"
}
\`\`\`
    `,
    expectedApiUsage: `
import { SomeEnum } from 'samplePackageName';

let someEnumUsageVariable: SomeEnum;
someEnumUsageVariable = SomeEnum.SOME_MEMBER;
    `,
  },
  {
    description: 'generates import statement usage',
    apiReport: `
\`\`\`ts
import { SomeType } from 'some-package';
\`\`\`
    `,
    expectedApiUsage: `
import { SomeType } from 'some-package';
    `,
  },
  {
    description: 'generates const/function usage',
    apiReport: `
\`\`\`ts
export const someConst: string;
export const someFunction: () => void;
\`\`\`
    `,
    expectedApiUsage: `
import { someConst } from 'samplePackageName';
import { someFunction } from 'samplePackageName';
    `,
  },
  {
    description: 'generates class usage',
    apiReport: `
\`\`\`ts
export class SomeClass {
    constructor(someConstructorParameter: string);
    someMethod: () => void;
}
\`\`\`
    `,
    expectedApiUsage: `
import { SomeClass } from 'samplePackageName';
    `,
  },
];

void describe('Api usage generator', () => {
  for (const testCase of testCases) {
    void it(testCase.description, () => {
      const apiReportAST = ApiReportParser.parse(testCase.apiReport);
      const apiUsage = new ApiUsageGenerator(
        'samplePackageName',
        apiReportAST
      ).generate();
      assert.strictEqual(apiUsage.trim(), testCase.expectedApiUsage.trim());
    });
  }
});
