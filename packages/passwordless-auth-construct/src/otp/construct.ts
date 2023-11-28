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

    const emailProps = typeof props.email === 'boolean' ? {} : props.email;

    const createAuthChallengeEnvVars = {
      otpOriginationNumber: props.sms?.originationNumber,
      otpSenderId: props.sms?.senderId,
      otpSmsMessage: props.sms?.message,
      otpFromAddress: emailProps?.fromAddress,
      otpSubject: emailProps?.subject,
      otpBody: emailProps?.body,
      otpLength: props.length?.toString(),
    };

    for (const [key, value] of Object.entries(createAuthChallengeEnvVars)) {
      triggers.createAuthChallenge.addEnvironment(key, value ?? '');
    }
  }
}
