import { Construct } from 'constructs';
import { CustomAuthTriggers, OtpAuthOptions } from '../types.js';
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';

/**
 * Amplify OTP Construct
 */
export class AmplifyOtpAuth extends Construct {
  /**
   * Create a new OTP construct with OTP.
   */
  constructor(
    scope: Construct,
    id: string,
    triggers: CustomAuthTriggers,
    props: OtpAuthOptions | boolean
  ) {
    super(scope, id);

    if (!props) {
      return;
    }

    const createAuthChallengePolicy = [
      // SNS IAM policy
      new PolicyStatement({
        actions: ['sns:publish'],
        // For SNS, resources only applies to topics. Adding the following notResources
        // prevents publishing to topics (while still allowing SMS messages to be sent).
        // see: https://docs.aws.amazon.com/sns/latest/dg/sns-using-identity-based-policies.html
        notResources: ['arn:aws:sns:*:*:*'],
      }),
      // SES IAM policy
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['ses:SendEmail'],
        resources: ['*'],
      }),
    ];

    for (const value of createAuthChallengePolicy) {
      triggers.createAuthChallenge.addToRolePolicy(value);
    }

    // return with default values if props is a boolean
    if (typeof props === 'boolean') return;

    const createAuthChallengeEnvVars = {
      originationNumber: props.originationNumber,
      senderId: props.senderId,
      otpLength: props.length?.toString(),
      otpFromAddress: props.fromAddress,
      smsMessage: props.userVerification?.smsMessage,
      emailSubject: props.userVerification?.emailSubject,
      emailBody: props.userVerification?.emailBody,
    };

    for (const [key, value] of Object.entries(createAuthChallengeEnvVars)) {
      value && triggers.createAuthChallenge.addEnvironment(key, value);
    }
  }
}
