```ts

export type SomeTypeUnderNamespace = {
  someProperty: string;
}

export type SomeTypeUnderNamespace_2 = {
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

declare namespace someNamespaceWithSameType {
  export {
    SomeTypeUnderNamespace_2 as SomeTypeUnderNamespace,
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
