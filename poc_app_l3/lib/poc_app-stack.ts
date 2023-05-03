import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
// import * as sqs from 'aws-cdk-lib/aws-sqs';
import {
  aws_cognito as auth,
  aws_s3 as s3,
  aws_lambda as lambda,
  aws_ses as ses,
  aws_iam as iam,
  aws_appsync as appsync,
} from 'aws-cdk-lib';

export class PocAppStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    new AmplifyApp(this, 'my-app', props);
  }
}

export class AmplifyApp extends Construct {
  constructor(scope: Construct, id: string, props?: Record<never, string>) {
    super(scope, id);

    const myAuth = new auth.UserPool(this, 'my-auth', {
      signInCaseSensitive: true,
      signInAliases: {
        email: true,
      },
      selfSignUpEnabled: true,
    });

    new auth.UserPoolClient(this, 'my-app-client', {
      userPool: myAuth,
      authFlows: {
        userPassword: true,
      },
      generateSecret: false,
    });

    new s3.Bucket(this, 'my-bucket', {
      bucketName: 'super-cool-bucket-2',
    });

    new ses.EmailIdentity(this, 'verified-to-identity', {
      identity: ses.Identity.email('sobkamil+pocl3+to@amazon.com'),
    });

    new ses.EmailIdentity(this, 'verified-from-identity', {
      identity: ses.Identity.email('sobkamil+pocl3+from@amazon.com'),
    });

    const myFunc = new lambda.Function(this, 'my-function', {
      handler: 'index.handler',
      code: new lambda.InlineCode(
        `
const { SES, SendEmailCommand } = require("@aws-sdk/client-ses");
const ses = new SES();

const handler = async (event) => {
  if (event.request.userAttributes.email) {
    await sendTheEmail(
      event.request.userAttributes.email,
      'Congratulations ' + event.userName + ', you have been confirmed.'
    );
  }
  return event;
};

const sendTheEmail = async (to, body) => {
  const eParams = {
    Destination: {
      ToAddresses: [to],
    },
    Message: {
      Body: {
        Text: {
          Data: body,
        },
      },
      Subject: {
        Data: "Cognito Identity Provider registration completed",
      },
    },
    Source: "junk+junkie@stolworthy.co",
  };
  try {
    await ses.send(new SendEmailCommand(eParams));
  } catch (err) {
    console.log(err);
  }
};

module.exports = { handler } 
`
      ),
      runtime: lambda.Runtime.NODEJS_18_X,
    });

    const myLogWritingFunc = new lambda.Function(
      this,
      'my-log-writing-function',
      {
        handler: 'index.handler',
        code: lambda.Code.fromAsset('./logger_func'),
        runtime: lambda.Runtime.NODEJS_18_X,
      }
    );

    myFunc.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['ses:SendEmail', 'ses:SendRawEmail'],
        resources: ['*'],
        effect: iam.Effect.ALLOW,
      })
    );
    myAuth.addTrigger(auth.UserPoolOperation.POST_CONFIRMATION, myFunc);
    myAuth.addTrigger(
      auth.UserPoolOperation.POST_AUTHENTICATION,
      myLogWritingFunc
    );
  }
}
