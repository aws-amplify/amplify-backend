## API Report File for "@aws-amplify/backend-output-schemas"

> Do not edit this file. It is a report generated by [API Extractor](https://api-extractor.com/).

```ts

import { z } from 'zod';

// @public (undocumented)
export type AuthOutput = z.infer<typeof versionedAuthOutputSchema>;

// @public
export const authOutputKey = "AWS::Amplify::Auth";

// @public (undocumented)
export type AwsAppsyncAuthenticationType = z.infer<typeof AwsAppsyncAuthenticationZodEnum>;

// @public (undocumented)
export const AwsAppsyncAuthenticationZodEnum: z.ZodEnum<["API_KEY", "AWS_LAMBDA", "AWS_IAM", "OPENID_CONNECT", "AMAZON_COGNITO_USER_POOLS"]>;

// @public
export type BackendOutputEntryStackMetadata = z.infer<typeof backendOutputEntryStackMetadataSchema>;

// @public
export const backendOutputEntryStackMetadataSchema: z.ZodObject<{
    version: z.ZodString;
    stackOutputs: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    version: string;
    stackOutputs: string[];
}, {
    version: string;
    stackOutputs: string[];
}>;

// @public
export type BackendOutputStackMetadata = z.infer<typeof backendOutputStackMetadataSchema>;

// @public
export const backendOutputStackMetadataSchema: z.ZodRecord<z.ZodString, z.ZodObject<{
    version: z.ZodString;
    stackOutputs: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    version: string;
    stackOutputs: string[];
}, {
    version: string;
    stackOutputs: string[];
}>>;

// @public (undocumented)
export type CustomOutput = z.infer<typeof versionedCustomOutputSchema>;

// @public
export const customOutputKey = "AWS::Amplify::Custom";

// @public (undocumented)
export type FunctionOutput = z.infer<typeof versionedFunctionOutputSchema>;

// @public
export const functionOutputKey = "AWS::Amplify::Function";

// @public (undocumented)
export type GraphqlOutput = z.infer<typeof versionedGraphqlOutputSchema>;

// @public
export const graphqlOutputKey = "AWS::Amplify::GraphQL";

// @public
export const platformOutputKey = "AWS::Amplify::Platform";

// @public (undocumented)
export type StorageOutput = z.infer<typeof versionedStorageOutputSchema>;

// @public
export const storageOutputKey = "AWS::Amplify::Storage";

// @public
export type UnifiedBackendOutput = z.infer<typeof unifiedBackendOutputSchema>;

// @public
export const unifiedBackendOutputSchema: z.ZodObject<{
    "AWS::Amplify::Platform": z.ZodOptional<z.ZodDiscriminatedUnion<"version", [z.ZodObject<{
        version: z.ZodLiteral<"1">;
        payload: z.ZodObject<{
            deploymentType: z.ZodString;
            region: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            deploymentType: string;
            region: string;
        }, {
            deploymentType: string;
            region: string;
        }>;
    }, "strip", z.ZodTypeAny, {
        version: "1";
        payload: {
            deploymentType: string;
            region: string;
        };
    }, {
        version: "1";
        payload: {
            deploymentType: string;
            region: string;
        };
    }>]>>;
    "AWS::Amplify::Auth": z.ZodOptional<z.ZodDiscriminatedUnion<"version", [z.ZodObject<{
        version: z.ZodLiteral<"1">;
        payload: z.ZodObject<{
            authRegion: z.ZodString;
            userPoolId: z.ZodString;
            webClientId: z.ZodString;
            identityPoolId: z.ZodString;
            amazonClientId: z.ZodOptional<z.ZodString>;
            appleClientId: z.ZodOptional<z.ZodString>;
            facebookClientId: z.ZodOptional<z.ZodString>;
            googleClientId: z.ZodOptional<z.ZodString>;
            allowUnauthenticatedIdentities: z.ZodOptional<z.ZodString>;
            usernameAttributes: z.ZodOptional<z.ZodString>;
            signupAttributes: z.ZodOptional<z.ZodString>;
            passwordPolicyMinLength: z.ZodOptional<z.ZodString>;
            passwordPolicyRequirements: z.ZodOptional<z.ZodString>;
            mfaConfiguration: z.ZodOptional<z.ZodString>;
            mfaTypes: z.ZodOptional<z.ZodString>;
            verificationMechanisms: z.ZodOptional<z.ZodString>;
            socialProviders: z.ZodOptional<z.ZodString>;
            oauthCognitoDomain: z.ZodOptional<z.ZodString>;
            oauthScope: z.ZodOptional<z.ZodString>;
            oauthRedirectSignIn: z.ZodOptional<z.ZodString>;
            oauthRedirectSignOut: z.ZodOptional<z.ZodString>;
            oauthClientId: z.ZodOptional<z.ZodString>;
            oauthResponseType: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            authRegion: string;
            userPoolId: string;
            webClientId: string;
            identityPoolId: string;
            amazonClientId?: string | undefined;
            appleClientId?: string | undefined;
            facebookClientId?: string | undefined;
            googleClientId?: string | undefined;
            allowUnauthenticatedIdentities?: string | undefined;
            usernameAttributes?: string | undefined;
            signupAttributes?: string | undefined;
            passwordPolicyMinLength?: string | undefined;
            passwordPolicyRequirements?: string | undefined;
            mfaConfiguration?: string | undefined;
            mfaTypes?: string | undefined;
            verificationMechanisms?: string | undefined;
            socialProviders?: string | undefined;
            oauthCognitoDomain?: string | undefined;
            oauthScope?: string | undefined;
            oauthRedirectSignIn?: string | undefined;
            oauthRedirectSignOut?: string | undefined;
            oauthClientId?: string | undefined;
            oauthResponseType?: string | undefined;
        }, {
            authRegion: string;
            userPoolId: string;
            webClientId: string;
            identityPoolId: string;
            amazonClientId?: string | undefined;
            appleClientId?: string | undefined;
            facebookClientId?: string | undefined;
            googleClientId?: string | undefined;
            allowUnauthenticatedIdentities?: string | undefined;
            usernameAttributes?: string | undefined;
            signupAttributes?: string | undefined;
            passwordPolicyMinLength?: string | undefined;
            passwordPolicyRequirements?: string | undefined;
            mfaConfiguration?: string | undefined;
            mfaTypes?: string | undefined;
            verificationMechanisms?: string | undefined;
            socialProviders?: string | undefined;
            oauthCognitoDomain?: string | undefined;
            oauthScope?: string | undefined;
            oauthRedirectSignIn?: string | undefined;
            oauthRedirectSignOut?: string | undefined;
            oauthClientId?: string | undefined;
            oauthResponseType?: string | undefined;
        }>;
    }, "strip", z.ZodTypeAny, {
        version: "1";
        payload: {
            authRegion: string;
            userPoolId: string;
            webClientId: string;
            identityPoolId: string;
            amazonClientId?: string | undefined;
            appleClientId?: string | undefined;
            facebookClientId?: string | undefined;
            googleClientId?: string | undefined;
            allowUnauthenticatedIdentities?: string | undefined;
            usernameAttributes?: string | undefined;
            signupAttributes?: string | undefined;
            passwordPolicyMinLength?: string | undefined;
            passwordPolicyRequirements?: string | undefined;
            mfaConfiguration?: string | undefined;
            mfaTypes?: string | undefined;
            verificationMechanisms?: string | undefined;
            socialProviders?: string | undefined;
            oauthCognitoDomain?: string | undefined;
            oauthScope?: string | undefined;
            oauthRedirectSignIn?: string | undefined;
            oauthRedirectSignOut?: string | undefined;
            oauthClientId?: string | undefined;
            oauthResponseType?: string | undefined;
        };
    }, {
        version: "1";
        payload: {
            authRegion: string;
            userPoolId: string;
            webClientId: string;
            identityPoolId: string;
            amazonClientId?: string | undefined;
            appleClientId?: string | undefined;
            facebookClientId?: string | undefined;
            googleClientId?: string | undefined;
            allowUnauthenticatedIdentities?: string | undefined;
            usernameAttributes?: string | undefined;
            signupAttributes?: string | undefined;
            passwordPolicyMinLength?: string | undefined;
            passwordPolicyRequirements?: string | undefined;
            mfaConfiguration?: string | undefined;
            mfaTypes?: string | undefined;
            verificationMechanisms?: string | undefined;
            socialProviders?: string | undefined;
            oauthCognitoDomain?: string | undefined;
            oauthScope?: string | undefined;
            oauthRedirectSignIn?: string | undefined;
            oauthRedirectSignOut?: string | undefined;
            oauthClientId?: string | undefined;
            oauthResponseType?: string | undefined;
        };
    }>]>>;
    "AWS::Amplify::GraphQL": z.ZodOptional<z.ZodDiscriminatedUnion<"version", [z.ZodObject<{
        version: z.ZodLiteral<"1">;
        payload: z.ZodObject<{
            awsAppsyncRegion: z.ZodString;
            awsAppsyncApiEndpoint: z.ZodString;
            awsAppsyncAuthenticationType: z.ZodEnum<["API_KEY", "AWS_LAMBDA", "AWS_IAM", "OPENID_CONNECT", "AMAZON_COGNITO_USER_POOLS"]>;
            awsAppsyncAdditionalAuthenticationTypes: z.ZodOptional<z.ZodString>;
            awsAppsyncConflictResolutionMode: z.ZodOptional<z.ZodString>;
            awsAppsyncApiKey: z.ZodOptional<z.ZodString>;
            awsAppsyncApiId: z.ZodString;
            amplifyApiModelSchemaS3Uri: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            awsAppsyncRegion: string;
            awsAppsyncApiEndpoint: string;
            awsAppsyncAuthenticationType: "API_KEY" | "AWS_LAMBDA" | "AWS_IAM" | "OPENID_CONNECT" | "AMAZON_COGNITO_USER_POOLS";
            awsAppsyncApiId: string;
            amplifyApiModelSchemaS3Uri: string;
            awsAppsyncAdditionalAuthenticationTypes?: string | undefined;
            awsAppsyncConflictResolutionMode?: string | undefined;
            awsAppsyncApiKey?: string | undefined;
        }, {
            awsAppsyncRegion: string;
            awsAppsyncApiEndpoint: string;
            awsAppsyncAuthenticationType: "API_KEY" | "AWS_LAMBDA" | "AWS_IAM" | "OPENID_CONNECT" | "AMAZON_COGNITO_USER_POOLS";
            awsAppsyncApiId: string;
            amplifyApiModelSchemaS3Uri: string;
            awsAppsyncAdditionalAuthenticationTypes?: string | undefined;
            awsAppsyncConflictResolutionMode?: string | undefined;
            awsAppsyncApiKey?: string | undefined;
        }>;
    }, "strip", z.ZodTypeAny, {
        version: "1";
        payload: {
            awsAppsyncRegion: string;
            awsAppsyncApiEndpoint: string;
            awsAppsyncAuthenticationType: "API_KEY" | "AWS_LAMBDA" | "AWS_IAM" | "OPENID_CONNECT" | "AMAZON_COGNITO_USER_POOLS";
            awsAppsyncApiId: string;
            amplifyApiModelSchemaS3Uri: string;
            awsAppsyncAdditionalAuthenticationTypes?: string | undefined;
            awsAppsyncConflictResolutionMode?: string | undefined;
            awsAppsyncApiKey?: string | undefined;
        };
    }, {
        version: "1";
        payload: {
            awsAppsyncRegion: string;
            awsAppsyncApiEndpoint: string;
            awsAppsyncAuthenticationType: "API_KEY" | "AWS_LAMBDA" | "AWS_IAM" | "OPENID_CONNECT" | "AMAZON_COGNITO_USER_POOLS";
            awsAppsyncApiId: string;
            amplifyApiModelSchemaS3Uri: string;
            awsAppsyncAdditionalAuthenticationTypes?: string | undefined;
            awsAppsyncConflictResolutionMode?: string | undefined;
            awsAppsyncApiKey?: string | undefined;
        };
    }>]>>;
    "AWS::Amplify::Storage": z.ZodOptional<z.ZodDiscriminatedUnion<"version", [z.ZodObject<{
        version: z.ZodLiteral<"1">;
        payload: z.ZodObject<{
            bucketName: z.ZodString;
            storageRegion: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            bucketName: string;
            storageRegion: string;
        }, {
            bucketName: string;
            storageRegion: string;
        }>;
    }, "strip", z.ZodTypeAny, {
        version: "1";
        payload: {
            bucketName: string;
            storageRegion: string;
        };
    }, {
        version: "1";
        payload: {
            bucketName: string;
            storageRegion: string;
        };
    }>]>>;
    "AWS::Amplify::Custom": z.ZodOptional<z.ZodDiscriminatedUnion<"version", [z.ZodObject<{
        version: z.ZodLiteral<"1">;
        payload: z.ZodObject<{
            customOutputs: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            customOutputs: string;
        }, {
            customOutputs: string;
        }>;
    }, "strip", z.ZodTypeAny, {
        version: "1";
        payload: {
            customOutputs: string;
        };
    }, {
        version: "1";
        payload: {
            customOutputs: string;
        };
    }>]>>;
    "AWS::Amplify::Function": z.ZodOptional<z.ZodDiscriminatedUnion<"version", [z.ZodObject<{
        version: z.ZodLiteral<"1">;
        payload: z.ZodObject<{
            definedFunctions: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            definedFunctions: string;
        }, {
            definedFunctions: string;
        }>;
    }, "strip", z.ZodTypeAny, {
        version: "1";
        payload: {
            definedFunctions: string;
        };
    }, {
        version: "1";
        payload: {
            definedFunctions: string;
        };
    }>]>>;
}, "strip", z.ZodTypeAny, {
    "AWS::Amplify::Platform"?: {
        version: "1";
        payload: {
            deploymentType: string;
            region: string;
        };
    } | undefined;
    "AWS::Amplify::Custom"?: {
        version: "1";
        payload: {
            customOutputs: string;
        };
    } | undefined;
    "AWS::Amplify::Auth"?: {
        version: "1";
        payload: {
            authRegion: string;
            userPoolId: string;
            webClientId: string;
            identityPoolId: string;
            amazonClientId?: string | undefined;
            appleClientId?: string | undefined;
            facebookClientId?: string | undefined;
            googleClientId?: string | undefined;
            allowUnauthenticatedIdentities?: string | undefined;
            usernameAttributes?: string | undefined;
            signupAttributes?: string | undefined;
            passwordPolicyMinLength?: string | undefined;
            passwordPolicyRequirements?: string | undefined;
            mfaConfiguration?: string | undefined;
            mfaTypes?: string | undefined;
            verificationMechanisms?: string | undefined;
            socialProviders?: string | undefined;
            oauthCognitoDomain?: string | undefined;
            oauthScope?: string | undefined;
            oauthRedirectSignIn?: string | undefined;
            oauthRedirectSignOut?: string | undefined;
            oauthClientId?: string | undefined;
            oauthResponseType?: string | undefined;
        };
    } | undefined;
    "AWS::Amplify::GraphQL"?: {
        version: "1";
        payload: {
            awsAppsyncRegion: string;
            awsAppsyncApiEndpoint: string;
            awsAppsyncAuthenticationType: "API_KEY" | "AWS_LAMBDA" | "AWS_IAM" | "OPENID_CONNECT" | "AMAZON_COGNITO_USER_POOLS";
            awsAppsyncApiId: string;
            amplifyApiModelSchemaS3Uri: string;
            awsAppsyncAdditionalAuthenticationTypes?: string | undefined;
            awsAppsyncConflictResolutionMode?: string | undefined;
            awsAppsyncApiKey?: string | undefined;
        };
    } | undefined;
    "AWS::Amplify::Storage"?: {
        version: "1";
        payload: {
            bucketName: string;
            storageRegion: string;
        };
    } | undefined;
    "AWS::Amplify::Function"?: {
        version: "1";
        payload: {
            definedFunctions: string;
        };
    } | undefined;
}, {
    "AWS::Amplify::Platform"?: {
        version: "1";
        payload: {
            deploymentType: string;
            region: string;
        };
    } | undefined;
    "AWS::Amplify::Custom"?: {
        version: "1";
        payload: {
            customOutputs: string;
        };
    } | undefined;
    "AWS::Amplify::Auth"?: {
        version: "1";
        payload: {
            authRegion: string;
            userPoolId: string;
            webClientId: string;
            identityPoolId: string;
            amazonClientId?: string | undefined;
            appleClientId?: string | undefined;
            facebookClientId?: string | undefined;
            googleClientId?: string | undefined;
            allowUnauthenticatedIdentities?: string | undefined;
            usernameAttributes?: string | undefined;
            signupAttributes?: string | undefined;
            passwordPolicyMinLength?: string | undefined;
            passwordPolicyRequirements?: string | undefined;
            mfaConfiguration?: string | undefined;
            mfaTypes?: string | undefined;
            verificationMechanisms?: string | undefined;
            socialProviders?: string | undefined;
            oauthCognitoDomain?: string | undefined;
            oauthScope?: string | undefined;
            oauthRedirectSignIn?: string | undefined;
            oauthRedirectSignOut?: string | undefined;
            oauthClientId?: string | undefined;
            oauthResponseType?: string | undefined;
        };
    } | undefined;
    "AWS::Amplify::GraphQL"?: {
        version: "1";
        payload: {
            awsAppsyncRegion: string;
            awsAppsyncApiEndpoint: string;
            awsAppsyncAuthenticationType: "API_KEY" | "AWS_LAMBDA" | "AWS_IAM" | "OPENID_CONNECT" | "AMAZON_COGNITO_USER_POOLS";
            awsAppsyncApiId: string;
            amplifyApiModelSchemaS3Uri: string;
            awsAppsyncAdditionalAuthenticationTypes?: string | undefined;
            awsAppsyncConflictResolutionMode?: string | undefined;
            awsAppsyncApiKey?: string | undefined;
        };
    } | undefined;
    "AWS::Amplify::Storage"?: {
        version: "1";
        payload: {
            bucketName: string;
            storageRegion: string;
        };
    } | undefined;
    "AWS::Amplify::Function"?: {
        version: "1";
        payload: {
            definedFunctions: string;
        };
    } | undefined;
}>;

// @public (undocumented)
export const versionedAuthOutputSchema: z.ZodDiscriminatedUnion<"version", [z.ZodObject<{
    version: z.ZodLiteral<"1">;
    payload: z.ZodObject<{
        authRegion: z.ZodString;
        userPoolId: z.ZodString;
        webClientId: z.ZodString;
        identityPoolId: z.ZodString;
        amazonClientId: z.ZodOptional<z.ZodString>;
        appleClientId: z.ZodOptional<z.ZodString>;
        facebookClientId: z.ZodOptional<z.ZodString>;
        googleClientId: z.ZodOptional<z.ZodString>;
        allowUnauthenticatedIdentities: z.ZodOptional<z.ZodString>;
        usernameAttributes: z.ZodOptional<z.ZodString>;
        signupAttributes: z.ZodOptional<z.ZodString>;
        passwordPolicyMinLength: z.ZodOptional<z.ZodString>;
        passwordPolicyRequirements: z.ZodOptional<z.ZodString>;
        mfaConfiguration: z.ZodOptional<z.ZodString>;
        mfaTypes: z.ZodOptional<z.ZodString>;
        verificationMechanisms: z.ZodOptional<z.ZodString>;
        socialProviders: z.ZodOptional<z.ZodString>;
        oauthCognitoDomain: z.ZodOptional<z.ZodString>;
        oauthScope: z.ZodOptional<z.ZodString>;
        oauthRedirectSignIn: z.ZodOptional<z.ZodString>;
        oauthRedirectSignOut: z.ZodOptional<z.ZodString>;
        oauthClientId: z.ZodOptional<z.ZodString>;
        oauthResponseType: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        authRegion: string;
        userPoolId: string;
        webClientId: string;
        identityPoolId: string;
        amazonClientId?: string | undefined;
        appleClientId?: string | undefined;
        facebookClientId?: string | undefined;
        googleClientId?: string | undefined;
        allowUnauthenticatedIdentities?: string | undefined;
        usernameAttributes?: string | undefined;
        signupAttributes?: string | undefined;
        passwordPolicyMinLength?: string | undefined;
        passwordPolicyRequirements?: string | undefined;
        mfaConfiguration?: string | undefined;
        mfaTypes?: string | undefined;
        verificationMechanisms?: string | undefined;
        socialProviders?: string | undefined;
        oauthCognitoDomain?: string | undefined;
        oauthScope?: string | undefined;
        oauthRedirectSignIn?: string | undefined;
        oauthRedirectSignOut?: string | undefined;
        oauthClientId?: string | undefined;
        oauthResponseType?: string | undefined;
    }, {
        authRegion: string;
        userPoolId: string;
        webClientId: string;
        identityPoolId: string;
        amazonClientId?: string | undefined;
        appleClientId?: string | undefined;
        facebookClientId?: string | undefined;
        googleClientId?: string | undefined;
        allowUnauthenticatedIdentities?: string | undefined;
        usernameAttributes?: string | undefined;
        signupAttributes?: string | undefined;
        passwordPolicyMinLength?: string | undefined;
        passwordPolicyRequirements?: string | undefined;
        mfaConfiguration?: string | undefined;
        mfaTypes?: string | undefined;
        verificationMechanisms?: string | undefined;
        socialProviders?: string | undefined;
        oauthCognitoDomain?: string | undefined;
        oauthScope?: string | undefined;
        oauthRedirectSignIn?: string | undefined;
        oauthRedirectSignOut?: string | undefined;
        oauthClientId?: string | undefined;
        oauthResponseType?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    version: "1";
    payload: {
        authRegion: string;
        userPoolId: string;
        webClientId: string;
        identityPoolId: string;
        amazonClientId?: string | undefined;
        appleClientId?: string | undefined;
        facebookClientId?: string | undefined;
        googleClientId?: string | undefined;
        allowUnauthenticatedIdentities?: string | undefined;
        usernameAttributes?: string | undefined;
        signupAttributes?: string | undefined;
        passwordPolicyMinLength?: string | undefined;
        passwordPolicyRequirements?: string | undefined;
        mfaConfiguration?: string | undefined;
        mfaTypes?: string | undefined;
        verificationMechanisms?: string | undefined;
        socialProviders?: string | undefined;
        oauthCognitoDomain?: string | undefined;
        oauthScope?: string | undefined;
        oauthRedirectSignIn?: string | undefined;
        oauthRedirectSignOut?: string | undefined;
        oauthClientId?: string | undefined;
        oauthResponseType?: string | undefined;
    };
}, {
    version: "1";
    payload: {
        authRegion: string;
        userPoolId: string;
        webClientId: string;
        identityPoolId: string;
        amazonClientId?: string | undefined;
        appleClientId?: string | undefined;
        facebookClientId?: string | undefined;
        googleClientId?: string | undefined;
        allowUnauthenticatedIdentities?: string | undefined;
        usernameAttributes?: string | undefined;
        signupAttributes?: string | undefined;
        passwordPolicyMinLength?: string | undefined;
        passwordPolicyRequirements?: string | undefined;
        mfaConfiguration?: string | undefined;
        mfaTypes?: string | undefined;
        verificationMechanisms?: string | undefined;
        socialProviders?: string | undefined;
        oauthCognitoDomain?: string | undefined;
        oauthScope?: string | undefined;
        oauthRedirectSignIn?: string | undefined;
        oauthRedirectSignOut?: string | undefined;
        oauthClientId?: string | undefined;
        oauthResponseType?: string | undefined;
    };
}>]>;

// @public (undocumented)
export const versionedCustomOutputSchema: z.ZodDiscriminatedUnion<"version", [z.ZodObject<{
    version: z.ZodLiteral<"1">;
    payload: z.ZodObject<{
        customOutputs: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        customOutputs: string;
    }, {
        customOutputs: string;
    }>;
}, "strip", z.ZodTypeAny, {
    version: "1";
    payload: {
        customOutputs: string;
    };
}, {
    version: "1";
    payload: {
        customOutputs: string;
    };
}>]>;

// @public (undocumented)
export const versionedFunctionOutputSchema: z.ZodDiscriminatedUnion<"version", [z.ZodObject<{
    version: z.ZodLiteral<"1">;
    payload: z.ZodObject<{
        definedFunctions: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        definedFunctions: string;
    }, {
        definedFunctions: string;
    }>;
}, "strip", z.ZodTypeAny, {
    version: "1";
    payload: {
        definedFunctions: string;
    };
}, {
    version: "1";
    payload: {
        definedFunctions: string;
    };
}>]>;

// @public (undocumented)
export const versionedGraphqlOutputSchema: z.ZodDiscriminatedUnion<"version", [z.ZodObject<{
    version: z.ZodLiteral<"1">;
    payload: z.ZodObject<{
        awsAppsyncRegion: z.ZodString;
        awsAppsyncApiEndpoint: z.ZodString;
        awsAppsyncAuthenticationType: z.ZodEnum<["API_KEY", "AWS_LAMBDA", "AWS_IAM", "OPENID_CONNECT", "AMAZON_COGNITO_USER_POOLS"]>;
        awsAppsyncAdditionalAuthenticationTypes: z.ZodOptional<z.ZodString>;
        awsAppsyncConflictResolutionMode: z.ZodOptional<z.ZodString>;
        awsAppsyncApiKey: z.ZodOptional<z.ZodString>;
        awsAppsyncApiId: z.ZodString;
        amplifyApiModelSchemaS3Uri: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        awsAppsyncRegion: string;
        awsAppsyncApiEndpoint: string;
        awsAppsyncAuthenticationType: "API_KEY" | "AWS_LAMBDA" | "AWS_IAM" | "OPENID_CONNECT" | "AMAZON_COGNITO_USER_POOLS";
        awsAppsyncApiId: string;
        amplifyApiModelSchemaS3Uri: string;
        awsAppsyncAdditionalAuthenticationTypes?: string | undefined;
        awsAppsyncConflictResolutionMode?: string | undefined;
        awsAppsyncApiKey?: string | undefined;
    }, {
        awsAppsyncRegion: string;
        awsAppsyncApiEndpoint: string;
        awsAppsyncAuthenticationType: "API_KEY" | "AWS_LAMBDA" | "AWS_IAM" | "OPENID_CONNECT" | "AMAZON_COGNITO_USER_POOLS";
        awsAppsyncApiId: string;
        amplifyApiModelSchemaS3Uri: string;
        awsAppsyncAdditionalAuthenticationTypes?: string | undefined;
        awsAppsyncConflictResolutionMode?: string | undefined;
        awsAppsyncApiKey?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    version: "1";
    payload: {
        awsAppsyncRegion: string;
        awsAppsyncApiEndpoint: string;
        awsAppsyncAuthenticationType: "API_KEY" | "AWS_LAMBDA" | "AWS_IAM" | "OPENID_CONNECT" | "AMAZON_COGNITO_USER_POOLS";
        awsAppsyncApiId: string;
        amplifyApiModelSchemaS3Uri: string;
        awsAppsyncAdditionalAuthenticationTypes?: string | undefined;
        awsAppsyncConflictResolutionMode?: string | undefined;
        awsAppsyncApiKey?: string | undefined;
    };
}, {
    version: "1";
    payload: {
        awsAppsyncRegion: string;
        awsAppsyncApiEndpoint: string;
        awsAppsyncAuthenticationType: "API_KEY" | "AWS_LAMBDA" | "AWS_IAM" | "OPENID_CONNECT" | "AMAZON_COGNITO_USER_POOLS";
        awsAppsyncApiId: string;
        amplifyApiModelSchemaS3Uri: string;
        awsAppsyncAdditionalAuthenticationTypes?: string | undefined;
        awsAppsyncConflictResolutionMode?: string | undefined;
        awsAppsyncApiKey?: string | undefined;
    };
}>]>;

// @public (undocumented)
export const versionedStorageOutputSchema: z.ZodDiscriminatedUnion<"version", [z.ZodObject<{
    version: z.ZodLiteral<"1">;
    payload: z.ZodObject<{
        bucketName: z.ZodString;
        storageRegion: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        bucketName: string;
        storageRegion: string;
    }, {
        bucketName: string;
        storageRegion: string;
    }>;
}, "strip", z.ZodTypeAny, {
    version: "1";
    payload: {
        bucketName: string;
        storageRegion: string;
    };
}, {
    version: "1";
    payload: {
        bucketName: string;
        storageRegion: string;
    };
}>]>;

// (No @packageDocumentation comment for this package)

```