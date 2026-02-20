#!/usr/bin/env -S npx tsx

/**
 * Workflow Failure Tracker
 *
 * This script analyzes GitHub Actions workflow runs for the health_checks workflow
 * in the amplify-backend repository. It retrieves the last 6 months of workflow run
 * data via the GitHub REST API, analyzes failure patterns at both workflow and job
 * levels, and generates a markdown report with summary statistics and failure counts.
 */

import { Octokit, RestEndpointMethodTypes } from '@octokit/rest';
import { promises as fs } from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

type WorkflowRun =
  RestEndpointMethodTypes['actions']['listWorkflowRuns']['response']['data']['workflow_runs'][number];

type Job =
  RestEndpointMethodTypes['actions']['listJobsForWorkflowRun']['response']['data']['jobs'][number];

type FailureStats = {
  totalRuns: number;
  failedRuns: number;
  failureRate: number;
  workflowFailures: Map<string, number>;
  jobFailures: Map<string, number>;
};

/**
 * Authenticates with GitHub API using a token from environment variables
 * @throws If GITHUB_TOKEN environment variable is not set
 */
const authenticateGitHub = (): Octokit => {
  const token = process.env.GITHUB_TOKEN;

  if (!token) {
    throw new Error('GITHUB_TOKEN environment variable is required');
  }

  return new Octokit({
    auth: token,
  });
};

/**
 * Calculates the date 6 months prior to the given date
 */
const calculateStartDate = (currentDate: Date = new Date()): Date => {
  const startDate = new Date(currentDate);
  startDate.setMonth(startDate.getMonth() - 6);
  return startDate;
};

/**
 * Fetches workflow runs for a specific workflow from GitHub API
 */
const fetchWorkflowRuns = async (
  octokit: Octokit,
  owner: string,
  repo: string,
  workflowName: string,
  startDate: Date,
): Promise<WorkflowRun[]> => {
  // First, get the workflow ID by name
  const { data: workflows } = await octokit.rest.actions.listRepoWorkflows({
    owner,
    repo,
  });

  const workflow = workflows.workflows.find((w) => w.name === workflowName);

  if (!workflow) {
    throw new Error(
      `Workflow "${workflowName}" not found in repository ${owner}/${repo}`,
    );
  }

  // Use octokit.paginate to handle pagination automatically.
  // The mapFn filters runs within our time period and signals
  // early termination via done() when we hit older runs.
  return octokit.paginate(
    octokit.rest.actions.listWorkflowRuns,
    {
      owner,
      repo,
      workflow_id: workflow.id,
      branch: 'main',
      per_page: 100,
    },
    (response, done) => {
      const runsInPeriod = response.data.filter(
        (run) => new Date(run.created_at) >= startDate,
      );
      // If some runs on this page were too old, we've passed our window
      if (runsInPeriod.length < response.data.length) {
        done();
      }
      return runsInPeriod;
    },
  );
};

/**
 * Fetches jobs for a specific workflow run from GitHub API
 */
const fetchJobsForRun = async (
  octokit: Octokit,
  owner: string,
  repo: string,
  runId: number,
): Promise<Job[]> => {
  return octokit.paginate(
    octokit.rest.actions.listJobsForWorkflowRun,
    {
      owner,
      repo,
      run_id: runId,
      per_page: 100,
    },
    (response) => response.data,
  );
};

/**
 * Analyzes workflow runs and jobs to calculate failure statistics
 */
