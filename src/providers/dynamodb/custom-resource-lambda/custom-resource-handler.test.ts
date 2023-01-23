import { DynamoDB } from "aws-sdk";
import { getNextGSIUpdate } from "./custom-resource-handler";

it("computes deletion correctly", () => {
  const currentState: DynamoDB.TableDescription = {
    AttributeDefinitions: [
      {
        AttributeName: "pk",
        AttributeType: "S",
      },
      {
        AttributeName: "sk",
        AttributeType: "S",
      },
    ],
    TableName: "test-table",
    KeySchema: [
      {
        AttributeName: "pk",
        KeyType: "HASH",
      },
    ],
    TableStatus: "ACTIVE",
    ProvisionedThroughput: {
      NumberOfDecreasesToday: 0,
      ReadCapacityUnits: 0,
      WriteCapacityUnits: 0,
    },
    TableSizeBytes: 0,
    ItemCount: 0,
    TableArn: "arn:aws:dynamodb:us-west-1:580394976433:table/test-table",
    TableId: "179dc0cb-3a30-4100-8432-d2095532f6c7",
    BillingModeSummary: {
      BillingMode: "PAY_PER_REQUEST",
    },
    GlobalSecondaryIndexes: [
      {
        IndexName: "gsi1",
        KeySchema: [
          {
            AttributeName: "sk",
            KeyType: "HASH",
          },
        ],
        Projection: {
          ProjectionType: "ALL",
        },
        IndexStatus: "ACTIVE",
        ProvisionedThroughput: {
          NumberOfDecreasesToday: 0,
          ReadCapacityUnits: 0,
          WriteCapacityUnits: 0,
        },
        IndexSizeBytes: 0,
        ItemCount: 0,
        IndexArn: "arn:aws:dynamodb:us-west-1:580394976433:table/test-table/index/gsi1",
      },
    ],
  };

  const endState: DynamoDB.CreateTableInput = {
    // todo how to generate a good name here?
    TableName: "test-table",
    AttributeDefinitions: [
      {
        AttributeName: "pk",
        AttributeType: "S",
      },
      {
        AttributeName: "sk",
        AttributeType: "S",
      },
      {
        AttributeName: "newKey",
        AttributeType: "S",
      },
    ],
    KeySchema: [
      {
        AttributeName: "pk",
        KeyType: "HASH",
      },
    ],
    BillingMode: "PAY_PER_REQUEST",
    GlobalSecondaryIndexes: [
      {
        IndexName: "gsi2",
        KeySchema: [
          {
            AttributeName: "sk",
            KeyType: "HASH",
          },
        ],
        Projection: {
          ProjectionType: "ALL",
        },
      },
      {
        IndexName: "gsi3",
        KeySchema: [
          {
            AttributeName: "newKey",
            KeyType: "HASH",
          },
        ],
        Projection: {
          ProjectionType: "ALL",
        },
      },
    ],
  };
  const nextUpdate = getNextGSIUpdate(currentState, endState);
  expect(nextUpdate).toMatchInlineSnapshot(`
    Object {
      "GlobalSecondaryIndexUpdates": Array [
        Object {
          "Delete": Object {
            "IndexName": "gsi1",
          },
        },
      ],
      "TableName": "test-table",
    }
  `);
});

