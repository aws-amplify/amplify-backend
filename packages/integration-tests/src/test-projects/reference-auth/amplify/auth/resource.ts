import { referenceAuth } from '@aws-amplify/backend';
import { addUserToGroup } from '../data/add-user-to-group/resource.js';

export const auth = referenceAuth({
  identityPoolId: '',
  authRoleArn: '',
  unauthRoleArn: '',
  userPoolId: '',
  userPoolClientId: '',
  groups: {
    ADMINS: '',
  },
  access: (allow) => [allow.resource(addUserToGroup).to(['addUserToGroup'])],
});
