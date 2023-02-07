import aws from 'aws-sdk';

export const configureProfile = async (profileName: string = 'default'): Promise<void> => {
  process.env.AWS_SDK_LOAD_CONFIG = '1';
  const credentialProviderChain = new aws.CredentialProviderChain([
    () => new aws.SharedIniFileCredentials({ profile: profileName }),
    () => new aws.ProcessCredentials({ profile: profileName }),
  ]);
  aws.config.credentials = await credentialProviderChain.resolvePromise();
};
