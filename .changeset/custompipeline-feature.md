---
'@aws-amplify/plugin-types': patch
'@aws-amplify/platform-core': patch
'@aws-amplify/backend': patch
'@aws-amplify/backend-deployer': patch
'@aws-amplify/backend-output-storage': patch
'@aws-amplify/cli-core': patch
'@aws-amplify/backend-cli': patch
'@aws-amplify/auth-construct': patch
---

Add standalone deployment type for deploying without Amplify Hosting

This change enables deploying Amplify Gen2 backends in custom CI/CD pipelines (CodePipeline, Jenkins, etc.) without requiring Amplify Hosting.
