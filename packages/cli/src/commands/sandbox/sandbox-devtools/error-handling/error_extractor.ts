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
  // Handle AmplifyError objects (which have structured resolution info)
  if (AmplifyError.isAmplifyError(error)) {
    return {
      name: error.name,
      message: error.message,
      resolution: error.resolution,
    };
  }

  // Handle regular Error objects
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
    };
  }

  // Handle everything else
  return {
    name: 'UnknownError',
    message: String(error),
  };
};