it("computes addition correctly", () => {
  const currentState: DynamoDB.TableDescription = {
    AttributeDefinitions: [
      {
        AttributeName: "pk",
        AttributeType: "S",
      },
      {
        AttributeName: "sk",
        AttributeType: "S",
      },
    ],
    TableName: "test-table",
    KeySchema: [
      {
        AttributeName: "pk",
        KeyType: "HASH",
      },
    ],
    TableStatus: "ACTIVE",
    ProvisionedThroughput: {
      NumberOfDecreasesToday: 0,
      ReadCapacityUnits: 0,
      WriteCapacityUnits: 0,
    },
    TableSizeBytes: 0,
    ItemCount: 0,
    TableArn: "arn:aws:dynamodb:us-west-1:580394976433:table/test-table",
    TableId: "179dc0cb-3a30-4100-8432-d2095532f6c7",
    BillingModeSummary: {
      BillingMode: "PAY_PER_REQUEST",
    },
    GlobalSecondaryIndexes: [],
  };

  const endState: DynamoDB.CreateTableInput = {
    // todo how to generate a good name here?
    TableName: "test-table",
    AttributeDefinitions: [
      {
        AttributeName: "pk",
        AttributeType: "S",
      },
      {
        AttributeName: "sk",
        AttributeType: "S",
      },
      {
        AttributeName: "newKey",
        AttributeType: "S",
      },
    ],
    KeySchema: [
      {
        AttributeName: "pk",
        KeyType: "HASH",
      },
    ],
    BillingMode: "PAY_PER_REQUEST",
    GlobalSecondaryIndexes: [
      {
        IndexName: "gsi2",
        KeySchema: [
          {
            AttributeName: "sk",
            KeyType: "HASH",
          },
        ],
        Projection: {
          ProjectionType: "ALL",
        },
      },
      {
        IndexName: "gsi3",
        KeySchema: [
          {
            AttributeName: "newKey",
            KeyType: "HASH",
          },
        ],
        Projection: {
          ProjectionType: "ALL",
        },
      },
    ],
  };
  const nextUpdate = getNextGSIUpdate(currentState, endState);
  expect(nextUpdate).toMatchInlineSnapshot(`
    Object {
      "AttributeDefinitions": Array [
        Object {
          "AttributeName": "sk",
          "AttributeType": "S",
        },
      ],
      "GlobalSecondaryIndexUpdates": Array [
        Object {
          "Create": Object {
            "IndexName": "gsi2",
            "KeySchema": Array [
              Object {
                "AttributeName": "sk",
                "KeyType": "HASH",
              },
            ],
            "Projection": Object {
              "ProjectionType": "ALL",
            },
          },
        },
      ],
      "TableName": "test-table",
    }
  `);
});

it("computes next addition correctly", () => {
  const currentState: DynamoDB.TableDescription = {
    AttributeDefinitions: [
      {
        AttributeName: "pk",
        AttributeType: "S",
      },
      {
        AttributeName: "sk",
        AttributeType: "S",
      },
    ],
    TableName: "test-table",
    KeySchema: [
      {
        AttributeName: "pk",
        KeyType: "HASH",
      },
    ],
    TableStatus: "ACTIVE",
    ProvisionedThroughput: {
      NumberOfDecreasesToday: 0,
      ReadCapacityUnits: 0,
      WriteCapacityUnits: 0,
    },
    TableSizeBytes: 0,
    ItemCount: 0,
    TableArn: "arn:aws:dynamodb:us-west-1:580394976433:table/test-table",
    TableId: "179dc0cb-3a30-4100-8432-d2095532f6c7",
    BillingModeSummary: {
      BillingMode: "PAY_PER_REQUEST",
    },
    GlobalSecondaryIndexes: [
      {
        IndexName: "gsi2",
        KeySchema: [
          {
            AttributeName: "sk",
            KeyType: "HASH",
          },
        ],
        Projection: {
          ProjectionType: "ALL",
        },
        IndexStatus: "ACTIVE",
        ProvisionedThroughput: {
          NumberOfDecreasesToday: 0,
          ReadCapacityUnits: 0,
          WriteCapacityUnits: 0,
        },
        IndexSizeBytes: 0,
        ItemCount: 0,
        IndexArn: "arn:aws:dynamodb:us-west-1:580394976433:table/test-table/index/gsi1",
      },
    ],
  };

  const endState: DynamoDB.CreateTableInput = {
    // todo how to generate a good name here?
    TableName: "test-table",
    AttributeDefinitions: [
      {
        AttributeName: "pk",
        AttributeType: "S",
      },
      {
        AttributeName: "sk",
        AttributeType: "S",
      },
      {
        AttributeName: "newKey",
        AttributeType: "S",
      },
    ],
    KeySchema: [
      {
        AttributeName: "pk",
        KeyType: "HASH",
      },
    ],
    BillingMode: "PAY_PER_REQUEST",
    GlobalSecondaryIndexes: [
      {
        IndexName: "gsi2",
        KeySchema: [
          {
            AttributeName: "sk",
            KeyType: "HASH",
          },
        ],
        Projection: {
          ProjectionType: "ALL",
        },
      },
      {
        IndexName: "gsi3",
        KeySchema: [
          {
            AttributeName: "newKey",
            KeyType: "HASH",
          },
        ],
        Projection: {
          ProjectionType: "ALL",
        },
      },
    ],
  };
  const nextUpdate = getNextGSIUpdate(currentState, endState);
  expect(nextUpdate).toMatchInlineSnapshot(`
    Object {
      "AttributeDefinitions": Array [
        Object {
          "AttributeName": "newKey",
          "AttributeType": "S",
        },
      ],
      "GlobalSecondaryIndexUpdates": Array [
        Object {
          "Create": Object {
            "IndexName": "gsi3",
            "KeySchema": Array [
              Object {
                "AttributeName": "newKey",
                "KeyType": "HASH",
              },
            ],
            "Projection": Object {
              "ProjectionType": "ALL",
            },
          },
        },
      ],
      "TableName": "test-table",
    }
  `);
});

