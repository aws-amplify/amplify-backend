/* eslint-disable unicorn/filename-case */
/* eslint-disable check-file/filename-naming-convention */
// we have to match the naming convention of the generated env shim file

// we have to match the expected environment variable names
/* eslint-disable @typescript-eslint/naming-convention */
export const env = process.env as {
  TEST_NAME_BUCKET_NAME: string;
  AWS_REGION: string;
  AWS_ACCESS_KEY_ID: string;
  AWS_SECRET_ACCESS_KEY: string;
  AWS_SESSION_TOKEN: string;
  TEST_SECRET: string;
  TEST_SHARED_SECRET: string;
};
