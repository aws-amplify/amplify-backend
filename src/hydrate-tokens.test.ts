import { hydrateTokens } from "./hydrate-tokens";

it("returns new object with replacements", () => {
  const initialMap = {
    this: {
      is: {
        a: "nested",
        object: {
          with: "some values",
        },
      },
    },
    over: {
      here: "$param:tokenKey",
      weHave: [
        {
          anObject: "in an array",
        },
        ["a nested array"],
        "a normal string",
        23,
        "$param:otherToken",
      ],
    },
  };
  const result = hydrateTokens(initialMap, {
    tokenKey: "firstValue",
    otherToken: "secondValue",
  });
  expect(result).toEqual({
    this: {
      is: {
        a: "nested",
        object: {
          with: "some values",
        },
      },
    },
    over: {
      here: "firstValue",
      weHave: [
        {
          anObject: "in an array",
        },
        ["a nested array"],
        "a normal string",
        23,
        "secondValue",
      ],
    },
  });
});

it("errors on unknown params", () => {
  const initialMap = {
    param1: "$param:key1",
    param2: "$param:key2",
    param3: "$param:key3",
  };
  expect(() =>
    hydrateTokens(initialMap, {})
  ).toThrowErrorMatchingInlineSnapshot(
    `"Provided tokens did not include key1"`
  );
});

it("substitutes simple map", () => {
  const initialMap = {
    param1: "$param:key1",
    param2: "$param:key2",
    param3: "$param:key3",
  };
  expect(
    hydrateTokens(initialMap, {
      key1: "value1",
      key2: "value2",
      key3: "value3",
    })
  ).toEqual({
    param1: "value1",
    param2: "value2",
    param3: "value3",
  });
});
