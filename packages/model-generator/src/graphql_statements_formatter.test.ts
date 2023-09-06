import { describe, it } from 'node:test';
import fs from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

describe('Graphql statements formatter', () => {
  fs.readFileSync(
    fileURLToPath(
      path.join(path.dirname(import.meta.url), 'appsync_schema.test.graphql')
    ),
    'utf8'
  );
  it.todo('correctly formats typescript');
});
