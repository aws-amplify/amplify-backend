import { Backend } from '@aws-amplify/backend';
import { auth } from './auth/resource.js';
import { data } from './data/resource.js';

void (async () => {
  const backend = new Backend({
    auth,
    data,
  });

  await backend.generate();
})();