const analyzeFailures = (
  runs: WorkflowRun[],
  jobsByRun: Map<number, Job[]>,
  logger: (message: string) => void,
): FailureStats => {
  // Count total workflow runs
  const totalRuns = runs.length;

  // Count runs where conclusion === 'failure'
  const failedRuns = runs.filter((run) => run.conclusion === 'failure').length;

  // Calculate failure rate as (failedRuns / totalRuns) * 100
  const failureRate = totalRuns > 0 ? (failedRuns / totalRuns) * 100 : 0;

  // Track workflow failures (for now, we'll use a simple count since all runs are from the same workflow)
  const workflowFailures = new Map<string, number>();
  if (failedRuns > 0) {
    workflowFailures.set('health_checks', failedRuns);
  }

  // Count jobs where conclusion === 'failure' and group by job name
  const jobFailures = new Map<string, number>();

  // Also track all conclusion types for debugging
  const conclusionCounts = new Map<string, number>();

  for (const jobs of jobsByRun.values()) {
    for (const job of jobs) {
      // Track all conclusions
      const conclusion = job.conclusion ?? 'null';
      conclusionCounts.set(
        conclusion,
        (conclusionCounts.get(conclusion) ?? 0) + 1,
      );

      // Only count 'failure' (not canceled)
      if (job.conclusion === 'failure') {
        // Extract job prefix (everything before the first space)
        // This groups matrix jobs together (e.g., "e2e_sandbox test1.js test2.js 22 windows" -> "e2e_sandbox")
        const jobPrefix = job.name.split(' ')[0];
        const currentCount = jobFailures.get(jobPrefix) ?? 0;
        jobFailures.set(jobPrefix, currentCount + 1);
      }
    }
  }

  // Log conclusion breakdown for debugging
  logger('\nJob conclusion breakdown:');
  for (const [conclusion, count] of Array.from(conclusionCounts.entries()).sort(
    (a, b) => b[1] - a[1],
  )) {
    logger(`  ${conclusion}: ${count}`);
  }

  return {
    totalRuns,
    failedRuns,
    failureRate,
    workflowFailures,
    jobFailures,
  };
};

/**
 * Generates a markdown report from failure statistics
 */
const generateMarkdownReport = (
  stats: FailureStats,
  startDate: Date,
  endDate: Date,
): string => {
  const lines: string[] = [];

  // Generate markdown header with title
  lines.push('# Workflow Failure Report');
  lines.push('');

  // Include time period covered (start and end dates)
  lines.push('## Time Period');
  lines.push('');
  lines.push(`**Start Date:** ${startDate.toISOString()}`);
  lines.push(`**End Date:** ${endDate.toISOString()}`);
  lines.push('');

  // Add summary section with total runs, failed runs, and failure rate
  lines.push('## Summary Statistics');
  lines.push('');
  lines.push(`- **Total Runs:** ${stats.totalRuns}`);
  lines.push(`- **Failed Runs:** ${stats.failedRuns}`);
  lines.push(`- **Failure Rate:** ${stats.failureRate.toFixed(2)}%`);
  lines.push(
    `- **Total Job Failures:** ${Array.from(stats.jobFailures.values()).reduce((sum, count) => sum + count, 0)}`,
  );
  lines.push(`- **Unique Jobs That Failed:** ${stats.jobFailures.size}`);
  lines.push('');

  // Create table of workflow-level failures
  lines.push('## Workflow-Level Failures');
  lines.push('');
  if (stats.workflowFailures.size > 0) {
    lines.push('| Workflow | Failure Count |');
    lines.push('|----------|---------------|');
    for (const [workflow, count] of stats.workflowFailures.entries()) {
      lines.push(`| ${workflow} | ${count} |`);
    }
  } else {
    lines.push('No workflow failures detected.');
  }
  lines.push('');

  // Create table of job-level failures sorted by count (descending)
  lines.push('## Job-Level Failures');
  lines.push('');
  if (stats.jobFailures.size > 0) {
    // Sort job failures by count in descending order
    const sortedJobFailures = Array.from(stats.jobFailures.entries()).sort(
      (a, b) => b[1] - a[1],
    );

    lines.push('| Job Name | Failure Count |');
    lines.push('|----------|---------------|');
    for (const [jobName, count] of sortedJobFailures) {
      lines.push(`| ${jobName} | ${count} |`);
    }
  } else {
    lines.push('No job failures detected.');
  }
  lines.push('');

  return lines.join('\n');
};

/**
 * Writes the markdown report to a file
 */
