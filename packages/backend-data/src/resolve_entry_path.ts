import {
  AmplifyUserError,
  FilePathExtractor,
} from '@aws-amplify/platform-core';
import { dirname, join } from 'path';
import type { JsResolverEntry } from '@aws-amplify/data-schema-types';
import { AmplifyDataError } from './types.js';
import fs from 'fs';

/**
 * Resolve JS Resolver Handler or Sql Reference Handler entry path to absolute path
 * @param entry handler entry
 * @returns resolved absolute file path
 */
export const resolveEntryPath = (entry: JsResolverEntry): string => {
  if (typeof entry === 'string') {
    if (fs.existsSync(entry)) {
      return entry;
    }
    throw new AmplifyUserError<AmplifyDataError>('InvalidPathError', {
      message: `Cannot find file at ${entry}`,
      resolution: `Check that the file exists at ${entry} and is readable`,
    });
  }

  const importPath = new FilePathExtractor(entry.importLine).extract();

  if (importPath) {
    const filePath = join(dirname(importPath), entry.relativePath);
    if (filePath && fs.existsSync(filePath)) {
      return filePath;
    }
  }

  throw new AmplifyUserError<AmplifyDataError>('UnresolvedEntryPathError', {
    message:
      'Could not determine import path to construct absolute code path from relative path: ' +
      JSON.stringify(entry),
    resolution: 'Consider using an absolute path instead.',
  });
};
