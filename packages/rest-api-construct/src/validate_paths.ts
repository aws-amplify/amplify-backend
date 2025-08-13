import { AmplifyUserError } from '@aws-amplify/platform-core';

/**
 * Validates REST API paths, ensuring a leading slash, no trailing slash, and no double slashes.
 * If all paths are valid, nothing will happen; otherwise an error will be thrown.
 * @param paths array of all the paths to be validated
 */
export const validateRestApiPaths = (paths: string[]) => {
  if (paths.length == 0) {
    throw new AmplifyUserError<string>('NoPathsError', {
      message: 'There must be at least one path.',
      resolution: 'Add at least one valid path.',
    });
  }
  const pathCount: { [path: string]: number } = {};
  paths.forEach((value) => {
    validatePath(value);
    if (pathCount[value]) {
      throw new AmplifyUserError<string>('DuplicatePathError', {
        message:
          'Rest API paths must be unique. Found duplicate path: ' + value,
        resolution: 'Remove duplicates of the path, leaving only one.',
      });
    } else {
      pathCount[value] = 1;
    }
  });
};

const validatePath = (path: string) => {
  if (path === '') {
    throw new AmplifyUserError<string>('EmptyPathError', {
      message: 'A path must not be an empty string.',
      resolution: 'Replace any empty string paths with valid paths.',
    });
  }
  if (!path.startsWith('/')) {
    throw new AmplifyUserError<string>('NoLeadingSlashError', {
      message: "Rest API paths must start with '/'. Found path: " + path,
      resolution: "Add '/' to the start of your path.",
    });
  }

  if (path.endsWith('/')) {
    throw new AmplifyUserError<string>('TrailingSlashError', {
      message: "Rest API paths must not end with '/'. Found path: " + path,
      resolution: "Remove '/' from the end of your path.",
    });
  }

  if (path.includes('//')) {
    throw new AmplifyUserError<string>('DoubleSlashError', {
      message: "Rest API paths must not contain '//'. Found path: " + path,
      resolution: "Replace '//' with '/' in your path.",
    });
  }
};
