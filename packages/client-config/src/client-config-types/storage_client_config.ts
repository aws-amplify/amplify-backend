/**
 * Build this up over time based on
 * https://docs.amplify.aws/lib/client-configuration/configuring-amplify-categories/q/platform/js/#scoped-configuration---storage
 */
export type StorageClientConfig = {
  aws_user_files_s3_bucket_region: string;
  aws_user_files_s3_bucket: string;
};
