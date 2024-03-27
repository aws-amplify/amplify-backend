```ts

export type SomeTypeUnderNamespace = {
  someProperty: string;
}

declare namespace someNamespace {
  export {
    SomeTypeUnderNamespace
  }
}

```
