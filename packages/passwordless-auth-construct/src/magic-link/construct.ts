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

    const createAuthChallengeEnvVars = {
      magicLinkFromAddress:
        typeof props.email === 'boolean' ? undefined : props.email?.fromAddress,
      allowedOrigins: props.allowedOrigins.join(','),
      kmsKeyId: kmsKey.keyId,
      dynamodbSecretsTableName: secretsTable.tableName,
      secondsUntilExpiry: props.linkDuration?.toSeconds().toString() ?? '900',
    };

    const verifyAuthChallengeResponseEnvVars = {
      dynamodbSecretsTableName: secretsTable.tableName,
    };

    for (const [key, value] of Object.entries(createAuthChallengeEnvVars)) {
      triggers.createAuthChallenge.addEnvironment(key, value ?? '');
    }

    for (const [key, value] of Object.entries(
      verifyAuthChallengeResponseEnvVars
    )) {
      triggers.verifyAuthChallengeResponse.addEnvironment(key, value);
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

    triggers.createAuthChallenge.addToRolePolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        resources: [
          `arn:${Aws.PARTITION}:kms:${Aws.REGION}:${Aws.ACCOUNT_ID}:key/*`,
        ],
        actions: ['kms:Sign'],
        conditions: {
          StringLike: {
            'kms:RequestAlias': alias,
          },
        },
      })
    );

    triggers.verifyAuthChallengeResponse.addToRolePolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        resources: [
          `arn:${Aws.PARTITION}:kms:${Aws.REGION}:${Aws.ACCOUNT_ID}:key/*`,
        ],
        actions: ['kms:GetPublicKey'],
        conditions: {
          StringLike: {
            'kms:RequestAlias': alias,
          },
        },
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
        type: AttributeType.BINARY,
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
