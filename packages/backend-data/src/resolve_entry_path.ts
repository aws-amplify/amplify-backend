import {
  AmplifyUserError,
  FilePathExtractor,
} from '@aws-amplify/platform-core';
import { dirname, join } from 'path';
import type { JsResolverEntry } from '@aws-amplify/data-schema-types';
import { AmplifyDataError } from './types.js';

/**
 * Resolve JS Resolver Handler or Sql Reference Handler entry path to absolute path
 * @param entry handler entry
 * @returns resolved absolute file path
 */
export const resolveEntryPath = (entry: JsResolverEntry): string => {
  const unresolvedImportLocationError = new AmplifyUserError<AmplifyDataError>(
    'UnresolvedEntryPath',
    {
      message:
        'Could not determine import path to construct absolute code path from relative path: ' +
        JSON.stringify(entry),
      resolution: 'Consider using an absolute path instead.',
    }
  );

  if (typeof entry === 'string') {
    return entry;
  }

  const filePath = new FilePathExtractor(entry.importLine).extract();
  if (filePath) {
    return join(dirname(filePath), entry.relativePath);
  }

  throw unresolvedImportLocationError;
};
