import { Construct } from 'constructs';
import {
  NodejsFunction,
  NodejsFunctionProps,
  OutputFormat,
} from 'aws-cdk-lib/aws-lambda-nodejs';
import { Architecture, Runtime } from 'aws-cdk-lib/aws-lambda';
import { PasswordlessAuthProps } from './types.js';
import { AmplifyAuth } from '@aws-amplify/auth-construct-alpha';
import * as path from 'path';
import { fileURLToPath } from 'url';

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);
/**
 * Amplify Auth CDK Construct
 */
export class AmplifyPasswordlessAuth extends Construct {
  /**
   * Create a new Auth construct with AuthProps.
   * If no props are provided, email login and defaults will be used.
   */
  constructor(
    scope: Construct,
    id: string,
    auth: AmplifyAuth,
    props: PasswordlessAuthProps
  ) {
    super(scope, id);

    // TODO: add check for OTP
    if (!props.magicLink) {
      return;
    }

    const commonOptions: NodejsFunctionProps = {
      entry: path.join(dirname, 'custom-auth', 'index.js'),
      runtime: Runtime.NODEJS_18_X,
      architecture: Architecture.ARM_64,
      bundling: {
        format: OutputFormat.ESM,
      },
    };

    const defineAuthChallenge = new NodejsFunction(
      scope,
      `DefineAuthChallenge${id}`,
      {
        handler: 'defineAuthChallengeHandler',
        ...commonOptions,
      }
    );

    const createAuthChallenge = new NodejsFunction(
      scope,
      `CreateAuthChallenge${id}`,
      {
        handler: 'createAuthChallengeHandler',
        ...commonOptions,
      }
    );

    const verifyAuthChallengeResponse = new NodejsFunction(
      scope,
      `VerifyAuthChallengeResponse${id}`,
      {
        handler: 'verifyAuthChallengeHandler',
        ...commonOptions,
      }
    );

    auth.addTrigger('defineAuthChallenge', defineAuthChallenge);

    auth.addTrigger('createAuthChallenge', createAuthChallenge);

    auth.addTrigger('verifyAuthChallengeResponse', verifyAuthChallengeResponse);
  }
}
