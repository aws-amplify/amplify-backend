import { type ClientSchema, a, defineData } from '@aws-amplify/backend';
import { addUserToGroup } from './add-user-to-group/resource.js';

const schema = a.schema({
  Todo: a
    .model({
      name: a.string(),
      description: a.string(),
    })
    .authorization((allow) => allow.group('ADMINS')),
  addUserToGroup: a
    .mutation()
    .arguments({
      userId: a.string().required(),
      groupName: a.string().required(),
    })
    .authorization((allow) => [allow.group('ADMINS')])
    .handler(a.handler.function(addUserToGroup))
    .returns(a.json()),
}) as never;

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({ schema });
