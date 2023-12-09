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
import { AmplifyOtpAuth } from './otp/construct.js';
import { AmplifyMagicLinkAuth } from './magic-link/construct.js';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Aws } from 'aws-cdk-lib';
import { AmplifySignUpPasswordless } from './sign-up/construct.js';

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

    if (!props.magicLink && !props.otp) {
      return;
    }

    // default memory allocation for lambda functions
    const defaultMemorySize = 128;

    // increased memory for create/verify challenge lambdas when magic link is
    // enabled.
    const magicLinkMemorySize = 256;

    const commonOptions: NodejsFunctionProps = {
      entry: path.join(dirname, 'custom-auth', 'index.js'),
      runtime: Runtime.NODEJS_20_X,
      architecture: Architecture.ARM_64,
      bundling: {
        format: OutputFormat.ESM,
      },
    };

    const defineAuthChallenge = new NodejsFunction(
      scope,
      `DefineAuthChallenge${id}`,
      {
        handler: 'defineAuthChallenge',
        ...commonOptions,
        memorySize: defaultMemorySize,
      }
    );

    const createAuthChallenge = new NodejsFunction(
      scope,
      `CreateAuthChallenge${id}`,
      {
        handler: 'createAuthChallenge',
        ...commonOptions,
        memorySize: props.magicLink ? magicLinkMemorySize : defaultMemorySize,
      }
    );

    const verifyAuthChallengeResponse = new NodejsFunction(
      scope,
      `VerifyAuthChallengeResponse${id}`,
      {
        handler: 'verifyAuthChallenge',
        ...commonOptions,
        memorySize: props.magicLink ? magicLinkMemorySize : defaultMemorySize,
      }
    );

    auth.addTrigger('defineAuthChallenge', defineAuthChallenge);

    auth.addTrigger('createAuthChallenge', createAuthChallenge);

    auth.addTrigger('verifyAuthChallengeResponse', verifyAuthChallengeResponse);

    const emailEnabled = !!props.otp?.email || !!props.magicLink?.email;
    const smsEnabled = !!props.otp?.sms;

    if (emailEnabled) {
      createAuthChallenge.addToRolePolicy(
        new PolicyStatement({
          actions: ['ses:SendEmail'],
          resources: [
            `arn:${Aws.PARTITION}:ses:${Aws.REGION}:${Aws.ACCOUNT_ID}:identity/*`,
          ],
        })
      );
    }

    if (smsEnabled) {
      createAuthChallenge.addToRolePolicy(
        new PolicyStatement({
          actions: ['sns:publish'],
          // For SNS, resources only applies to topics. Adding the following notResources
          // prevents publishing to topics (while still allowing SMS messages to be sent).
          // see: https://docs.aws.amazon.com/sns/latest/dg/sns-using-identity-based-policies.html
          notResources: ['arn:aws:sns:*:*:*'],
        })
      );
    }

    // Configure OTP environment
    if (props.otp) {
      new AmplifyOtpAuth(
        scope,
        `${id}-otp`,
        {
          defineAuthChallenge,
          createAuthChallenge,
          verifyAuthChallengeResponse,
        },
        props.otp
      );
    }

    // Configure Magic Link
    if (props.magicLink) {
      new AmplifyMagicLinkAuth(
        scope,
        `${id}-magic-link`,
        {
          defineAuthChallenge,
          createAuthChallenge,
          verifyAuthChallengeResponse,
        },
        props.magicLink
      );
    }

    // Configure Sign Up without password
    if (props.signUpNoPassword) {
      new AmplifySignUpPasswordless(
        scope,
        `${id}-signup-passwordless`,
        verifyAuthChallengeResponse,
        auth.resources.userPool
      );
    }
  }
}
