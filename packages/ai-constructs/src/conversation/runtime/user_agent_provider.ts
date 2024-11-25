import { ConversationTurnEvent } from './types';

// This is intentional. There's no other way to read package version.
// 1. The 'imports' field in package.json won't work because this is CommonJS package.
// 2. We can't use `fs.readFile`. This file is bundled by ESBuild. ESBuild needs to know to bundle package.json
//    That is achievable by either require or import statements.
// 3. The package.json is outside the rootDir defined in tsconfig.json
//    Imports require tsconfig to be broken down (as explained here https://stackoverflow.com/questions/55753163/package-json-is-not-under-rootdir).
//    This would however would not work with our scripts that check tsconfig files for correctness.
// 4. Hardcoding version in the code, as opposed to reading package.json file isn't great option either.
//
// Therefore, using require as least problematic solution here.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const packageVersion = require('../../../package.json').version;
// Compliant with https://www.rfc-editor.org/rfc/rfc5234.
const packageName = 'amplify-ai-constructs';

export type UserAgentAdditionalMetadata = {
  // These keys are user agent friendly intentionally.
  // eslint-disable-next-line @typescript-eslint/naming-convention
  'turn-response-type'?: 'single' | 'streaming' | 'error';
};

/**
 * Provides user agent.
 */
export class UserAgentProvider {
  /**
   * Creates user agent provider instance.
   */
  constructor(private readonly event: ConversationTurnEvent) {}

  getUserAgent = (additionalMetadata?: UserAgentAdditionalMetadata): string => {
    let userAgent = this.event.request.headers['x-amz-user-agent'];

    // append library version
    if (userAgent) {
      // if user agent was forwarded from AppSync then append our package information as metadata.
      userAgent = `${userAgent} md/${packageName}#${packageVersion}`;
    } else {
      // if user agent was not forwarded use our package information as library.
      userAgent = `lib/${packageName}#${packageVersion}`;
    }

    if (additionalMetadata) {
      Object.entries(additionalMetadata).forEach(([key, value]) => {
        userAgent = `${userAgent} md/${key}#${value}`;
      });
    }

    return userAgent;
  };
}
