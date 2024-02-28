import { Construct } from 'constructs';
import { AmplifyData } from '@aws-amplify/data-construct';
import { CfnFunctionConfiguration, CfnResolver } from 'aws-cdk-lib/aws-appsync';
import { FilePathExtractor } from '@aws-amplify/platform-core';
import { JsResolver, JsResolverEntry } from '@aws-amplify/data-schema-types';
import { readFileSync, statSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';

const APPSYNC_PIPELINE_RESOLVER = 'PIPELINE';
const APPSYNC_JS_RUNTIME_NAME = 'APPSYNC_JS';
const APPSYNC_JS_RUNTIME_VERSION = '1.0.0';
const JS_PIPELINE_RESOLVER_HANDLER = './js_resolver_handler.js';

/**
 * Resolve JS resolver function entry relative path to absolute
 */
const resolveEntryPath = (entry: JsResolverEntry): string => {
  const unresolvedImportLocationError = new Error(
    'Could not determine import path to construct absolute code path from relative path. Consider using an absolute path instead.'
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

/**
 * Convert JS resolver entry to a fully resolved and validated file path
 * @param entry - string file path OR object containing relative path and import line
 * @returns - resolved and validated file path or throws error
 */
const validatedFilePath = (entry: JsResolverEntry): string => {
  const path = resolveEntryPath(entry);

  const stat = statSync(path);
  if (stat.isFile()) {
    return path;
  }

  throw new Error(
    `JS Resolver entry file not found at path: ${path}\nConsider using an absolute path instead.`
  );
};

/**
 * Reads default js resolver template file and returns string contents
 * sans inline sourcemap and eslint-disable
 */
const normalizedDefaultJsResolver = (): string => {
  const resolvedTemplatePath = resolve(
    fileURLToPath(import.meta.url),
    '..',
    JS_PIPELINE_RESOLVER_HANDLER
  );
  const fileContents: string = readFileSync(resolvedTemplatePath, 'utf-8');
  const fileLines = fileContents.split('\n');

  if (fileLines[0]?.includes('eslint-disable')) {
    fileLines.shift();
  }

  if (fileLines.slice(-1)?.includes('sourceMappingURL')) {
    fileLines.pop();
  }

  return fileLines.join('\n');
};

/**
 * Converts JS Resolver definition emitted by data-schema into AppSync pipeline
 * resolvers via L1 construct.
 */
export const convertJsResolverDefinition = (
  scope: Construct,
  amplifyApi: AmplifyData,
  jsResolvers: JsResolver[] | undefined
): void => {
  if (!jsResolvers || jsResolvers.length < 1) {
    return;
  }

  for (const resolver of jsResolvers) {
    const functions: string[] = resolver.handlers.map((handler, idx) => {
      const fnName = `Fn_${resolver.typeName}_${resolver.fieldName}_${idx + 1}`;

      const fn = new CfnFunctionConfiguration(scope, fnName, {
        apiId: amplifyApi.apiId,
        dataSourceName: handler.dataSource,
        name: fnName,
        code: readFileSync(validatedFilePath(handler.entry), 'utf-8'),
        runtime: {
          name: APPSYNC_JS_RUNTIME_NAME,
          runtimeVersion: APPSYNC_JS_RUNTIME_VERSION,
        },
      });
      fn.node.addDependency(amplifyApi);
      return fn.attrFunctionId;
    });

    const resolverName = `Resolver_${resolver.typeName}_${resolver.fieldName}`;

    new CfnResolver(scope, resolverName, {
      apiId: amplifyApi.apiId,
      fieldName: resolver.fieldName,
      typeName: resolver.typeName,
      kind: APPSYNC_PIPELINE_RESOLVER,
      code: normalizedDefaultJsResolver(),
      runtime: {
        name: APPSYNC_JS_RUNTIME_NAME,
        runtimeVersion: APPSYNC_JS_RUNTIME_VERSION,
      },
      pipelineConfig: {
        functions,
      },
    }).node.addDependency(amplifyApi);
  }
};
