import * as ddb from '@aws-appsync/utils/dynamodb';

/**
 * JS resolver used by e2e test
 */
export const request = (ctx) => {
  return ddb.get({ key: { id: ctx.args.id } });
};
/**
 * JS resolver used by e2e test
 */
export const response = (ctx) => ({
  ...ctx.result,
  content: 'overwritten by JS Resolver',
});
