import { defineMiddleware } from 'astro:middleware';

export const onRequest = defineMiddleware(async (context, next) => {
  const response = await next();
  response.headers.set('x-amplify-astro-test', '1');
  return response;
});
