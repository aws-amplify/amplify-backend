import { defineBackend } from '@aws-amplify/backend';
import { auth as authG2 } from './auth/resource';
import { data as dataG2 } from './data/resource';
import { storage as storageG2 } from './storage/resource';
import { AmplifyAuth } from '@aws-amplify/auth-construct';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { AmplifyStorage } from '@aws-amplify/storage-construct';

/**
 * @see https://docs.amplify.aws/react/build-a-backend/ to add storage, functions, and more
 */
const backend = defineBackend({
  authG2,
  dataG2,
  storageG2,
});

const stack = backend.createStack('foo');

const auth = new AmplifyAuth(stack, 'auth');
const func = new NodejsFunction(stack, 'func');
const trigger = new NodejsFunction(stack, 'trigger');

const storage = new AmplifyStorage(stack, 'storage', {
  name: 'myStorage',
  isDefault: true,
  versioned: true,
});

storage.grantAccess(func, ['read', 'write'], 'foo/*');

storage.grantAccess(auth, (allow) => {
  allow.guest.to(['read'], 'public/*');
  allow.authenticated.to(['read', 'write'], 'public/*');
  allow.groups(['Admins']).to(['read', 'write', 'delete'], 'public/*');
  allow.authenticated.to(['read'], 'protected/{entity_id}/*');
  allow
    .entity('identity')
    .to(['read', 'write', 'delete'], 'protected/{entity_id}/*');
  allow
    .groups(['Admins'])
    .to(['read', 'write', 'delete'], 'protected/{entity_id}/*');
});

storage.addTrigger('onDelete', trigger);
storage.addTrigger('onUpload', trigger);