const writeReport = async (
  content: string,
  filename: string,
): Promise<void> => {
  try {
    await fs.writeFile(filename, content, 'utf-8');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Failed to write report to file "${filename}": ${errorMessage}`,
      { cause: error },
    );
  }
};

/**
 * Main execution function that orchestrates the workflow failure analysis
 */
const main = async (): Promise<void> => {
  // Configuration
  const owner = 'aws-amplify';
  const repo = 'amplify-backend';
  const workflowName = 'health_checks';
  // Write report to repo root regardless of where the script is run from
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  const outputFilename = path.resolve(currentDir, '..', 'workflow-failure-report.md');

  // eslint-disable-next-line no-console
  console.log('Starting workflow failure analysis...');

  // 1. Call authenticateGitHub
  // eslint-disable-next-line no-console
  console.log('Authenticating with GitHub...');
  const octokit = authenticateGitHub();

  // 2. Calculate time period (6 months ago to now)
  const endDate = new Date();
  const startDate = calculateStartDate(endDate);
  // eslint-disable-next-line no-console
  console.log(
    `Analyzing period: ${startDate.toISOString()} to ${endDate.toISOString()}`,
  );

  // 3. Fetch workflow runs
  // eslint-disable-next-line no-console
  console.log(`Fetching workflow runs for "${workflowName}"...`);
  const runs = await fetchWorkflowRuns(
    octokit,
    owner,
    repo,
    workflowName,
    startDate,
  );
  // eslint-disable-next-line no-console
  console.log(`Found ${runs.length} workflow runs`);

  // 4. Fetch jobs for each run in parallel (batched to avoid rate limits)
  // eslint-disable-next-line no-console
  console.log('Fetching jobs for each run...');
  const jobsByRun = new Map<number, Job[]>();
  const batchSize = 20;
  let skippedCount = 0;

  for (let i = 0; i < runs.length; i += batchSize) {
    const batch = runs.slice(i, i + batchSize);
    const results = await Promise.allSettled(
      batch.map((run) => fetchJobsForRun(octokit, owner, repo, run.id)),
    );

    for (let j = 0; j < results.length; j++) {
      const result = results[j];
      if (result.status === 'fulfilled') {
        jobsByRun.set(batch[j].id, result.value);
      } else {
        skippedCount++;
      }
    }

    const processed = Math.min(i + batchSize, runs.length);
    // eslint-disable-next-line no-console
    console.log(
      `Progress: ${processed}/${runs.length} runs (${Math.round((processed / runs.length) * 100)}%)`,
    );
  }
  // eslint-disable-next-line no-console
  console.log(
    `Fetched jobs for ${jobsByRun.size} runs (${skippedCount} skipped)`,
  );

  // 5. Analyze failures
  // eslint-disable-next-line no-console
  console.log('Analyzing failures...');
  // eslint-disable-next-line no-console
  const stats = analyzeFailures(runs, jobsByRun, console.log);
  // eslint-disable-next-line no-console
  console.log(
    `Analysis complete: ${stats.failedRuns} failed runs out of ${stats.totalRuns} total`,
  );

  // 6. Generate report
  // eslint-disable-next-line no-console
  console.log('Generating markdown report...');
  const report = generateMarkdownReport(stats, startDate, endDate);

  // 7. Write report to file
  // eslint-disable-next-line no-console
  console.log(`Writing report to ${outputFilename}...`);
  await writeReport(report, outputFilename);

  // eslint-disable-next-line no-console
  console.log('✓ Workflow failure analysis complete!');
  // eslint-disable-next-line no-console
  console.log(`Report written to: ${outputFilename}`);
};

// Execute main function if this script is run directly
void main().catch((error: unknown) => {
  const errorMessage = error instanceof Error ? error.message : String(error);
  // eslint-disable-next-line no-console
  console.error('Error:', errorMessage);

  process.stderr.write(`Fatal error: ${errorMessage}\n`);
  process.exit(1);
});
