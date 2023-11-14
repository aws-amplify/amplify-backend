import url, { UrlWithStringQuery } from 'url';
import { latestApiVersion } from './version_manager.js';

let parsedUrl: UrlWithStringQuery;

const prodUrl = `https://api.cli.amplify.aws/${latestApiVersion}/metrics`;

/**
 *  Usage data tracking service URL
 */
export const getUrl = (): UrlWithStringQuery => {
  if (!parsedUrl) {
    parsedUrl = getParsedUrl();
  }

  return parsedUrl;
};

const getParsedUrl = (): UrlWithStringQuery => {
  if (!useBetaUrl()) {
    return url.parse(prodUrl);
  }

  return url.parse(process.env.AMPLIFY_CLI_BETA_USAGE_TRACKING_URL || '');
};

const useBetaUrl = (): boolean =>
  !!(
    process.env.AMPLIFY_CLI_BETA_USAGE_TRACKING_URL &&
    typeof process.env.AMPLIFY_CLI_BETA_USAGE_TRACKING_URL === 'string'
  );
