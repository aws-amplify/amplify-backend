import {
  ApolloClient,
  ApolloLink,
  HttpLink,
  InMemoryCache,
} from '@apollo/client/core';
import * as auth from 'aws-amplify/auth';
import { AuthOptions, createAuthLink } from 'aws-appsync-auth-link';
import { AUTH_TYPE } from 'aws-appsync-auth-link/lib/auth-link.js';
import { createSubscriptionHandshakeLink } from 'aws-appsync-subscription-link';
import { gql } from 'graphql-tag';
import * as outputs from './amplify_outputs.json';
import { Amplify } from 'aws-amplify';
import * as Auth from 'aws-amplify/auth';
import crypto from 'node:crypto';
import * as readline from 'readline';
import ws from 'ws';
import * as secrets from './secrets.json';

// POLYFILLS
globalThis.WebSocket = ws;
globalThis.crypto = crypto;

Amplify.configure(outputs.default);

const knownChatNames = ['basicChat', 'evilChat'];
const chatName = process.argv[2];

if (!knownChatNames.includes(chatName)) {
  throw new Error(`${chatName} must be one of ${knownChatNames.join(', ')}`);
}

const capitalizedChatName =
  chatName.charAt(0).toUpperCase() + chatName.slice(1);

const signInResult = await Auth.signIn({
  username: secrets.default.username,
  password: secrets.default.password,
});
const authSession = await Auth.fetchAuthSession();
if (!authSession.credentials) {
  throw new Error('No credentials in auth session');
}
const idToken = authSession.tokens.idToken;
if (!idToken) {
  throw Error('IdToken');
}

const url = outputs.default.data.url;
const region = outputs.default.data.aws_region;

const auth: AuthOptions = {
  type: AUTH_TYPE.AMAZON_COGNITO_USER_POOLS,
  jwtToken: () => {
    return idToken.toString();
  },
};

const httpLink = new HttpLink({ uri: url });

const link = ApolloLink.from([
  createAuthLink({ url, region, auth }),
  createSubscriptionHandshakeLink({ url, region, auth }, httpLink),
]);

const client = new ApolloClient({
  link,
  cache: new InMemoryCache(),
});

const conversation = await client.mutate({
  mutation: gql(
    `
mutation MyMutation {
  createConversation${capitalizedChatName}(input: {}) {
    id
  }
}
    `
  ),
});

console.log(conversation);

const conversationId =
  conversation.data[`createConversation${capitalizedChatName}`].id;

client
  .subscribe({
    query: gql(`
  subscription MySubscription {
  onCreateAssistantResponse${capitalizedChatName}(sessionId: "${conversationId}") {
    content
  }
}

  `),
  })
  .subscribe((response) => {
    const responseContent =
      response.data[`onCreateAssistantResponse${capitalizedChatName}`].content;
    console.log(`Response: ${responseContent}`);
    console.log('Type question:');
  });

const reader = readline.createInterface(process.stdin);

console.log('Type question:');
for await (const line of reader) {
  console.log(`Sending message: ${line}`);
  // send message
  await client.mutate({
    mutation: gql(
      `
    mutation MyMutation {
  ${chatName}(content: "${line}", sessionId: "${conversationId}")
}
    `
    ),
  });
}
