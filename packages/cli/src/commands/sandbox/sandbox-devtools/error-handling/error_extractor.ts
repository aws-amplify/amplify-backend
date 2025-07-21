import { AmplifyError } from '@aws-amplify/platform-core';

/**
 * Simple error information extracted from any error
 */
export type SimpleErrorInfo = {
  name: string;
  message: string;
  resolution?: string;
};

/**
 * Extracts basic error information from any error object
 * @param error The error to extract information from
 * @returns Simple error information with name, message, and optional resolution
 */
export const extractErrorInfo = (error: unknown): SimpleErrorInfo => {
  // Use AmplifyError.fromError() to guarantee an AmplifyError
  const amplifyError = AmplifyError.fromError(error);

  return {
    name: amplifyError.name,
    message: amplifyError.message,
    resolution: amplifyError.resolution,
  };
};
