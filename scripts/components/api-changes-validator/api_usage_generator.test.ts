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
export const someFunction1: () => void;
export const someFunction2: (param1: string, param2?: number) => string;
export const someFunction3: (param1: string, param2: number = 1) => string;
export const someFunction4: <T1, T2, T3>(param1: T1, param2?: T2) => Promise<T3>;
    `,
    expectedApiUsage: `
import { someFunction1 } from 'samplePackageName';
import { someFunction2 } from 'samplePackageName';
import { someFunction3 } from 'samplePackageName';
import { someFunction4 } from 'samplePackageName';

const someFunction1UsageFunction = () => {
    someFunction1();
    someFunction1();
}

const someFunction2UsageFunction = (param1: string, param2?: number) => {
    const returnValue: string = someFunction2(param1);
    someFunction2(param1, param2);
}

const someFunction3UsageFunction = (param1: string, param2: number = 1) => {
    const returnValue: string = someFunction3(param1);
    someFunction3(param1, param2);
}

const someFunction4UsageFunction = <T1, T2, T3>(param1: T1, param2?: T2) => {
    const returnValue: Promise<T3> = someFunction4(param1);
    someFunction4(param1, param2);
}
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
      console.log(apiUsage);
      assert.strictEqual(apiUsage.trim(), testCase.expectedApiUsage.trim());
    });
  }
});
