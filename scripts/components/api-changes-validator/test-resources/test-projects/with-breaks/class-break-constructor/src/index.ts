export class SomeClass1 {
  // remove parameter
  constructor(param1: string) {}
}

export class SomeClass2 {
  // change parameter type
  constructor(param1: string, param2?: number) {}
}

export class SomeClass3<T1> {
  // remove template type
  constructor(param1: T1, param2?: string) {}
}

export class SomeClass4<T1 extends SomeClass2, T2> {
  // change template type
  constructor(param1: T1, param2?: T2) {}
}

export class SomeAbstractClass1 {
  // remove parameter
  constructor(param1: string) {}
}

export class SomeAbstractClass2 {
  // change parameter type
  constructor(param1: string, param2?: number) {}
}

export class SomeAbstractClass3<T1> {
  // remove template type
  constructor(param1: T1, param2?: string) {}
}

export class SomeAbstractClass4<T1 extends SomeClass2, T2> {
  // change template type
  constructor(param1: T1, param2?: T2) {}
}
