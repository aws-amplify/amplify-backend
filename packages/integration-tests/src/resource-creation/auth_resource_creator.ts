import {
  CognitoIdentityProviderClient,
  CreateGroupCommand,
  CreateGroupCommandInput,
  CreateIdentityProviderCommand,
  CreateIdentityProviderCommandInput,
  CreateUserPoolClientCommand,
  CreateUserPoolClientCommandInput,
  CreateUserPoolCommand,
  CreateUserPoolCommandInput,
  CreateUserPoolDomainCommand,
  CreateUserPoolDomainCommandInput,
  DeleteGroupCommand,
  DeleteIdentityProviderCommand,
  DeleteUserPoolClientCommand,
  DeleteUserPoolCommand,
  DeleteUserPoolDomainCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import {
  CreateRoleCommand,
  CreateRoleCommandInput,
  DeleteRoleCommand,
  IAMClient,
} from '@aws-sdk/client-iam';
import {
  CognitoIdentityClient,
  CreateIdentityPoolCommand,
  CreateIdentityPoolCommandInput,
  DeleteIdentityPoolCommand,
  SetIdentityPoolRolesCommand,
} from '@aws-sdk/client-cognito-identity';
import { shortUuid } from '../short_uuid.js';
import { e2eToolingClientConfig } from '../e2e_tooling_client_config.js';
const TEST_AMPLIFY_RESOURCE_PREFIX = 'amplify-';

type CleanupTask = {
  run: () => Promise<void>;
  arn?: string | undefined;
  id?: string | undefined;
};
/**
 * Provides a way to create auth resources using aws sdk
 */
export class AuthResourceCreator {
  private cleanup: CleanupTask[] = [];

  /**
   * Setup a new auth resource creator
   * @param cognitoIdentityProviderClient client
   * @param cognitoIdentityClient client
   * @param iamClient client
   */
  constructor(
    private cognitoIdentityProviderClient: CognitoIdentityProviderClient = new CognitoIdentityProviderClient(
      e2eToolingClientConfig
    ),
    private cognitoIdentityClient: CognitoIdentityClient = new CognitoIdentityClient(
      e2eToolingClientConfig
    ),
    private iamClient: IAMClient = new IAMClient(e2eToolingClientConfig),
    private createResourceNameSuffix: () => string = shortUuid
  ) {}

  cleanupResources = async () => {
    // delete in reverse order
    const list = this.cleanup.map((t) => t.arn ?? t.id);
    console.log(
      `Attempting to delete a total of ${this.cleanup.length} resources`
    );
    console.log('Resource descriptions/ARNs/IDs:', list);
    const failedTasks: CleanupTask[] = [];
    for (let i = this.cleanup.length - 1; i >= 0; i--) {
      const task = this.cleanup[i];
      try {
        await task.run();
        console.log(`Deleted: ${task.arn ?? task.id}`);
      } catch (e) {
        failedTasks.push(task);
        console.error(`Failed to delete resource: ${task.arn ?? task.id}`, e);
      }
    }
    console.error(
      'Failed tasks:',
      failedTasks.map((t) => t.arn ?? t.id)
    );
  };

  createUserPoolBase = async (props: CreateUserPoolCommandInput) => {
    const result = await this.cognitoIdentityProviderClient.send(
      new CreateUserPoolCommand({
        ...props,
        PoolName: `${TEST_AMPLIFY_RESOURCE_PREFIX}${
          props.PoolName
        }-${this.createResourceNameSuffix()}`,
      })
    );
    const userPool = result.UserPool;
    if (!userPool) {
      throw new Error('Failed to create user pool.');
    }
    this.cleanup.push({
      run: async () => {
        await this.cognitoIdentityProviderClient.send(
          new DeleteUserPoolCommand({ UserPoolId: userPool.Id })
        );
      },
      arn: userPool.Arn,
    });
    return userPool;
  };

  createUserPoolClientBase = async (
    props: CreateUserPoolClientCommandInput
  ) => {
    const result = await this.cognitoIdentityProviderClient.send(
      new CreateUserPoolClientCommand({
        ...props,
        ClientName: `${TEST_AMPLIFY_RESOURCE_PREFIX}${
          props.ClientName
        }-${this.createResourceNameSuffix()}`,
      })
    );
    const client = result.UserPoolClient;
    if (!client) {
      throw new Error('Failed to create user pool client.');
    }
    this.cleanup.push({
      run: async () => {
        await this.cognitoIdentityProviderClient.send(
          new DeleteUserPoolClientCommand({
            ClientId: client.ClientId,
            UserPoolId: client.UserPoolId,
          })
        );
      },
      id: `UserPoolClientId: ${client.ClientId}`,
    });
    return client;
  };

  createUserPoolDomainBase = async (
    props: CreateUserPoolDomainCommandInput
  ) => {
    const domain = `${TEST_AMPLIFY_RESOURCE_PREFIX}${
      props.Domain
    }-${this.createResourceNameSuffix()}`;
    await this.cognitoIdentityProviderClient.send(
      new CreateUserPoolDomainCommand({
        ...props,
        Domain: domain,
      })
    );
    // if it didn't throw, domain was created.
    this.cleanup.push({
      run: async () => {
        await this.cognitoIdentityProviderClient.send(
          new DeleteUserPoolDomainCommand({
            Domain: domain,
            UserPoolId: props.UserPoolId,
          })
        );
      },
      id: `Domain: ${domain}`,
    });
    return domain;
  };

  createIdentityProviderBase = async (
    props: CreateIdentityProviderCommandInput
  ) => {
    const result = await this.cognitoIdentityProviderClient.send(
      new CreateIdentityProviderCommand({
        ...props,
      })
    );
    const provider = result.IdentityProvider;
    if (!provider) {
      throw new Error(
        `An error occurred while creating the identity provider ${props.ProviderName}`
      );
    }
    this.cleanup.push({
      run: async () => {
        await this.cognitoIdentityProviderClient.send(
          new DeleteIdentityProviderCommand({
            UserPoolId: props.UserPoolId,
            ProviderName: provider.ProviderName,
          })
        );
      },
      id: `Provider: ${provider.ProviderName}`,
    });
    return provider;
  };

  createIdentityPoolBase = async (props: CreateIdentityPoolCommandInput) => {
    const identityPoolResponse = await this.cognitoIdentityClient.send(
      new CreateIdentityPoolCommand({
        ...props,
        IdentityPoolName: `${TEST_AMPLIFY_RESOURCE_PREFIX}${
          props.IdentityPoolName
        }-${this.createResourceNameSuffix()}`,
      })
    );
    const identityPoolId = identityPoolResponse.IdentityPoolId;
    if (!identityPoolId) {
      throw new Error('An error occurred while creating the identity pool');
    }
    this.cleanup.push({
      run: async () => {
        await this.cognitoIdentityClient.send(
          new DeleteIdentityPoolCommand({ IdentityPoolId: identityPoolId })
        );
      },
      id: `IdentityPool: ${identityPoolResponse.IdentityPoolId}`,
    });
    return {
      ...identityPoolResponse,
      // the line below ensures that the type engine sees IdentityPoolId as string, not string | undefined.
      IdentityPoolId: identityPoolId,
    };
  };

  createRoleBase = async (props: CreateRoleCommandInput) => {
    const result = await this.iamClient.send(
      new CreateRoleCommand({
        ...props,
        RoleName: `${TEST_AMPLIFY_RESOURCE_PREFIX}${
          props.RoleName
        }-${this.createResourceNameSuffix()}`,
      })
    );
    const role = result.Role;
    if (!role) {
      throw new Error(
        `An error occurred while creating the role: ${props.RoleName}`
      );
    }
    this.cleanup.push({
      run: async () => {
        await this.iamClient.send(
          new DeleteRoleCommand({ RoleName: role.RoleName })
        );
      },
      arn: role.Arn,
    });
    return role;
  };

  createUserPoolGroupBase = async (props: CreateGroupCommandInput) => {
    const result = await this.cognitoIdentityProviderClient.send(
      new CreateGroupCommand({
        ...props,
        GroupName: `${TEST_AMPLIFY_RESOURCE_PREFIX}${
          props.GroupName
        }-${this.createResourceNameSuffix()}`,
      })
    );
    const group = result.Group;
    if (!group || !group.GroupName) {
      throw new Error(`Error creating group with name: ${props.GroupName}`);
    }
    this.cleanup.push({
      run: async () => {
        await this.cognitoIdentityProviderClient.send(
          new DeleteGroupCommand({
            UserPoolId: props.UserPoolId,
            GroupName: group.GroupName,
          })
        );
      },
      id: `Group: ${group.GroupName}`,
    });
    return group;
  };

  setupUserPoolGroup = async (
    groupName: string,
    userPoolId: string,
    identityPoolId: string
  ) => {
    const groupRole = await this.createRoleBase({
      RoleName: 'ref-auth-group-role',
      AssumeRolePolicyDocument: this.getIdentityPoolAssumeRolePolicyDocument(
        identityPoolId,
        'authenticated'
      ),
    });
    const group = await this.createUserPoolGroupBase({
      GroupName: groupName,
      UserPoolId: userPoolId,
      RoleArn: groupRole.Arn,
    });
    return group;
  };

  /**
   * Setup standard auth and unauth roles for an identity pool
   * @param userPoolId user pool id
   * @param userPoolClientId user pool client id
   * @param identityPoolId identity pool id
   * @returns auth and unauth roles
   */
  setupIdentityPoolRoles = async (
    userPoolId: string,
    userPoolClientId: string,
    identityPoolId: string
  ) => {
    const authRole = await this.createRoleBase({
      RoleName: `ref-auth-role`,
      AssumeRolePolicyDocument: this.getIdentityPoolAssumeRolePolicyDocument(
        identityPoolId,
        'authenticated'
      ),
    });
    const unauthRole = await this.createRoleBase({
      RoleName: `ref-unauth-role`,
      AssumeRolePolicyDocument: this.getIdentityPoolAssumeRolePolicyDocument(
        identityPoolId,
        'unauthenticated'
      ),
    });
    const region = await this.cognitoIdentityClient.config.region();
    await this.cognitoIdentityClient.send(
      new SetIdentityPoolRolesCommand({
        IdentityPoolId: identityPoolId,
        Roles: {
          unauthenticated: unauthRole.Arn!,
          authenticated: authRole.Arn!,
        },
        RoleMappings: {
          [`cognito-idp.${region}.amazonaws.com/${userPoolId}:${userPoolClientId}`]:
            {
              Type: 'Token',
              AmbiguousRoleResolution: 'AuthenticatedRole',
            },
        },
      })
    );

    return {
      authRole,
      unauthRole,
    };
  };

  private getIdentityPoolAssumeRolePolicyDocument = (
    identityPoolId: string,
    roleType: 'authenticated' | 'unauthenticated'
  ) => {
    return `{
        "Version": "2012-10-17",
        "Statement": [
            {
                "Effect": "Allow",
                "Principal": {
                    "Federated": "cognito-identity.amazonaws.com"
                },
                "Action": "sts:AssumeRoleWithWebIdentity",
                "Condition": {
                    "StringEquals": {
                        "cognito-identity.amazonaws.com:aud": "${identityPoolId}"
                    },
                    "ForAnyValue:StringLike": {
                        "cognito-identity.amazonaws.com:amr": "${roleType}"
                    }
                }
            }
        ]
    }`;
  };
}
