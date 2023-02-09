import aws from 'aws-sdk';

export const configureAwsSdk = async (profileName: string = 'default'): Promise<typeof aws> => {
  process.env.AWS_SDK_LOAD_CONFIG = '1';
  const credentialProviderChain = new aws.CredentialProviderChain([
    () => new aws.SharedIniFileCredentials({ profile: profileName }),
    () => new aws.ProcessCredentials({ profile: profileName }),
  ]);
  aws.config.credentials = await credentialProviderChain.resolvePromise();
  return aws;
};
