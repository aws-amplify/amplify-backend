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

export class SampleClass {}

export const someFunction1 = (): void => {
  throw new Error();
};
export const someFunction2 = (param1: string, param2?: number): string => {
  throw new Error();
};
export const someFunction3 = (param1: string, param2: number = 1): string => {
  throw new Error();
};
export const someFunction4 = <T1, T2, T3>(
  param1: T1,
  param2?: T2
): Promise<T3> => {
  throw new Error();
};

export type SampleTypeUsingClass = {
  sampleMethod: (param: SampleClass) => void;
};

export type SampleTypeThatReferencesFunction<T extends typeof someFunction1> = {
  sampleProperty: T;
};
