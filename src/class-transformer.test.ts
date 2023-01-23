import 'reflect-metadata';
import { plainToClass, Transform, Type } from 'class-transformer';

test('class-transformer', () => {
  const raw: MyType = {
    someProp: {
      aKey: {
        nestedProp: 'something',
      },
    },
  };

  const instance = plainToClass(MyClass, raw);
  console.log(instance);
});

type MyType = {
  someProp: Record<string, NestedType>;
};

type NestedType = {
  nestedProp: string;
};

class MyClass implements MyType {
  // @Transform((params) => new NestedClass(params.value))
  readonly someProp: Record<string, NestedType>;
}

class NestedClass implements NestedType {
  readonly nestedProp: string;
}
