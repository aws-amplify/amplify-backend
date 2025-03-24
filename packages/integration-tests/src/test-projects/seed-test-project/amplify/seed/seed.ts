import { createAndSignUpUser, signInUser } from '@aws-amplify/seed';
import * as auth from 'aws-amplify/auth';
import type { Schema } from './../data/resource.js';
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/api';
// @ts-ignore this file will not exist until sandbox is created
// import outputs from '../../amplify_outputs.json';
import { SemVer } from 'semver';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';

// TODO: this is a work around - in theory this should be fixed
// it seems like as of amplify v6 , some of the code only runs in the browser ...
// see https://github.com/aws-amplify/amplify-js/issues/12751
if (process.versions.node) {
  // node >= 20 now exposes crypto by default. This workaround is not needed: https://github.com/nodejs/node/pull/42083
  if (new SemVer(process.versions.node).major < 20) {
    // @ts-expect-error altering typing for global to make compiler happy is not worth the effort assuming this is temporary workaround
    globalThis.crypto = crypto;
  }
}

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);
const outputFile = path.normalize(
  path.join(dirname, '..', '..', 'amplify_outputs.json'),
);

const outputs = JSON.parse(await readFile(outputFile, { encoding: 'utf8' }));

Amplify.configure(outputs);

const dataClient = generateClient<Schema>();

const username1 = 'testUser@amazon.com';
const randomSuffix = crypto.randomBytes(4).toString('hex');
const password1 = `T3st_Passw0rd*${randomSuffix}`;

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
  },
);
if (response1.errors && response1.errors.length > 0) {
  throw response1.errors;
}

auth.signOut();
