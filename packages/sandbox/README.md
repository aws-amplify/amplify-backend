# Description

Contains a programmatic library for managing the Amplify sandbox lifecycle.
The sandbox lifecycle includes starting a file watching process that kicks off deployments on file changes.
The backend-deployer is used for executing these deployments.
The sandbox lifecycle also emits various events that can have handlers attached to perform additional operations.
For example, the sandbox cli command handler attaches event listeners to regenerate client config on every successful deployment.
