import { getAmplifyConfig, queryGraphQL } from '../utils/backend';

export default defineEventHandler(async () => {
  const config = getAmplifyConfig();
  const userPoolId = config.auth?.user_pool_id || 'none';

  let backendStatus = 'disconnected';
  let graphqlResult = 'no-query';

  try {
    if (config.data?.url && config.data?.api_key) {
      const result = await queryGraphQL(
        config.data.url,
        config.data.api_key,
        '{ listTodos { items { id content } } }',
      );

      if (result.data && 'listTodos' in result.data) {
        graphqlResult = JSON.stringify(result.data);
        backendStatus = 'connected';
      } else if (result.errors) {
        graphqlResult = 'errors:' + JSON.stringify(result.errors);
        backendStatus = 'error';
      }
    }
  } catch (e) {
    graphqlResult = 'exception:' + (e as Error).message;
    backendStatus = 'error';
  }

  return { userPoolId, backendStatus, graphqlResult };
});
