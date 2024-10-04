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
export type SomeType1 = {
    someProperty: string;
};
export type SomeType2<T1, T2> = {
    someProperty1: T1;
    someProperty1: T2;
};
    `,
    expectedApiUsage: `
import { SomeType1 } from 'samplePackageName';
import { SomeType2 } from 'samplePackageName';

type SomeType1Baseline = {
    someProperty: string;
}
const someType1UsageFunction = (someType1FunctionParameter: SomeType1Baseline) => {
  const someType1: SomeType1 = someType1FunctionParameter;
}

type SomeType2Baseline<T1, T2> = {
    someProperty1: T1;
    someProperty1: T2;
}
const someType2UsageFunction = <T1, T2>(someType2FunctionParameter: SomeType2Baseline<T1, T2>) => {
  const someType2: SomeType2<T1, T2> = someType2FunctionParameter;
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
export const someFunction5: (param1: string, ...param2: number) => string;
    `,
    expectedApiUsage: `
import { someFunction1 } from 'samplePackageName';
import { someFunction2 } from 'samplePackageName';
import { someFunction3 } from 'samplePackageName';
import { someFunction4 } from 'samplePackageName';
import { someFunction5 } from 'samplePackageName';

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

const someFunction5UsageFunction = (param1: string, ...param2: number) => {
  const returnValue: string = someFunction5(param1, ...param2);
  someFunction5(param1, ...param2);
}
    `,
  },
  {
    description: 'generates class usage',
    apiReportCode: `
export class SomeClass1 {
}
export class SomeClass2 {
  constructor(param1: string, param2?: string);
}
export class SomeClass3 {
  someMethod: (param1: string, param2?: string) => string;
}
export class SomeClass4 {
  someProperty: string;
  someOptionalProperty?: string;
}
export class SomeClass5 {
  static someStaticMethod: (param1: string, param2?: string) => string;
}
export class SomeClass6 {
  static someStaticProperty: string;
}
export class SomeClass7<T1 extends SomeClass1, T2, T3, T4, T5, T6> {
  constructor(param1: T1, param2?: T2);
  someMethod: (param1: T3, param2?: T4) => T5;
  someProperty: T6;
}
export class SomeClass8 {
  someMethod: (param1: string, ...param2: string) => string;
}
export abstract class SomeAbstractClass1 {
  constructor(param1: string, param2?: string);
  someMethod: (param1: string, param2?: string) => string;
  someProperty: string;
  static someStaticMethod: (param1: string, param2?: string) => string;
  static someStaticProperty: string;
}
export abstract class SomeAbstractClass2<T1 extends SomeClass1, T2, T3, T4, T5, T6> {
  constructor(param1: T1, param2?: T2);
}
    `,
    expectedApiUsage: `
import { SomeClass1 } from 'samplePackageName';
import { SomeClass2 } from 'samplePackageName';
import { SomeClass3 } from 'samplePackageName';
import { SomeClass4 } from 'samplePackageName';
import { SomeClass5 } from 'samplePackageName';
import { SomeClass6 } from 'samplePackageName';
import { SomeClass7 } from 'samplePackageName';
import { SomeClass8 } from 'samplePackageName';
import { SomeAbstractClass1 } from 'samplePackageName';
import { SomeAbstractClass2 } from 'samplePackageName';

const someClass2ConstructorUsageFunction = (param1: string, param2?: string) => {
  new SomeClass2(param1);
  new SomeClass2(param1, param2);
}


const someClass3SomeMethodUsageOuterFunction = (someClass3SomeMethodUsageOuterFunctionParameter: SomeClass3) => {
  const SomeClass3SomeMethodUsageInnerFunction = (param1: string, param2?: string) => {
    const returnValue: string = someClass3SomeMethodUsageOuterFunctionParameter.someMethod(param1);
    someClass3SomeMethodUsageOuterFunctionParameter.someMethod(param1, param2);
  }
}


const someClass4SomePropertyUsageOuterFunction = (someClass4SomePropertyUsageOuterFunctionParameter: SomeClass4) => {
  const propertyValue: string = someClass4SomePropertyUsageOuterFunctionParameter.someProperty;
}
const someClass4SomeOptionalPropertyUsageOuterFunction = (someClass4SomeOptionalPropertyUsageOuterFunctionParameter: SomeClass4) => {
  const propertyValue: string | undefined = someClass4SomeOptionalPropertyUsageOuterFunctionParameter.someOptionalProperty;
}


const someClass5SomeStaticMethodUsageOuterFunction = (someClass5SomeStaticMethodUsageOuterFunctionParameter: SomeClass5) => {
  const SomeClass5SomeStaticMethodUsageInnerFunction = (param1: string, param2?: string) => {
    const returnValue: string = SomeClass5.someStaticMethod(param1);
    SomeClass5.someStaticMethod(param1, param2);
  }
}


const someClass6SomeStaticPropertyUsageOuterFunction = (someClass6SomeStaticPropertyUsageOuterFunctionParameter: SomeClass6) => {
  const propertyValue: string = SomeClass6.someStaticProperty;
}


const someClass7ConstructorUsageFunction = <T1 extends SomeClass1, T2, T3, T4, T5, T6>(param1: T1, param2?: T2) => {
  new SomeClass7<T1, T2, T3, T4, T5, T6>(param1);
  new SomeClass7<T1, T2, T3, T4, T5, T6>(param1, param2);
}
const someClass7SomeMethodUsageOuterFunction = <T1 extends SomeClass1, T2, T3, T4, T5, T6>(someClass7SomeMethodUsageOuterFunctionParameter: SomeClass7<T1, T2, T3, T4, T5, T6>) => {
  const SomeClass7SomeMethodUsageInnerFunction = (param1: T3, param2?: T4) => {
    const returnValue: T5 = someClass7SomeMethodUsageOuterFunctionParameter.someMethod(param1);
    someClass7SomeMethodUsageOuterFunctionParameter.someMethod(param1, param2);
  }
}
const someClass7SomePropertyUsageOuterFunction = <T1 extends SomeClass1, T2, T3, T4, T5, T6>(someClass7SomePropertyUsageOuterFunctionParameter: SomeClass7<T1, T2, T3, T4, T5, T6>) => {
  const propertyValue: T6 = someClass7SomePropertyUsageOuterFunctionParameter.someProperty;
}


const someClass8SomeMethodUsageOuterFunction = (someClass8SomeMethodUsageOuterFunctionParameter: SomeClass8) => {
  const SomeClass8SomeMethodUsageInnerFunction = (param1: string, ...param2: string) => {
    const returnValue: string = someClass8SomeMethodUsageOuterFunctionParameter.someMethod(param1, ...param2);
    someClass8SomeMethodUsageOuterFunctionParameter.someMethod(param1, ...param2);
  }
}


class SomeAbstractClass1DerivedUsageClass extends SomeAbstractClass1{
  constructor(param1: string, param2?: string) {
    super(param1, param2);
  }
}
const someAbstractClass1SomeMethodUsageOuterFunction = (someAbstractClass1SomeMethodUsageOuterFunctionParameter: SomeAbstractClass1) => {
  const SomeAbstractClass1SomeMethodUsageInnerFunction = (param1: string, param2?: string) => {
    const returnValue: string = someAbstractClass1SomeMethodUsageOuterFunctionParameter.someMethod(param1);
    someAbstractClass1SomeMethodUsageOuterFunctionParameter.someMethod(param1, param2);
  }
}
const someAbstractClass1SomePropertyUsageOuterFunction = (someAbstractClass1SomePropertyUsageOuterFunctionParameter: SomeAbstractClass1) => {
  const propertyValue: string = someAbstractClass1SomePropertyUsageOuterFunctionParameter.someProperty;
}
const someAbstractClass1SomeStaticMethodUsageOuterFunction = (someAbstractClass1SomeStaticMethodUsageOuterFunctionParameter: SomeAbstractClass1) => {
  const SomeAbstractClass1SomeStaticMethodUsageInnerFunction = (param1: string, param2?: string) => {
    const returnValue: string = SomeAbstractClass1.someStaticMethod(param1);
    SomeAbstractClass1.someStaticMethod(param1, param2);
  }
}
const someAbstractClass1SomeStaticPropertyUsageOuterFunction = (someAbstractClass1SomeStaticPropertyUsageOuterFunctionParameter: SomeAbstractClass1) => {
  const propertyValue: string = SomeAbstractClass1.someStaticProperty;
}


class SomeAbstractClass2DerivedUsageClass<T1 extends SomeClass1, T2, T3, T4, T5, T6> extends SomeAbstractClass2<T1, T2, T3, T4, T5, T6>{
  constructor(param1: T1, param2?: T2) {
    super(param1, param2);
  }
}
    `,
  },
  {
    description: 'generates class inheritance usage',
    apiReportCode: `
export type SomeType1 = {
};
export type SomeType2<T1, T2> = {
};
export abstract class SomeAbstractClass<T1, T2> {
}
export class SomeClass<T1, T2, T3, T4> extends SomeAbstractClass<T1, T2> implements SomeType1, SomeType2<T3, T4>{
}
    `,
    expectedApiUsage: `
import { SomeType1 } from 'samplePackageName';
import { SomeType2 } from 'samplePackageName';
import { SomeAbstractClass } from 'samplePackageName';
import { SomeClass } from 'samplePackageName';

type SomeType1Baseline = {
}
const someType1UsageFunction = (someType1FunctionParameter: SomeType1Baseline) => {
  const someType1: SomeType1 = someType1FunctionParameter;
}

type SomeType2Baseline<T1, T2> = {
}
const someType2UsageFunction = <T1, T2>(someType2FunctionParameter: SomeType2Baseline<T1, T2>) => {
  const someType2: SomeType2<T1, T2> = someType2FunctionParameter;
}

const someClassInheritanceUsageFunction = <T1, T2, T3, T4>(someClassInheritanceUsageFunctionParameter: SomeClass<T1, T2, T3, T4>) => {
  const superTypeUsageConst0: SomeAbstractClass<T1, T2> = someClassInheritanceUsageFunctionParameter;
  const superTypeUsageConst1: SomeType1 = someClassInheritanceUsageFunctionParameter;
  const superTypeUsageConst2: SomeType2<T3, T4> = someClassInheritanceUsageFunctionParameter;
}
    `,
  },
  {
    description: 'generates type usage',
    apiReportCode: `
export type SomeTypeUnderNamespace = {
  someProperty: string;
}

type SomeTypeUnderSubNamespace = {
  someOtherProperty: string;
}

declare namespace someSubNamespace {
  export {
    SomeTypeUnderSubNamespace
  }
}

declare namespace someNamespace {
  export {
    SomeTypeUnderNamespace,
    someSubNamespace
  }
}
    `,
    expectedApiUsage: `
import { someNamespace } from 'samplePackageName';

type SomeTypeUnderNamespaceBaseline = {
  someProperty: string;
}
const someTypeUnderNamespaceUsageFunction = (someTypeUnderNamespaceFunctionParameter: SomeTypeUnderNamespaceBaseline) => {
  const someTypeUnderNamespace: someNamespace.SomeTypeUnderNamespace = someTypeUnderNamespaceFunctionParameter;
}

type SomeTypeUnderSubNamespaceBaseline = {
  someOtherProperty: string;
}
const someTypeUnderSubNamespaceUsageFunction = (someTypeUnderSubNamespaceFunctionParameter: SomeTypeUnderSubNamespaceBaseline) => {
  const someTypeUnderSubNamespace: someNamespace.someSubNamespace.SomeTypeUnderSubNamespace = someTypeUnderSubNamespaceFunctionParameter;
}
    `,
  },
  {
    description: 'Skips ignored type',
    apiReportCode: `
export type SampleIgnoredType = {
  someProperty: string;
}
    `,
    expectedApiUsage: '',
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
        apiReportAST,
        ['SampleIgnoredType']
      ).generate();
      assert.strictEqual(
        // .replace() removes EOL differences between Windows and other OS so output matches for all
        apiUsage.replace(/[\r]/g, '').trim(),
        testCase.expectedApiUsage.trim()
      );
    });
  }
});
