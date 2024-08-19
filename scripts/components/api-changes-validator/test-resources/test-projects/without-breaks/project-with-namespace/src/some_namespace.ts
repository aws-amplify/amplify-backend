import * as someSubNamespace from './some_sub_namespace.js';

export type SomeTypeUnderNamespace = {
  someProperty: string;
};

export { someSubNamespace };

export const functionUsingTypes1 = (
  props: SomeTypeUnderNamespace
): someSubNamespace.SomeTypeUnderSubNamespace => {
  throw new Error();
};
export const functionUsingTypes2 = (
  props: SomeTypeUnderNamespace,
  extraArg: string
): Array<someSubNamespace.SomeTypeUnderSubNamespace> => {
  throw new Error();
};
