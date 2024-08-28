import * as someSubNamespace from './some_sub_namespace.js';
import { SomeTypeUnderNamespace } from './types.js';

export { someSubNamespace, SomeTypeUnderNamespace };

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
