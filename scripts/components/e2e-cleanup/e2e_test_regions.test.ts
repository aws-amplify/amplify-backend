import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import { E2E_TEST_REGIONS } from './e2e_test_regions.js';

const workflowPath = fileURLToPath(
  new URL(
    '../../../.github/workflows/e2e_resource_cleanup.yml',
    import.meta.url,
  ),
);

void describe('E2E_TEST_REGIONS', () => {
  void it('lists the regions of the cleanup workflow matrix', () => {
    const workflow = readFileSync(workflowPath, 'utf-8');
    const matrixRegions = /^\s*region:\s*\[(?<regions>[^\]]+)\]\s*$/m.exec(
      workflow,
    )?.groups?.regions;
    assert.ok(
      matrixRegions,
      'The cleanup workflow no longer declares its regions as a single line matrix entry, so this test cannot keep E2E_TEST_REGIONS in sync with it anymore',
    );
    assert.deepStrictEqual(
      [...E2E_TEST_REGIONS].sort(),
      matrixRegions
        .split(',')
        .map((region) => region.trim())
        .sort(),
      'E2E_TEST_REGIONS is out of sync with the region matrix of the e2e_resource_cleanup workflow. A region that runs e2e tests but is missing here is a region whose live stacks do not protect their account wide resources from the cleanup sweeps',
    );
  });
});
