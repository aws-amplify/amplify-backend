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

    // return with default values if props is a boolean
    if (typeof props === 'boolean') return;

    const createAuthChallengeEnvVars = {
      otpOriginationNumber: props.sms?.originationNumber,
      otpSenderId: props.sms?.senderId,
      otpFromAddress:
        typeof props.email === 'boolean' ? undefined : props.email?.fromAddress,
      otpLength: props.length?.toString(),
    };

    for (const [key, value] of Object.entries(createAuthChallengeEnvVars)) {
      triggers.createAuthChallenge.addEnvironment(key, value ?? '');
    }
  }
}
