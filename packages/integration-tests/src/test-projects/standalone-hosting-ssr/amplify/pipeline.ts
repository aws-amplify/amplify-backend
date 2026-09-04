import { definePipeline } from '@aws-amplify/hosting/pipeline';

definePipeline({
  source: {
    repo: 'adrianjoshua-strutt/amplify-gen2-pipeline-demo',
    connectionArn:
      'arn:aws:codeconnections:us-east-1:028064247663:connection/70f8c66a-3d3e-4a87-98af-2f44f9e54d97',
  },
  branches: [
    {
      branch: 'main',
      stages: [{ name: 'prod' }],
    },
  ],
});
