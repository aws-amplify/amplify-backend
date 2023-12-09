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

export const sampleFunction: () => void = () => {};

export type SampleTypeUsingClass = {
  sampleMethod: (param: SampleClass) => void;
};

export type SampleTypeThatReferencesFunction<T extends typeof sampleFunction> =
  {
    sampleProperty: T;
  };
