## API Report File for "@aws-amplify/backend-auth"

> Do not edit this file. It is a report generated by [API Extractor](https://api-extractor.com/).

```ts

import { AmazonProviderProps } from '@aws-amplify/auth-construct';
import { AmplifyFunction } from '@aws-amplify/plugin-types';
import { AppleProviderProps } from '@aws-amplify/auth-construct';
import { AuthOutput } from '@aws-amplify/backend-output-schemas';
import { AuthProps } from '@aws-amplify/auth-construct';
import { AuthResources } from '@aws-amplify/plugin-types';
import { AuthRoleName } from '@aws-amplify/plugin-types';
import { BackendOutputStorageStrategy } from '@aws-amplify/plugin-types';
import { BackendSecret } from '@aws-amplify/plugin-types';
import { ConstructFactory } from '@aws-amplify/plugin-types';
import { ConstructFactoryGetInstanceProps } from '@aws-amplify/plugin-types';
import { ExternalProviderOptions } from '@aws-amplify/auth-construct';
import { FacebookProviderProps } from '@aws-amplify/auth-construct';
import { FunctionResources } from '@aws-amplify/plugin-types';
import { GoogleProviderProps } from '@aws-amplify/auth-construct';
import { IFunction } from 'aws-cdk-lib/aws-lambda';
import { OidcProviderProps } from '@aws-amplify/auth-construct';
import { ReferenceAuthResources } from '@aws-amplify/plugin-types';
import { ResourceAccessAcceptor } from '@aws-amplify/plugin-types';
import { ResourceAccessAcceptorFactory } from '@aws-amplify/plugin-types';
import { ResourceProvider } from '@aws-amplify/plugin-types';
import { StackProvider } from '@aws-amplify/plugin-types';
import { TriggerEvent } from '@aws-amplify/auth-construct';
import { UserPoolSESOptions } from 'aws-cdk-lib/aws-cognito';
import { UserPoolSnsOptions } from '@aws-amplify/auth-construct';

// @public
export type ActionIam = 'addUserToGroup' | 'createGroup' | 'createUser' | 'deleteGroup' | 'deleteUser' | 'deleteUserAttributes' | 'disableUser' | 'enableUser' | 'forgetDevice' | 'getDevice' | 'getGroup' | 'getUser' | 'listUsers' | 'listUsersInGroup' | 'listGroups' | 'listDevices' | 'listGroupsForUser' | 'removeUserFromGroup' | 'resetUserPassword' | 'setUserMfaPreference' | 'setUserPassword' | 'setUserSettings' | 'updateDeviceStatus' | 'updateGroup' | 'updateUserAttributes';

// @public
export type ActionMeta = 'manageUsers' | 'manageGroups' | 'manageGroupMembership' | 'manageUserDevices' | 'managePasswordRecovery';

// @public
export type AmazonProviderFactoryProps = Omit<AmazonProviderProps, 'clientId' | 'clientSecret'> & {
    clientId: BackendSecret;
    clientSecret: BackendSecret;
};

// @public (undocumented)
export type AmplifyAuthProps = Expand<Omit<AuthProps, 'outputStorageStrategy' | 'loginWith' | 'senders'> & {
    loginWith: Expand<AuthLoginWithFactoryProps>;
    triggers?: Partial<Record<TriggerEvent, ConstructFactory<ResourceProvider<FunctionResources>>>>;
    access?: AuthAccessGenerator;
    senders?: {
        email?: Pick<UserPoolSESOptions, 'fromEmail' | 'fromName' | 'replyTo'> | CustomEmailSender;
        sms?: UserPoolSnsOptions | CustomSmsSender;
    };
}>;

// @public (undocumented)
export type AmplifyReferenceAuthProps = Expand<Omit<ReferenceAuthProps, 'outputStorageStrategy'> & {
    access?: AuthAccessGenerator;
}>;

// @public
export type AppleProviderFactoryProps = Omit<AppleProviderProps, 'clientId' | 'teamId' | 'keyId' | 'privateKey'> & {
    clientId: BackendSecret;
    teamId: BackendSecret;
    keyId: BackendSecret;
    privateKey: BackendSecret;
};

// @public (undocumented)
export type AuthAccessBuilder = {
    resource: (other: ConstructFactory<ResourceProvider & ResourceAccessAcceptorFactory>) => AuthActionBuilder;
};

// @public (undocumented)
export type AuthAccessDefinition = {
    getResourceAccessAcceptor: (getInstanceProps: ConstructFactoryGetInstanceProps) => ResourceAccessAcceptor;
    actions: AuthAction[];
};

// @public (undocumented)
export type AuthAccessGenerator = (allow: AuthAccessBuilder) => AuthAccessDefinition[];

// @public (undocumented)
export type AuthAction = ActionIam | ActionMeta;

// @public (undocumented)
export type AuthActionBuilder = {
    to: (actions: AuthAction[]) => AuthAccessDefinition;
};

// @public
export type AuthLoginWithFactoryProps = Omit<AuthProps['loginWith'], 'externalProviders'> & {
    externalProviders?: ExternalProviderSpecificFactoryProps;
};

// @public (undocumented)
export type BackendAuth = ResourceProvider<AuthResources> & ResourceAccessAcceptorFactory<AuthRoleName | string> & StackProvider;

// @public (undocumented)
export type BackendReferenceAuth = ResourceProvider<ReferenceAuthResources> & ResourceAccessAcceptorFactory<AuthRoleName | string> & StackProvider;

// @public
export type CustomEmailSender = {
    handler: ConstructFactory<AmplifyFunction> | IFunction;
    kmsKeyArn?: string;
};

// @public
export type CustomSmsSender = {
    handler: ConstructFactory<AmplifyFunction> | IFunction;
    kmsKeyArn?: string;
};

// @public
export const defineAuth: (props: AmplifyAuthProps) => ConstructFactory<BackendAuth>;

// @public
export type Expand<T> = T extends infer O ? {
    [K in keyof O]: O[K];
} : never;

// @public
export type ExternalProviderGeneralFactoryProps = Omit<ExternalProviderOptions, 'signInWithApple' | 'loginWithAmazon' | 'facebook' | 'oidc' | 'google' | 'domainPrefix'>;

// @public
export type ExternalProviderSpecificFactoryProps = ExternalProviderGeneralFactoryProps & {
    signInWithApple?: AppleProviderFactoryProps;
    loginWithAmazon?: AmazonProviderFactoryProps;
    facebook?: FacebookProviderFactoryProps;
    oidc?: OidcProviderFactoryProps[];
    google?: GoogleProviderFactoryProps;
};

// @public
export type FacebookProviderFactoryProps = Omit<FacebookProviderProps, 'clientId' | 'clientSecret'> & {
    clientId: BackendSecret;
    clientSecret: BackendSecret;
};

// @public
export type GoogleProviderFactoryProps = Omit<GoogleProviderProps, 'clientId' | 'clientSecret'> & {
    clientId: BackendSecret;
    clientSecret: BackendSecret;
};

// @public
export type OidcProviderFactoryProps = Omit<OidcProviderProps, 'clientId' | 'clientSecret'> & {
    clientId: BackendSecret;
    clientSecret: BackendSecret;
};

// @public
export const referenceAuth: (props: AmplifyReferenceAuthProps) => ConstructFactory<BackendReferenceAuth>;

// @public (undocumented)
export type ReferenceAuthProps = {
    outputStorageStrategy?: BackendOutputStorageStrategy<AuthOutput>;
    userPoolId: string;
    identityPoolId: string;
    userPoolClientId: string;
    authRoleArn: string;
    unauthRoleArn: string;
    groups?: {
        [groupName: string]: string;
    };
};

// (No @packageDocumentation comment for this package)

```
