import { expectTypeTestsToPassAsync } from 'jest-tsd';
import { model } from '../src/ModelType';
import { fields } from '../src/ModelField';

const { string } = fields;

// evaluates type defs in corresponding test-d.ts file
it('should not produce static type errors', async () => {
  await expectTypeTestsToPassAsync(__filename);
});

describe('scratch', () => {
  it('scratch', () => {
    const m = model({
      title: string(),
    });
    // console.log({ m: JSON.stringify(m, null, 2) });
    console.dir(m, { depth: 100 });
  });
});
