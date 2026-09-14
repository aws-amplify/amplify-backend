/**
 * The regions that the hourly e2e resource cleanup workflow runs in.
 *
 * The workflow runs one job per region, but S3 buckets and IAM roles are listed account wide, so
 * every one of those jobs sees the buckets and roles of all of these regions. A job therefore has
 * to know about the stacks of every region, otherwise it deletes a bucket or a role that a live
 * stack of another region still owns.
 *
 * `e2e_test_regions.test.ts` keeps this list in sync with the workflow matrix.
 */
export const E2E_TEST_REGIONS = [
  'us-west-2',
  'us-east-1',
  'ca-central-1',
  'eu-central-1',
];
