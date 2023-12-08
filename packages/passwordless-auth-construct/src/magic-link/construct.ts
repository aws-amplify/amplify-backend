import { Construct } from 'constructs';
import { CustomAuthTriggers, MagicLinkAuthOptions } from '../types.js';
import { Aws, RemovalPolicy, Stack } from 'aws-cdk-lib';
import { IKey, Key, KeySpec, KeyUsage } from 'aws-cdk-lib/aws-kms';
import {
  AccountRootPrincipal,
  Effect,
  PolicyDocument,
  PolicyStatement,
} from 'aws-cdk-lib/aws-iam';
import { AttributeType, BillingMode, Table } from 'aws-cdk-lib/aws-dynamodb';
import { codeOrLinkPlaceholder } from '../constants.js';

/**
 * Amplify Auth CDK Construct
 */
export class AmplifyMagicLinkAuth extends Construct {
  /**
   * Create a new Auth construct with AuthProps.
   * If no props are provided, email login and defaults will be used.
   */
  constructor(
    scope: Construct,
    id: string,
    triggers: CustomAuthTriggers,
    props: MagicLinkAuthOptions
  ) {
    super(scope, id);

    if (!props) {
      return;
    }

    const kmsKey = this.createKmsKey(scope, id, triggers);
    const secretsTable = this.createSecretsTable(scope, id, triggers);

    const magicLinkBody = props.email?.body
      ? props.email?.body(codeOrLinkPlaceholder)
      : undefined;

    const createAuthChallengeEnvVars = {
      magicLinkEmailEnabled: props.email ? 'true' : 'false',
      magicLinkFromAddress: props.email?.fromAddress,
      magicLinkSubject: props.email?.subject,
      magicLinkBody: magicLinkBody,
      magicLinkAllowedOrigins: props.allowedOrigins.join(','),
      magicLinkKmsKeyId: kmsKey.keyId,
      magicLinkTableName: secretsTable.tableName,
      magicLinkSecondsUntilExpiry:
        props.linkDuration?.toSeconds().toString() ?? '900',
    };

    const verifyAuthChallengeResponseEnvVars = {
      magicLinkTableName: secretsTable.tableName,
    };

    for (const [key, value] of Object.entries(createAuthChallengeEnvVars)) {
      value && triggers.createAuthChallenge.addEnvironment(key, value);
    }

    for (const [key, value] of Object.entries(
      verifyAuthChallengeResponseEnvVars
    )) {
      value && triggers.verifyAuthChallengeResponse.addEnvironment(key, value);
    }
  }

  private createKmsKey = (
    scope: Construct,
    id: string,
    triggers: CustomAuthTriggers
  ): IKey => {
    const alias = `${id}-${Stack.of(scope).stackName}`;
    const key = new Key(this, `KmsKeyRsa${id}`, {
      keySpec: KeySpec.RSA_2048,
      keyUsage: KeyUsage.SIGN_VERIFY,
      alias: alias,
      removalPolicy: RemovalPolicy.DESTROY,
      policy: new PolicyDocument({
        statements: [
          new PolicyStatement({
            effect: Effect.ALLOW,
            notActions: ['kms:Sign'],
            resources: ['*'],
            principals: [new AccountRootPrincipal()],
          }),
        ],
      }),
    });

    const permissions = {
      effect: Effect.ALLOW,
      resources: [
        `arn:${Aws.PARTITION}:kms:${Aws.REGION}:${Aws.ACCOUNT_ID}:key/*`,
      ],
      actions: ['kms:Sign'],
    };
    key.addToResourcePolicy(
      new PolicyStatement({
        ...permissions,
        // Lambda functions are created with a default unique role. Handling
        // an undefined role is not needed.
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        principals: [triggers.createAuthChallenge.role!.grantPrincipal],
      })
    );
    triggers.createAuthChallenge.addToRolePolicy(
      new PolicyStatement(permissions)
    );

    triggers.verifyAuthChallengeResponse.addToRolePolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        resources: [
          `arn:${Aws.PARTITION}:kms:${Aws.REGION}:${Aws.ACCOUNT_ID}:key/*`,
        ],
        actions: ['kms:GetPublicKey'],
      })
    );
    return key;
  };

  private createSecretsTable = (
    scope: Construct,
    id: string,
    triggers: CustomAuthTriggers
  ) => {
    const secretsTable = new Table(scope, `SecretsTable${id}`, {
      billingMode: BillingMode.PAY_PER_REQUEST,
      partitionKey: {
        name: 'userId',
        type: AttributeType.STRING,
      },
      timeToLiveAttribute: 'exp',
      removalPolicy: RemovalPolicy.DESTROY,
    });
    secretsTable.grant(triggers.createAuthChallenge, 'dynamodb:PutItem');
    secretsTable.grant(
      triggers.verifyAuthChallengeResponse,
      'dynamodb:DeleteItem'
    );
    return secretsTable;
  };
}
