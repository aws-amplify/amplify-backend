import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { ConversationTurnEventToolsProvider } from './event_tools_provider';
import { ConversationTurnEvent } from '../types';
import { GraphQlQueryFactory } from './graphql_query_factory';
import { ConversationTurnEventToolConfiguration } from './types';

void describe('events tool provider', () => {
  void it('returns empty array if no tools are present', async () => {
    const eventTools = new ConversationTurnEventToolsProvider({
      conversationId: '',
      currentMessageId: '',
      graphqlApiEndpoint: '',
      messageHistoryQuery: {
        getQueryName: '',
        getQueryInputTypeName: '',
        listQueryName: '',
        listQueryInputTypeName: '',
      },
      modelConfiguration: { modelId: '', systemPrompt: '' },
      request: { headers: { authorization: '' } },
      responseMutation: {
        name: '',
        inputTypeName: '',
        selectionSet: '',
      },
    }).getEventTools();

    assert.strictEqual(eventTools.length, 0);
  });

  void it('maps tools definitions into executable tools', async () => {
    const toolDefinition1: ConversationTurnEventToolConfiguration = {
      name: 'toolName1',
      description: 'toolDescription1',
      inputSchema: {
        json: {
          type: 'object',
          properties: {
            tool1Property: { type: 'string' },
          },
        },
      },
      graphqlRequestInputDescriptor: {
        queryName: 'queryName1',
        selectionSet: 'selection1',
        propertyTypes: {
          tool1Property: 'type1',
        },
      },
    };
    const toolDefinition2: ConversationTurnEventToolConfiguration = {
      name: 'toolName2',
      description: 'toolDescription2',
      inputSchema: {
        json: {
          type: 'object',
          properties: {
            tool2Property: { type: 'string' },
          },
        },
      },
      graphqlRequestInputDescriptor: {
        queryName: 'queryName2',
        selectionSet: 'selection2',
        propertyTypes: {
          tool2Property: 'type2',
        },
      },
    };
    const event: ConversationTurnEvent = {
      conversationId: '',
      currentMessageId: '',
      graphqlApiEndpoint: '',
      messageHistoryQuery: {
        getQueryName: '',
        getQueryInputTypeName: '',
        listQueryName: '',
        listQueryInputTypeName: '',
      },
      modelConfiguration: { modelId: '', systemPrompt: '' },
      request: { headers: { authorization: '' } },
      responseMutation: {
        name: '',
        inputTypeName: '',
        selectionSet: '',
      },
      toolsConfiguration: {
        dataTools: [toolDefinition1, toolDefinition2],
      },
    };
    const queryFactory = new GraphQlQueryFactory();
    const createQueryMock = mock.method(queryFactory, 'createQuery', () => {
      return 'testQuery';
    });
    const eventTools = new ConversationTurnEventToolsProvider(
      event,
      queryFactory
    ).getEventTools();

    assert.strictEqual(eventTools.length, 2);
    assert.strictEqual(eventTools[0].name, toolDefinition1.name);
    assert.strictEqual(eventTools[0].description, toolDefinition1.description);
    assert.deepStrictEqual(
      eventTools[0].inputSchema,
      toolDefinition1.inputSchema
    );
    assert.strictEqual(eventTools[1].name, toolDefinition2.name);
    assert.strictEqual(eventTools[1].description, toolDefinition2.description);
    assert.deepStrictEqual(
      eventTools[1].inputSchema,
      toolDefinition2.inputSchema
    );

    assert.strictEqual(createQueryMock.mock.calls.length, 2);
    assert.deepStrictEqual(
      createQueryMock.mock.calls[0].arguments[0],
      toolDefinition1
    );
    assert.deepStrictEqual(
      createQueryMock.mock.calls[1].arguments[0],
      toolDefinition2
    );
  });
});