it("computes end state correctly", () => {
  const currentState: DynamoDB.TableDescription = {
    AttributeDefinitions: [
      {
        AttributeName: "pk",
        AttributeType: "S",
      },
      {
        AttributeName: "sk",
        AttributeType: "S",
      },
    ],
    TableName: "test-table",
    KeySchema: [
      {
        AttributeName: "pk",
        KeyType: "HASH",
      },
    ],
    TableStatus: "ACTIVE",
    ProvisionedThroughput: {
      NumberOfDecreasesToday: 0,
      ReadCapacityUnits: 0,
      WriteCapacityUnits: 0,
    },
    TableSizeBytes: 0,
    ItemCount: 0,
    TableArn: "arn:aws:dynamodb:us-west-1:580394976433:table/test-table",
    TableId: "179dc0cb-3a30-4100-8432-d2095532f6c7",
    BillingModeSummary: {
      BillingMode: "PAY_PER_REQUEST",
    },
    GlobalSecondaryIndexes: [
      {
        IndexName: "gsi2",
        KeySchema: [
          {
            AttributeName: "sk",
            KeyType: "HASH",
          },
        ],
        Projection: {
          ProjectionType: "ALL",
        },
        IndexStatus: "ACTIVE",
        ProvisionedThroughput: {
          NumberOfDecreasesToday: 0,
          ReadCapacityUnits: 0,
          WriteCapacityUnits: 0,
        },
        IndexSizeBytes: 0,
        ItemCount: 0,
        IndexArn: "arn:aws:dynamodb:us-west-1:580394976433:table/test-table/index/gsi1",
      },
      {
        IndexName: "gsi3",
        KeySchema: [
          {
            AttributeName: "newKey",
            KeyType: "HASH",
          },
        ],
        Projection: {
          ProjectionType: "ALL",
        },
        IndexStatus: "ACTIVE",
        ProvisionedThroughput: {
          NumberOfDecreasesToday: 0,
          ReadCapacityUnits: 0,
          WriteCapacityUnits: 0,
        },
        IndexSizeBytes: 0,
        ItemCount: 0,
        IndexArn: "arn:aws:dynamodb:us-west-1:580394976433:table/test-table/index/gsi1",
      },
    ],
  };

  const endState: DynamoDB.CreateTableInput = {
    // todo how to generate a good name here?
    TableName: "test-table",
    AttributeDefinitions: [
      {
        AttributeName: "pk",
        AttributeType: "S",
      },
      {
        AttributeName: "sk",
        AttributeType: "S",
      },
      {
        AttributeName: "newKey",
        AttributeType: "S",
      },
    ],
    KeySchema: [
      {
        AttributeName: "pk",
        KeyType: "HASH",
      },
    ],
    BillingMode: "PAY_PER_REQUEST",
    GlobalSecondaryIndexes: [
      {
        IndexName: "gsi2",
        KeySchema: [
          {
            AttributeName: "sk",
            KeyType: "HASH",
          },
        ],
        Projection: {
          ProjectionType: "ALL",
        },
      },
      {
        IndexName: "gsi3",
        KeySchema: [
          {
            AttributeName: "newKey",
            KeyType: "HASH",
          },
        ],
        Projection: {
          ProjectionType: "ALL",
        },
      },
    ],
  };
  const nextUpdate = getNextGSIUpdate(currentState, endState);
  expect(nextUpdate).toBeUndefined();
});
