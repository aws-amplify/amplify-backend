```ts
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

export class SomeClass
  extends SomeAbstractClass
  implements SomeType1, SomeType2
{
  someProperty1: string;
  someProperty2: string;
  someProperty3: string;
}
```
