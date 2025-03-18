import url, { UrlWithStringQuery } from 'node:url';
// import { latestApiVersion } from './constants.js';

let cachedUrl: UrlWithStringQuery;

const prodUrl = ``;

/**
 *  Telemetry data tracking service URL
 */
export const getUrl = (): UrlWithStringQuery => {
  if (!cachedUrl) {
    cachedUrl = getParsedUrl();
  }

  return cachedUrl;
};

const getParsedUrl = (): UrlWithStringQuery => {
  return url.parse(
    process.env.AMPLIFY_BACKEND_TELEMETRY_TRACKING_ENDPOINT || prodUrl
  );
};
