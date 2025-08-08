# Resource Access Example

This example demonstrates how to grant Lambda functions access to storage using the new resource access functionality.

## Basic Usage

```typescript
import { AmplifyStorage } from '@aws-amplify/storage-construct';
import { Function } from 'aws-cdk-lib/aws-lambda';
import { Stack } from 'aws-cdk-lib';

// Create a Lambda function
const processFunction = new Function(stack, 'ProcessFunction', {
  // ... function configuration
});

// Create storage
const storage = new AmplifyStorage(stack, 'Storage', {
  name: 'my-app-storage',
});

// Grant the function access to storage
storage.grantAccess(auth, {
  'uploads/*': [
    // Users can upload files
    { type: 'authenticated', actions: ['write'] },
    // Function can read and process uploaded files
    { type: 'resource', actions: ['read'], resource: processFunction },
  ],
  'processed/*': [
    // Function can write processed results
    { type: 'resource', actions: ['write'], resource: processFunction },
    // Users can read processed files
    { type: 'authenticated', actions: ['read'] },
  ],
});
```

## Supported Resource Types

The resource access functionality supports any construct that has an IAM role:

### Lambda Functions

```typescript
{ type: 'resource', actions: ['read'], resource: lambdaFunction }
```

### Custom Constructs with Roles

```typescript
const customResource = {
  role: myIamRole // Any IRole instance
};

{ type: 'resource', actions: ['read', 'write'], resource: customResource }
```

## Actions Available

- `'read'`: Grants s3:GetObject and s3:ListBucket permissions
- `'write'`: Grants s3:PutObject permissions
- `'delete'`: Grants s3:DeleteObject permissions

## Path Patterns

Resource access follows the same path patterns as other access types:

- `'public/*'`: Access to all files in public folder
- `'functions/temp/*'`: Access to temporary files for functions
- `'processing/{entity_id}/*'`: Not recommended for resources (entity substitution doesn't apply)

## Complete Example

```typescript
import { AmplifyStorage } from '@aws-amplify/storage-construct';
import { Function, Runtime, Code } from 'aws-cdk-lib/aws-lambda';
import { Stack, App } from 'aws-cdk-lib';

const app = new App();
const stack = new Stack(app, 'MyStack');

// Create processing function
const imageProcessor = new Function(stack, 'ImageProcessor', {
  runtime: Runtime.NODEJS_18_X,
  handler: 'index.handler',
  code: Code.fromInline(`
    exports.handler = async (event) => {
      // Process S3 events and manipulate files
      console.log('Processing:', event);
    };
  `),
});

// Create storage with triggers and access
const storage = new AmplifyStorage(stack, 'Storage', {
  name: 'image-processing-storage',
  triggers: {
    onUpload: imageProcessor, // Trigger function on upload
  },
});

// Configure access permissions
storage.grantAccess(auth, {
  'raw-images/*': [
    { type: 'authenticated', actions: ['write'] }, // Users upload raw images
    { type: 'resource', actions: ['read'], resource: imageProcessor }, // Function reads raw images
  ],
  'processed-images/*': [
    { type: 'resource', actions: ['write'], resource: imageProcessor }, // Function writes processed images
    { type: 'authenticated', actions: ['read'] }, // Users read processed images
    { type: 'guest', actions: ['read'] }, // Public access to processed images
  ],
  'temp/*': [
    {
      type: 'resource',
      actions: ['read', 'write', 'delete'],
      resource: imageProcessor,
    }, // Function manages temp files
  ],
});
```

This provides the same functionality as backend-storage's `allow.resource(myFunction).to(['read'])` pattern.
