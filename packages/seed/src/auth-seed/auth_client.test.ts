import { describe, it } from 'node:test';
//import {App, Stack, aws_cognito } from 'aws-cdk-lib';
//import { AmplifyAuth } from '@aws-amplify/auth-construct';

void describe('seeding auth APIs', () => {
  void describe('adding to user group', () => {
    void it('adds user to an existing user group', async () => {});
    void it('throws error if user does not exist', async () => {});
    void it('throws error if group does not exist', async () => {});
  });
  void describe('userpool configured with persistent password', () => {
    //const app = new App();
    //const stack = new Stack(app);
    //new AmplifyAuth(stack, 'test', {loginWith: { }});
    // need a way to mock Amplify.configure

    void it('creates and signs up user', async () => {});

    void it('throws error if attempting to create user that already exists', async () => {});

    void it('signs in user', async () => {});

    void it('throws error if attempting to sign in user that does not exist', async () => {});
  });
  void describe('userpool configured with MFA', () => {});
});
