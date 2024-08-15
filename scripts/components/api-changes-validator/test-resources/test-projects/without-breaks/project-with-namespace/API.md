```ts

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

export const functionUsingTypes1: (props: SomeTypeUnderNamespace) => SomeTypeUnderSubNamespace;
export const functionUsingTypes2: (props: SomeTypeUnderNamespace, extraArg: string) => Array<SomeTypeUnderSubNamespace>;

declare namespace someNamespace {
  export {
    SomeTypeUnderNamespace,
    someSubNamespace,
    functionUsingTypes1,
    functionUsingTypes2
  }
}

type SomeTypeUnderOtherEntryPoint = {
  somePropertyUnderOtherEntryPoint: string;
}

declare namespace __export__other_entry_point {
  export {
    SomeTypeUnderOtherEntryPoint
  }
}

```
