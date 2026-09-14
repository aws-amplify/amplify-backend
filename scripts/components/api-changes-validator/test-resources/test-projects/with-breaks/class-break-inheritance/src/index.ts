export type SomeType1 = {
  someProperty1: string;
};

export type SomeType2 = {
  someProperty2: string;
  someProperty3: string;
};

export abstract class SomeAbstractClass {
  someMethod1: (param1: string, param2?: string) => string;
}

// remove all inheritance here
export class SomeClass {}
