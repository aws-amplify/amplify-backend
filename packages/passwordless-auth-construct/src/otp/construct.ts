import { Construct } from 'constructs';
import { CustomAuthTriggers, OtpAuthOptions } from '../types.js';

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
    props: OtpAuthOptions
  ) {
    super(scope, id);

    if (!props) {
      return;
    }

    const createAuthChallengeEnvVars = {
      otpEmailEnabled: props.email?.fromAddress ? 'true' : 'false',
      otpSmsEnabled: props.sms?.originationNumber ? 'true' : 'false',
      otpOriginationNumber: props.sms?.originationNumber,
      otpSenderId: props.sms?.senderId,
      otpSmsMessage: props.sms?.message,
      otpFromAddress: props.email?.fromAddress,
      otpSubject: props.email?.subject,
      otpBody: props.email?.body,
      otpLength: props.length?.toString(),
    };

    for (const [key, value] of Object.entries(createAuthChallengeEnvVars)) {
      value && triggers.createAuthChallenge.addEnvironment(key, value);
    }
  }
}
