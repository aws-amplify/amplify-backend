/**
 * Build this up over time based on
 * https://docs.amplify.aws/lib/client-configuration/configuring-amplify-categories/q/platform/js/#scoped-configuration---storage
 */
export type StorageClientConfig = {
  Storage: {
    AWSS3: {
      bucket: string;
    };
  };
};
