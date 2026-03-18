import assert from 'node:assert';
import { beforeEach, describe, it } from 'node:test';
import { App, Stack } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { DataFactory } from './factory.js';
import { a } from '@aws-amplify/data-schema';

void describe('automatic nested stack partitioning', () => {
  let app: App;
  let stack: Stack;

  void beforeEach(() => {
    app = new App();
    stack = new Stack(app, 'TestStack');
  });

  void describe('enableAutoPartitioning prop', () => {
    void it('defaults to true for backend-data', () => {
      const schema = a.schema({
        Todo: a.model({
          content: a.string(),
        }),
      });

      const dataFactory = new DataFactory({
        schema,
        authorizationModes: {
          defaultAuthorizationMode: 'apiKey',
        },
      });

      // This test verifies that the factory accepts the prop without error
      assert.doesNotThrow(() => {
        dataFactory.getInstance({
          constructContainer: stack,
        });
      });
    });

    void it('accepts enableAutoPartitioning: true', () => {
      const schema = a.schema({
        Todo: a.model({
          content: a.string(),
        }),
      });

      const dataFactory = new DataFactory({
        schema,
        authorizationModes: {
          defaultAuthorizationMode: 'apiKey',
        },
        enableAutoPartitioning: true,
      });

      assert.doesNotThrow(() => {
        dataFactory.getInstance({
          constructContainer: stack,
        });
      });
    });

    void it('accepts enableAutoPartitioning: false', () => {
      const schema = a.schema({
        Todo: a.model({
          content: a.string(),
        }),
      });

      const dataFactory = new DataFactory({
        schema,
        authorizationModes: {
          defaultAuthorizationMode: 'apiKey',
        },
        enableAutoPartitioning: false,
      });

      assert.doesNotThrow(() => {
        dataFactory.getInstance({
          constructContainer: stack,
        });
      });
    });
  });

  void describe('partitioningConfig prop', () => {
    void it('accepts custom partitioning configuration', () => {
      const schema = a.schema({
        Todo: a.model({
          content: a.string(),
        }),
      });

      const dataFactory = new DataFactory({
        schema,
        authorizationModes: {
          defaultAuthorizationMode: 'apiKey',
        },
        enableAutoPartitioning: true,
        partitioningConfig: {
          maxResolversPerStack: 150,
          stackSizeThreshold: 600000,
          groupRelatedResolvers: true,
          maxCrossStackReferences: 100,
        },
      });

      assert.doesNotThrow(() => {
        dataFactory.getInstance({
          constructContainer: stack,
        });
      });
    });

    void it('accepts partial partitioning configuration', () => {
      const schema = a.schema({
        Todo: a.model({
          content: a.string(),
        }),
      });

      const dataFactory = new DataFactory({
        schema,
        authorizationModes: {
          defaultAuthorizationMode: 'apiKey',
        },
        enableAutoPartitioning: true,
        partitioningConfig: {
          maxResolversPerStack: 100,
        },
      });

      assert.doesNotThrow(() => {
        dataFactory.getInstance({
          constructContainer: stack,
        });
      });
    });

    void it('ignores partitioningConfig when partitioning is disabled', () => {
      const schema = a.schema({
        Todo: a.model({
          content: a.string(),
        }),
      });

      const dataFactory = new DataFactory({
        schema,
        authorizationModes: {
          defaultAuthorizationMode: 'apiKey',
        },
        enableAutoPartitioning: false,
        partitioningConfig: {
          maxResolversPerStack: 100, // Should be ignored
        },
      });

      assert.doesNotThrow(() => {
        dataFactory.getInstance({
          constructContainer: stack,
        });
      });
    });
  });

  void describe('with large schema', () => {
    void it('handles schema with many models', () => {
      // Create a schema with 50 models
      const models: Record<string, any> = {};
      for (let i = 0; i < 50; i++) {
        models[`Model${i}`] = a.model({
          name: a.string(),
          description: a.string(),
        });
      }

      const schema = a.schema(models);

      const dataFactory = new DataFactory({
        schema,
        authorizationModes: {
          defaultAuthorizationMode: 'apiKey',
        },
        enableAutoPartitioning: true,
        partitioningConfig: {
          maxResolversPerStack: 50,
        },
      });

      assert.doesNotThrow(() => {
        dataFactory.getInstance({
          constructContainer: stack,
        });
      });
    });

    void it('creates multiple nested stacks for large schema', () => {
      // Create a schema with 30 models
      const models: Record<string, any> = {};
      for (let i = 0; i < 30; i++) {
        models[`Model${i}`] = a.model({
          field1: a.string(),
          field2: a.integer(),
        });
      }

      const schema = a.schema(models);

      const dataFactory = new DataFactory({
        schema,
        authorizationModes: {
          defaultAuthorizationMode: 'apiKey',
        },
        enableAutoPartitioning: true,
        partitioningConfig: {
          maxResolversPerStack: 20,
        },
      });

      const instance = dataFactory.getInstance({
        constructContainer: stack,
      });

      const template = Template.fromStack(stack);

      // Should create multiple nested stacks
      const nestedStacks = template.findResources('AWS::CloudFormation::Stack');
      assert.ok(
        Object.keys(nestedStacks).length > 1,
        'Should create multiple nested stacks for large schema',
      );
    });
  });

  void describe('backwards compatibility', () => {
    void it('maintains same behavior when enableAutoPartitioning not specified', () => {
      const schema = a.schema({
        Todo: a.model({
          content: a.string(),
        }),
      });

      const dataFactory1 = new DataFactory({
        schema,
        authorizationModes: {
          defaultAuthorizationMode: 'apiKey',
        },
        // Not specifying enableAutoPartitioning
      });

      const dataFactory2 = new DataFactory({
        schema,
        authorizationModes: {
          defaultAuthorizationMode: 'apiKey',
        },
        enableAutoPartitioning: true, // Explicit default
      });

      // Both should work
      assert.doesNotThrow(() => {
        dataFactory1.getInstance({
          constructContainer: new Stack(app, 'Stack1'),
        });
      });

      assert.doesNotThrow(() => {
        dataFactory2.getInstance({
          constructContainer: new Stack(app, 'Stack2'),
        });
      });
    });

    void it('preserves resources property access', () => {
      const schema = a.schema({
        Todo: a.model({
          content: a.string(),
        }),
      });

      const dataFactory = new DataFactory({
        schema,
        authorizationModes: {
          defaultAuthorizationMode: 'apiKey',
        },
        enableAutoPartitioning: true,
      });

      const instance = dataFactory.getInstance({
        constructContainer: stack,
      });

      // Should expose standard resources
      assert.ok(instance.resources, 'Should have resources property');
      assert.ok(instance.resources.graphqlApi, 'Should have graphqlApi');
      assert.ok(instance.resources.cfnResources, 'Should have cfnResources');
    });
  });

  void describe('edge cases', () => {
    void it('handles single model schema', () => {
      const schema = a.schema({
        Todo: a.model({
          content: a.string(),
        }),
      });

      const dataFactory = new DataFactory({
        schema,
        authorizationModes: {
          defaultAuthorizationMode: 'apiKey',
        },
        enableAutoPartitioning: true,
      });

      assert.doesNotThrow(() => {
        dataFactory.getInstance({
          constructContainer: stack,
        });
      });
    });

    void it('handles schema with relationships', () => {
      const schema = a.schema({
        Todo: a.model({
          content: a.string(),
          notes: a.hasMany('Note', 'todoId'),
        }),
        Note: a.model({
          content: a.string(),
          todoId: a.id(),
          todo: a.belongsTo('Todo', 'todoId'),
        }),
      });

      const dataFactory = new DataFactory({
        schema,
        authorizationModes: {
          defaultAuthorizationMode: 'apiKey',
        },
        enableAutoPartitioning: true,
      });

      assert.doesNotThrow(() => {
        dataFactory.getInstance({
          constructContainer: stack,
        });
      });
    });

    void it('handles schema with custom queries', () => {
      const schema = a.schema({
        Todo: a.model({
          content: a.string(),
        }),
        customQuery: a
          .query()
          .returns(a.string())
          .authorization((allow) => [allow.publicApiKey()]),
      });

      const dataFactory = new DataFactory({
        schema,
        authorizationModes: {
          defaultAuthorizationMode: 'apiKey',
        },
        enableAutoPartitioning: true,
      });

      assert.doesNotThrow(() => {
        dataFactory.getInstance({
          constructContainer: stack,
        });
      });
    });
  });

  void describe('configuration validation', () => {
    void it('accepts all valid configuration options', () => {
      const schema = a.schema({
        Todo: a.model({
          content: a.string(),
        }),
      });

      const dataFactory = new DataFactory({
        schema,
        authorizationModes: {
          defaultAuthorizationMode: 'apiKey',
        },
        enableAutoPartitioning: true,
        partitioningConfig: {
          stackSizeThreshold: 500000,
          maxResolversPerStack: 100,
          groupRelatedResolvers: false,
          maxCrossStackReferences: 100,
        },
      });

      assert.doesNotThrow(() => {
        dataFactory.getInstance({
          constructContainer: stack,
        });
      });
    });

    void it('works without partitioningConfig when partitioning enabled', () => {
      const schema = a.schema({
        Todo: a.model({
          content: a.string(),
        }),
      });

      const dataFactory = new DataFactory({
        schema,
        authorizationModes: {
          defaultAuthorizationMode: 'apiKey',
        },
        enableAutoPartitioning: true,
        // No partitioningConfig - should use defaults
      });

      assert.doesNotThrow(() => {
        dataFactory.getInstance({
          constructContainer: stack,
        });
      });
    });
  });
});
