export class SomeClass {
  // break type
  static someStaticProperty1: boolean;

  // removed static someStaticProperty2: string;

  // removed someProperty2: string;
  // break parameters
  static someStaticMethod1: (param1: string) => string;

  // removed static someStaticMethod2: (param1: string, param2?: string) => string;
  // break return type
  static someStaticMethod3: (param1: string, param2?: string) => boolean;

  // break type
  someProperty1: number;

  // break parameters
  someMethod1 = (param1: string): string => {
    throw new Error();
  };

  // removed someMethod2: (param1: string, param2?: string) => string;
  // break return type
  someMethod3 = (param1: string, param2?: string): number => {
    throw new Error();
  };
}
