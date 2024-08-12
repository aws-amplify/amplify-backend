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

declare namespace someNamespace {
  export {
    SomeTypeUnderNamespace,
    someSubNamespace
  }
}

```
