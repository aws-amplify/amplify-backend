```ts
export enum SampleEnum {
  FIRST_MEMBER = 'first-member',
  SECOND_MEMBER = 'second-member',
}

export type SampleType = {
  someProperty: string;
  anotherProperty?: string;
};

export type SampleTypeWithTypeParam<T, D extends SampleType> = {
  someProperty: T;
  anotherProperty?: D;
};

export class SampleClass1 {}
export class SampleClass2 {
  constructor(param1: string, param2?: string);
}
export class SampleClass3 {
  someMethod: (param1: string, param2?: string) => string;
}
export class SampleClass4 {
  someProperty: string;
  someOptionalProperty?: string;
}
export class SampleClass5 {
  static someStaticMethod: (param1: string, param2?: string) => string;
}
export class SampleClass6 {
  static someStaticProperty: string;
}
export class SampleClass7<T1, T2, T3, T4, T5, T6> {
  constructor(param1: T1, param2?: T2);
  someMethod: (param1: T3, param2?: T4) => T5;
  someProperty: T6;
}
export abstract class SomeAbstractClass {
  constructor(param1: string, param2?: string);
  someMethod: (param1: string, param2?: string) => string;
  someProperty: string;
  static someStaticMethod: (param1: string, param2?: string) => string;
  static someStaticProperty: string;
}

export const someFunction1: () => void;
export const someFunction2: (param1: string, param2?: number) => string;
export const someFunction3: (param1: string, param2: number = 1) => string;
export const someFunction4: <T1, T2, T3>(
  param1: T1,
  param2?: T2
) => Promise<T3>;

export type SampleTypeUsingClass = {
  sampleMethod: (param: SampleClass1) => void;
};

export type SampleTypeThatReferencesFunction<T extends typeof someFunction1> = {
  sampleProperty: T;
};
```
