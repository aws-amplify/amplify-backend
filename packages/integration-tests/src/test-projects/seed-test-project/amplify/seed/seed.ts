import { createAndSignUpUser, signInUser } from '@aws-amplify/seed';
import * as auth from 'aws-amplify/auth';
import type { Schema } from './../data/resource.js';
import { Amplify } from 'aws-amplify';
// @ts-ignore typescript does not like this import
import outputs from '../../amplify_outputs.json';
import { generateClient } from 'aws-amplify/api';

Amplify.configure(outputs);

const dataClient = generateClient<Schema>();

const username1 = 'testUser@testing.com';
const password1 = 'T3st_Passw0rd*';

const user1 = await createAndSignUpUser({
  username: username1,
  password: password1,
  signInAfterCreation: false,
  signInFlow: 'Password',
});

await signInUser({
  username: username1,
  password: password1,
  signInFlow: user1.signInFlow,
});

let response1 = await dataClient.models.Todo.create(
  {
    content: `Todo list item for ${username1}`,
  },
  {
    authMode: 'userPool',
  }
);
if (response1.errors && response1.errors.length > 0) {
  throw response1.errors;
}

auth.signOut();
