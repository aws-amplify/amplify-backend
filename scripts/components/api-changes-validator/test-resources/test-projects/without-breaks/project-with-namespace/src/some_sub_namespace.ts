export type SomeTypeUnderSubNamespace = {
  someOtherProperty: string;
};

export type SomeOtherTypeUnderSubNamespace = {
  someProperty: SomeTypeUnderSubNamespace;
  someArrayProperty: SomeTypeUnderSubNamespace[];
};
