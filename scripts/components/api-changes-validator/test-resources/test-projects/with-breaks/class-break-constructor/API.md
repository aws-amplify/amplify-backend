```ts
export class SomeClass1 {
  constructor(param1: string, param2?: string);
}

export class SomeClass2 {
  constructor(param1: string, param2?: string);
}

export class SomeClass3<T1, T2> {
  constructor(param1: T1, param2?: T2);
}

export class SomeClass4<T1 extends SomeClass1, T2> {
  constructor(param1: T1, param2?: T2);
}

export class SomeAbstractClass1 {
  constructor(param1: string, param2?: string);
}

export class SomeAbstractClass2 {
  constructor(param1: string, param2?: string);
}

export class SomeAbstractClass3<T1, T2> {
  constructor(param1: T1, param2?: T2);
}

export class SomeAbstractClass4<T1 extends SomeClass1, T2> {
  constructor(param1: T1, param2?: T2);
}
```
