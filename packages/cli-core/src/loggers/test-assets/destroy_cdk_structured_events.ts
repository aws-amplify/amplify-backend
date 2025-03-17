export const data = [
  {
    code: 'CDK_TOOLKIT_I0000',
    message: '--app points to a cloud assembly, so we bypass synth',
  },
  {
    code: 'CDK_TOOLKIT_I1000',
    message: '  Synthesis time: 0s',
  },
  {
    code: 'CDK_TOOLKIT_I7100',
    message:
      'amplify-sampleprojectapp-user-sandbox-0e1752a889: destroying... [1/1]',
  },
  {
    code: 'CDK_TOOLKIT_I0000',
    message: 'Retrieved account ID 123456789012 from disk cache',
  },
  {
    code: 'CDK_TOOLKIT_I0000',
    message: 'Retrieved account ID 123456789012 from disk cache',
  },
  {
    code: 'CDK_TOOLKIT_I0000',
    message:
      "Assuming role 'arn:aws:iam::123456789012:role/cdk-hnb659fds-deploy-role-123456789012-us-west-2'.",
  },
  {
    code: 'CDK_TOOLKIT_I0000',
    message:
      '[sdk info] STS.AssumeRole({"RoleArn":"arn:aws:iam::123456789012:role/cdk-hnb659fds-deploy-role-123456789012-us-west-2","RoleSessionName":"aws-cdk-user"}) -> OK',
  },
  {
    code: 'CDK_TOOLKIT_I0000',
    message: 'Retrieved account ID 123456789012 from disk cache',
  },
  {
    code: 'CDK_TOOLKIT_I0000',
    message:
      '[sdk info] CloudFormation.DescribeStacks({"StackName":"amplify-sampleprojectapp-user-sandbox-0e1752a889"}) -> OK',
  },
  {
    code: 'CDK_TOOLKIT_I5501',
    message: 'Deploying amplify-sampleprojectapp-user-sandbox-0e1752a889',
  },
  {
    code: 'CDK_TOOLKIT_I0000',
    message:
      '[sdk info] CloudFormation.DeleteStack({"StackName":"amplify-sampleprojectapp-user-sandbox-0e1752a889","RoleARN":"arn:aws:iam::123456789012:role/cdk-hnb659fds-cfn-exec-role-123456789012-us-west-2"}) -> OK',
  },
  {
    code: 'CDK_TOOLKIT_I0000',
    message:
      'Waiting for stack amplify-sampleprojectapp-user-sandbox-0e1752a889 to finish creating or updating...',
  },
  {
    code: 'CDK_TOOLKIT_I0000',
    message:
      '[sdk info] CloudFormation.DescribeStacks({"StackName":"amplify-sampleprojectapp-user-sandbox-0e1752a889"}) -> OK',
  },
  {
    code: 'CDK_TOOLKIT_I0000',
    message:
      'Stack amplify-sampleprojectapp-user-sandbox-0e1752a889 has an ongoing operation in progress and is not stable (DELETE_IN_PROGRESS (User Initiated))',
  },
  {
    code: 'CDK_TOOLKIT_I0000',
    message:
      '[sdk info] CloudFormation.DescribeStackEvents({"StackName":"amplify-sampleprojectapp-user-sandbox-0e1752a889"}) -> OK',
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0e1752a889 |   0 | 11:05:29 PM | DELETE_IN_PROGRESS | AWS::CloudFormation::Stack | amplify-sampleprojectapp-user-sandbox-0e1752a889 User Initiated',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0e1752a889/912e40a0-fe24-11ef-ab54-068258314c15',
        EventId: 'b036ef50-fe25-11ef-8931-0a2aa41805d9',
        StackName: 'amplify-sampleprojectapp-user-sandbox-0e1752a889',
        LogicalResourceId: 'amplify-sampleprojectapp-user-sandbox-0e1752a889',
        PhysicalResourceId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0e1752a889/912e40a0-fe24-11ef-ab54-068258314c15',
        ResourceType: 'AWS::CloudFormation::Stack',
        Timestamp: new Date('2025-03-11T03:05:29.530'),
        ResourceStatus: 'DELETE_IN_PROGRESS',
        ResourceStatusReason: 'User Initiated',
      },
      progress: {
        completed: 0,
        formatted: '  0',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I0000',
    message:
      '[sdk info] CloudFormation.DescribeStackEvents({"StackName":"amplify-sampleprojectapp-user-sandbox-0e1752a889"}) -> OK',
  },
  {
    code: 'CDK_TOOLKIT_I0000',
    message:
      '[sdk info] CloudFormation.DescribeStackEvents({"StackName":"arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0e1752a889-MyCustomResourcesBB610599-8G262VTBDJMK/96f8f2f0-fe24-11ef-a75d-0aa9ea96647d"}) -> OK',
  },
  {
    code: 'CDK_TOOLKIT_I0000',
    message:
      '[sdk info] CloudFormation.DescribeStacks({"StackName":"amplify-sampleprojectapp-user-sandbox-0e1752a889"}) -> OK',
  },
  {
    code: 'CDK_TOOLKIT_I0000',
    message:
      'Stack amplify-sampleprojectapp-user-sandbox-0e1752a889 has an ongoing operation in progress and is not stable (DELETE_IN_PROGRESS)',
  },
  {
    code: 'CDK_TOOLKIT_I0000',
    message:
      '[sdk info] CloudFormation.DescribeStackEvents({"StackName":"arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0e1752a889-storage0EC3F24A-FW28UHWGJFK9/b34eac10-fe24-11ef-884b-028f2e174171"}) -> OK',
  },
  {
    code: 'CDK_TOOLKIT_I0000',
    message:
      '[sdk info] CloudFormation.DescribeStackEvents({"StackName":"arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C/b355b0f0-fe24-11ef-a0bd-020db6799971"}) -> OK',
  },
  {
    code: 'CDK_TOOLKIT_I0000',
    message:
      '[sdk info] CloudFormation.DescribeStackEvents({"StackName":"arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataConnectionStackNestedStackConne-1RT45PFNMWNGH/026d3050-fe25-11ef-abb4-06dfee28c627"}) -> OK',
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0e1752a889 |   0 | 11:05:31 PM | DELETE_IN_PROGRESS | AWS::CDK::Metadata | auth/CDKMetadata/Default (CDKMetadata)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0e1752a889/912e40a0-fe24-11ef-ab54-068258314c15',
        EventId: 'CDKMetadata-DELETE_IN_PROGRESS-2025-03-11T03:05:31.661Z',
        StackName: 'amplify-sampleprojectapp-user-sandbox-0e1752a889',
        LogicalResourceId: 'CDKMetadata',
        PhysicalResourceId: '912e40a0-fe24-11ef-ab54-068258314c15',
        ResourceType: 'AWS::CDK::Metadata',
        Timestamp: new Date('2025-03-11T03:05:31.661'),
        ResourceStatus: 'DELETE_IN_PROGRESS',
        ResourceProperties:
          '{"Analytics":"v2:deflate64:H4sIAAAAAAAA/zPSM7Qw0jNQTCwv1k1OydbNyUzSqw4uSUzO1nFOy/MvLSkoLQGxwEK1Onn5Kal6WcX6ZUYGeoYWeoaKWcWZmbpFpXklmbmpekEQGgDqjI8HVAAAAA=="}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'CDKMetadata',
        },
        constructPath: 'auth/CDKMetadata/Default',
      },
      progress: {
        completed: 0,
        formatted: '  0',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0e1752a889 |   0 | 11:05:31 PM | DELETE_IN_PROGRESS | AWS::CloudFormation::Stack | data.NestedStack/data.NestedStackResource (data7552DF31)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0e1752a889/912e40a0-fe24-11ef-ab54-068258314c15',
        EventId: 'data7552DF31-DELETE_IN_PROGRESS-2025-03-11T03:05:31.698Z',
        StackName: 'amplify-sampleprojectapp-user-sandbox-0e1752a889',
        LogicalResourceId: 'data7552DF31',
        PhysicalResourceId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C/b355b0f0-fe24-11ef-a0bd-020db6799971',
        ResourceType: 'AWS::CloudFormation::Stack',
        Timestamp: new Date('2025-03-11T03:05:31.698'),
        ResourceStatus: 'DELETE_IN_PROGRESS',
        ResourceProperties:
          '{"TemplateURL":"https://s3.us-west-2.amazonaws.com/cdk-hnb659fds-assets-123456789012-us-west-2/76f3f913f2bffd4d3b833199e6d331903453796a752c920c60d3aa8456e8a975.json","Parameters":{"referencetoamplifysampleprojectappusersandbox0e1752a889authNestedStackauthNestedStackResource1C2A2D1EOutputsamplifysampleprojectappusersandbox0e1752a889authamplifyAuthIdentityPool5160F57DRef":"us-west-2:e3abf6f7-1ae5-4254-829e-0d8c9dc05bff","referencetoamplifysampleprojectappusersandbox0e1752a889authNestedStackauthNestedStackResource1C2A2D1EOutputsamplifysampleprojectappusersandbox0e1752a889authamplifyAuthUserPool0A15674BRef":"us-west-2_FcSDTLfnY","referencetoamplifysampleprojectappusersandbox0e1752a889authNestedStackauthNestedStackResource1C2A2D1EOutputsamplifysampleprojectappusersandbox0e1752a889authamplifyAuthunauthenticatedUserRoleC92E0CFERef":"amplify-sampleprojectapp--amplifyAuthunauthenticate-0ZSS9wsA6Aut","referencetoamplifysampleprojectappusersandbox0e1752a889authNestedStackauthNestedStackResource1C2A2D1EOutputsamplifysampleprojectappusersandbox0e1752a889authamplifyAuthauthenticatedUserRole11751600Ref":"amplify-sampleprojectapp--amplifyAuthauthenticatedU-JksUKi7c8Bvh"},"Tags":[{"Value":"sandbox","Key":"amplify:deployment-type"},{"Value":"amplify","Key":"created-by"}]}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'data7552DF31',
        },
        constructPath: 'data.NestedStack/data.NestedStackResource',
      },
      progress: {
        completed: 0,
        formatted: '  0',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0e1752a889 |   0 | 11:05:31 PM | DELETE_IN_PROGRESS | AWS::CloudFormation::Stack | storage.NestedStack/storage.NestedStackResource (storage0EC3F24A)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0e1752a889/912e40a0-fe24-11ef-ab54-068258314c15',
        EventId: 'storage0EC3F24A-DELETE_IN_PROGRESS-2025-03-11T03:05:31.718Z',
        StackName: 'amplify-sampleprojectapp-user-sandbox-0e1752a889',
        LogicalResourceId: 'storage0EC3F24A',
        PhysicalResourceId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0e1752a889-storage0EC3F24A-FW28UHWGJFK9/b34eac10-fe24-11ef-884b-028f2e174171',
        ResourceType: 'AWS::CloudFormation::Stack',
        Timestamp: new Date('2025-03-11T03:05:31.718'),
        ResourceStatus: 'DELETE_IN_PROGRESS',
        ResourceProperties:
          '{"TemplateURL":"https://s3.us-west-2.amazonaws.com/cdk-hnb659fds-assets-123456789012-us-west-2/a217e7c300711883159bfa09d4a6a99f762c9d59542ae5bb802ebac85abdb443.json","Parameters":{"referencetoamplifysampleprojectappusersandbox0e1752a889functionNestedStackfunctionNestedStackResourceC6A79258Outputsamplifysampleprojectappusersandbox0e1752a889functionsayhellolambdaServiceRole6B7F66E6Ref":"amplify-sampleprojectapp--sayhellolambdaServiceRole-rTltSNgzZZ60","referencetoamplifysampleprojectappusersandbox0e1752a889functionNestedStackfunctionNestedStackResourceC6A79258Outputsamplifysampleprojectappusersandbox0e1752a889functionsayhellolambdaB2E612D0Arn":"arn:aws:lambda:us-west-2:123456789012:function:amplify-sampleprojectapp-pr-sayhellolambdaEFA46D92-FKnDZgZ20NmE"},"Tags":[{"Value":"sandbox","Key":"amplify:deployment-type"},{"Value":"amplify","Key":"created-by"}]}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'storage0EC3F24A',
        },
        constructPath: 'storage.NestedStack/storage.NestedStackResource',
      },
      progress: {
        completed: 0,
        formatted: '  0',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0e1752a889 |   0 | 11:05:31 PM | DELETE_IN_PROGRESS | AWS::CloudFormation::Stack | MyCustomResources.NestedStack/MyCustomResources.NestedStackResource (MyCustomResourcesBB610599)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0e1752a889/912e40a0-fe24-11ef-ab54-068258314c15',
        EventId:
          'MyCustomResourcesBB610599-DELETE_IN_PROGRESS-2025-03-11T03:05:31.795Z',
        StackName: 'amplify-sampleprojectapp-user-sandbox-0e1752a889',
        LogicalResourceId: 'MyCustomResourcesBB610599',
        PhysicalResourceId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0e1752a889-MyCustomResourcesBB610599-8G262VTBDJMK/96f8f2f0-fe24-11ef-a75d-0aa9ea96647d',
        ResourceType: 'AWS::CloudFormation::Stack',
        Timestamp: new Date('2025-03-11T03:05:31.795'),
        ResourceStatus: 'DELETE_IN_PROGRESS',
        ResourceProperties:
          '{"TemplateURL":"https://s3.us-west-2.amazonaws.com/cdk-hnb659fds-assets-123456789012-us-west-2/2b0cd76a5fea2795b3e3b23e2c4cb8eaf621211d2c9e2303e2868ac0be4607bc.json","Tags":[{"Value":"sandbox","Key":"amplify:deployment-type"},{"Value":"amplify","Key":"created-by"}]}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'MyCustomResourcesBB610599',
        },
        constructPath:
          'MyCustomResources.NestedStack/MyCustomResources.NestedStackResource',
      },
      progress: {
        completed: 0,
        formatted: '  0',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0e1752a889-MyCustomResourcesBB610599-8G262VTBDJMK |   0 | 11:05:32 PM | DELETE_IN_PROGRESS | AWS::CloudFormation::Stack | amplify-sampleprojectapp-user-sandbox-0e1752a889-MyCustomResourcesBB610599-8G262VTBDJMK User Initiated',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0e1752a889-MyCustomResourcesBB610599-8G262VTBDJMK/96f8f2f0-fe24-11ef-a75d-0aa9ea96647d',
        EventId: 'b1c94f20-fe25-11ef-99e2-0677b97aed67',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0e1752a889-MyCustomResourcesBB610599-8G262VTBDJMK',
        LogicalResourceId:
          'amplify-sampleprojectapp-user-sandbox-0e1752a889-MyCustomResourcesBB610599-8G262VTBDJMK',
        PhysicalResourceId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0e1752a889-MyCustomResourcesBB610599-8G262VTBDJMK/96f8f2f0-fe24-11ef-a75d-0aa9ea96647d',
        ResourceType: 'AWS::CloudFormation::Stack',
        Timestamp: new Date('2025-03-11T03:05:32.166'),
        ResourceStatus: 'DELETE_IN_PROGRESS',
        ResourceStatusReason: 'User Initiated',
      },
      progress: {
        completed: 0,
        formatted: '  0',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0e1752a889-storage0EC3F24A-FW28UHWGJFK9 |   0 | 11:05:32 PM | DELETE_IN_PROGRESS | AWS::CloudFormation::Stack | amplify-sampleprojectapp-user-sandbox-0e1752a889-storage0EC3F24A-FW28UHWGJFK9 User Initiated',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0e1752a889-storage0EC3F24A-FW28UHWGJFK9/b34eac10-fe24-11ef-884b-028f2e174171',
        EventId: 'b1d276e0-fe25-11ef-a2c6-0ac2a00d0037',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0e1752a889-storage0EC3F24A-FW28UHWGJFK9',
        LogicalResourceId:
          'amplify-sampleprojectapp-user-sandbox-0e1752a889-storage0EC3F24A-FW28UHWGJFK9',
        PhysicalResourceId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0e1752a889-storage0EC3F24A-FW28UHWGJFK9/b34eac10-fe24-11ef-884b-028f2e174171',
        ResourceType: 'AWS::CloudFormation::Stack',
        Timestamp: new Date('2025-03-11T03:05:32.226'),
        ResourceStatus: 'DELETE_IN_PROGRESS',
        ResourceStatusReason: 'User Initiated',
      },
      progress: {
        completed: 0,
        formatted: '  0',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C |   0 | 11:05:32 PM | DELETE_IN_PROGRESS | AWS::CloudFormation::Stack | amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C User Initiated',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C/b355b0f0-fe24-11ef-a0bd-020db6799971',
        EventId: 'b1dab440-fe25-11ef-bc0b-0a5d68f69c09',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C',
        LogicalResourceId:
          'amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C',
        PhysicalResourceId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C/b355b0f0-fe24-11ef-a0bd-020db6799971',
        ResourceType: 'AWS::CloudFormation::Stack',
        Timestamp: new Date('2025-03-11T03:05:32.278'),
        ResourceStatus: 'DELETE_IN_PROGRESS',
        ResourceStatusReason: 'User Initiated',
      },
      progress: {
        completed: 0,
        formatted: '  0',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0e1752a889 |   1 | 11:05:32 PM | DELETE_COMPLETE | AWS::CDK::Metadata | auth/CDKMetadata/Default (CDKMetadata)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0e1752a889/912e40a0-fe24-11ef-ab54-068258314c15',
        EventId: 'CDKMetadata-DELETE_COMPLETE-2025-03-11T03:05:32.547Z',
        StackName: 'amplify-sampleprojectapp-user-sandbox-0e1752a889',
        LogicalResourceId: 'CDKMetadata',
        PhysicalResourceId: '912e40a0-fe24-11ef-ab54-068258314c15',
        ResourceType: 'AWS::CDK::Metadata',
        Timestamp: new Date('2025-03-11T03:05:32.547'),
        ResourceStatus: 'DELETE_COMPLETE',
        ResourceProperties:
          '{"Analytics":"v2:deflate64:H4sIAAAAAAAA/zPSM7Qw0jNQTCwv1k1OydbNyUzSqw4uSUzO1nFOy/MvLSkoLQGxwEK1Onn5Kal6WcX6ZUYGeoYWeoaKWcWZmbpFpXklmbmpekEQGgDqjI8HVAAAAA=="}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'CDKMetadata',
        },
        constructPath: 'auth/CDKMetadata/Default',
      },
      progress: {
        completed: 1,
        formatted: '  1',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0e1752a889-MyCustomResourcesBB610599-8G262VTBDJMK |   1 | 11:05:33 PM | DELETE_IN_PROGRESS | AWS::SQS::Queue | MyCustomResources/CustomQueue (CustomQueue6CD3A366)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0e1752a889-MyCustomResourcesBB610599-8G262VTBDJMK/96f8f2f0-fe24-11ef-a75d-0aa9ea96647d',
        EventId:
          'CustomQueue6CD3A366-DELETE_IN_PROGRESS-2025-03-11T03:05:33.876Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0e1752a889-MyCustomResourcesBB610599-8G262VTBDJMK',
        LogicalResourceId: 'CustomQueue6CD3A366',
        PhysicalResourceId:
          'https://sqs.us-west-2.amazonaws.com/123456789012/amplify-sampleprojectapp-user-sandbox-0e175-CustomQueue6CD3A366-wzR4DVvDRmK1',
        ResourceType: 'AWS::SQS::Queue',
        Timestamp: new Date('2025-03-11T03:05:33.876'),
        ResourceStatus: 'DELETE_IN_PROGRESS',
        ResourceProperties:
          '{"Tags":[{"Value":"sandbox","Key":"amplify:deployment-type"},{"Value":"amplify","Key":"created-by"}]}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'CustomQueue6CD3A366',
        },
        constructPath: 'MyCustomResources/CustomQueue',
      },
      progress: {
        completed: 1,
        formatted: '  1',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0e1752a889-MyCustomResourcesBB610599-8G262VTBDJMK |   1 | 11:05:33 PM | DELETE_IN_PROGRESS | AWS::CDK::Metadata | auth/CDKMetadata/Default (CDKMetadata)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0e1752a889-MyCustomResourcesBB610599-8G262VTBDJMK/96f8f2f0-fe24-11ef-a75d-0aa9ea96647d',
        EventId: 'CDKMetadata-DELETE_IN_PROGRESS-2025-03-11T03:05:33.879Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0e1752a889-MyCustomResourcesBB610599-8G262VTBDJMK',
        LogicalResourceId: 'CDKMetadata',
        PhysicalResourceId: '96f8f2f0-fe24-11ef-a75d-0aa9ea96647d',
        ResourceType: 'AWS::CDK::Metadata',
        Timestamp: new Date('2025-03-11T03:05:33.879'),
        ResourceStatus: 'DELETE_IN_PROGRESS',
        ResourceProperties:
          '{"Analytics":"v2:deflate64:H4sIAAAAAAAA/12JvQ4CIRAGn+V6+AQqensTf3qDsCZ7p5y64BWEdzeendVMZhya9Q5mCIvomCZ94wt2JIXSsYQ4KevN3w2LnJs8BW1fqZLaXvMqXUkWtNP84PiNq/TeVZ4TYZTN2xlYDzuMwqxfNRe+Ew4/fgBWxymaiQAAAA=="}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'CDKMetadata',
        },
        constructPath: 'auth/CDKMetadata/Default',
      },
      progress: {
        completed: 1,
        formatted: '  1',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0e1752a889-MyCustomResourcesBB610599-8G262VTBDJMK |   1 | 11:05:33 PM | DELETE_IN_PROGRESS | AWS::SNS::Topic | MyCustomResources/CustomTopics (CustomTopicsAF1A51E0)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0e1752a889-MyCustomResourcesBB610599-8G262VTBDJMK/96f8f2f0-fe24-11ef-a75d-0aa9ea96647d',
        EventId:
          'CustomTopicsAF1A51E0-DELETE_IN_PROGRESS-2025-03-11T03:05:33.884Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0e1752a889-MyCustomResourcesBB610599-8G262VTBDJMK',
        LogicalResourceId: 'CustomTopicsAF1A51E0',
        PhysicalResourceId:
          'arn:aws:sns:us-west-2:123456789012:amplify-sampleprojectapp-user-sandbox-0e1752a889-MyCustomResourcesBB610599-8G262VTBDJMK-CustomTopicsAF1A51E0-pVAttHlxIyKS',
        ResourceType: 'AWS::SNS::Topic',
        Timestamp: new Date('2025-03-11T03:05:33.884'),
        ResourceStatus: 'DELETE_IN_PROGRESS',
        ResourceProperties:
          '{"Tags":[{"Value":"sandbox","Key":"amplify:deployment-type"},{"Value":"amplify","Key":"created-by"}]}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'CustomTopicsAF1A51E0',
        },
        constructPath: 'MyCustomResources/CustomTopics',
      },
      progress: {
        completed: 1,
        formatted: '  1',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0e1752a889-storage0EC3F24A-FW28UHWGJFK9 |   1 | 11:05:34 PM | DELETE_IN_PROGRESS | Custom::S3BucketNotifications | storage/testName/Bucket/Notifications (testNameBucketNotificationsB9BE9A01)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0e1752a889-storage0EC3F24A-FW28UHWGJFK9/b34eac10-fe24-11ef-884b-028f2e174171',
        EventId:
          'testNameBucketNotificationsB9BE9A01-DELETE_IN_PROGRESS-2025-03-11T03:05:34.171Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0e1752a889-storage0EC3F24A-FW28UHWGJFK9',
        LogicalResourceId: 'testNameBucketNotificationsB9BE9A01',
        PhysicalResourceId: 'testNameBucketNotificationsB9BE9A01',
        ResourceType: 'Custom::S3BucketNotifications',
        Timestamp: new Date('2025-03-11T03:05:34.171'),
        ResourceStatus: 'DELETE_IN_PROGRESS',
        ResourceProperties:
          '{"ServiceToken":"arn:aws:lambda:us-west-2:123456789012:function:amplify-sampleprojectapp--BucketNotificationsHandl-Hz8a1MzLPzO6","BucketName":"amplify-sampleprojectapp-pr-testnamebucketb4152ad5-shsu6q3elmwn","NotificationConfiguration":{"LambdaFunctionConfigurations":[{"Events":["s3:ObjectRemoved:*"],"LambdaFunctionArn":"arn:aws:lambda:us-west-2:123456789012:function:amplify-sampleprojectapp-pr-sayhellolambdaEFA46D92-FKnDZgZ20NmE"}]},"Managed":"true","SkipDestinationValidation":"false"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'testNameBucketNotificationsB9BE9A01',
        },
        constructPath: 'storage/testName/Bucket/Notifications',
      },
      progress: {
        completed: 1,
        formatted: '  1',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0e1752a889-storage0EC3F24A-FW28UHWGJFK9 |   1 | 11:05:34 PM | DELETE_IN_PROGRESS | AWS::SSM::Parameter | storage/TEST_NAME_BUCKET_NAMEParameter (TESTNAMEBUCKETNAMEParameter6D140BDA)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0e1752a889-storage0EC3F24A-FW28UHWGJFK9/b34eac10-fe24-11ef-884b-028f2e174171',
        EventId:
          'TESTNAMEBUCKETNAMEParameter6D140BDA-DELETE_IN_PROGRESS-2025-03-11T03:05:34.174Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0e1752a889-storage0EC3F24A-FW28UHWGJFK9',
        LogicalResourceId: 'TESTNAMEBUCKETNAMEParameter6D140BDA',
        PhysicalResourceId:
          '/amplify/resource_reference/sampleprojectapp/user-sandbox-0e1752a889/TEST_NAME_BUCKET_NAME',
        ResourceType: 'AWS::SSM::Parameter',
        Timestamp: new Date('2025-03-11T03:05:34.174'),
        ResourceStatus: 'DELETE_IN_PROGRESS',
        ResourceProperties:
          '{"Type":"String","Value":"amplify-sampleprojectapp-pr-testnamebucketb4152ad5-shsu6q3elmwn","Tags":{"amplify:deployment-type":"sandbox","created-by":"amplify"},"Name":"/amplify/resource_reference/sampleprojectapp/user-sandbox-0e1752a889/TEST_NAME_BUCKET_NAME"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'TESTNAMEBUCKETNAMEParameter6D140BDA',
        },
        constructPath: 'storage/TEST_NAME_BUCKET_NAMEParameter',
      },
      progress: {
        completed: 1,
        formatted: '  1',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0e1752a889-storage0EC3F24A-FW28UHWGJFK9 |   1 | 11:05:34 PM | DELETE_IN_PROGRESS | AWS::IAM::Policy | storage/storageAccess5 (storageAccess524979CAB)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0e1752a889-storage0EC3F24A-FW28UHWGJFK9/b34eac10-fe24-11ef-884b-028f2e174171',
        EventId:
          'storageAccess524979CAB-DELETE_IN_PROGRESS-2025-03-11T03:05:34.176Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0e1752a889-storage0EC3F24A-FW28UHWGJFK9',
        LogicalResourceId: 'storageAccess524979CAB',
        PhysicalResourceId: 'ampli-stora-WBOSftR3QLib',
        ResourceType: 'AWS::IAM::Policy',
        Timestamp: new Date('2025-03-11T03:05:34.176'),
        ResourceStatus: 'DELETE_IN_PROGRESS',
        ResourceProperties:
          '{"PolicyName":"storageAccess524979CAB","PolicyDocument":{"Version":"2012-10-17","Statement":[{"Action":"s3:GetObject","Resource":"arn:aws:s3:::amplify-sampleprojectapp-pr-testnamebucketb4152ad5-shsu6q3elmwn/public/*","Effect":"Allow"},{"Condition":{"StringLike":{"s3:prefix":["public/*","public/"]}},"Action":"s3:ListBucket","Resource":"arn:aws:s3:::amplify-sampleprojectapp-pr-testnamebucketb4152ad5-shsu6q3elmwn","Effect":"Allow"},{"Action":"s3:PutObject","Resource":"arn:aws:s3:::amplify-sampleprojectapp-pr-testnamebucketb4152ad5-shsu6q3elmwn/public/*","Effect":"Allow"}]},"Roles":["amplify-sampleprojectapp--sayhellolambdaServiceRole-rTltSNgzZZ60"]}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'storageAccess524979CAB',
        },
        constructPath: 'storage/storageAccess5',
      },
      progress: {
        completed: 1,
        formatted: '  1',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0e1752a889-storage0EC3F24A-FW28UHWGJFK9 |   1 | 11:05:34 PM | DELETE_IN_PROGRESS | Custom::S3AutoDeleteObjects | storage/testName/Bucket/AutoDeleteObjectsCustomResource/Default (testNameBucketAutoDeleteObjectsCustomResource245F058C)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0e1752a889-storage0EC3F24A-FW28UHWGJFK9/b34eac10-fe24-11ef-884b-028f2e174171',
        EventId:
          'testNameBucketAutoDeleteObjectsCustomResource245F058C-DELETE_IN_PROGRESS-2025-03-11T03:05:34.178Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0e1752a889-storage0EC3F24A-FW28UHWGJFK9',
        LogicalResourceId:
          'testNameBucketAutoDeleteObjectsCustomResource245F058C',
        PhysicalResourceId: 'd9917f5f-6c2b-4167-b37b-7f6d64f73461',
        ResourceType: 'Custom::S3AutoDeleteObjects',
        Timestamp: new Date('2025-03-11T03:05:34.178'),
        ResourceStatus: 'DELETE_IN_PROGRESS',
        ResourceProperties:
          '{"ServiceToken":"arn:aws:lambda:us-west-2:123456789012:function:amplify-sampleprojectapp--CustomS3AutoDeleteObject-26NDTY8D5dwA","BucketName":"amplify-sampleprojectapp-pr-testnamebucketb4152ad5-shsu6q3elmwn"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'testNameBucketAutoDeleteObjectsCustomResource245F058C',
        },
        constructPath:
          'storage/testName/Bucket/AutoDeleteObjectsCustomResource/Default',
      },
      progress: {
        completed: 1,
        formatted: '  1',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0e1752a889-storage0EC3F24A-FW28UHWGJFK9 |   1 | 11:05:34 PM | DELETE_IN_PROGRESS | AWS::CDK::Metadata | auth/CDKMetadata/Default (CDKMetadata)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0e1752a889-storage0EC3F24A-FW28UHWGJFK9/b34eac10-fe24-11ef-884b-028f2e174171',
        EventId: 'CDKMetadata-DELETE_IN_PROGRESS-2025-03-11T03:05:34.178Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0e1752a889-storage0EC3F24A-FW28UHWGJFK9',
        LogicalResourceId: 'CDKMetadata',
        PhysicalResourceId: 'b34eac10-fe24-11ef-884b-028f2e174171',
        ResourceType: 'AWS::CDK::Metadata',
        Timestamp: new Date('2025-03-11T03:05:34.178'),
        ResourceStatus: 'DELETE_IN_PROGRESS',
        ResourceProperties:
          '{"Analytics":"v2:deflate64:H4sIAAAAAAAA/12MwY7CMAxEv4V76qXdC1foeVdV+wHIJKYybRIUu6BV1H9H0K1Y7Wlm7DdTQbmrYLvBuxTWDcXIJ8jfJEquU7SDwbscs3xCPkx2IDX1Ofy6RZo4sv15n5c8mxH9ySHU59BQ8izCMRhGD7mNIz35l77ra1HEQ+40cegbTOhJKb3+a5hnU0+i0bckcUp2Gfvjv/B65dD/o5oUb+woHVDI7EVIO8X+ya3EbEJ0BBf5uFVbKHdQbi7CXKQpKHuCdtEHWulAxDMBAAA="}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'CDKMetadata',
        },
        constructPath: 'auth/CDKMetadata/Default',
      },
      progress: {
        completed: 1,
        formatted: '  1',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C |   1 | 11:05:34 PM | DELETE_IN_PROGRESS | Custom::S3AutoDeleteObjects | data/modelIntrospectionSchemaBucket/AutoDeleteObjectsCustomResource/Default (modelIntrospectionSchemaBucketAutoDeleteObjectsCustomResourceFE57309F)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C/b355b0f0-fe24-11ef-a0bd-020db6799971',
        EventId:
          'modelIntrospectionSchemaBucketAutoDeleteObjectsCustomResourceFE57309F-DELETE_IN_PROGRESS-2025-03-11T03:05:34.498Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C',
        LogicalResourceId:
          'modelIntrospectionSchemaBucketAutoDeleteObjectsCustomResourceFE57309F',
        PhysicalResourceId: '06734357-2f12-497a-a8ef-c6f13938b77c',
        ResourceType: 'Custom::S3AutoDeleteObjects',
        Timestamp: new Date('2025-03-11T03:05:34.498'),
        ResourceStatus: 'DELETE_IN_PROGRESS',
        ResourceProperties:
          '{"ServiceToken":"arn:aws:lambda:us-west-2:123456789012:function:amplify-sampleprojectapp--CustomS3AutoDeleteObject-wJKnIElU6MiV","BucketName":"amplify-sampleprojectapp--modelintrospectionschema-q5iuovbg1sue"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'modelIntrospectionSchemaBucketAutoDeleteObjectsCustomResourceFE57309F',
        },
        constructPath:
          'data/modelIntrospectionSchemaBucket/AutoDeleteObjectsCustomResource/Default',
      },
      progress: {
        completed: 1,
        formatted: '  1',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C |   1 | 11:05:34 PM | DELETE_IN_PROGRESS | AWS::SSM::Parameter | data/AMPLIFY_DATA_DEFAULT_NAMEParameter (AMPLIFYDATADEFAULTNAMEParameterE7C23CC4)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C/b355b0f0-fe24-11ef-a0bd-020db6799971',
        EventId:
          'AMPLIFYDATADEFAULTNAMEParameterE7C23CC4-DELETE_IN_PROGRESS-2025-03-11T03:05:34.519Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C',
        LogicalResourceId: 'AMPLIFYDATADEFAULTNAMEParameterE7C23CC4',
        PhysicalResourceId:
          '/amplify/resource_reference/sampleprojectapp/user-sandbox-0e1752a889/AMPLIFY_DATA_DEFAULT_NAME',
        ResourceType: 'AWS::SSM::Parameter',
        Timestamp: new Date('2025-03-11T03:05:34.519'),
        ResourceStatus: 'DELETE_IN_PROGRESS',
        ResourceProperties:
          '{"Type":"String","Value":"amplifyData","Tags":{"amplify:deployment-type":"sandbox","created-by":"amplify"},"Name":"/amplify/resource_reference/sampleprojectapp/user-sandbox-0e1752a889/AMPLIFY_DATA_DEFAULT_NAME"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'AMPLIFYDATADEFAULTNAMEParameterE7C23CC4',
        },
        constructPath: 'data/AMPLIFY_DATA_DEFAULT_NAMEParameter',
      },
      progress: {
        completed: 1,
        formatted: '  1',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C |   1 | 11:05:34 PM | DELETE_IN_PROGRESS | AWS::SSM::Parameter | data/AMPLIFY_DATA_MODEL_INTROSPECTION_SCHEMA_BUCKET_NAMEParameter (AMPLIFYDATAMODELINTROSPECTIONSCHEMABUCKETNAMEParameter47BF4F44)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C/b355b0f0-fe24-11ef-a0bd-020db6799971',
        EventId:
          'AMPLIFYDATAMODELINTROSPECTIONSCHEMABUCKETNAMEParameter47BF4F44-DELETE_IN_PROGRESS-2025-03-11T03:05:34.520Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C',
        LogicalResourceId:
          'AMPLIFYDATAMODELINTROSPECTIONSCHEMABUCKETNAMEParameter47BF4F44',
        PhysicalResourceId:
          '/amplify/resource_reference/sampleprojectapp/user-sandbox-0e1752a889/AMPLIFY_DATA_MODEL_INTROSPECTION_SCHEMA_BUCKET_NAME',
        ResourceType: 'AWS::SSM::Parameter',
        Timestamp: new Date('2025-03-11T03:05:34.520'),
        ResourceStatus: 'DELETE_IN_PROGRESS',
        ResourceProperties:
          '{"Type":"String","Value":"amplify-sampleprojectapp--modelintrospectionschema-q5iuovbg1sue","Tags":{"amplify:deployment-type":"sandbox","created-by":"amplify"},"Name":"/amplify/resource_reference/sampleprojectapp/user-sandbox-0e1752a889/AMPLIFY_DATA_MODEL_INTROSPECTION_SCHEMA_BUCKET_NAME"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'AMPLIFYDATAMODELINTROSPECTIONSCHEMABUCKETNAMEParameter47BF4F44',
        },
        constructPath:
          'data/AMPLIFY_DATA_MODEL_INTROSPECTION_SCHEMA_BUCKET_NAMEParameter',
      },
      progress: {
        completed: 1,
        formatted: '  1',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C |   1 | 11:05:34 PM | DELETE_IN_PROGRESS | AWS::SSM::Parameter | data/AMPLIFY_DATA_GRAPHQL_ENDPOINTParameter (AMPLIFYDATAGRAPHQLENDPOINTParameter1C2CBB16)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C/b355b0f0-fe24-11ef-a0bd-020db6799971',
        EventId:
          'AMPLIFYDATAGRAPHQLENDPOINTParameter1C2CBB16-DELETE_IN_PROGRESS-2025-03-11T03:05:34.528Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C',
        LogicalResourceId: 'AMPLIFYDATAGRAPHQLENDPOINTParameter1C2CBB16',
        PhysicalResourceId:
          '/amplify/resource_reference/sampleprojectapp/user-sandbox-0e1752a889/AMPLIFY_DATA_GRAPHQL_ENDPOINT',
        ResourceType: 'AWS::SSM::Parameter',
        Timestamp: new Date('2025-03-11T03:05:34.528'),
        ResourceStatus: 'DELETE_IN_PROGRESS',
        ResourceProperties:
          '{"Type":"String","Value":"https://hbh33im3izgqfkqksqgn5hkqly.appsync-api.us-west-2.amazonaws.com/graphql","Tags":{"amplify:deployment-type":"sandbox","created-by":"amplify"},"Name":"/amplify/resource_reference/sampleprojectapp/user-sandbox-0e1752a889/AMPLIFY_DATA_GRAPHQL_ENDPOINT"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'AMPLIFYDATAGRAPHQLENDPOINTParameter1C2CBB16',
        },
        constructPath: 'data/AMPLIFY_DATA_GRAPHQL_ENDPOINTParameter',
      },
      progress: {
        completed: 1,
        formatted: '  1',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C |   1 | 11:05:34 PM | DELETE_IN_PROGRESS | AWS::CDK::Metadata | auth/CDKMetadata/Default (CDKMetadata)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C/b355b0f0-fe24-11ef-a0bd-020db6799971',
        EventId: 'CDKMetadata-DELETE_IN_PROGRESS-2025-03-11T03:05:34.534Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C',
        LogicalResourceId: 'CDKMetadata',
        PhysicalResourceId: 'b355b0f0-fe24-11ef-a0bd-020db6799971',
        ResourceType: 'AWS::CDK::Metadata',
        Timestamp: new Date('2025-03-11T03:05:34.534'),
        ResourceStatus: 'DELETE_IN_PROGRESS',
        ResourceProperties:
          '{"Analytics":"v2:deflate64:H4sIAAAAAAAA/1VQy27CMBD8Fu7GBXrhGoLaC0WUSL1Gi7MJBj9Sr0MURfn3yjGEcprHyuPZXfHlesUXM2hpLorrXMkT7/dIHovMg7iyI5JtnEAGLeU91DV1RvD+00F9/lVJLTdAyNLSjM73LqnlP5WJM2pge2twCx6yGJWW5qkGRu+83zTiij5M7izCwSopuqd911GEn8PrvC+wVrbTaDyPo+1kMCBCTzwJMDAF+lQA79PS7KBD94OOpDUsk6ZS6K35aIzwwZlIWk7mwCRo3h+tGpcY8VkxsoERad5n3klTHcCBRo9unD/EMAQZ75s25K2erhxSHzx2zVXomUNLQkmetJQqOVZn40qZh0qa6iU/iC+o69F/yT84e5MFung6YwvkF3q7rRZ8uebL2YWknLvGeKmRHyP+AfOB530iAgAA"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'CDKMetadata',
        },
        constructPath: 'auth/CDKMetadata/Default',
      },
      progress: {
        completed: 1,
        formatted: '  1',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C |   1 | 11:05:34 PM | DELETE_IN_PROGRESS | Custom::CDKBucketDeployment | data/amplifyData/AmplifyCodegenAssets/AmplifyCodegenAssetsDeployment/CustomResource-1536MiB/Default (amplifyDataAmplifyCodegenAssetsAmplifyCodegenAssetsDeploymentCustomResource1536MiB21775929)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C/b355b0f0-fe24-11ef-a0bd-020db6799971',
        EventId:
          'amplifyDataAmplifyCodegenAssetsAmplifyCodegenAssetsDeploymentCustomResource1536MiB21775929-DELETE_IN_PROGRESS-2025-03-11T03:05:34.537Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C',
        LogicalResourceId:
          'amplifyDataAmplifyCodegenAssetsAmplifyCodegenAssetsDeploymentCustomResource1536MiB21775929',
        PhysicalResourceId:
          'aws.cdk.s3deployment.9efe895d-1660-4629-aa08-07d8200b5e72',
        ResourceType: 'Custom::CDKBucketDeployment',
        Timestamp: new Date('2025-03-11T03:05:34.537'),
        ResourceStatus: 'DELETE_IN_PROGRESS',
        ResourceProperties:
          '{"ServiceToken":"arn:aws:lambda:us-west-2:123456789012:function:amplify-sampleprojectapp--CustomCDKBucketDeploymen-hPaUgEqbbzHw","SourceMarkers":[{}],"Prune":"true","OutputObjectKeys":"true","DestinationBucketArn":"arn:aws:s3:::amplify-sampleprojectapp--amplifydataamplifycodege-ndv73vbejv8r","SourceBucketNames":["cdk-hnb659fds-assets-123456789012-us-west-2"],"DestinationBucketName":"amplify-sampleprojectapp--amplifydataamplifycodege-ndv73vbejv8r","SourceObjectKeys":["2f050e6b9affea69843658b09b5d9073acc9cda9170a30ff043def78a33c6ad0.zip"]}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'amplifyDataAmplifyCodegenAssetsAmplifyCodegenAssetsDeploymentCustomResource1536MiB21775929',
        },
        constructPath:
          'data/amplifyData/AmplifyCodegenAssets/AmplifyCodegenAssetsDeployment/CustomResource-1536MiB/Default',
      },
      progress: {
        completed: 1,
        formatted: '  1',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C |   1 | 11:05:34 PM | DELETE_IN_PROGRESS | AWS::SSM::Parameter | data/AMPLIFY_DATA_MODEL_INTROSPECTION_SCHEMA_KEYParameter (AMPLIFYDATAMODELINTROSPECTIONSCHEMAKEYParameterB6AEAE8A)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C/b355b0f0-fe24-11ef-a0bd-020db6799971',
        EventId:
          'AMPLIFYDATAMODELINTROSPECTIONSCHEMAKEYParameterB6AEAE8A-DELETE_IN_PROGRESS-2025-03-11T03:05:34.544Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C',
        LogicalResourceId:
          'AMPLIFYDATAMODELINTROSPECTIONSCHEMAKEYParameterB6AEAE8A',
        PhysicalResourceId:
          '/amplify/resource_reference/sampleprojectapp/user-sandbox-0e1752a889/AMPLIFY_DATA_MODEL_INTROSPECTION_SCHEMA_KEY',
        ResourceType: 'AWS::SSM::Parameter',
        Timestamp: new Date('2025-03-11T03:05:34.544'),
        ResourceStatus: 'DELETE_IN_PROGRESS',
        ResourceProperties:
          '{"Type":"String","Value":"modelIntrospectionSchema.json","Tags":{"amplify:deployment-type":"sandbox","created-by":"amplify"},"Name":"/amplify/resource_reference/sampleprojectapp/user-sandbox-0e1752a889/AMPLIFY_DATA_MODEL_INTROSPECTION_SCHEMA_KEY"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'AMPLIFYDATAMODELINTROSPECTIONSCHEMAKEYParameterB6AEAE8A',
        },
        constructPath:
          'data/AMPLIFY_DATA_MODEL_INTROSPECTION_SCHEMA_KEYParameter',
      },
      progress: {
        completed: 1,
        formatted: '  1',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C |   1 | 11:05:34 PM | DELETE_IN_PROGRESS | Custom::CDKBucketDeployment | data/modelIntrospectionSchemaBucketDeployment/CustomResource-1536MiB/Default (modelIntrospectionSchemaBucketDeploymentCustomResource1536MiB104B97EC)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C/b355b0f0-fe24-11ef-a0bd-020db6799971',
        EventId:
          'modelIntrospectionSchemaBucketDeploymentCustomResource1536MiB104B97EC-DELETE_IN_PROGRESS-2025-03-11T03:05:34.546Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C',
        LogicalResourceId:
          'modelIntrospectionSchemaBucketDeploymentCustomResource1536MiB104B97EC',
        PhysicalResourceId:
          'aws.cdk.s3deployment.f79d81ec-ad1e-44ee-b02b-70caed5ce76a',
        ResourceType: 'Custom::CDKBucketDeployment',
        Timestamp: new Date('2025-03-11T03:05:34.546'),
        ResourceStatus: 'DELETE_IN_PROGRESS',
        ResourceProperties:
          '{"ServiceToken":"arn:aws:lambda:us-west-2:123456789012:function:amplify-sampleprojectapp--CustomCDKBucketDeploymen-hPaUgEqbbzHw","SourceMarkers":[{}],"Prune":"true","OutputObjectKeys":"true","SourceBucketNames":["cdk-hnb659fds-assets-123456789012-us-west-2"],"DestinationBucketName":"amplify-sampleprojectapp--modelintrospectionschema-q5iuovbg1sue","SourceObjectKeys":["907cb295088857ccb545b8aae83288bd9dfa82115bb0d20a0ae0d08dc8872f8a.zip"]}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'modelIntrospectionSchemaBucketDeploymentCustomResource1536MiB104B97EC',
        },
        constructPath:
          'data/modelIntrospectionSchemaBucketDeployment/CustomResource-1536MiB/Default',
      },
      progress: {
        completed: 1,
        formatted: '  1',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C |   1 | 11:05:34 PM | DELETE_IN_PROGRESS | AWS::Lambda::LayerVersion | data/modelIntrospectionSchemaBucketDeployment/AwsCliLayer (modelIntrospectionSchemaBucketDeploymentAwsCliLayer13C432F7)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C/b355b0f0-fe24-11ef-a0bd-020db6799971',
        EventId:
          'modelIntrospectionSchemaBucketDeploymentAwsCliLayer13C432F7-DELETE_IN_PROGRESS-2025-03-11T03:05:34.548Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C',
        LogicalResourceId:
          'modelIntrospectionSchemaBucketDeploymentAwsCliLayer13C432F7',
        PhysicalResourceId:
          'arn:aws:lambda:us-west-2:123456789012:layer:modelIntrospectionSchemaBucketDeploymentAwsCliLayer13C432F7:56',
        ResourceType: 'AWS::Lambda::LayerVersion',
        Timestamp: new Date('2025-03-11T03:05:34.548'),
        ResourceStatus: 'DELETE_IN_PROGRESS',
        ResourceProperties:
          '{"Description":"/opt/awscli/aws","Content":{"S3Bucket":"cdk-hnb659fds-assets-123456789012-us-west-2","S3Key":"14700f3f8dd2f4997b0e6380f2714c17996184ef4a12d7990ce58b009105e158.zip"}}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'modelIntrospectionSchemaBucketDeploymentAwsCliLayer13C432F7',
        },
        constructPath:
          'data/modelIntrospectionSchemaBucketDeployment/AwsCliLayer',
      },
      progress: {
        completed: 1,
        formatted: '  1',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C |   1 | 11:05:34 PM | DELETE_IN_PROGRESS | Custom::S3AutoDeleteObjects | data/amplifyData/AmplifyCodegenAssets/AmplifyCodegenAssetsBucket/AutoDeleteObjectsCustomResource/Default (amplifyDataAmplifyCodegenAssetsAmplifyCodegenAssetsBucketAutoDeleteObjectsCustomResource437F26F5)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C/b355b0f0-fe24-11ef-a0bd-020db6799971',
        EventId:
          'amplifyDataAmplifyCodegenAssetsAmplifyCodegenAssetsBucketAutoDeleteObjectsCustomResource437F26F5-DELETE_IN_PROGRESS-2025-03-11T03:05:34.590Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C',
        LogicalResourceId:
          'amplifyDataAmplifyCodegenAssetsAmplifyCodegenAssetsBucketAutoDeleteObjectsCustomResource437F26F5',
        PhysicalResourceId: '6a4ce3c9-cb82-4870-a550-6689abdfb0fa',
        ResourceType: 'Custom::S3AutoDeleteObjects',
        Timestamp: new Date('2025-03-11T03:05:34.590'),
        ResourceStatus: 'DELETE_IN_PROGRESS',
        ResourceProperties:
          '{"ServiceToken":"arn:aws:lambda:us-west-2:123456789012:function:amplify-sampleprojectapp--CustomS3AutoDeleteObject-wJKnIElU6MiV","BucketName":"amplify-sampleprojectapp--amplifydataamplifycodege-ndv73vbejv8r"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'amplifyDataAmplifyCodegenAssetsAmplifyCodegenAssetsBucketAutoDeleteObjectsCustomResource437F26F5',
        },
        constructPath:
          'data/amplifyData/AmplifyCodegenAssets/AmplifyCodegenAssetsBucket/AutoDeleteObjectsCustomResource/Default',
      },
      progress: {
        completed: 1,
        formatted: '  1',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C |   1 | 11:05:34 PM | DELETE_IN_PROGRESS | AWS::CloudFormation::Stack | data/amplifyData/ConnectionStack.NestedStack/ConnectionStack.NestedStackResource (amplifyDataConnectionStackNestedStackConnectionStackNestedStackResourceAB0F312B)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C/b355b0f0-fe24-11ef-a0bd-020db6799971',
        EventId:
          'amplifyDataConnectionStackNestedStackConnectionStackNestedStackResourceAB0F312B-DELETE_IN_PROGRESS-2025-03-11T03:05:34.663Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C',
        LogicalResourceId:
          'amplifyDataConnectionStackNestedStackConnectionStackNestedStackResourceAB0F312B',
        PhysicalResourceId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataConnectionStackNestedStackConne-1RT45PFNMWNGH/026d3050-fe25-11ef-abb4-06dfee28c627',
        ResourceType: 'AWS::CloudFormation::Stack',
        Timestamp: new Date('2025-03-11T03:05:34.663'),
        ResourceStatus: 'DELETE_IN_PROGRESS',
        ResourceProperties:
          '{"TemplateURL":"https://s3.us-west-2.amazonaws.com/cdk-hnb659fds-assets-123456789012-us-west-2/83ef1d85f437ccf9bf6d749fd82f93b06ce961419558f4618e4da3765db7a706.json","Parameters":{"referencetoamplifysampleprojectappusersandbox0e1752a889dataamplifyDataPostNestedStackPostNestedStackResource01FEDE53Outputsamplifysampleprojectappusersandbox0e1752a889dataamplifyDataPostPostTable365E2F9CTableArn":"arn:aws:dynamodb:us-west-2:123456789012:table/Post-ezabg7fk2jecvodrblowtgbsme-NONE","referencetoamplifysampleprojectappusersandbox0e1752a889dataamplifyDataPersonNestedStackPersonNestedStackResource35C2DCE5Outputsamplifysampleprojectappusersandbox0e1752a889dataamplifyDataPersonPersonTableF02A70DBTableArn":"arn:aws:dynamodb:us-west-2:123456789012:table/Person-ezabg7fk2jecvodrblowtgbsme-NONE","referencetoamplifysampleprojectappusersandbox0e1752a889authNestedStackauthNestedStackResource1C2A2D1EOutputsamplifysampleprojectappusersandbox0e1752a889authamplifyAuthIdentityPool5160F57DRef":"us-west-2:e3abf6f7-1ae5-4254-829e-0d8c9dc05bff","referencetoamplifysampleprojectappusersandbox0e1752a889dataamplifyDataPersonNestedStackPersonNestedStackResource35C2DCE5Outputsamplifysampleprojectappusersandbox0e1752a889dataamplifyDataPersonPersonDataSourceDA3812F2Name":"PersonTable","referencetoamplifysampleprojectappusersandbox0e1752a889dataamplifyDataGraphQLAPIB1F14B28ApiId":"ezabg7fk2jecvodrblowtgbsme","referencetoamplifysampleprojectappusersandbox0e1752a889authNestedStackauthNestedStackResource1C2A2D1EOutputsamplifysampleprojectappusersandbox0e1752a889authamplifyAuthunauthenticatedUserRoleC92E0CFERef":"amplify-sampleprojectapp--amplifyAuthunauthenticate-0ZSS9wsA6Aut","referencetoamplifysampleprojectappusersandbox0e1752a889dataamplifyDataGraphQLAPINONEDS97A6DFB0Name":"NONE_DS","referencetoamplifysampleprojectappusersandbox0e1752a889authNestedStackauthNestedStackResource1C2A2D1EOutputsamplifysampleprojectappusersandbox0e1752a889authamplifyAuthauthenticatedUserRole11751600Ref":"amplify-sampleprojectapp--amplifyAuthauthenticatedU-JksUKi7c8Bvh","referencetoamplifysampleprojectappusersandbox0e1752a889dataamplifyDataPostNestedStackPostNestedStackResource01FEDE53Outputsamplifysampleprojectappusersandbox0e1752a889dataamplifyDataPostPostDataSourceED97F46CName":"PostTable"},"Tags":[{"Value":"sandbox","Key":"amplify:deployment-type"},{"Value":"amplifyData","Key":"amplify:friendly-name"},{"Value":"amplify","Key":"created-by"}]}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'amplifyDataConnectionStackNestedStackConnectionStackNestedStackResourceAB0F312B',
        },
        constructPath:
          'data/amplifyData/ConnectionStack.NestedStack/ConnectionStack.NestedStackResource',
      },
      progress: {
        completed: 1,
        formatted: '  1',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataConnectionStackNestedStackConne-1RT45PFNMWNGH |   1 | 11:05:34 PM | DELETE_IN_PROGRESS | AWS::CloudFormation::Stack | amplify-sampleprojectapp-user-sandbox-0-amplifyDataConnectionStackNestedStackConne-1RT45PFNMWNGH User Initiated',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataConnectionStackNestedStackConne-1RT45PFNMWNGH/026d3050-fe25-11ef-abb4-06dfee28c627',
        EventId: 'b3799730-fe25-11ef-99e2-0677b97aed67',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataConnectionStackNestedStackConne-1RT45PFNMWNGH',
        LogicalResourceId:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataConnectionStackNestedStackConne-1RT45PFNMWNGH',
        PhysicalResourceId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataConnectionStackNestedStackConne-1RT45PFNMWNGH/026d3050-fe25-11ef-abb4-06dfee28c627',
        ResourceType: 'AWS::CloudFormation::Stack',
        Timestamp: new Date('2025-03-11T03:05:34.998'),
        ResourceStatus: 'DELETE_IN_PROGRESS',
        ResourceStatusReason: 'User Initiated',
      },
      progress: {
        completed: 1,
        formatted: '  1',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C |   2 | 11:05:35 PM | DELETE_COMPLETE | AWS::Lambda::LayerVersion | data/modelIntrospectionSchemaBucketDeployment/AwsCliLayer (modelIntrospectionSchemaBucketDeploymentAwsCliLayer13C432F7)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C/b355b0f0-fe24-11ef-a0bd-020db6799971',
        EventId:
          'modelIntrospectionSchemaBucketDeploymentAwsCliLayer13C432F7-DELETE_COMPLETE-2025-03-11T03:05:35.461Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C',
        LogicalResourceId:
          'modelIntrospectionSchemaBucketDeploymentAwsCliLayer13C432F7',
        PhysicalResourceId:
          'arn:aws:lambda:us-west-2:123456789012:layer:modelIntrospectionSchemaBucketDeploymentAwsCliLayer13C432F7:56',
        ResourceType: 'AWS::Lambda::LayerVersion',
        Timestamp: new Date('2025-03-11T03:05:35.461'),
        ResourceStatus: 'DELETE_COMPLETE',
        ResourceProperties:
          '{"Description":"/opt/awscli/aws","Content":{"S3Bucket":"cdk-hnb659fds-assets-123456789012-us-west-2","S3Key":"14700f3f8dd2f4997b0e6380f2714c17996184ef4a12d7990ce58b009105e158.zip"}}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'modelIntrospectionSchemaBucketDeploymentAwsCliLayer13C432F7',
        },
        constructPath:
          'data/modelIntrospectionSchemaBucketDeployment/AwsCliLayer',
      },
      progress: {
        completed: 2,
        formatted: '  2',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C |   1 | 11:05:35 PM | DELETE_COMPLETE | AWS::CDK::Metadata | auth/CDKMetadata/Default (CDKMetadata)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C/b355b0f0-fe24-11ef-a0bd-020db6799971',
        EventId: 'CDKMetadata-DELETE_COMPLETE-2025-03-11T03:05:35.462Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C',
        LogicalResourceId: 'CDKMetadata',
        PhysicalResourceId: 'b355b0f0-fe24-11ef-a0bd-020db6799971',
        ResourceType: 'AWS::CDK::Metadata',
        Timestamp: new Date('2025-03-11T03:05:35.462'),
        ResourceStatus: 'DELETE_COMPLETE',
        ResourceProperties:
          '{"Analytics":"v2:deflate64:H4sIAAAAAAAA/1VQy27CMBD8Fu7GBXrhGoLaC0WUSL1Gi7MJBj9Sr0MURfn3yjGEcprHyuPZXfHlesUXM2hpLorrXMkT7/dIHovMg7iyI5JtnEAGLeU91DV1RvD+00F9/lVJLTdAyNLSjM73LqnlP5WJM2pge2twCx6yGJWW5qkGRu+83zTiij5M7izCwSopuqd911GEn8PrvC+wVrbTaDyPo+1kMCBCTzwJMDAF+lQA79PS7KBD94OOpDUsk6ZS6K35aIzwwZlIWk7mwCRo3h+tGpcY8VkxsoERad5n3klTHcCBRo9unD/EMAQZ75s25K2erhxSHzx2zVXomUNLQkmetJQqOVZn40qZh0qa6iU/iC+o69F/yT84e5MFung6YwvkF3q7rRZ8uebL2YWknLvGeKmRHyP+AfOB530iAgAA"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'CDKMetadata',
        },
        constructPath: 'auth/CDKMetadata/Default',
      },
      progress: {
        completed: 1,
        formatted: '  1',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C |   2 | 11:05:35 PM | DELETE_COMPLETE | AWS::SSM::Parameter | data/AMPLIFY_DATA_MODEL_INTROSPECTION_SCHEMA_KEYParameter (AMPLIFYDATAMODELINTROSPECTIONSCHEMAKEYParameterB6AEAE8A)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C/b355b0f0-fe24-11ef-a0bd-020db6799971',
        EventId:
          'AMPLIFYDATAMODELINTROSPECTIONSCHEMAKEYParameterB6AEAE8A-DELETE_COMPLETE-2025-03-11T03:05:35.475Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C',
        LogicalResourceId:
          'AMPLIFYDATAMODELINTROSPECTIONSCHEMAKEYParameterB6AEAE8A',
        PhysicalResourceId:
          '/amplify/resource_reference/sampleprojectapp/user-sandbox-0e1752a889/AMPLIFY_DATA_MODEL_INTROSPECTION_SCHEMA_KEY',
        ResourceType: 'AWS::SSM::Parameter',
        Timestamp: new Date('2025-03-11T03:05:35.475'),
        ResourceStatus: 'DELETE_COMPLETE',
        ResourceProperties:
          '{"Type":"String","Value":"modelIntrospectionSchema.json","Tags":{"amplify:deployment-type":"sandbox","created-by":"amplify"},"Name":"/amplify/resource_reference/sampleprojectapp/user-sandbox-0e1752a889/AMPLIFY_DATA_MODEL_INTROSPECTION_SCHEMA_KEY"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'AMPLIFYDATAMODELINTROSPECTIONSCHEMAKEYParameterB6AEAE8A',
        },
        constructPath:
          'data/AMPLIFY_DATA_MODEL_INTROSPECTION_SCHEMA_KEYParameter',
      },
      progress: {
        completed: 2,
        formatted: '  2',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C |   3 | 11:05:35 PM | DELETE_COMPLETE | AWS::SSM::Parameter | data/AMPLIFY_DATA_GRAPHQL_ENDPOINTParameter (AMPLIFYDATAGRAPHQLENDPOINTParameter1C2CBB16)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C/b355b0f0-fe24-11ef-a0bd-020db6799971',
        EventId:
          'AMPLIFYDATAGRAPHQLENDPOINTParameter1C2CBB16-DELETE_COMPLETE-2025-03-11T03:05:35.528Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C',
        LogicalResourceId: 'AMPLIFYDATAGRAPHQLENDPOINTParameter1C2CBB16',
        PhysicalResourceId:
          '/amplify/resource_reference/sampleprojectapp/user-sandbox-0e1752a889/AMPLIFY_DATA_GRAPHQL_ENDPOINT',
        ResourceType: 'AWS::SSM::Parameter',
        Timestamp: new Date('2025-03-11T03:05:35.528'),
        ResourceStatus: 'DELETE_COMPLETE',
        ResourceProperties:
          '{"Type":"String","Value":"https://hbh33im3izgqfkqksqgn5hkqly.appsync-api.us-west-2.amazonaws.com/graphql","Tags":{"amplify:deployment-type":"sandbox","created-by":"amplify"},"Name":"/amplify/resource_reference/sampleprojectapp/user-sandbox-0e1752a889/AMPLIFY_DATA_GRAPHQL_ENDPOINT"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'AMPLIFYDATAGRAPHQLENDPOINTParameter1C2CBB16',
        },
        constructPath: 'data/AMPLIFY_DATA_GRAPHQL_ENDPOINTParameter',
      },
      progress: {
        completed: 3,
        formatted: '  3',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C |   4 | 11:05:35 PM | DELETE_COMPLETE | AWS::SSM::Parameter | data/AMPLIFY_DATA_DEFAULT_NAMEParameter (AMPLIFYDATADEFAULTNAMEParameterE7C23CC4)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C/b355b0f0-fe24-11ef-a0bd-020db6799971',
        EventId:
          'AMPLIFYDATADEFAULTNAMEParameterE7C23CC4-DELETE_COMPLETE-2025-03-11T03:05:35.534Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C',
        LogicalResourceId: 'AMPLIFYDATADEFAULTNAMEParameterE7C23CC4',
        PhysicalResourceId:
          '/amplify/resource_reference/sampleprojectapp/user-sandbox-0e1752a889/AMPLIFY_DATA_DEFAULT_NAME',
        ResourceType: 'AWS::SSM::Parameter',
        Timestamp: new Date('2025-03-11T03:05:35.534'),
        ResourceStatus: 'DELETE_COMPLETE',
        ResourceProperties:
          '{"Type":"String","Value":"amplifyData","Tags":{"amplify:deployment-type":"sandbox","created-by":"amplify"},"Name":"/amplify/resource_reference/sampleprojectapp/user-sandbox-0e1752a889/AMPLIFY_DATA_DEFAULT_NAME"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'AMPLIFYDATADEFAULTNAMEParameterE7C23CC4',
        },
        constructPath: 'data/AMPLIFY_DATA_DEFAULT_NAMEParameter',
      },
      progress: {
        completed: 4,
        formatted: '  4',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C |   5 | 11:05:35 PM | DELETE_COMPLETE | AWS::SSM::Parameter | data/AMPLIFY_DATA_MODEL_INTROSPECTION_SCHEMA_BUCKET_NAMEParameter (AMPLIFYDATAMODELINTROSPECTIONSCHEMABUCKETNAMEParameter47BF4F44)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C/b355b0f0-fe24-11ef-a0bd-020db6799971',
        EventId:
          'AMPLIFYDATAMODELINTROSPECTIONSCHEMABUCKETNAMEParameter47BF4F44-DELETE_COMPLETE-2025-03-11T03:05:35.631Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C',
        LogicalResourceId:
          'AMPLIFYDATAMODELINTROSPECTIONSCHEMABUCKETNAMEParameter47BF4F44',
        PhysicalResourceId:
          '/amplify/resource_reference/sampleprojectapp/user-sandbox-0e1752a889/AMPLIFY_DATA_MODEL_INTROSPECTION_SCHEMA_BUCKET_NAME',
        ResourceType: 'AWS::SSM::Parameter',
        Timestamp: new Date('2025-03-11T03:05:35.631'),
        ResourceStatus: 'DELETE_COMPLETE',
        ResourceProperties:
          '{"Type":"String","Value":"amplify-sampleprojectapp--modelintrospectionschema-q5iuovbg1sue","Tags":{"amplify:deployment-type":"sandbox","created-by":"amplify"},"Name":"/amplify/resource_reference/sampleprojectapp/user-sandbox-0e1752a889/AMPLIFY_DATA_MODEL_INTROSPECTION_SCHEMA_BUCKET_NAME"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'AMPLIFYDATAMODELINTROSPECTIONSCHEMABUCKETNAMEParameter47BF4F44',
        },
        constructPath:
          'data/AMPLIFY_DATA_MODEL_INTROSPECTION_SCHEMA_BUCKET_NAMEParameter',
      },
      progress: {
        completed: 5,
        formatted: '  5',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataConnectionStackNestedStackConne-1RT45PFNMWNGH |   5 | 11:05:36 PM | DELETE_IN_PROGRESS | AWS::CDK::Metadata | auth/CDKMetadata/Default (CDKMetadata)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataConnectionStackNestedStackConne-1RT45PFNMWNGH/026d3050-fe25-11ef-abb4-06dfee28c627',
        EventId: 'CDKMetadata-DELETE_IN_PROGRESS-2025-03-11T03:05:36.882Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataConnectionStackNestedStackConne-1RT45PFNMWNGH',
        LogicalResourceId: 'CDKMetadata',
        PhysicalResourceId: '026d3050-fe25-11ef-abb4-06dfee28c627',
        ResourceType: 'AWS::CDK::Metadata',
        Timestamp: new Date('2025-03-11T03:05:36.882'),
        ResourceStatus: 'DELETE_IN_PROGRESS',
        ResourceProperties:
          '{"Analytics":"v2:deflate64:H4sIAAAAAAAA/yXMPQ6DMAxA4bOwB5efhbUgdewAB0BuMChAHYQdUIW4e0U7fXrLyyAtMkgi3CW23RTP7gXHk0SpaxTtZHCX9pC8RRFSgfuFkRzKYCfSEoUMLot82MJR9fwIbNV5rjz3bggrXmGqnmsSP2+0nqf5PRrFwfFwGvYdwSi3LUsgLSCNRnEuXgOrexPUf796F96XpwAAAA=="}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'CDKMetadata',
        },
        constructPath: 'auth/CDKMetadata/Default',
      },
      progress: {
        completed: 5,
        formatted: '  5',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataConnectionStackNestedStackConne-1RT45PFNMWNGH |   5 | 11:05:36 PM | DELETE_IN_PROGRESS | AWS::AppSync::Resolver | data/amplifyData/ConnectionStack/postAuthorResolver (PostauthorResolver)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataConnectionStackNestedStackConne-1RT45PFNMWNGH/026d3050-fe25-11ef-abb4-06dfee28c627',
        EventId:
          'PostauthorResolver-DELETE_IN_PROGRESS-2025-03-11T03:05:36.907Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataConnectionStackNestedStackConne-1RT45PFNMWNGH',
        LogicalResourceId: 'PostauthorResolver',
        PhysicalResourceId:
          'arn:aws:appsync:us-west-2:123456789012:apis/ezabg7fk2jecvodrblowtgbsme/types/Post/resolvers/author',
        ResourceType: 'AWS::AppSync::Resolver',
        Timestamp: new Date('2025-03-11T03:05:36.907'),
        ResourceStatus: 'DELETE_IN_PROGRESS',
        ResourceProperties:
          '{"TypeName":"Post","PipelineConfig":{"Functions":["wy5mcasl35f5pkzbjq3hdb3pmq","gyrtjdvjabegrowdabgtrgrcgq"]},"RequestMappingTemplate":"$util.qr($ctx.stash.put(\\"typeName\\", \\"Post\\"))\\n$util.qr($ctx.stash.put(\\"fieldName\\", \\"author\\"))\\n$util.qr($ctx.stash.put(\\"conditions\\", []))\\n$util.qr($ctx.stash.put(\\"metadata\\", {}))\\n$util.qr($ctx.stash.metadata.put(\\"dataSourceType\\", \\"AMAZON_DYNAMODB\\"))\\n$util.qr($ctx.stash.metadata.put(\\"apiId\\", \\"ezabg7fk2jecvodrblowtgbsme\\"))\\n$util.qr($ctx.stash.put(\\"connectionAttributes\\", {}))\\n$util.qr($ctx.stash.put(\\"tableName\\", \\"Person-ezabg7fk2jecvodrblowtgbsme-NONE\\"))\\n$util.qr($ctx.stash.put(\\"authRole\\", \\"arn:aws:sts::123456789012:assumed-role/amplify-sampleprojectapp--amplifyAuthauthenticatedU-JksUKi7c8Bvh/CognitoIdentityCredentials\\"))\\n$util.qr($ctx.stash.put(\\"unauthRole\\", \\"arn:aws:sts::123456789012:assumed-role/amplify-sampleprojectapp--amplifyAuthunauthenticate-0ZSS9wsA6Aut/CognitoIdentityCredentials\\"))\\n$util.qr($ctx.stash.put(\\"identityPoolId\\", \\"us-west-2:e3abf6f7-1ae5-4254-829e-0d8c9dc05bff\\"))\\n$util.qr($ctx.stash.put(\\"adminRoles\\", []))\\n$util.toJson({})","ResponseMappingTemplate":"$util.toJson($ctx.prev.result)","Kind":"PIPELINE","ApiId":"ezabg7fk2jecvodrblowtgbsme","FieldName":"author"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'PostauthorResolver',
        },
        constructPath: 'data/amplifyData/ConnectionStack/postAuthorResolver',
      },
      progress: {
        completed: 5,
        formatted: '  5',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataConnectionStackNestedStackConne-1RT45PFNMWNGH |   5 | 11:05:36 PM | DELETE_IN_PROGRESS | AWS::AppSync::Resolver | data/amplifyData/ConnectionStack/personAuthoredPostsResolver (PersonauthoredPostsResolver)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataConnectionStackNestedStackConne-1RT45PFNMWNGH/026d3050-fe25-11ef-abb4-06dfee28c627',
        EventId:
          'PersonauthoredPostsResolver-DELETE_IN_PROGRESS-2025-03-11T03:05:36.911Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataConnectionStackNestedStackConne-1RT45PFNMWNGH',
        LogicalResourceId: 'PersonauthoredPostsResolver',
        PhysicalResourceId:
          'arn:aws:appsync:us-west-2:123456789012:apis/ezabg7fk2jecvodrblowtgbsme/types/Person/resolvers/authoredPosts',
        ResourceType: 'AWS::AppSync::Resolver',
        Timestamp: new Date('2025-03-11T03:05:36.911'),
        ResourceStatus: 'DELETE_IN_PROGRESS',
        ResourceProperties:
          '{"TypeName":"Person","PipelineConfig":{"Functions":["c72wvd7a3ra3vihc4xq5yslugm","46nlz3vf35azdiuhizkj75us4i"]},"RequestMappingTemplate":"$util.qr($ctx.stash.put(\\"typeName\\", \\"Person\\"))\\n$util.qr($ctx.stash.put(\\"fieldName\\", \\"authoredPosts\\"))\\n$util.qr($ctx.stash.put(\\"conditions\\", []))\\n$util.qr($ctx.stash.put(\\"metadata\\", {}))\\n$util.qr($ctx.stash.metadata.put(\\"dataSourceType\\", \\"AMAZON_DYNAMODB\\"))\\n$util.qr($ctx.stash.metadata.put(\\"apiId\\", \\"ezabg7fk2jecvodrblowtgbsme\\"))\\n$util.qr($ctx.stash.put(\\"connectionAttributes\\", {}))\\n$util.qr($ctx.stash.put(\\"tableName\\", \\"Post-ezabg7fk2jecvodrblowtgbsme-NONE\\"))\\n$util.qr($ctx.stash.put(\\"authRole\\", \\"arn:aws:sts::123456789012:assumed-role/amplify-sampleprojectapp--amplifyAuthauthenticatedU-JksUKi7c8Bvh/CognitoIdentityCredentials\\"))\\n$util.qr($ctx.stash.put(\\"unauthRole\\", \\"arn:aws:sts::123456789012:assumed-role/amplify-sampleprojectapp--amplifyAuthunauthenticate-0ZSS9wsA6Aut/CognitoIdentityCredentials\\"))\\n$util.qr($ctx.stash.put(\\"identityPoolId\\", \\"us-west-2:e3abf6f7-1ae5-4254-829e-0d8c9dc05bff\\"))\\n$util.qr($ctx.stash.put(\\"adminRoles\\", []))\\n$util.toJson({})","ResponseMappingTemplate":"$util.toJson($ctx.prev.result)","Kind":"PIPELINE","ApiId":"ezabg7fk2jecvodrblowtgbsme","FieldName":"authoredPosts"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'PersonauthoredPostsResolver',
        },
        constructPath:
          'data/amplifyData/ConnectionStack/personAuthoredPostsResolver',
      },
      progress: {
        completed: 5,
        formatted: '  5',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I0000',
    message:
      '[sdk info] CloudFormation.DescribeStackEvents({"StackName":"amplify-sampleprojectapp-user-sandbox-0e1752a889"}) -> OK',
  },
  {
    code: 'CDK_TOOLKIT_I0000',
    message:
      '[sdk info] CloudFormation.DescribeStackEvents({"StackName":"arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0e1752a889-MyCustomResourcesBB610599-8G262VTBDJMK/96f8f2f0-fe24-11ef-a75d-0aa9ea96647d"}) -> OK',
  },
  {
    code: 'CDK_TOOLKIT_I0000',
    message:
      '[sdk info] CloudFormation.DescribeStacks({"StackName":"amplify-sampleprojectapp-user-sandbox-0e1752a889"}) -> OK',
  },
  {
    code: 'CDK_TOOLKIT_I0000',
    message:
      'Stack amplify-sampleprojectapp-user-sandbox-0e1752a889 has an ongoing operation in progress and is not stable (DELETE_IN_PROGRESS)',
  },
  {
    code: 'CDK_TOOLKIT_I0000',
    message:
      '[sdk info] CloudFormation.DescribeStackEvents({"StackName":"arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0e1752a889-storage0EC3F24A-FW28UHWGJFK9/b34eac10-fe24-11ef-884b-028f2e174171"}) -> OK',
  },
  {
    code: 'CDK_TOOLKIT_I0000',
    message:
      '[sdk info] CloudFormation.DescribeStackEvents({"StackName":"arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C/b355b0f0-fe24-11ef-a0bd-020db6799971"}) -> OK',
  },
  {
    code: 'CDK_TOOLKIT_I0000',
    message:
      '[sdk info] CloudFormation.DescribeStackEvents({"StackName":"arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataConnectionStackNestedStackConne-1RT45PFNMWNGH/026d3050-fe25-11ef-abb4-06dfee28c627"}) -> OK',
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0e1752a889-MyCustomResourcesBB610599-8G262VTBDJMK |   4 | 11:05:34 PM | DELETE_COMPLETE | AWS::CDK::Metadata | auth/CDKMetadata/Default (CDKMetadata)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0e1752a889-MyCustomResourcesBB610599-8G262VTBDJMK/96f8f2f0-fe24-11ef-a75d-0aa9ea96647d',
        EventId: 'CDKMetadata-DELETE_COMPLETE-2025-03-11T03:05:34.734Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0e1752a889-MyCustomResourcesBB610599-8G262VTBDJMK',
        LogicalResourceId: 'CDKMetadata',
        PhysicalResourceId: '96f8f2f0-fe24-11ef-a75d-0aa9ea96647d',
        ResourceType: 'AWS::CDK::Metadata',
        Timestamp: new Date('2025-03-11T03:05:34.734'),
        ResourceStatus: 'DELETE_COMPLETE',
        ResourceProperties:
          '{"Analytics":"v2:deflate64:H4sIAAAAAAAA/12JvQ4CIRAGn+V6+AQqensTf3qDsCZ7p5y64BWEdzeendVMZhya9Q5mCIvomCZ94wt2JIXSsYQ4KevN3w2LnJs8BW1fqZLaXvMqXUkWtNP84PiNq/TeVZ4TYZTN2xlYDzuMwqxfNRe+Ew4/fgBWxymaiQAAAA=="}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'CDKMetadata',
        },
        constructPath: 'auth/CDKMetadata/Default',
      },
      progress: {
        completed: 4,
        formatted: '  4',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0e1752a889-storage0EC3F24A-FW28UHWGJFK9 |   5 | 11:05:35 PM | DELETE_COMPLETE | AWS::IAM::Policy | storage/storageAccess5 (storageAccess524979CAB)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0e1752a889-storage0EC3F24A-FW28UHWGJFK9/b34eac10-fe24-11ef-884b-028f2e174171',
        EventId:
          'storageAccess524979CAB-DELETE_COMPLETE-2025-03-11T03:05:35.002Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0e1752a889-storage0EC3F24A-FW28UHWGJFK9',
        LogicalResourceId: 'storageAccess524979CAB',
        PhysicalResourceId: 'ampli-stora-WBOSftR3QLib',
        ResourceType: 'AWS::IAM::Policy',
        Timestamp: new Date('2025-03-11T03:05:35.002'),
        ResourceStatus: 'DELETE_COMPLETE',
        ResourceProperties:
          '{"PolicyName":"storageAccess524979CAB","PolicyDocument":{"Version":"2012-10-17","Statement":[{"Action":"s3:GetObject","Resource":"arn:aws:s3:::amplify-sampleprojectapp-pr-testnamebucketb4152ad5-shsu6q3elmwn/public/*","Effect":"Allow"},{"Condition":{"StringLike":{"s3:prefix":["public/*","public/"]}},"Action":"s3:ListBucket","Resource":"arn:aws:s3:::amplify-sampleprojectapp-pr-testnamebucketb4152ad5-shsu6q3elmwn","Effect":"Allow"},{"Action":"s3:PutObject","Resource":"arn:aws:s3:::amplify-sampleprojectapp-pr-testnamebucketb4152ad5-shsu6q3elmwn/public/*","Effect":"Allow"}]},"Roles":["amplify-sampleprojectapp--sayhellolambdaServiceRole-rTltSNgzZZ60"]}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'storageAccess524979CAB',
        },
        constructPath: 'storage/storageAccess5',
      },
      progress: {
        completed: 5,
        formatted: '  5',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0e1752a889-storage0EC3F24A-FW28UHWGJFK9 |   4 | 11:05:35 PM | DELETE_COMPLETE | AWS::CDK::Metadata | auth/CDKMetadata/Default (CDKMetadata)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0e1752a889-storage0EC3F24A-FW28UHWGJFK9/b34eac10-fe24-11ef-884b-028f2e174171',
        EventId: 'CDKMetadata-DELETE_COMPLETE-2025-03-11T03:05:35.202Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0e1752a889-storage0EC3F24A-FW28UHWGJFK9',
        LogicalResourceId: 'CDKMetadata',
        PhysicalResourceId: 'b34eac10-fe24-11ef-884b-028f2e174171',
        ResourceType: 'AWS::CDK::Metadata',
        Timestamp: new Date('2025-03-11T03:05:35.202'),
        ResourceStatus: 'DELETE_COMPLETE',
        ResourceProperties:
          '{"Analytics":"v2:deflate64:H4sIAAAAAAAA/12MwY7CMAxEv4V76qXdC1foeVdV+wHIJKYybRIUu6BV1H9H0K1Y7Wlm7DdTQbmrYLvBuxTWDcXIJ8jfJEquU7SDwbscs3xCPkx2IDX1Ofy6RZo4sv15n5c8mxH9ySHU59BQ8izCMRhGD7mNIz35l77ra1HEQ+40cegbTOhJKb3+a5hnU0+i0bckcUp2Gfvjv/B65dD/o5oUb+woHVDI7EVIO8X+ya3EbEJ0BBf5uFVbKHdQbi7CXKQpKHuCdtEHWulAxDMBAAA="}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'CDKMetadata',
        },
        constructPath: 'auth/CDKMetadata/Default',
      },
      progress: {
        completed: 4,
        formatted: '  4',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0e1752a889-storage0EC3F24A-FW28UHWGJFK9 |   5 | 11:05:35 PM | DELETE_COMPLETE | AWS::SSM::Parameter | storage/TEST_NAME_BUCKET_NAMEParameter (TESTNAMEBUCKETNAMEParameter6D140BDA)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0e1752a889-storage0EC3F24A-FW28UHWGJFK9/b34eac10-fe24-11ef-884b-028f2e174171',
        EventId:
          'TESTNAMEBUCKETNAMEParameter6D140BDA-DELETE_COMPLETE-2025-03-11T03:05:35.312Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0e1752a889-storage0EC3F24A-FW28UHWGJFK9',
        LogicalResourceId: 'TESTNAMEBUCKETNAMEParameter6D140BDA',
        PhysicalResourceId:
          '/amplify/resource_reference/sampleprojectapp/user-sandbox-0e1752a889/TEST_NAME_BUCKET_NAME',
        ResourceType: 'AWS::SSM::Parameter',
        Timestamp: new Date('2025-03-11T03:05:35.312'),
        ResourceStatus: 'DELETE_COMPLETE',
        ResourceProperties:
          '{"Type":"String","Value":"amplify-sampleprojectapp-pr-testnamebucketb4152ad5-shsu6q3elmwn","Tags":{"amplify:deployment-type":"sandbox","created-by":"amplify"},"Name":"/amplify/resource_reference/sampleprojectapp/user-sandbox-0e1752a889/TEST_NAME_BUCKET_NAME"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'TESTNAMEBUCKETNAMEParameter6D140BDA',
        },
        constructPath: 'storage/TEST_NAME_BUCKET_NAMEParameter',
      },
      progress: {
        completed: 5,
        formatted: '  5',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C |   6 | 11:05:36 PM | DELETE_COMPLETE | Custom::CDKBucketDeployment | data/amplifyData/AmplifyCodegenAssets/AmplifyCodegenAssetsDeployment/CustomResource-1536MiB/Default (amplifyDataAmplifyCodegenAssetsAmplifyCodegenAssetsDeploymentCustomResource1536MiB21775929)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C/b355b0f0-fe24-11ef-a0bd-020db6799971',
        EventId:
          'amplifyDataAmplifyCodegenAssetsAmplifyCodegenAssetsDeploymentCustomResource1536MiB21775929-DELETE_COMPLETE-2025-03-11T03:05:36.456Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C',
        LogicalResourceId:
          'amplifyDataAmplifyCodegenAssetsAmplifyCodegenAssetsDeploymentCustomResource1536MiB21775929',
        PhysicalResourceId:
          'aws.cdk.s3deployment.9efe895d-1660-4629-aa08-07d8200b5e72',
        ResourceType: 'Custom::CDKBucketDeployment',
        Timestamp: new Date('2025-03-11T03:05:36.456'),
        ResourceStatus: 'DELETE_COMPLETE',
        ResourceProperties:
          '{"ServiceToken":"arn:aws:lambda:us-west-2:123456789012:function:amplify-sampleprojectapp--CustomCDKBucketDeploymen-hPaUgEqbbzHw","SourceMarkers":[{}],"Prune":"true","OutputObjectKeys":"true","DestinationBucketArn":"arn:aws:s3:::amplify-sampleprojectapp--amplifydataamplifycodege-ndv73vbejv8r","SourceBucketNames":["cdk-hnb659fds-assets-123456789012-us-west-2"],"DestinationBucketName":"amplify-sampleprojectapp--amplifydataamplifycodege-ndv73vbejv8r","SourceObjectKeys":["2f050e6b9affea69843658b09b5d9073acc9cda9170a30ff043def78a33c6ad0.zip"]}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'amplifyDataAmplifyCodegenAssetsAmplifyCodegenAssetsDeploymentCustomResource1536MiB21775929',
        },
        constructPath:
          'data/amplifyData/AmplifyCodegenAssets/AmplifyCodegenAssetsDeployment/CustomResource-1536MiB/Default',
      },
      progress: {
        completed: 6,
        formatted: '  6',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C |   7 | 11:05:36 PM | DELETE_COMPLETE | Custom::CDKBucketDeployment | data/modelIntrospectionSchemaBucketDeployment/CustomResource-1536MiB/Default (modelIntrospectionSchemaBucketDeploymentCustomResource1536MiB104B97EC)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C/b355b0f0-fe24-11ef-a0bd-020db6799971',
        EventId:
          'modelIntrospectionSchemaBucketDeploymentCustomResource1536MiB104B97EC-DELETE_COMPLETE-2025-03-11T03:05:36.524Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C',
        LogicalResourceId:
          'modelIntrospectionSchemaBucketDeploymentCustomResource1536MiB104B97EC',
        PhysicalResourceId:
          'aws.cdk.s3deployment.f79d81ec-ad1e-44ee-b02b-70caed5ce76a',
        ResourceType: 'Custom::CDKBucketDeployment',
        Timestamp: new Date('2025-03-11T03:05:36.524'),
        ResourceStatus: 'DELETE_COMPLETE',
        ResourceProperties:
          '{"ServiceToken":"arn:aws:lambda:us-west-2:123456789012:function:amplify-sampleprojectapp--CustomCDKBucketDeploymen-hPaUgEqbbzHw","SourceMarkers":[{}],"Prune":"true","OutputObjectKeys":"true","SourceBucketNames":["cdk-hnb659fds-assets-123456789012-us-west-2"],"DestinationBucketName":"amplify-sampleprojectapp--modelintrospectionschema-q5iuovbg1sue","SourceObjectKeys":["907cb295088857ccb545b8aae83288bd9dfa82115bb0d20a0ae0d08dc8872f8a.zip"]}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'modelIntrospectionSchemaBucketDeploymentCustomResource1536MiB104B97EC',
        },
        constructPath:
          'data/modelIntrospectionSchemaBucketDeployment/CustomResource-1536MiB/Default',
      },
      progress: {
        completed: 7,
        formatted: '  7',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C |   7 | 11:05:37 PM | DELETE_IN_PROGRESS | AWS::Lambda::Function | data/Custom::CDKBucketDeployment8693BB64968944B69AAFB0CC9EB8756C1536MiB (CustomCDKBucketDeployment8693BB64968944B69AAFB0CC9EB8756C1536MiBC5D8AB21)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C/b355b0f0-fe24-11ef-a0bd-020db6799971',
        EventId:
          'CustomCDKBucketDeployment8693BB64968944B69AAFB0CC9EB8756C1536MiBC5D8AB21-DELETE_IN_PROGRESS-2025-03-11T03:05:37.021Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C',
        LogicalResourceId:
          'CustomCDKBucketDeployment8693BB64968944B69AAFB0CC9EB8756C1536MiBC5D8AB21',
        PhysicalResourceId:
          'amplify-sampleprojectapp--CustomCDKBucketDeploymen-hPaUgEqbbzHw',
        ResourceType: 'AWS::Lambda::Function',
        Timestamp: new Date('2025-03-11T03:05:37.021'),
        ResourceStatus: 'DELETE_IN_PROGRESS',
        ResourceProperties:
          '{"Role":"arn:aws:iam::123456789012:role/amplify-sampleprojectapp--CustomCDKBucketDeployment-u7Dt1VwbCyC1","MemorySize":"1536","Runtime":"python3.11","Timeout":"900","Environment":{"Variables":{"AWS_CA_BUNDLE":"/etc/pki/ca-trust/extracted/pem/tls-ca-bundle.pem"}},"Handler":"index.handler","Code":{"S3Bucket":"cdk-hnb659fds-assets-123456789012-us-west-2","S3Key":"c6358465bf49dfae556bb430bf9c81fa578c221b82c308e3707901b1dd654762.zip"},"Layers":["arn:aws:lambda:us-west-2:123456789012:layer:amplifyDataAmplifyCodegenAssetsAmplifyCodegenAssetsDeploymentAwsCliLayerE322F905:245"],"Tags":[{"Value":"sandbox","Key":"amplify:deployment-type"},{"Value":"amplify","Key":"created-by"}]}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'CustomCDKBucketDeployment8693BB64968944B69AAFB0CC9EB8756C1536MiBC5D8AB21',
        },
        constructPath:
          'data/Custom::CDKBucketDeployment8693BB64968944B69AAFB0CC9EB8756C1536MiB',
      },
      progress: {
        completed: 7,
        formatted: '  7',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0e1752a889-storage0EC3F24A-FW28UHWGJFK9 |   8 | 11:05:37 PM | DELETE_COMPLETE | Custom::S3BucketNotifications | storage/testName/Bucket/Notifications (testNameBucketNotificationsB9BE9A01)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0e1752a889-storage0EC3F24A-FW28UHWGJFK9/b34eac10-fe24-11ef-884b-028f2e174171',
        EventId:
          'testNameBucketNotificationsB9BE9A01-DELETE_COMPLETE-2025-03-11T03:05:37.217Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0e1752a889-storage0EC3F24A-FW28UHWGJFK9',
        LogicalResourceId: 'testNameBucketNotificationsB9BE9A01',
        PhysicalResourceId: 'testNameBucketNotificationsB9BE9A01',
        ResourceType: 'Custom::S3BucketNotifications',
        Timestamp: new Date('2025-03-11T03:05:37.217'),
        ResourceStatus: 'DELETE_COMPLETE',
        ResourceProperties:
          '{"ServiceToken":"arn:aws:lambda:us-west-2:123456789012:function:amplify-sampleprojectapp--BucketNotificationsHandl-Hz8a1MzLPzO6","BucketName":"amplify-sampleprojectapp-pr-testnamebucketb4152ad5-shsu6q3elmwn","NotificationConfiguration":{"LambdaFunctionConfigurations":[{"Events":["s3:ObjectRemoved:*"],"LambdaFunctionArn":"arn:aws:lambda:us-west-2:123456789012:function:amplify-sampleprojectapp-pr-sayhellolambdaEFA46D92-FKnDZgZ20NmE"}]},"Managed":"true","SkipDestinationValidation":"false"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'testNameBucketNotificationsB9BE9A01',
        },
        constructPath: 'storage/testName/Bucket/Notifications',
      },
      progress: {
        completed: 8,
        formatted: '  8',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C |   9 | 11:05:37 PM | DELETE_COMPLETE | Custom::S3AutoDeleteObjects | data/modelIntrospectionSchemaBucket/AutoDeleteObjectsCustomResource/Default (modelIntrospectionSchemaBucketAutoDeleteObjectsCustomResourceFE57309F)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C/b355b0f0-fe24-11ef-a0bd-020db6799971',
        EventId:
          'modelIntrospectionSchemaBucketAutoDeleteObjectsCustomResourceFE57309F-DELETE_COMPLETE-2025-03-11T03:05:37.301Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C',
        LogicalResourceId:
          'modelIntrospectionSchemaBucketAutoDeleteObjectsCustomResourceFE57309F',
        PhysicalResourceId: '06734357-2f12-497a-a8ef-c6f13938b77c',
        ResourceType: 'Custom::S3AutoDeleteObjects',
        Timestamp: new Date('2025-03-11T03:05:37.301'),
        ResourceStatus: 'DELETE_COMPLETE',
        ResourceProperties:
          '{"ServiceToken":"arn:aws:lambda:us-west-2:123456789012:function:amplify-sampleprojectapp--CustomS3AutoDeleteObject-wJKnIElU6MiV","BucketName":"amplify-sampleprojectapp--modelintrospectionschema-q5iuovbg1sue"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'modelIntrospectionSchemaBucketAutoDeleteObjectsCustomResourceFE57309F',
        },
        constructPath:
          'data/modelIntrospectionSchemaBucket/AutoDeleteObjectsCustomResource/Default',
      },
      progress: {
        completed: 9,
        formatted: '  9',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0e1752a889-storage0EC3F24A-FW28UHWGJFK9 |   9 | 11:05:37 PM | DELETE_IN_PROGRESS | AWS::Lambda::Permission | storage/testName/Bucket/AllowBucketNotificationsToamplifysampleprojectappusersandbox0e1752a889functionsayhellolambda6952570F (testNameBucketAllowBucketNotificationsToamplifysampleprojectappusersandbox0e1752a889functionsayhellolambda6952570FF2CCBD02)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0e1752a889-storage0EC3F24A-FW28UHWGJFK9/b34eac10-fe24-11ef-884b-028f2e174171',
        EventId:
          'testNameBucketAllowBucketNotificationsToamplifysampleprojectappusersandbox0e1752a889functionsayhellolambda6952570FF2CCBD02-DELETE_IN_PROGRESS-2025-03-11T03:05:37.571Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0e1752a889-storage0EC3F24A-FW28UHWGJFK9',
        LogicalResourceId:
          'testNameBucketAllowBucketNotificationsToamplifysampleprojectappusersandbox0e1752a889functionsayhellolambda6952570FF2CCBD02',
        PhysicalResourceId:
          'amplify-sampleprojectapp-user-sandbox-0-testNameBucketAllowBucketNotificationsToamp-JvPJhaqqSIXQ',
        ResourceType: 'AWS::Lambda::Permission',
        Timestamp: new Date('2025-03-11T03:05:37.571'),
        ResourceStatus: 'DELETE_IN_PROGRESS',
        ResourceProperties:
          '{"FunctionName":"arn:aws:lambda:us-west-2:123456789012:function:amplify-sampleprojectapp-pr-sayhellolambdaEFA46D92-FKnDZgZ20NmE","Action":"lambda:InvokeFunction","SourceArn":"arn:aws:s3:::amplify-sampleprojectapp-pr-testnamebucketb4152ad5-shsu6q3elmwn","SourceAccount":"123456789012","Principal":"s3.amazonaws.com"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'testNameBucketAllowBucketNotificationsToamplifysampleprojectappusersandbox0e1752a889functionsayhellolambda6952570FF2CCBD02',
        },
        constructPath:
          'storage/testName/Bucket/AllowBucketNotificationsToamplifysampleprojectappusersandbox0e1752a889functionsayhellolambda6952570F',
      },
      progress: {
        completed: 9,
        formatted: '  9',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0e1752a889-storage0EC3F24A-FW28UHWGJFK9 |   9 | 11:05:37 PM | DELETE_IN_PROGRESS | AWS::Lambda::Function | storage/BucketNotificationsHandler050a0587b7544547bf325f094a3db834 (BucketNotificationsHandler050a0587b7544547bf325f094a3db8347ECC3691)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0e1752a889-storage0EC3F24A-FW28UHWGJFK9/b34eac10-fe24-11ef-884b-028f2e174171',
        EventId:
          'BucketNotificationsHandler050a0587b7544547bf325f094a3db8347ECC3691-DELETE_IN_PROGRESS-2025-03-11T03:05:37.597Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0e1752a889-storage0EC3F24A-FW28UHWGJFK9',
        LogicalResourceId:
          'BucketNotificationsHandler050a0587b7544547bf325f094a3db8347ECC3691',
        PhysicalResourceId:
          'amplify-sampleprojectapp--BucketNotificationsHandl-Hz8a1MzLPzO6',
        ResourceType: 'AWS::Lambda::Function',
        Timestamp: new Date('2025-03-11T03:05:37.597'),
        ResourceStatus: 'DELETE_IN_PROGRESS',
        ResourceProperties:
          '{"Role":"arn:aws:iam::123456789012:role/amplify-sampleprojectapp--BucketNotificationsHandle-MLaT6AFcXyTf","Runtime":"python3.11","Description":"AWS CloudFormation handler for \\"Custom::S3BucketNotifications\\" resources (@aws-cdk/aws-s3)","Timeout":"300","Handler":"index.handler","Code":{"ZipFile":"import boto3  # type: ignore\\nimport json\\nimport logging\\nimport urllib.request\\n\\ns3 = boto3.client(\\"s3\\")\\n\\nEVENTBRIDGE_CONFIGURATION = \'EventBridgeConfiguration\'\\nCONFIGURATION_TYPES = [\\"TopicConfigurations\\", \\"QueueConfigurations\\", \\"LambdaFunctionConfigurations\\"]\\n\\ndef handler(event: dict, context):\\n  response_status = \\"SUCCESS\\"\\n  error_message = \\"\\"\\n  try:\\n    props = event[\\"ResourceProperties\\"]\\n    notification_configuration = props[\\"NotificationConfiguration\\"]\\n    managed = props.get(\'Managed\', \'true\').lower() == \'true\'\\n    skipDestinationValidation = props.get(\'SkipDestinationValidation\', \'false\').lower() == \'true\'\\n    stack_id = event[\'StackId\']\\n    old = event.get(\\"OldResourceProperties\\", {}).get(\\"NotificationConfiguration\\", {})\\n    if managed:\\n      config = handle_managed(event[\\"RequestType\\"], notification_configuration)\\n    else:\\n      config = handle_unmanaged(props[\\"BucketName\\"], stack_id, event[\\"RequestType\\"], notification_configuration, old)\\n    s3.put_bucket_notification_configuration(Bucket=props[\\"BucketName\\"], NotificationConfiguration=config, SkipDestinationValidation=skipDestinationValidation)\\n  except Exception as e:\\n    logging.exception(\\"Failed to put bucket notification configuration\\")\\n    response_status = \\"FAILED\\"\\n    error_message = f\\"Error: {str(e)}. \\"\\n  finally:\\n    submit_response(event, context, response_status, error_message)\\n\\ndef handle_managed(request_type, notification_configuration):\\n  if request_type == \'Delete\':\\n    return {}\\n  return notification_configuration\\n\\ndef handle_unmanaged(bucket, stack_id, request_type, notification_configuration, old):\\n  def get_id(n):\\n    n[\'Id\'] = \'\'\\n    sorted_notifications = sort_filter_rules(n)\\n    strToHash=json.dumps(sorted_notifications, sort_keys=True).replace(\'\\"Name\\": \\"prefix\\"\', \'\\"Name\\": \\"Prefix\\"\').replace(\'\\"Name\\": \\"suffix\\"\', \'\\"Name\\": \\"Suffix\\"\')\\n    return f\\"{stack_id}-{hash(strToHash)}\\"\\n  def with_id(n):\\n    n[\'Id\'] = get_id(n)\\n    return n\\n\\n  external_notifications = {}\\n  existing_notifications = s3.get_bucket_notification_configuration(Bucket=bucket)\\n  for t in CONFIGURATION_TYPES:\\n    if request_type == \'Update\':\\n        old_incoming_ids = [get_id(n) for n in old.get(t, [])]\\n        external_notifications[t] = [n for n in existing_notifications.get(t, []) if not get_id(n) in old_incoming_ids]      \\n    elif request_type == \'Delete\':\\n        external_notifications[t] = [n for n in existing_notifications.get(t, []) if not n[\'Id\'].startswith(f\\"{stack_id}-\\")]\\n    elif request_type == \'Create\':\\n        external_notifications[t] = [n for n in existing_notifications.get(t, [])]\\n  if EVENTBRIDGE_CONFIGURATION in existing_notifications:\\n    external_notifications[EVENTBRIDGE_CONFIGURATION] = existing_notifications[EVENTBRIDGE_CONFIGURATION]\\n\\n  if request_type == \'Delete\':\\n    return external_notifications\\n\\n  notifications = {}\\n  for t in CONFIGURATION_TYPES:\\n    external = external_notifications.get(t, [])\\n    incoming = [with_id(n) for n in notification_configuration.get(t, [])]\\n    notifications[t] = external + incoming\\n\\n  if EVENTBRIDGE_CONFIGURATION in notification_configuration:\\n    notifications[EVENTBRIDGE_CONFIGURATION] = notification_configuration[EVENTBRIDGE_CONFIGURATION]\\n  elif EVENTBRIDGE_CONFIGURATION in external_notifications:\\n    notifications[EVENTBRIDGE_CONFIGURATION] = external_notifications[EVENTBRIDGE_CONFIGURATION]\\n\\n  return notifications\\n\\ndef submit_response(event: dict, context, response_status: str, error_message: str):\\n  response_body = json.dumps(\\n    {\\n      \\"Status\\": response_status,\\n      \\"Reason\\": f\\"{error_message}See the details in CloudWatch Log Stream: {context.log_stream_name}\\",\\n      \\"PhysicalResourceId\\": event.get(\\"PhysicalResourceId\\") or event[\\"LogicalResourceId\\"],\\n      \\"StackId\\": event[\\"StackId\\"],\\n      \\"RequestId\\": event[\\"RequestId\\"],\\n      \\"LogicalResourceId\\": event[\\"LogicalResourceId\\"],\\n      \\"NoEcho\\": False,\\n    }\\n  ).encode(\\"utf-8\\")\\n  headers = {\\"content-type\\": \\"\\", \\"content-length\\": str(len(response_body))}\\n  try:\\n    req = urllib.request.Request(url=event[\\"ResponseURL\\"], headers=headers, data=response_body, method=\\"PUT\\")\\n    with urllib.request.urlopen(req) as response:\\n      print(response.read().decode(\\"utf-8\\"))\\n    print(\\"Status code: \\" + response.reason)\\n  except Exception as e:\\n      print(\\"send(..) failed executing request.urlopen(..): \\" + str(e))\\n\\ndef sort_filter_rules(json_obj):\\n  if not isinstance(json_obj, dict):\\n      return json_obj\\n  for key, value in json_obj.items():\\n      if isinstance(value, dict):\\n          json_obj[key] = sort_filter_rules(value)\\n      elif isinstance(value, list):\\n          json_obj[key] = [sort_filter_rules(item) for item in value]\\n  if \\"Filter\\" in json_obj and \\"Key\\" in json_obj[\\"Filter\\"] and \\"FilterRules\\" in json_obj[\\"Filter\\"][\\"Key\\"]:\\n      filter_rules = json_obj[\\"Filter\\"][\\"Key\\"][\\"FilterRules\\"]\\n      sorted_filter_rules = sorted(filter_rules, key=lambda x: x[\\"Name\\"])\\n      json_obj[\\"Filter\\"][\\"Key\\"][\\"FilterRules\\"] = sorted_filter_rules\\n  return json_obj"},"Tags":[{"Value":"sandbox","Key":"amplify:deployment-type"},{"Value":"amplify","Key":"created-by"}]}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'BucketNotificationsHandler050a0587b7544547bf325f094a3db8347ECC3691',
        },
        constructPath:
          'storage/BucketNotificationsHandler050a0587b7544547bf325f094a3db834',
      },
      progress: {
        completed: 9,
        formatted: '  9',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C |   9 | 11:05:37 PM | DELETE_IN_PROGRESS | AWS::S3::BucketPolicy | data/modelIntrospectionSchemaBucket/Policy (modelIntrospectionSchemaBucketPolicy4DAB0D15)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C/b355b0f0-fe24-11ef-a0bd-020db6799971',
        EventId:
          'modelIntrospectionSchemaBucketPolicy4DAB0D15-DELETE_IN_PROGRESS-2025-03-11T03:05:37.714Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C',
        LogicalResourceId: 'modelIntrospectionSchemaBucketPolicy4DAB0D15',
        PhysicalResourceId:
          'amplify-sampleprojectapp--modelintrospectionschema-q5iuovbg1sue',
        ResourceType: 'AWS::S3::BucketPolicy',
        Timestamp: new Date('2025-03-11T03:05:37.714'),
        ResourceStatus: 'DELETE_IN_PROGRESS',
        ResourceProperties:
          '{"Bucket":"amplify-sampleprojectapp--modelintrospectionschema-q5iuovbg1sue","PolicyDocument":{"Version":"2012-10-17","Statement":[{"Condition":{"Bool":{"aws:SecureTransport":"false"}},"Action":"s3:*","Resource":["arn:aws:s3:::amplify-sampleprojectapp--modelintrospectionschema-q5iuovbg1sue","arn:aws:s3:::amplify-sampleprojectapp--modelintrospectionschema-q5iuovbg1sue/*"],"Effect":"Deny","Principal":{"AWS":"*"}},{"Action":["s3:PutBucketPolicy","s3:GetBucket*","s3:List*","s3:DeleteObject*"],"Resource":["arn:aws:s3:::amplify-sampleprojectapp--modelintrospectionschema-q5iuovbg1sue","arn:aws:s3:::amplify-sampleprojectapp--modelintrospectionschema-q5iuovbg1sue/*"],"Effect":"Allow","Principal":{"AWS":"arn:aws:iam::123456789012:role/amplify-sampleprojectapp--CustomS3AutoDeleteObjects-UEGEyfol9r26"}}]}}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'modelIntrospectionSchemaBucketPolicy4DAB0D15',
        },
        constructPath: 'data/modelIntrospectionSchemaBucket/Policy',
      },
      progress: {
        completed: 9,
        formatted: '  9',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataConnectionStackNestedStackConne-1RT45PFNMWNGH |   8 | 11:05:37 PM | DELETE_COMPLETE | AWS::CDK::Metadata | auth/CDKMetadata/Default (CDKMetadata)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataConnectionStackNestedStackConne-1RT45PFNMWNGH/026d3050-fe25-11ef-abb4-06dfee28c627',
        EventId: 'CDKMetadata-DELETE_COMPLETE-2025-03-11T03:05:37.816Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataConnectionStackNestedStackConne-1RT45PFNMWNGH',
        LogicalResourceId: 'CDKMetadata',
        PhysicalResourceId: '026d3050-fe25-11ef-abb4-06dfee28c627',
        ResourceType: 'AWS::CDK::Metadata',
        Timestamp: new Date('2025-03-11T03:05:37.816'),
        ResourceStatus: 'DELETE_COMPLETE',
        ResourceProperties:
          '{"Analytics":"v2:deflate64:H4sIAAAAAAAA/yXMPQ6DMAxA4bOwB5efhbUgdewAB0BuMChAHYQdUIW4e0U7fXrLyyAtMkgi3CW23RTP7gXHk0SpaxTtZHCX9pC8RRFSgfuFkRzKYCfSEoUMLot82MJR9fwIbNV5rjz3bggrXmGqnmsSP2+0nqf5PRrFwfFwGvYdwSi3LUsgLSCNRnEuXgOrexPUf796F96XpwAAAA=="}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'CDKMetadata',
        },
        constructPath: 'auth/CDKMetadata/Default',
      },
      progress: {
        completed: 8,
        formatted: '  8',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataConnectionStackNestedStackConne-1RT45PFNMWNGH |   9 | 11:05:38 PM | DELETE_COMPLETE | AWS::AppSync::Resolver | data/amplifyData/ConnectionStack/postAuthorResolver (PostauthorResolver)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataConnectionStackNestedStackConne-1RT45PFNMWNGH/026d3050-fe25-11ef-abb4-06dfee28c627',
        EventId: 'PostauthorResolver-DELETE_COMPLETE-2025-03-11T03:05:38.164Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataConnectionStackNestedStackConne-1RT45PFNMWNGH',
        LogicalResourceId: 'PostauthorResolver',
        PhysicalResourceId:
          'arn:aws:appsync:us-west-2:123456789012:apis/ezabg7fk2jecvodrblowtgbsme/types/Post/resolvers/author',
        ResourceType: 'AWS::AppSync::Resolver',
        Timestamp: new Date('2025-03-11T03:05:38.164'),
        ResourceStatus: 'DELETE_COMPLETE',
        ResourceProperties:
          '{"TypeName":"Post","PipelineConfig":{"Functions":["wy5mcasl35f5pkzbjq3hdb3pmq","gyrtjdvjabegrowdabgtrgrcgq"]},"RequestMappingTemplate":"$util.qr($ctx.stash.put(\\"typeName\\", \\"Post\\"))\\n$util.qr($ctx.stash.put(\\"fieldName\\", \\"author\\"))\\n$util.qr($ctx.stash.put(\\"conditions\\", []))\\n$util.qr($ctx.stash.put(\\"metadata\\", {}))\\n$util.qr($ctx.stash.metadata.put(\\"dataSourceType\\", \\"AMAZON_DYNAMODB\\"))\\n$util.qr($ctx.stash.metadata.put(\\"apiId\\", \\"ezabg7fk2jecvodrblowtgbsme\\"))\\n$util.qr($ctx.stash.put(\\"connectionAttributes\\", {}))\\n$util.qr($ctx.stash.put(\\"tableName\\", \\"Person-ezabg7fk2jecvodrblowtgbsme-NONE\\"))\\n$util.qr($ctx.stash.put(\\"authRole\\", \\"arn:aws:sts::123456789012:assumed-role/amplify-sampleprojectapp--amplifyAuthauthenticatedU-JksUKi7c8Bvh/CognitoIdentityCredentials\\"))\\n$util.qr($ctx.stash.put(\\"unauthRole\\", \\"arn:aws:sts::123456789012:assumed-role/amplify-sampleprojectapp--amplifyAuthunauthenticate-0ZSS9wsA6Aut/CognitoIdentityCredentials\\"))\\n$util.qr($ctx.stash.put(\\"identityPoolId\\", \\"us-west-2:e3abf6f7-1ae5-4254-829e-0d8c9dc05bff\\"))\\n$util.qr($ctx.stash.put(\\"adminRoles\\", []))\\n$util.toJson({})","ResponseMappingTemplate":"$util.toJson($ctx.prev.result)","Kind":"PIPELINE","ApiId":"ezabg7fk2jecvodrblowtgbsme","FieldName":"author"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'PostauthorResolver',
        },
        constructPath: 'data/amplifyData/ConnectionStack/postAuthorResolver',
      },
      progress: {
        completed: 9,
        formatted: '  9',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0e1752a889-storage0EC3F24A-FW28UHWGJFK9 |  10 | 11:05:38 PM | DELETE_COMPLETE | Custom::S3AutoDeleteObjects | storage/testName/Bucket/AutoDeleteObjectsCustomResource/Default (testNameBucketAutoDeleteObjectsCustomResource245F058C)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0e1752a889-storage0EC3F24A-FW28UHWGJFK9/b34eac10-fe24-11ef-884b-028f2e174171',
        EventId:
          'testNameBucketAutoDeleteObjectsCustomResource245F058C-DELETE_COMPLETE-2025-03-11T03:05:38.172Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0e1752a889-storage0EC3F24A-FW28UHWGJFK9',
        LogicalResourceId:
          'testNameBucketAutoDeleteObjectsCustomResource245F058C',
        PhysicalResourceId: 'd9917f5f-6c2b-4167-b37b-7f6d64f73461',
        ResourceType: 'Custom::S3AutoDeleteObjects',
        Timestamp: new Date('2025-03-11T03:05:38.172'),
        ResourceStatus: 'DELETE_COMPLETE',
        ResourceProperties:
          '{"ServiceToken":"arn:aws:lambda:us-west-2:123456789012:function:amplify-sampleprojectapp--CustomS3AutoDeleteObject-26NDTY8D5dwA","BucketName":"amplify-sampleprojectapp-pr-testnamebucketb4152ad5-shsu6q3elmwn"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'testNameBucketAutoDeleteObjectsCustomResource245F058C',
        },
        constructPath:
          'storage/testName/Bucket/AutoDeleteObjectsCustomResource/Default',
      },
      progress: {
        completed: 10,
        formatted: ' 10',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataConnectionStackNestedStackConne-1RT45PFNMWNGH |  11 | 11:05:38 PM | DELETE_COMPLETE | AWS::AppSync::Resolver | data/amplifyData/ConnectionStack/personAuthoredPostsResolver (PersonauthoredPostsResolver)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataConnectionStackNestedStackConne-1RT45PFNMWNGH/026d3050-fe25-11ef-abb4-06dfee28c627',
        EventId:
          'PersonauthoredPostsResolver-DELETE_COMPLETE-2025-03-11T03:05:38.177Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataConnectionStackNestedStackConne-1RT45PFNMWNGH',
        LogicalResourceId: 'PersonauthoredPostsResolver',
        PhysicalResourceId:
          'arn:aws:appsync:us-west-2:123456789012:apis/ezabg7fk2jecvodrblowtgbsme/types/Person/resolvers/authoredPosts',
        ResourceType: 'AWS::AppSync::Resolver',
        Timestamp: new Date('2025-03-11T03:05:38.177'),
        ResourceStatus: 'DELETE_COMPLETE',
        ResourceProperties:
          '{"TypeName":"Person","PipelineConfig":{"Functions":["c72wvd7a3ra3vihc4xq5yslugm","46nlz3vf35azdiuhizkj75us4i"]},"RequestMappingTemplate":"$util.qr($ctx.stash.put(\\"typeName\\", \\"Person\\"))\\n$util.qr($ctx.stash.put(\\"fieldName\\", \\"authoredPosts\\"))\\n$util.qr($ctx.stash.put(\\"conditions\\", []))\\n$util.qr($ctx.stash.put(\\"metadata\\", {}))\\n$util.qr($ctx.stash.metadata.put(\\"dataSourceType\\", \\"AMAZON_DYNAMODB\\"))\\n$util.qr($ctx.stash.metadata.put(\\"apiId\\", \\"ezabg7fk2jecvodrblowtgbsme\\"))\\n$util.qr($ctx.stash.put(\\"connectionAttributes\\", {}))\\n$util.qr($ctx.stash.put(\\"tableName\\", \\"Post-ezabg7fk2jecvodrblowtgbsme-NONE\\"))\\n$util.qr($ctx.stash.put(\\"authRole\\", \\"arn:aws:sts::123456789012:assumed-role/amplify-sampleprojectapp--amplifyAuthauthenticatedU-JksUKi7c8Bvh/CognitoIdentityCredentials\\"))\\n$util.qr($ctx.stash.put(\\"unauthRole\\", \\"arn:aws:sts::123456789012:assumed-role/amplify-sampleprojectapp--amplifyAuthunauthenticate-0ZSS9wsA6Aut/CognitoIdentityCredentials\\"))\\n$util.qr($ctx.stash.put(\\"identityPoolId\\", \\"us-west-2:e3abf6f7-1ae5-4254-829e-0d8c9dc05bff\\"))\\n$util.qr($ctx.stash.put(\\"adminRoles\\", []))\\n$util.toJson({})","ResponseMappingTemplate":"$util.toJson($ctx.prev.result)","Kind":"PIPELINE","ApiId":"ezabg7fk2jecvodrblowtgbsme","FieldName":"authoredPosts"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'PersonauthoredPostsResolver',
        },
        constructPath:
          'data/amplifyData/ConnectionStack/personAuthoredPostsResolver',
      },
      progress: {
        completed: 11,
        formatted: ' 11',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataConnectionStackNestedStackConne-1RT45PFNMWNGH |  11 | 11:05:38 PM | DELETE_IN_PROGRESS | AWS::AppSync::FunctionConfiguration | data/amplifyData/ConnectionStack/PersonAuthoredPostsDataResolverFn/PersonAuthoredPostsDataResolverFn.AppSyncFunction (PersonAuthoredPostsDataResolverFnPersonAuthoredPostsDataResolverFnAppSyncFunctionCC61F83F)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataConnectionStackNestedStackConne-1RT45PFNMWNGH/026d3050-fe25-11ef-abb4-06dfee28c627',
        EventId:
          'PersonAuthoredPostsDataResolverFnPersonAuthoredPostsDataResolverFnAppSyncFunctionCC61F83F-DELETE_IN_PROGRESS-2025-03-11T03:05:38.493Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataConnectionStackNestedStackConne-1RT45PFNMWNGH',
        LogicalResourceId:
          'PersonAuthoredPostsDataResolverFnPersonAuthoredPostsDataResolverFnAppSyncFunctionCC61F83F',
        PhysicalResourceId:
          'arn:aws:appsync:us-west-2:123456789012:apis/ezabg7fk2jecvodrblowtgbsme/functions/46nlz3vf35azdiuhizkj75us4i',
        ResourceType: 'AWS::AppSync::FunctionConfiguration',
        Timestamp: new Date('2025-03-11T03:05:38.493'),
        ResourceStatus: 'DELETE_IN_PROGRESS',
        ResourceProperties:
          '{"ResponseMappingTemplateS3Location":"s3://cdk-hnb659fds-assets-123456789012-us-west-2/49e7a1f2fb4c809b82bed6b0242a2a3bcfa2c5276ebd2539ff330fee36f8fe18.vtl","DataSourceName":"PostTable","FunctionVersion":"2018-05-29","RequestMappingTemplateS3Location":"s3://cdk-hnb659fds-assets-123456789012-us-west-2/db826cc870f25dcd05aff645c3b384ba3a97115acc5373e580c14379eb0430b3.vtl","ApiId":"ezabg7fk2jecvodrblowtgbsme","Name":"PersonAuthoredPostsDataResolverFn"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'PersonAuthoredPostsDataResolverFnPersonAuthoredPostsDataResolverFnAppSyncFunctionCC61F83F',
        },
        constructPath:
          'data/amplifyData/ConnectionStack/PersonAuthoredPostsDataResolverFn/PersonAuthoredPostsDataResolverFn.AppSyncFunction',
      },
      progress: {
        completed: 11,
        formatted: ' 11',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataConnectionStackNestedStackConne-1RT45PFNMWNGH |  11 | 11:05:38 PM | DELETE_IN_PROGRESS | AWS::AppSync::FunctionConfiguration | data/amplifyData/ConnectionStack/Postauthorauth0Function/Postauthorauth0Function.AppSyncFunction (Postauthorauth0FunctionPostauthorauth0FunctionAppSyncFunction453E4126)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataConnectionStackNestedStackConne-1RT45PFNMWNGH/026d3050-fe25-11ef-abb4-06dfee28c627',
        EventId:
          'Postauthorauth0FunctionPostauthorauth0FunctionAppSyncFunction453E4126-DELETE_IN_PROGRESS-2025-03-11T03:05:38.497Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataConnectionStackNestedStackConne-1RT45PFNMWNGH',
        LogicalResourceId:
          'Postauthorauth0FunctionPostauthorauth0FunctionAppSyncFunction453E4126',
        PhysicalResourceId:
          'arn:aws:appsync:us-west-2:123456789012:apis/ezabg7fk2jecvodrblowtgbsme/functions/wy5mcasl35f5pkzbjq3hdb3pmq',
        ResourceType: 'AWS::AppSync::FunctionConfiguration',
        Timestamp: new Date('2025-03-11T03:05:38.497'),
        ResourceStatus: 'DELETE_IN_PROGRESS',
        ResourceProperties:
          '{"DataSourceName":"NONE_DS","ResponseMappingTemplate":"$util.toJson({})","FunctionVersion":"2018-05-29","RequestMappingTemplateS3Location":"s3://cdk-hnb659fds-assets-123456789012-us-west-2/5b2dd26ac19f6a54684f2769d465463159cc27a441d7ac8b8efafdec1b2370fd.vtl","ApiId":"ezabg7fk2jecvodrblowtgbsme","Name":"Postauthorauth0Function"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'Postauthorauth0FunctionPostauthorauth0FunctionAppSyncFunction453E4126',
        },
        constructPath:
          'data/amplifyData/ConnectionStack/Postauthorauth0Function/Postauthorauth0Function.AppSyncFunction',
      },
      progress: {
        completed: 11,
        formatted: ' 11',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0e1752a889-storage0EC3F24A-FW28UHWGJFK9 |  12 | 11:05:38 PM | DELETE_COMPLETE | AWS::Lambda::Permission | storage/testName/Bucket/AllowBucketNotificationsToamplifysampleprojectappusersandbox0e1752a889functionsayhellolambda6952570F (testNameBucketAllowBucketNotificationsToamplifysampleprojectappusersandbox0e1752a889functionsayhellolambda6952570FF2CCBD02)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0e1752a889-storage0EC3F24A-FW28UHWGJFK9/b34eac10-fe24-11ef-884b-028f2e174171',
        EventId:
          'testNameBucketAllowBucketNotificationsToamplifysampleprojectappusersandbox0e1752a889functionsayhellolambda6952570FF2CCBD02-DELETE_COMPLETE-2025-03-11T03:05:38.505Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0e1752a889-storage0EC3F24A-FW28UHWGJFK9',
        LogicalResourceId:
          'testNameBucketAllowBucketNotificationsToamplifysampleprojectappusersandbox0e1752a889functionsayhellolambda6952570FF2CCBD02',
        PhysicalResourceId:
          'amplify-sampleprojectapp-user-sandbox-0-testNameBucketAllowBucketNotificationsToamp-JvPJhaqqSIXQ',
        ResourceType: 'AWS::Lambda::Permission',
        Timestamp: new Date('2025-03-11T03:05:38.505'),
        ResourceStatus: 'DELETE_COMPLETE',
        ResourceProperties:
          '{"FunctionName":"arn:aws:lambda:us-west-2:123456789012:function:amplify-sampleprojectapp-pr-sayhellolambdaEFA46D92-FKnDZgZ20NmE","Action":"lambda:InvokeFunction","SourceArn":"arn:aws:s3:::amplify-sampleprojectapp-pr-testnamebucketb4152ad5-shsu6q3elmwn","SourceAccount":"123456789012","Principal":"s3.amazonaws.com"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'testNameBucketAllowBucketNotificationsToamplifysampleprojectappusersandbox0e1752a889functionsayhellolambda6952570FF2CCBD02',
        },
        constructPath:
          'storage/testName/Bucket/AllowBucketNotificationsToamplifysampleprojectappusersandbox0e1752a889functionsayhellolambda6952570F',
      },
      progress: {
        completed: 12,
        formatted: ' 12',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataConnectionStackNestedStackConne-1RT45PFNMWNGH |  12 | 11:05:38 PM | DELETE_IN_PROGRESS | AWS::AppSync::FunctionConfiguration | data/amplifyData/ConnectionStack/PostAuthorDataResolverFn/PostAuthorDataResolverFn.AppSyncFunction (PostAuthorDataResolverFnPostAuthorDataResolverFnAppSyncFunction89F00125)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataConnectionStackNestedStackConne-1RT45PFNMWNGH/026d3050-fe25-11ef-abb4-06dfee28c627',
        EventId:
          'PostAuthorDataResolverFnPostAuthorDataResolverFnAppSyncFunction89F00125-DELETE_IN_PROGRESS-2025-03-11T03:05:38.531Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataConnectionStackNestedStackConne-1RT45PFNMWNGH',
        LogicalResourceId:
          'PostAuthorDataResolverFnPostAuthorDataResolverFnAppSyncFunction89F00125',
        PhysicalResourceId:
          'arn:aws:appsync:us-west-2:123456789012:apis/ezabg7fk2jecvodrblowtgbsme/functions/gyrtjdvjabegrowdabgtrgrcgq',
        ResourceType: 'AWS::AppSync::FunctionConfiguration',
        Timestamp: new Date('2025-03-11T03:05:38.531'),
        ResourceStatus: 'DELETE_IN_PROGRESS',
        ResourceProperties:
          '{"ResponseMappingTemplateS3Location":"s3://cdk-hnb659fds-assets-123456789012-us-west-2/dcb70e4856bc9a423e02b8b9e9c2ab3f71479784572d4c04a02d1f5b61a9f9ac.vtl","DataSourceName":"PersonTable","FunctionVersion":"2018-05-29","RequestMappingTemplateS3Location":"s3://cdk-hnb659fds-assets-123456789012-us-west-2/c3534669fc2486ce8786b1a3efd6c0848cd3c4835de33940c0f49c28c9d8abef.vtl","ApiId":"ezabg7fk2jecvodrblowtgbsme","Name":"PostAuthorDataResolverFn"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'PostAuthorDataResolverFnPostAuthorDataResolverFnAppSyncFunction89F00125',
        },
        constructPath:
          'data/amplifyData/ConnectionStack/PostAuthorDataResolverFn/PostAuthorDataResolverFn.AppSyncFunction',
      },
      progress: {
        completed: 12,
        formatted: ' 12',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0e1752a889-storage0EC3F24A-FW28UHWGJFK9 |  12 | 11:05:38 PM | DELETE_IN_PROGRESS | AWS::S3::BucketPolicy | storage/testName/Bucket/Policy (testNameBucketPolicyA5C458BB)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0e1752a889-storage0EC3F24A-FW28UHWGJFK9/b34eac10-fe24-11ef-884b-028f2e174171',
        EventId:
          'testNameBucketPolicyA5C458BB-DELETE_IN_PROGRESS-2025-03-11T03:05:38.534Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0e1752a889-storage0EC3F24A-FW28UHWGJFK9',
        LogicalResourceId: 'testNameBucketPolicyA5C458BB',
        PhysicalResourceId:
          'amplify-sampleprojectapp-pr-testnamebucketb4152ad5-shsu6q3elmwn',
        ResourceType: 'AWS::S3::BucketPolicy',
        Timestamp: new Date('2025-03-11T03:05:38.534'),
        ResourceStatus: 'DELETE_IN_PROGRESS',
        ResourceProperties:
          '{"Bucket":"amplify-sampleprojectapp-pr-testnamebucketb4152ad5-shsu6q3elmwn","PolicyDocument":{"Version":"2012-10-17","Statement":[{"Condition":{"Bool":{"aws:SecureTransport":"false"}},"Action":"s3:*","Resource":["arn:aws:s3:::amplify-sampleprojectapp-pr-testnamebucketb4152ad5-shsu6q3elmwn","arn:aws:s3:::amplify-sampleprojectapp-pr-testnamebucketb4152ad5-shsu6q3elmwn/*"],"Effect":"Deny","Principal":{"AWS":"*"}},{"Action":["s3:PutBucketPolicy","s3:GetBucket*","s3:List*","s3:DeleteObject*"],"Resource":["arn:aws:s3:::amplify-sampleprojectapp-pr-testnamebucketb4152ad5-shsu6q3elmwn","arn:aws:s3:::amplify-sampleprojectapp-pr-testnamebucketb4152ad5-shsu6q3elmwn/*"],"Effect":"Allow","Principal":{"AWS":"arn:aws:iam::123456789012:role/amplify-sampleprojectapp--CustomS3AutoDeleteObjects-C3hMUnpj2GY1"}}]}}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'testNameBucketPolicyA5C458BB',
        },
        constructPath: 'storage/testName/Bucket/Policy',
      },
      progress: {
        completed: 12,
        formatted: ' 12',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0e1752a889-storage0EC3F24A-FW28UHWGJFK9 |  12 | 11:05:38 PM | DELETE_IN_PROGRESS | AWS::Lambda::Function | data/Custom::S3AutoDeleteObjectsCustomResourceProvider/Handler (CustomS3AutoDeleteObjectsCustomResourceProviderHandler9D90184F)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0e1752a889-storage0EC3F24A-FW28UHWGJFK9/b34eac10-fe24-11ef-884b-028f2e174171',
        EventId:
          'CustomS3AutoDeleteObjectsCustomResourceProviderHandler9D90184F-DELETE_IN_PROGRESS-2025-03-11T03:05:38.538Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0e1752a889-storage0EC3F24A-FW28UHWGJFK9',
        LogicalResourceId:
          'CustomS3AutoDeleteObjectsCustomResourceProviderHandler9D90184F',
        PhysicalResourceId:
          'amplify-sampleprojectapp--CustomS3AutoDeleteObject-26NDTY8D5dwA',
        ResourceType: 'AWS::Lambda::Function',
        Timestamp: new Date('2025-03-11T03:05:38.538'),
        ResourceStatus: 'DELETE_IN_PROGRESS',
        ResourceProperties:
          '{"Role":"arn:aws:iam::123456789012:role/amplify-sampleprojectapp--CustomS3AutoDeleteObjects-C3hMUnpj2GY1","MemorySize":"128","Runtime":"nodejs20.x","Description":"Lambda function for auto-deleting objects in amplify-sampleprojectapp-pr-testnamebucketb4152ad5-shsu6q3elmwn S3 bucket.","Timeout":"900","Handler":"index.handler","Code":{"S3Bucket":"cdk-hnb659fds-assets-123456789012-us-west-2","S3Key":"faa95a81ae7d7373f3e1f242268f904eb748d8d0fdd306e8a6fe515a1905a7d6.zip"}}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'CustomS3AutoDeleteObjectsCustomResourceProviderHandler9D90184F',
        },
        constructPath:
          'data/Custom::S3AutoDeleteObjectsCustomResourceProvider/Handler',
      },
      progress: {
        completed: 12,
        formatted: ' 12',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataConnectionStackNestedStackConne-1RT45PFNMWNGH |  12 | 11:05:38 PM | DELETE_IN_PROGRESS | AWS::AppSync::FunctionConfiguration | data/amplifyData/ConnectionStack/PersonauthoredPostsauth0Function/PersonauthoredPostsauth0Function.AppSyncFunction (PersonauthoredPostsauth0FunctionPersonauthoredPostsauth0FunctionAppSyncFunctionC5A66FBD)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataConnectionStackNestedStackConne-1RT45PFNMWNGH/026d3050-fe25-11ef-abb4-06dfee28c627',
        EventId:
          'PersonauthoredPostsauth0FunctionPersonauthoredPostsauth0FunctionAppSyncFunctionC5A66FBD-DELETE_IN_PROGRESS-2025-03-11T03:05:38.545Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataConnectionStackNestedStackConne-1RT45PFNMWNGH',
        LogicalResourceId:
          'PersonauthoredPostsauth0FunctionPersonauthoredPostsauth0FunctionAppSyncFunctionC5A66FBD',
        PhysicalResourceId:
          'arn:aws:appsync:us-west-2:123456789012:apis/ezabg7fk2jecvodrblowtgbsme/functions/c72wvd7a3ra3vihc4xq5yslugm',
        ResourceType: 'AWS::AppSync::FunctionConfiguration',
        Timestamp: new Date('2025-03-11T03:05:38.545'),
        ResourceStatus: 'DELETE_IN_PROGRESS',
        ResourceProperties:
          '{"DataSourceName":"NONE_DS","ResponseMappingTemplate":"$util.toJson({})","FunctionVersion":"2018-05-29","RequestMappingTemplateS3Location":"s3://cdk-hnb659fds-assets-123456789012-us-west-2/5b2dd26ac19f6a54684f2769d465463159cc27a441d7ac8b8efafdec1b2370fd.vtl","ApiId":"ezabg7fk2jecvodrblowtgbsme","Name":"PersonauthoredPostsauth0Function"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'PersonauthoredPostsauth0FunctionPersonauthoredPostsauth0FunctionAppSyncFunctionC5A66FBD',
        },
        constructPath:
          'data/amplifyData/ConnectionStack/PersonauthoredPostsauth0Function/PersonauthoredPostsauth0Function.AppSyncFunction',
      },
      progress: {
        completed: 12,
        formatted: ' 12',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C |  13 | 11:05:38 PM | DELETE_COMPLETE | Custom::S3AutoDeleteObjects | data/amplifyData/AmplifyCodegenAssets/AmplifyCodegenAssetsBucket/AutoDeleteObjectsCustomResource/Default (amplifyDataAmplifyCodegenAssetsAmplifyCodegenAssetsBucketAutoDeleteObjectsCustomResource437F26F5)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C/b355b0f0-fe24-11ef-a0bd-020db6799971',
        EventId:
          'amplifyDataAmplifyCodegenAssetsAmplifyCodegenAssetsBucketAutoDeleteObjectsCustomResource437F26F5-DELETE_COMPLETE-2025-03-11T03:05:38.736Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C',
        LogicalResourceId:
          'amplifyDataAmplifyCodegenAssetsAmplifyCodegenAssetsBucketAutoDeleteObjectsCustomResource437F26F5',
        PhysicalResourceId: '6a4ce3c9-cb82-4870-a550-6689abdfb0fa',
        ResourceType: 'Custom::S3AutoDeleteObjects',
        Timestamp: new Date('2025-03-11T03:05:38.736'),
        ResourceStatus: 'DELETE_COMPLETE',
        ResourceProperties:
          '{"ServiceToken":"arn:aws:lambda:us-west-2:123456789012:function:amplify-sampleprojectapp--CustomS3AutoDeleteObject-wJKnIElU6MiV","BucketName":"amplify-sampleprojectapp--amplifydataamplifycodege-ndv73vbejv8r"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'amplifyDataAmplifyCodegenAssetsAmplifyCodegenAssetsBucketAutoDeleteObjectsCustomResource437F26F5',
        },
        constructPath:
          'data/amplifyData/AmplifyCodegenAssets/AmplifyCodegenAssetsBucket/AutoDeleteObjectsCustomResource/Default',
      },
      progress: {
        completed: 13,
        formatted: ' 13',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C |  14 | 11:05:38 PM | DELETE_COMPLETE | AWS::S3::BucketPolicy | data/modelIntrospectionSchemaBucket/Policy (modelIntrospectionSchemaBucketPolicy4DAB0D15)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C/b355b0f0-fe24-11ef-a0bd-020db6799971',
        EventId:
          'modelIntrospectionSchemaBucketPolicy4DAB0D15-DELETE_COMPLETE-2025-03-11T03:05:38.873Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C',
        LogicalResourceId: 'modelIntrospectionSchemaBucketPolicy4DAB0D15',
        PhysicalResourceId:
          'amplify-sampleprojectapp--modelintrospectionschema-q5iuovbg1sue',
        ResourceType: 'AWS::S3::BucketPolicy',
        Timestamp: new Date('2025-03-11T03:05:38.873'),
        ResourceStatus: 'DELETE_COMPLETE',
        ResourceProperties:
          '{"Bucket":"amplify-sampleprojectapp--modelintrospectionschema-q5iuovbg1sue","PolicyDocument":{"Version":"2012-10-17","Statement":[{"Condition":{"Bool":{"aws:SecureTransport":"false"}},"Action":"s3:*","Resource":["arn:aws:s3:::amplify-sampleprojectapp--modelintrospectionschema-q5iuovbg1sue","arn:aws:s3:::amplify-sampleprojectapp--modelintrospectionschema-q5iuovbg1sue/*"],"Effect":"Deny","Principal":{"AWS":"*"}},{"Action":["s3:PutBucketPolicy","s3:GetBucket*","s3:List*","s3:DeleteObject*"],"Resource":["arn:aws:s3:::amplify-sampleprojectapp--modelintrospectionschema-q5iuovbg1sue","arn:aws:s3:::amplify-sampleprojectapp--modelintrospectionschema-q5iuovbg1sue/*"],"Effect":"Allow","Principal":{"AWS":"arn:aws:iam::123456789012:role/amplify-sampleprojectapp--CustomS3AutoDeleteObjects-UEGEyfol9r26"}}]}}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'modelIntrospectionSchemaBucketPolicy4DAB0D15',
        },
        constructPath: 'data/modelIntrospectionSchemaBucket/Policy',
      },
      progress: {
        completed: 14,
        formatted: ' 14',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C |  14 | 11:05:39 PM | DELETE_IN_PROGRESS | AWS::S3::BucketPolicy | data/amplifyData/AmplifyCodegenAssets/AmplifyCodegenAssetsBucket/Policy (amplifyDataAmplifyCodegenAssetsAmplifyCodegenAssetsBucketPolicyF1C1C548)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C/b355b0f0-fe24-11ef-a0bd-020db6799971',
        EventId:
          'amplifyDataAmplifyCodegenAssetsAmplifyCodegenAssetsBucketPolicyF1C1C548-DELETE_IN_PROGRESS-2025-03-11T03:05:39.156Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C',
        LogicalResourceId:
          'amplifyDataAmplifyCodegenAssetsAmplifyCodegenAssetsBucketPolicyF1C1C548',
        PhysicalResourceId:
          'amplify-sampleprojectapp--amplifydataamplifycodege-ndv73vbejv8r',
        ResourceType: 'AWS::S3::BucketPolicy',
        Timestamp: new Date('2025-03-11T03:05:39.156'),
        ResourceStatus: 'DELETE_IN_PROGRESS',
        ResourceProperties:
          '{"Bucket":"amplify-sampleprojectapp--amplifydataamplifycodege-ndv73vbejv8r","PolicyDocument":{"Version":"2012-10-17","Statement":[{"Action":["s3:PutBucketPolicy","s3:GetBucket*","s3:List*","s3:DeleteObject*"],"Resource":["arn:aws:s3:::amplify-sampleprojectapp--amplifydataamplifycodege-ndv73vbejv8r","arn:aws:s3:::amplify-sampleprojectapp--amplifydataamplifycodege-ndv73vbejv8r/*"],"Effect":"Allow","Principal":{"AWS":"arn:aws:iam::123456789012:role/amplify-sampleprojectapp--CustomS3AutoDeleteObjects-UEGEyfol9r26"}}]}}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'amplifyDataAmplifyCodegenAssetsAmplifyCodegenAssetsBucketPolicyF1C1C548',
        },
        constructPath:
          'data/amplifyData/AmplifyCodegenAssets/AmplifyCodegenAssetsBucket/Policy',
      },
      progress: {
        completed: 14,
        formatted: ' 14',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C |  14 | 11:05:39 PM | DELETE_IN_PROGRESS | AWS::Lambda::Function | data/Custom::S3AutoDeleteObjectsCustomResourceProvider/Handler (CustomS3AutoDeleteObjectsCustomResourceProviderHandler9D90184F)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C/b355b0f0-fe24-11ef-a0bd-020db6799971',
        EventId:
          'CustomS3AutoDeleteObjectsCustomResourceProviderHandler9D90184F-DELETE_IN_PROGRESS-2025-03-11T03:05:39.156Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C',
        LogicalResourceId:
          'CustomS3AutoDeleteObjectsCustomResourceProviderHandler9D90184F',
        PhysicalResourceId:
          'amplify-sampleprojectapp--CustomS3AutoDeleteObject-wJKnIElU6MiV',
        ResourceType: 'AWS::Lambda::Function',
        Timestamp: new Date('2025-03-11T03:05:39.156'),
        ResourceStatus: 'DELETE_IN_PROGRESS',
        ResourceProperties:
          '{"Role":"arn:aws:iam::123456789012:role/amplify-sampleprojectapp--CustomS3AutoDeleteObjects-UEGEyfol9r26","MemorySize":"128","Runtime":"nodejs20.x","Description":"Lambda function for auto-deleting objects in amplify-sampleprojectapp--amplifydataamplifycodege-ndv73vbejv8r S3 bucket.","Timeout":"900","Handler":"index.handler","Code":{"S3Bucket":"cdk-hnb659fds-assets-123456789012-us-west-2","S3Key":"faa95a81ae7d7373f3e1f242268f904eb748d8d0fdd306e8a6fe515a1905a7d6.zip"}}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'CustomS3AutoDeleteObjectsCustomResourceProviderHandler9D90184F',
        },
        constructPath:
          'data/Custom::S3AutoDeleteObjectsCustomResourceProvider/Handler',
      },
      progress: {
        completed: 14,
        formatted: ' 14',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataConnectionStackNestedStackConne-1RT45PFNMWNGH |  15 | 11:05:39 PM | DELETE_COMPLETE | AWS::AppSync::FunctionConfiguration | data/amplifyData/ConnectionStack/PersonAuthoredPostsDataResolverFn/PersonAuthoredPostsDataResolverFn.AppSyncFunction (PersonAuthoredPostsDataResolverFnPersonAuthoredPostsDataResolverFnAppSyncFunctionCC61F83F)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataConnectionStackNestedStackConne-1RT45PFNMWNGH/026d3050-fe25-11ef-abb4-06dfee28c627',
        EventId:
          'PersonAuthoredPostsDataResolverFnPersonAuthoredPostsDataResolverFnAppSyncFunctionCC61F83F-DELETE_COMPLETE-2025-03-11T03:05:39.635Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataConnectionStackNestedStackConne-1RT45PFNMWNGH',
        LogicalResourceId:
          'PersonAuthoredPostsDataResolverFnPersonAuthoredPostsDataResolverFnAppSyncFunctionCC61F83F',
        PhysicalResourceId:
          'arn:aws:appsync:us-west-2:123456789012:apis/ezabg7fk2jecvodrblowtgbsme/functions/46nlz3vf35azdiuhizkj75us4i',
        ResourceType: 'AWS::AppSync::FunctionConfiguration',
        Timestamp: new Date('2025-03-11T03:05:39.635'),
        ResourceStatus: 'DELETE_COMPLETE',
        ResourceProperties:
          '{"ResponseMappingTemplateS3Location":"s3://cdk-hnb659fds-assets-123456789012-us-west-2/49e7a1f2fb4c809b82bed6b0242a2a3bcfa2c5276ebd2539ff330fee36f8fe18.vtl","DataSourceName":"PostTable","FunctionVersion":"2018-05-29","RequestMappingTemplateS3Location":"s3://cdk-hnb659fds-assets-123456789012-us-west-2/db826cc870f25dcd05aff645c3b384ba3a97115acc5373e580c14379eb0430b3.vtl","ApiId":"ezabg7fk2jecvodrblowtgbsme","Name":"PersonAuthoredPostsDataResolverFn"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'PersonAuthoredPostsDataResolverFnPersonAuthoredPostsDataResolverFnAppSyncFunctionCC61F83F',
        },
        constructPath:
          'data/amplifyData/ConnectionStack/PersonAuthoredPostsDataResolverFn/PersonAuthoredPostsDataResolverFn.AppSyncFunction',
      },
      progress: {
        completed: 15,
        formatted: ' 15',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataConnectionStackNestedStackConne-1RT45PFNMWNGH |  16 | 11:05:39 PM | DELETE_COMPLETE | AWS::AppSync::FunctionConfiguration | data/amplifyData/ConnectionStack/Postauthorauth0Function/Postauthorauth0Function.AppSyncFunction (Postauthorauth0FunctionPostauthorauth0FunctionAppSyncFunction453E4126)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataConnectionStackNestedStackConne-1RT45PFNMWNGH/026d3050-fe25-11ef-abb4-06dfee28c627',
        EventId:
          'Postauthorauth0FunctionPostauthorauth0FunctionAppSyncFunction453E4126-DELETE_COMPLETE-2025-03-11T03:05:39.668Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataConnectionStackNestedStackConne-1RT45PFNMWNGH',
        LogicalResourceId:
          'Postauthorauth0FunctionPostauthorauth0FunctionAppSyncFunction453E4126',
        PhysicalResourceId:
          'arn:aws:appsync:us-west-2:123456789012:apis/ezabg7fk2jecvodrblowtgbsme/functions/wy5mcasl35f5pkzbjq3hdb3pmq',
        ResourceType: 'AWS::AppSync::FunctionConfiguration',
        Timestamp: new Date('2025-03-11T03:05:39.668'),
        ResourceStatus: 'DELETE_COMPLETE',
        ResourceProperties:
          '{"DataSourceName":"NONE_DS","ResponseMappingTemplate":"$util.toJson({})","FunctionVersion":"2018-05-29","RequestMappingTemplateS3Location":"s3://cdk-hnb659fds-assets-123456789012-us-west-2/5b2dd26ac19f6a54684f2769d465463159cc27a441d7ac8b8efafdec1b2370fd.vtl","ApiId":"ezabg7fk2jecvodrblowtgbsme","Name":"Postauthorauth0Function"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'Postauthorauth0FunctionPostauthorauth0FunctionAppSyncFunction453E4126',
        },
        constructPath:
          'data/amplifyData/ConnectionStack/Postauthorauth0Function/Postauthorauth0Function.AppSyncFunction',
      },
      progress: {
        completed: 16,
        formatted: ' 16',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0e1752a889-storage0EC3F24A-FW28UHWGJFK9 |  17 | 11:05:39 PM | DELETE_COMPLETE | AWS::S3::BucketPolicy | storage/testName/Bucket/Policy (testNameBucketPolicyA5C458BB)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0e1752a889-storage0EC3F24A-FW28UHWGJFK9/b34eac10-fe24-11ef-884b-028f2e174171',
        EventId:
          'testNameBucketPolicyA5C458BB-DELETE_COMPLETE-2025-03-11T03:05:39.696Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0e1752a889-storage0EC3F24A-FW28UHWGJFK9',
        LogicalResourceId: 'testNameBucketPolicyA5C458BB',
        PhysicalResourceId:
          'amplify-sampleprojectapp-pr-testnamebucketb4152ad5-shsu6q3elmwn',
        ResourceType: 'AWS::S3::BucketPolicy',
        Timestamp: new Date('2025-03-11T03:05:39.696'),
        ResourceStatus: 'DELETE_COMPLETE',
        ResourceProperties:
          '{"Bucket":"amplify-sampleprojectapp-pr-testnamebucketb4152ad5-shsu6q3elmwn","PolicyDocument":{"Version":"2012-10-17","Statement":[{"Condition":{"Bool":{"aws:SecureTransport":"false"}},"Action":"s3:*","Resource":["arn:aws:s3:::amplify-sampleprojectapp-pr-testnamebucketb4152ad5-shsu6q3elmwn","arn:aws:s3:::amplify-sampleprojectapp-pr-testnamebucketb4152ad5-shsu6q3elmwn/*"],"Effect":"Deny","Principal":{"AWS":"*"}},{"Action":["s3:PutBucketPolicy","s3:GetBucket*","s3:List*","s3:DeleteObject*"],"Resource":["arn:aws:s3:::amplify-sampleprojectapp-pr-testnamebucketb4152ad5-shsu6q3elmwn","arn:aws:s3:::amplify-sampleprojectapp-pr-testnamebucketb4152ad5-shsu6q3elmwn/*"],"Effect":"Allow","Principal":{"AWS":"arn:aws:iam::123456789012:role/amplify-sampleprojectapp--CustomS3AutoDeleteObjects-C3hMUnpj2GY1"}}]}}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'testNameBucketPolicyA5C458BB',
        },
        constructPath: 'storage/testName/Bucket/Policy',
      },
      progress: {
        completed: 17,
        formatted: ' 17',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataConnectionStackNestedStackConne-1RT45PFNMWNGH |  18 | 11:05:39 PM | DELETE_COMPLETE | AWS::AppSync::FunctionConfiguration | data/amplifyData/ConnectionStack/PersonauthoredPostsauth0Function/PersonauthoredPostsauth0Function.AppSyncFunction (PersonauthoredPostsauth0FunctionPersonauthoredPostsauth0FunctionAppSyncFunctionC5A66FBD)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataConnectionStackNestedStackConne-1RT45PFNMWNGH/026d3050-fe25-11ef-abb4-06dfee28c627',
        EventId:
          'PersonauthoredPostsauth0FunctionPersonauthoredPostsauth0FunctionAppSyncFunctionC5A66FBD-DELETE_COMPLETE-2025-03-11T03:05:39.760Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataConnectionStackNestedStackConne-1RT45PFNMWNGH',
        LogicalResourceId:
          'PersonauthoredPostsauth0FunctionPersonauthoredPostsauth0FunctionAppSyncFunctionC5A66FBD',
        PhysicalResourceId:
          'arn:aws:appsync:us-west-2:123456789012:apis/ezabg7fk2jecvodrblowtgbsme/functions/c72wvd7a3ra3vihc4xq5yslugm',
        ResourceType: 'AWS::AppSync::FunctionConfiguration',
        Timestamp: new Date('2025-03-11T03:05:39.760'),
        ResourceStatus: 'DELETE_COMPLETE',
        ResourceProperties:
          '{"DataSourceName":"NONE_DS","ResponseMappingTemplate":"$util.toJson({})","FunctionVersion":"2018-05-29","RequestMappingTemplateS3Location":"s3://cdk-hnb659fds-assets-123456789012-us-west-2/5b2dd26ac19f6a54684f2769d465463159cc27a441d7ac8b8efafdec1b2370fd.vtl","ApiId":"ezabg7fk2jecvodrblowtgbsme","Name":"PersonauthoredPostsauth0Function"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'PersonauthoredPostsauth0FunctionPersonauthoredPostsauth0FunctionAppSyncFunctionC5A66FBD',
        },
        constructPath:
          'data/amplifyData/ConnectionStack/PersonauthoredPostsauth0Function/PersonauthoredPostsauth0Function.AppSyncFunction',
      },
      progress: {
        completed: 18,
        formatted: ' 18',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataConnectionStackNestedStackConne-1RT45PFNMWNGH |  19 | 11:05:39 PM | DELETE_COMPLETE | AWS::AppSync::FunctionConfiguration | data/amplifyData/ConnectionStack/PostAuthorDataResolverFn/PostAuthorDataResolverFn.AppSyncFunction (PostAuthorDataResolverFnPostAuthorDataResolverFnAppSyncFunction89F00125)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataConnectionStackNestedStackConne-1RT45PFNMWNGH/026d3050-fe25-11ef-abb4-06dfee28c627',
        EventId:
          'PostAuthorDataResolverFnPostAuthorDataResolverFnAppSyncFunction89F00125-DELETE_COMPLETE-2025-03-11T03:05:39.853Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataConnectionStackNestedStackConne-1RT45PFNMWNGH',
        LogicalResourceId:
          'PostAuthorDataResolverFnPostAuthorDataResolverFnAppSyncFunction89F00125',
        PhysicalResourceId:
          'arn:aws:appsync:us-west-2:123456789012:apis/ezabg7fk2jecvodrblowtgbsme/functions/gyrtjdvjabegrowdabgtrgrcgq',
        ResourceType: 'AWS::AppSync::FunctionConfiguration',
        Timestamp: new Date('2025-03-11T03:05:39.853'),
        ResourceStatus: 'DELETE_COMPLETE',
        ResourceProperties:
          '{"ResponseMappingTemplateS3Location":"s3://cdk-hnb659fds-assets-123456789012-us-west-2/dcb70e4856bc9a423e02b8b9e9c2ab3f71479784572d4c04a02d1f5b61a9f9ac.vtl","DataSourceName":"PersonTable","FunctionVersion":"2018-05-29","RequestMappingTemplateS3Location":"s3://cdk-hnb659fds-assets-123456789012-us-west-2/c3534669fc2486ce8786b1a3efd6c0848cd3c4835de33940c0f49c28c9d8abef.vtl","ApiId":"ezabg7fk2jecvodrblowtgbsme","Name":"PostAuthorDataResolverFn"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'PostAuthorDataResolverFnPostAuthorDataResolverFnAppSyncFunction89F00125',
        },
        constructPath:
          'data/amplifyData/ConnectionStack/PostAuthorDataResolverFn/PostAuthorDataResolverFn.AppSyncFunction',
      },
      progress: {
        completed: 19,
        formatted: ' 19',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataConnectionStackNestedStackConne-1RT45PFNMWNGH |  20 | 11:05:40 PM | DELETE_COMPLETE | AWS::CloudFormation::Stack | amplify-sampleprojectapp-user-sandbox-0-amplifyDataConnectionStackNestedStackConne-1RT45PFNMWNGH',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataConnectionStackNestedStackConne-1RT45PFNMWNGH/026d3050-fe25-11ef-abb4-06dfee28c627',
        EventId: 'b68e2a30-fe25-11ef-b609-0ada58aa3cc5',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataConnectionStackNestedStackConne-1RT45PFNMWNGH',
        LogicalResourceId:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataConnectionStackNestedStackConne-1RT45PFNMWNGH',
        PhysicalResourceId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataConnectionStackNestedStackConne-1RT45PFNMWNGH/026d3050-fe25-11ef-abb4-06dfee28c627',
        ResourceType: 'AWS::CloudFormation::Stack',
        Timestamp: new Date('2025-03-11T03:05:40.154'),
        ResourceStatus: 'DELETE_COMPLETE',
      },
      progress: {
        completed: 20,
        formatted: ' 20',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C |  21 | 11:05:40 PM | DELETE_COMPLETE | AWS::S3::BucketPolicy | data/amplifyData/AmplifyCodegenAssets/AmplifyCodegenAssetsBucket/Policy (amplifyDataAmplifyCodegenAssetsAmplifyCodegenAssetsBucketPolicyF1C1C548)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C/b355b0f0-fe24-11ef-a0bd-020db6799971',
        EventId:
          'amplifyDataAmplifyCodegenAssetsAmplifyCodegenAssetsBucketPolicyF1C1C548-DELETE_COMPLETE-2025-03-11T03:05:40.220Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C',
        LogicalResourceId:
          'amplifyDataAmplifyCodegenAssetsAmplifyCodegenAssetsBucketPolicyF1C1C548',
        PhysicalResourceId:
          'amplify-sampleprojectapp--amplifydataamplifycodege-ndv73vbejv8r',
        ResourceType: 'AWS::S3::BucketPolicy',
        Timestamp: new Date('2025-03-11T03:05:40.220'),
        ResourceStatus: 'DELETE_COMPLETE',
        ResourceProperties:
          '{"Bucket":"amplify-sampleprojectapp--amplifydataamplifycodege-ndv73vbejv8r","PolicyDocument":{"Version":"2012-10-17","Statement":[{"Action":["s3:PutBucketPolicy","s3:GetBucket*","s3:List*","s3:DeleteObject*"],"Resource":["arn:aws:s3:::amplify-sampleprojectapp--amplifydataamplifycodege-ndv73vbejv8r","arn:aws:s3:::amplify-sampleprojectapp--amplifydataamplifycodege-ndv73vbejv8r/*"],"Effect":"Allow","Principal":{"AWS":"arn:aws:iam::123456789012:role/amplify-sampleprojectapp--CustomS3AutoDeleteObjects-UEGEyfol9r26"}}]}}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'amplifyDataAmplifyCodegenAssetsAmplifyCodegenAssetsBucketPolicyF1C1C548',
        },
        constructPath:
          'data/amplifyData/AmplifyCodegenAssets/AmplifyCodegenAssetsBucket/Policy',
      },
      progress: {
        completed: 21,
        formatted: ' 21',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C |  22 | 11:05:40 PM | DELETE_COMPLETE | AWS::Lambda::Function | data/Custom::CDKBucketDeployment8693BB64968944B69AAFB0CC9EB8756C1536MiB (CustomCDKBucketDeployment8693BB64968944B69AAFB0CC9EB8756C1536MiBC5D8AB21)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C/b355b0f0-fe24-11ef-a0bd-020db6799971',
        EventId:
          'CustomCDKBucketDeployment8693BB64968944B69AAFB0CC9EB8756C1536MiBC5D8AB21-DELETE_COMPLETE-2025-03-11T03:05:40.606Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C',
        LogicalResourceId:
          'CustomCDKBucketDeployment8693BB64968944B69AAFB0CC9EB8756C1536MiBC5D8AB21',
        PhysicalResourceId:
          'amplify-sampleprojectapp--CustomCDKBucketDeploymen-hPaUgEqbbzHw',
        ResourceType: 'AWS::Lambda::Function',
        Timestamp: new Date('2025-03-11T03:05:40.606'),
        ResourceStatus: 'DELETE_COMPLETE',
        ResourceProperties:
          '{"Role":"arn:aws:iam::123456789012:role/amplify-sampleprojectapp--CustomCDKBucketDeployment-u7Dt1VwbCyC1","MemorySize":"1536","Runtime":"python3.11","Timeout":"900","Environment":{"Variables":{"AWS_CA_BUNDLE":"/etc/pki/ca-trust/extracted/pem/tls-ca-bundle.pem"}},"Handler":"index.handler","Code":{"S3Bucket":"cdk-hnb659fds-assets-123456789012-us-west-2","S3Key":"c6358465bf49dfae556bb430bf9c81fa578c221b82c308e3707901b1dd654762.zip"},"Layers":["arn:aws:lambda:us-west-2:123456789012:layer:amplifyDataAmplifyCodegenAssetsAmplifyCodegenAssetsDeploymentAwsCliLayerE322F905:245"],"Tags":[{"Value":"sandbox","Key":"amplify:deployment-type"},{"Value":"amplify","Key":"created-by"}]}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'CustomCDKBucketDeployment8693BB64968944B69AAFB0CC9EB8756C1536MiBC5D8AB21',
        },
        constructPath:
          'data/Custom::CDKBucketDeployment8693BB64968944B69AAFB0CC9EB8756C1536MiB',
      },
      progress: {
        completed: 22,
        formatted: ' 22',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C |  22 | 11:05:41 PM | DELETE_IN_PROGRESS | AWS::Lambda::LayerVersion | data/amplifyData/AmplifyCodegenAssets/AmplifyCodegenAssetsDeployment/AwsCliLayer (amplifyDataAmplifyCodegenAssetsAmplifyCodegenAssetsDeploymentAwsCliLayerE322F905)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C/b355b0f0-fe24-11ef-a0bd-020db6799971',
        EventId:
          'amplifyDataAmplifyCodegenAssetsAmplifyCodegenAssetsDeploymentAwsCliLayerE322F905-DELETE_IN_PROGRESS-2025-03-11T03:05:41.072Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C',
        LogicalResourceId:
          'amplifyDataAmplifyCodegenAssetsAmplifyCodegenAssetsDeploymentAwsCliLayerE322F905',
        PhysicalResourceId:
          'arn:aws:lambda:us-west-2:123456789012:layer:amplifyDataAmplifyCodegenAssetsAmplifyCodegenAssetsDeploymentAwsCliLayerE322F905:245',
        ResourceType: 'AWS::Lambda::LayerVersion',
        Timestamp: new Date('2025-03-11T03:05:41.072'),
        ResourceStatus: 'DELETE_IN_PROGRESS',
        ResourceProperties:
          '{"Description":"/opt/awscli/aws","Content":{"S3Bucket":"cdk-hnb659fds-assets-123456789012-us-west-2","S3Key":"14700f3f8dd2f4997b0e6380f2714c17996184ef4a12d7990ce58b009105e158.zip"}}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'amplifyDataAmplifyCodegenAssetsAmplifyCodegenAssetsDeploymentAwsCliLayerE322F905',
        },
        constructPath:
          'data/amplifyData/AmplifyCodegenAssets/AmplifyCodegenAssetsDeployment/AwsCliLayer',
      },
      progress: {
        completed: 22,
        formatted: ' 22',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C |  22 | 11:05:41 PM | DELETE_IN_PROGRESS | AWS::IAM::Policy | data/Custom::CDKBucketDeployment8693BB64968944B69AAFB0CC9EB8756C1536MiB/ServiceRole/DefaultPolicy (CustomCDKBucketDeployment8693BB64968944B69AAFB0CC9EB8756C1536MiBServiceRoleDefaultPolicyFF1C635B)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C/b355b0f0-fe24-11ef-a0bd-020db6799971',
        EventId:
          'CustomCDKBucketDeployment8693BB64968944B69AAFB0CC9EB8756C1536MiBServiceRoleDefaultPolicyFF1C635B-DELETE_IN_PROGRESS-2025-03-11T03:05:41.086Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C',
        LogicalResourceId:
          'CustomCDKBucketDeployment8693BB64968944B69AAFB0CC9EB8756C1536MiBServiceRoleDefaultPolicyFF1C635B',
        PhysicalResourceId: 'ampli-Custo-XrN44jfhwm54',
        ResourceType: 'AWS::IAM::Policy',
        Timestamp: new Date('2025-03-11T03:05:41.086'),
        ResourceStatus: 'DELETE_IN_PROGRESS',
        ResourceProperties:
          '{"PolicyName":"CustomCDKBucketDeployment8693BB64968944B69AAFB0CC9EB8756C1536MiBServiceRoleDefaultPolicyFF1C635B","PolicyDocument":{"Version":"2012-10-17","Statement":[{"Action":["s3:GetObject*","s3:GetBucket*","s3:List*"],"Resource":["arn:aws:s3:::cdk-hnb659fds-assets-123456789012-us-west-2","arn:aws:s3:::cdk-hnb659fds-assets-123456789012-us-west-2/*"],"Effect":"Allow"},{"Action":["s3:GetObject*","s3:GetBucket*","s3:List*","s3:DeleteObject*","s3:PutObject","s3:PutObjectLegalHold","s3:PutObjectRetention","s3:PutObjectTagging","s3:PutObjectVersionTagging","s3:Abort*"],"Resource":["arn:aws:s3:::amplify-sampleprojectapp--amplifydataamplifycodege-ndv73vbejv8r","arn:aws:s3:::amplify-sampleprojectapp--amplifydataamplifycodege-ndv73vbejv8r/*"],"Effect":"Allow"},{"Action":["s3:GetObject*","s3:GetBucket*","s3:List*","s3:DeleteObject*","s3:PutObject","s3:PutObjectLegalHold","s3:PutObjectRetention","s3:PutObjectTagging","s3:PutObjectVersionTagging","s3:Abort*"],"Resource":["arn:aws:s3:::amplify-sampleprojectapp--modelintrospectionschema-q5iuovbg1sue","arn:aws:s3:::amplify-sampleprojectapp--modelintrospectionschema-q5iuovbg1sue/*"],"Effect":"Allow"}]},"Roles":["amplify-sampleprojectapp--CustomCDKBucketDeployment-u7Dt1VwbCyC1"]}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'CustomCDKBucketDeployment8693BB64968944B69AAFB0CC9EB8756C1536MiBServiceRoleDefaultPolicyFF1C635B',
        },
        constructPath:
          'data/Custom::CDKBucketDeployment8693BB64968944B69AAFB0CC9EB8756C1536MiB/ServiceRole/DefaultPolicy',
      },
      progress: {
        completed: 22,
        formatted: ' 22',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I0000',
    message:
      '[sdk info] CloudFormation.DescribeStacks({"StackName":"amplify-sampleprojectapp-user-sandbox-0e1752a889"}) -> OK',
  },
  {
    code: 'CDK_TOOLKIT_I0000',
    message:
      'Stack amplify-sampleprojectapp-user-sandbox-0e1752a889 has an ongoing operation in progress and is not stable (DELETE_IN_PROGRESS)',
  },
  {
    code: 'CDK_TOOLKIT_I0000',
    message:
      '[sdk info] CloudFormation.DescribeStackEvents({"StackName":"amplify-sampleprojectapp-user-sandbox-0e1752a889"}) -> OK',
  },
  {
    code: 'CDK_TOOLKIT_I0000',
    message:
      '[sdk info] CloudFormation.DescribeStackEvents({"StackName":"arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0e1752a889-MyCustomResourcesBB610599-8G262VTBDJMK/96f8f2f0-fe24-11ef-a75d-0aa9ea96647d"}) -> OK',
  },
  {
    code: 'CDK_TOOLKIT_I0000',
    message:
      '[sdk info] CloudFormation.DescribeStackEvents({"StackName":"arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0e1752a889-storage0EC3F24A-FW28UHWGJFK9/b34eac10-fe24-11ef-884b-028f2e174171"}) -> OK',
  },
  {
    code: 'CDK_TOOLKIT_I0000',
    message:
      '[sdk info] CloudFormation.DescribeStackEvents({"StackName":"arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C/b355b0f0-fe24-11ef-a0bd-020db6799971"}) -> OK',
  },
  {
    code: 'CDK_TOOLKIT_I0000',
    message:
      '[sdk info] CloudFormation.DescribeStackEvents({"StackName":"arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB/e5b11440-fe24-11ef-98e6-0abc8a28bbed"}) -> OK',
  },
  {
    code: 'CDK_TOOLKIT_I0000',
    message:
      '[sdk info] CloudFormation.DescribeStacks({"StackName":"amplify-sampleprojectapp-user-sandbox-0e1752a889"}) -> OK',
  },
  {
    code: 'CDK_TOOLKIT_I0000',
    message:
      'Stack amplify-sampleprojectapp-user-sandbox-0e1752a889 has an ongoing operation in progress and is not stable (DELETE_IN_PROGRESS)',
  },
  {
    code: 'CDK_TOOLKIT_I0000',
    message:
      '[sdk info] CloudFormation.DescribeStackEvents({"StackName":"arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R/e5bef6f0-fe24-11ef-b7fc-06822b500091"}) -> OK',
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0e1752a889-storage0EC3F24A-FW28UHWGJFK9 |  23 | 11:05:41 PM | DELETE_COMPLETE | AWS::Lambda::Function | storage/BucketNotificationsHandler050a0587b7544547bf325f094a3db834 (BucketNotificationsHandler050a0587b7544547bf325f094a3db8347ECC3691)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0e1752a889-storage0EC3F24A-FW28UHWGJFK9/b34eac10-fe24-11ef-884b-028f2e174171',
        EventId:
          'BucketNotificationsHandler050a0587b7544547bf325f094a3db8347ECC3691-DELETE_COMPLETE-2025-03-11T03:05:41.097Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0e1752a889-storage0EC3F24A-FW28UHWGJFK9',
        LogicalResourceId:
          'BucketNotificationsHandler050a0587b7544547bf325f094a3db8347ECC3691',
        PhysicalResourceId:
          'amplify-sampleprojectapp--BucketNotificationsHandl-Hz8a1MzLPzO6',
        ResourceType: 'AWS::Lambda::Function',
        Timestamp: new Date('2025-03-11T03:05:41.097'),
        ResourceStatus: 'DELETE_COMPLETE',
        ResourceProperties:
          '{"Role":"arn:aws:iam::123456789012:role/amplify-sampleprojectapp--BucketNotificationsHandle-MLaT6AFcXyTf","Runtime":"python3.11","Description":"AWS CloudFormation handler for \\"Custom::S3BucketNotifications\\" resources (@aws-cdk/aws-s3)","Timeout":"300","Handler":"index.handler","Code":{"ZipFile":"import boto3  # type: ignore\\nimport json\\nimport logging\\nimport urllib.request\\n\\ns3 = boto3.client(\\"s3\\")\\n\\nEVENTBRIDGE_CONFIGURATION = \'EventBridgeConfiguration\'\\nCONFIGURATION_TYPES = [\\"TopicConfigurations\\", \\"QueueConfigurations\\", \\"LambdaFunctionConfigurations\\"]\\n\\ndef handler(event: dict, context):\\n  response_status = \\"SUCCESS\\"\\n  error_message = \\"\\"\\n  try:\\n    props = event[\\"ResourceProperties\\"]\\n    notification_configuration = props[\\"NotificationConfiguration\\"]\\n    managed = props.get(\'Managed\', \'true\').lower() == \'true\'\\n    skipDestinationValidation = props.get(\'SkipDestinationValidation\', \'false\').lower() == \'true\'\\n    stack_id = event[\'StackId\']\\n    old = event.get(\\"OldResourceProperties\\", {}).get(\\"NotificationConfiguration\\", {})\\n    if managed:\\n      config = handle_managed(event[\\"RequestType\\"], notification_configuration)\\n    else:\\n      config = handle_unmanaged(props[\\"BucketName\\"], stack_id, event[\\"RequestType\\"], notification_configuration, old)\\n    s3.put_bucket_notification_configuration(Bucket=props[\\"BucketName\\"], NotificationConfiguration=config, SkipDestinationValidation=skipDestinationValidation)\\n  except Exception as e:\\n    logging.exception(\\"Failed to put bucket notification configuration\\")\\n    response_status = \\"FAILED\\"\\n    error_message = f\\"Error: {str(e)}. \\"\\n  finally:\\n    submit_response(event, context, response_status, error_message)\\n\\ndef handle_managed(request_type, notification_configuration):\\n  if request_type == \'Delete\':\\n    return {}\\n  return notification_configuration\\n\\ndef handle_unmanaged(bucket, stack_id, request_type, notification_configuration, old):\\n  def get_id(n):\\n    n[\'Id\'] = \'\'\\n    sorted_notifications = sort_filter_rules(n)\\n    strToHash=json.dumps(sorted_notifications, sort_keys=True).replace(\'\\"Name\\": \\"prefix\\"\', \'\\"Name\\": \\"Prefix\\"\').replace(\'\\"Name\\": \\"suffix\\"\', \'\\"Name\\": \\"Suffix\\"\')\\n    return f\\"{stack_id}-{hash(strToHash)}\\"\\n  def with_id(n):\\n    n[\'Id\'] = get_id(n)\\n    return n\\n\\n  external_notifications = {}\\n  existing_notifications = s3.get_bucket_notification_configuration(Bucket=bucket)\\n  for t in CONFIGURATION_TYPES:\\n    if request_type == \'Update\':\\n        old_incoming_ids = [get_id(n) for n in old.get(t, [])]\\n        external_notifications[t] = [n for n in existing_notifications.get(t, []) if not get_id(n) in old_incoming_ids]      \\n    elif request_type == \'Delete\':\\n        external_notifications[t] = [n for n in existing_notifications.get(t, []) if not n[\'Id\'].startswith(f\\"{stack_id}-\\")]\\n    elif request_type == \'Create\':\\n        external_notifications[t] = [n for n in existing_notifications.get(t, [])]\\n  if EVENTBRIDGE_CONFIGURATION in existing_notifications:\\n    external_notifications[EVENTBRIDGE_CONFIGURATION] = existing_notifications[EVENTBRIDGE_CONFIGURATION]\\n\\n  if request_type == \'Delete\':\\n    return external_notifications\\n\\n  notifications = {}\\n  for t in CONFIGURATION_TYPES:\\n    external = external_notifications.get(t, [])\\n    incoming = [with_id(n) for n in notification_configuration.get(t, [])]\\n    notifications[t] = external + incoming\\n\\n  if EVENTBRIDGE_CONFIGURATION in notification_configuration:\\n    notifications[EVENTBRIDGE_CONFIGURATION] = notification_configuration[EVENTBRIDGE_CONFIGURATION]\\n  elif EVENTBRIDGE_CONFIGURATION in external_notifications:\\n    notifications[EVENTBRIDGE_CONFIGURATION] = external_notifications[EVENTBRIDGE_CONFIGURATION]\\n\\n  return notifications\\n\\ndef submit_response(event: dict, context, response_status: str, error_message: str):\\n  response_body = json.dumps(\\n    {\\n      \\"Status\\": response_status,\\n      \\"Reason\\": f\\"{error_message}See the details in CloudWatch Log Stream: {context.log_stream_name}\\",\\n      \\"PhysicalResourceId\\": event.get(\\"PhysicalResourceId\\") or event[\\"LogicalResourceId\\"],\\n      \\"StackId\\": event[\\"StackId\\"],\\n      \\"RequestId\\": event[\\"RequestId\\"],\\n      \\"LogicalResourceId\\": event[\\"LogicalResourceId\\"],\\n      \\"NoEcho\\": False,\\n    }\\n  ).encode(\\"utf-8\\")\\n  headers = {\\"content-type\\": \\"\\", \\"content-length\\": str(len(response_body))}\\n  try:\\n    req = urllib.request.Request(url=event[\\"ResponseURL\\"], headers=headers, data=response_body, method=\\"PUT\\")\\n    with urllib.request.urlopen(req) as response:\\n      print(response.read().decode(\\"utf-8\\"))\\n    print(\\"Status code: \\" + response.reason)\\n  except Exception as e:\\n      print(\\"send(..) failed executing request.urlopen(..): \\" + str(e))\\n\\ndef sort_filter_rules(json_obj):\\n  if not isinstance(json_obj, dict):\\n      return json_obj\\n  for key, value in json_obj.items():\\n      if isinstance(value, dict):\\n          json_obj[key] = sort_filter_rules(value)\\n      elif isinstance(value, list):\\n          json_obj[key] = [sort_filter_rules(item) for item in value]\\n  if \\"Filter\\" in json_obj and \\"Key\\" in json_obj[\\"Filter\\"] and \\"FilterRules\\" in json_obj[\\"Filter\\"][\\"Key\\"]:\\n      filter_rules = json_obj[\\"Filter\\"][\\"Key\\"][\\"FilterRules\\"]\\n      sorted_filter_rules = sorted(filter_rules, key=lambda x: x[\\"Name\\"])\\n      json_obj[\\"Filter\\"][\\"Key\\"][\\"FilterRules\\"] = sorted_filter_rules\\n  return json_obj"},"Tags":[{"Value":"sandbox","Key":"amplify:deployment-type"},{"Value":"amplify","Key":"created-by"}]}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'BucketNotificationsHandler050a0587b7544547bf325f094a3db8347ECC3691',
        },
        constructPath:
          'storage/BucketNotificationsHandler050a0587b7544547bf325f094a3db834',
      },
      progress: {
        completed: 23,
        formatted: ' 23',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0e1752a889-storage0EC3F24A-FW28UHWGJFK9 |  23 | 11:05:41 PM | DELETE_IN_PROGRESS | AWS::IAM::Policy | storage/BucketNotificationsHandler050a0587b7544547bf325f094a3db834/Role/DefaultPolicy (BucketNotificationsHandler050a0587b7544547bf325f094a3db834RoleDefaultPolicy2CF63D36)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0e1752a889-storage0EC3F24A-FW28UHWGJFK9/b34eac10-fe24-11ef-884b-028f2e174171',
        EventId:
          'BucketNotificationsHandler050a0587b7544547bf325f094a3db834RoleDefaultPolicy2CF63D36-DELETE_IN_PROGRESS-2025-03-11T03:05:41.458Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0e1752a889-storage0EC3F24A-FW28UHWGJFK9',
        LogicalResourceId:
          'BucketNotificationsHandler050a0587b7544547bf325f094a3db834RoleDefaultPolicy2CF63D36',
        PhysicalResourceId: 'ampli-Bucke-wQqfTT41U3cj',
        ResourceType: 'AWS::IAM::Policy',
        Timestamp: new Date('2025-03-11T03:05:41.458'),
        ResourceStatus: 'DELETE_IN_PROGRESS',
        ResourceProperties:
          '{"PolicyName":"BucketNotificationsHandler050a0587b7544547bf325f094a3db834RoleDefaultPolicy2CF63D36","PolicyDocument":{"Version":"2012-10-17","Statement":[{"Action":"s3:PutBucketNotification","Resource":"*","Effect":"Allow"}]},"Roles":["amplify-sampleprojectapp--BucketNotificationsHandle-MLaT6AFcXyTf"]}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'BucketNotificationsHandler050a0587b7544547bf325f094a3db834RoleDefaultPolicy2CF63D36',
        },
        constructPath:
          'storage/BucketNotificationsHandler050a0587b7544547bf325f094a3db834/Role/DefaultPolicy',
      },
      progress: {
        completed: 23,
        formatted: ' 23',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C |  24 | 11:05:42 PM | DELETE_COMPLETE | AWS::Lambda::LayerVersion | data/amplifyData/AmplifyCodegenAssets/AmplifyCodegenAssetsDeployment/AwsCliLayer (amplifyDataAmplifyCodegenAssetsAmplifyCodegenAssetsDeploymentAwsCliLayerE322F905)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C/b355b0f0-fe24-11ef-a0bd-020db6799971',
        EventId:
          'amplifyDataAmplifyCodegenAssetsAmplifyCodegenAssetsDeploymentAwsCliLayerE322F905-DELETE_COMPLETE-2025-03-11T03:05:42.073Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C',
        LogicalResourceId:
          'amplifyDataAmplifyCodegenAssetsAmplifyCodegenAssetsDeploymentAwsCliLayerE322F905',
        PhysicalResourceId:
          'arn:aws:lambda:us-west-2:123456789012:layer:amplifyDataAmplifyCodegenAssetsAmplifyCodegenAssetsDeploymentAwsCliLayerE322F905:245',
        ResourceType: 'AWS::Lambda::LayerVersion',
        Timestamp: new Date('2025-03-11T03:05:42.073'),
        ResourceStatus: 'DELETE_COMPLETE',
        ResourceProperties:
          '{"Description":"/opt/awscli/aws","Content":{"S3Bucket":"cdk-hnb659fds-assets-123456789012-us-west-2","S3Key":"14700f3f8dd2f4997b0e6380f2714c17996184ef4a12d7990ce58b009105e158.zip"}}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'amplifyDataAmplifyCodegenAssetsAmplifyCodegenAssetsDeploymentAwsCliLayerE322F905',
        },
        constructPath:
          'data/amplifyData/AmplifyCodegenAssets/AmplifyCodegenAssetsDeployment/AwsCliLayer',
      },
      progress: {
        completed: 24,
        formatted: ' 24',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0e1752a889-storage0EC3F24A-FW28UHWGJFK9 |  25 | 11:05:42 PM | DELETE_COMPLETE | AWS::Lambda::Function | data/Custom::S3AutoDeleteObjectsCustomResourceProvider/Handler (CustomS3AutoDeleteObjectsCustomResourceProviderHandler9D90184F)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0e1752a889-storage0EC3F24A-FW28UHWGJFK9/b34eac10-fe24-11ef-884b-028f2e174171',
        EventId:
          'CustomS3AutoDeleteObjectsCustomResourceProviderHandler9D90184F-DELETE_COMPLETE-2025-03-11T03:05:42.142Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0e1752a889-storage0EC3F24A-FW28UHWGJFK9',
        LogicalResourceId:
          'CustomS3AutoDeleteObjectsCustomResourceProviderHandler9D90184F',
        PhysicalResourceId:
          'amplify-sampleprojectapp--CustomS3AutoDeleteObject-26NDTY8D5dwA',
        ResourceType: 'AWS::Lambda::Function',
        Timestamp: new Date('2025-03-11T03:05:42.142'),
        ResourceStatus: 'DELETE_COMPLETE',
        ResourceProperties:
          '{"Role":"arn:aws:iam::123456789012:role/amplify-sampleprojectapp--CustomS3AutoDeleteObjects-C3hMUnpj2GY1","MemorySize":"128","Runtime":"nodejs20.x","Description":"Lambda function for auto-deleting objects in amplify-sampleprojectapp-pr-testnamebucketb4152ad5-shsu6q3elmwn S3 bucket.","Timeout":"900","Handler":"index.handler","Code":{"S3Bucket":"cdk-hnb659fds-assets-123456789012-us-west-2","S3Key":"faa95a81ae7d7373f3e1f242268f904eb748d8d0fdd306e8a6fe515a1905a7d6.zip"}}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'CustomS3AutoDeleteObjectsCustomResourceProviderHandler9D90184F',
        },
        constructPath:
          'data/Custom::S3AutoDeleteObjectsCustomResourceProvider/Handler',
      },
      progress: {
        completed: 25,
        formatted: ' 25',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C |  26 | 11:05:42 PM | DELETE_COMPLETE | AWS::IAM::Policy | data/Custom::CDKBucketDeployment8693BB64968944B69AAFB0CC9EB8756C1536MiB/ServiceRole/DefaultPolicy (CustomCDKBucketDeployment8693BB64968944B69AAFB0CC9EB8756C1536MiBServiceRoleDefaultPolicyFF1C635B)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C/b355b0f0-fe24-11ef-a0bd-020db6799971',
        EventId:
          'CustomCDKBucketDeployment8693BB64968944B69AAFB0CC9EB8756C1536MiBServiceRoleDefaultPolicyFF1C635B-DELETE_COMPLETE-2025-03-11T03:05:42.283Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C',
        LogicalResourceId:
          'CustomCDKBucketDeployment8693BB64968944B69AAFB0CC9EB8756C1536MiBServiceRoleDefaultPolicyFF1C635B',
        PhysicalResourceId: 'ampli-Custo-XrN44jfhwm54',
        ResourceType: 'AWS::IAM::Policy',
        Timestamp: new Date('2025-03-11T03:05:42.283'),
        ResourceStatus: 'DELETE_COMPLETE',
        ResourceProperties:
          '{"PolicyName":"CustomCDKBucketDeployment8693BB64968944B69AAFB0CC9EB8756C1536MiBServiceRoleDefaultPolicyFF1C635B","PolicyDocument":{"Version":"2012-10-17","Statement":[{"Action":["s3:GetObject*","s3:GetBucket*","s3:List*"],"Resource":["arn:aws:s3:::cdk-hnb659fds-assets-123456789012-us-west-2","arn:aws:s3:::cdk-hnb659fds-assets-123456789012-us-west-2/*"],"Effect":"Allow"},{"Action":["s3:GetObject*","s3:GetBucket*","s3:List*","s3:DeleteObject*","s3:PutObject","s3:PutObjectLegalHold","s3:PutObjectRetention","s3:PutObjectTagging","s3:PutObjectVersionTagging","s3:Abort*"],"Resource":["arn:aws:s3:::amplify-sampleprojectapp--amplifydataamplifycodege-ndv73vbejv8r","arn:aws:s3:::amplify-sampleprojectapp--amplifydataamplifycodege-ndv73vbejv8r/*"],"Effect":"Allow"},{"Action":["s3:GetObject*","s3:GetBucket*","s3:List*","s3:DeleteObject*","s3:PutObject","s3:PutObjectLegalHold","s3:PutObjectRetention","s3:PutObjectTagging","s3:PutObjectVersionTagging","s3:Abort*"],"Resource":["arn:aws:s3:::amplify-sampleprojectapp--modelintrospectionschema-q5iuovbg1sue","arn:aws:s3:::amplify-sampleprojectapp--modelintrospectionschema-q5iuovbg1sue/*"],"Effect":"Allow"}]},"Roles":["amplify-sampleprojectapp--CustomCDKBucketDeployment-u7Dt1VwbCyC1"]}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'CustomCDKBucketDeployment8693BB64968944B69AAFB0CC9EB8756C1536MiBServiceRoleDefaultPolicyFF1C635B',
        },
        constructPath:
          'data/Custom::CDKBucketDeployment8693BB64968944B69AAFB0CC9EB8756C1536MiB/ServiceRole/DefaultPolicy',
      },
      progress: {
        completed: 26,
        formatted: ' 26',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0e1752a889-storage0EC3F24A-FW28UHWGJFK9 |  27 | 11:05:42 PM | DELETE_COMPLETE | AWS::IAM::Policy | storage/BucketNotificationsHandler050a0587b7544547bf325f094a3db834/Role/DefaultPolicy (BucketNotificationsHandler050a0587b7544547bf325f094a3db834RoleDefaultPolicy2CF63D36)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0e1752a889-storage0EC3F24A-FW28UHWGJFK9/b34eac10-fe24-11ef-884b-028f2e174171',
        EventId:
          'BucketNotificationsHandler050a0587b7544547bf325f094a3db834RoleDefaultPolicy2CF63D36-DELETE_COMPLETE-2025-03-11T03:05:42.405Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0e1752a889-storage0EC3F24A-FW28UHWGJFK9',
        LogicalResourceId:
          'BucketNotificationsHandler050a0587b7544547bf325f094a3db834RoleDefaultPolicy2CF63D36',
        PhysicalResourceId: 'ampli-Bucke-wQqfTT41U3cj',
        ResourceType: 'AWS::IAM::Policy',
        Timestamp: new Date('2025-03-11T03:05:42.405'),
        ResourceStatus: 'DELETE_COMPLETE',
        ResourceProperties:
          '{"PolicyName":"BucketNotificationsHandler050a0587b7544547bf325f094a3db834RoleDefaultPolicy2CF63D36","PolicyDocument":{"Version":"2012-10-17","Statement":[{"Action":"s3:PutBucketNotification","Resource":"*","Effect":"Allow"}]},"Roles":["amplify-sampleprojectapp--BucketNotificationsHandle-MLaT6AFcXyTf"]}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'BucketNotificationsHandler050a0587b7544547bf325f094a3db834RoleDefaultPolicy2CF63D36',
        },
        constructPath:
          'storage/BucketNotificationsHandler050a0587b7544547bf325f094a3db834/Role/DefaultPolicy',
      },
      progress: {
        completed: 27,
        formatted: ' 27',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0e1752a889-storage0EC3F24A-FW28UHWGJFK9 |  27 | 11:05:42 PM | DELETE_IN_PROGRESS | AWS::IAM::Role | data/Custom::S3AutoDeleteObjectsCustomResourceProvider/Role (CustomS3AutoDeleteObjectsCustomResourceProviderRole3B1BD092)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0e1752a889-storage0EC3F24A-FW28UHWGJFK9/b34eac10-fe24-11ef-884b-028f2e174171',
        EventId:
          'CustomS3AutoDeleteObjectsCustomResourceProviderRole3B1BD092-DELETE_IN_PROGRESS-2025-03-11T03:05:42.551Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0e1752a889-storage0EC3F24A-FW28UHWGJFK9',
        LogicalResourceId:
          'CustomS3AutoDeleteObjectsCustomResourceProviderRole3B1BD092',
        PhysicalResourceId:
          'amplify-sampleprojectapp--CustomS3AutoDeleteObjects-C3hMUnpj2GY1',
        ResourceType: 'AWS::IAM::Role',
        Timestamp: new Date('2025-03-11T03:05:42.551'),
        ResourceStatus: 'DELETE_IN_PROGRESS',
        ResourceProperties:
          '{"ManagedPolicyArns":["arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"],"AssumeRolePolicyDocument":{"Version":"2012-10-17","Statement":[{"Action":"sts:AssumeRole","Effect":"Allow","Principal":{"Service":"lambda.amazonaws.com"}}]}}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'CustomS3AutoDeleteObjectsCustomResourceProviderRole3B1BD092',
        },
        constructPath:
          'data/Custom::S3AutoDeleteObjectsCustomResourceProvider/Role',
      },
      progress: {
        completed: 27,
        formatted: ' 27',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0e1752a889-storage0EC3F24A-FW28UHWGJFK9 |  27 | 11:05:42 PM | DELETE_IN_PROGRESS | AWS::S3::Bucket | storage/testName/Bucket (testNameBucketB4152AD5)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0e1752a889-storage0EC3F24A-FW28UHWGJFK9/b34eac10-fe24-11ef-884b-028f2e174171',
        EventId:
          'testNameBucketB4152AD5-DELETE_IN_PROGRESS-2025-03-11T03:05:42.557Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0e1752a889-storage0EC3F24A-FW28UHWGJFK9',
        LogicalResourceId: 'testNameBucketB4152AD5',
        PhysicalResourceId:
          'amplify-sampleprojectapp-pr-testnamebucketb4152ad5-shsu6q3elmwn',
        ResourceType: 'AWS::S3::Bucket',
        Timestamp: new Date('2025-03-11T03:05:42.557'),
        ResourceStatus: 'DELETE_IN_PROGRESS',
        ResourceProperties:
          '{"CorsConfiguration":{"CorsRules":[{"ExposedHeaders":["x-amz-server-side-encryption","x-amz-request-id","x-amz-id-2","ETag"],"AllowedMethods":["GET","HEAD","PUT","POST","DELETE"],"AllowedOrigins":["*"],"AllowedHeaders":["*"],"MaxAge":"3000"}]},"Tags":[{"Value":"sandbox","Key":"amplify:deployment-type"},{"Value":"testName","Key":"amplify:friendly-name"},{"Value":"true","Key":"aws-cdk:auto-delete-objects"},{"Value":"amplify","Key":"created-by"}]}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'testNameBucketB4152AD5',
        },
        constructPath: 'storage/testName/Bucket',
      },
      progress: {
        completed: 27,
        formatted: ' 27',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C |  27 | 11:05:42 PM | DELETE_IN_PROGRESS | AWS::IAM::Role | data/Custom::CDKBucketDeployment8693BB64968944B69AAFB0CC9EB8756C1536MiB/ServiceRole (CustomCDKBucketDeployment8693BB64968944B69AAFB0CC9EB8756C1536MiBServiceRoleA41FC8C2)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C/b355b0f0-fe24-11ef-a0bd-020db6799971',
        EventId:
          'CustomCDKBucketDeployment8693BB64968944B69AAFB0CC9EB8756C1536MiBServiceRoleA41FC8C2-DELETE_IN_PROGRESS-2025-03-11T03:05:42.649Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C',
        LogicalResourceId:
          'CustomCDKBucketDeployment8693BB64968944B69AAFB0CC9EB8756C1536MiBServiceRoleA41FC8C2',
        PhysicalResourceId:
          'amplify-sampleprojectapp--CustomCDKBucketDeployment-u7Dt1VwbCyC1',
        ResourceType: 'AWS::IAM::Role',
        Timestamp: new Date('2025-03-11T03:05:42.649'),
        ResourceStatus: 'DELETE_IN_PROGRESS',
        ResourceProperties:
          '{"ManagedPolicyArns":["arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"],"AssumeRolePolicyDocument":{"Version":"2012-10-17","Statement":[{"Action":"sts:AssumeRole","Effect":"Allow","Principal":{"Service":"lambda.amazonaws.com"}}]},"Tags":[{"Value":"sandbox","Key":"amplify:deployment-type"},{"Value":"amplify","Key":"created-by"}]}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'CustomCDKBucketDeployment8693BB64968944B69AAFB0CC9EB8756C1536MiBServiceRoleA41FC8C2',
        },
        constructPath:
          'data/Custom::CDKBucketDeployment8693BB64968944B69AAFB0CC9EB8756C1536MiB/ServiceRole',
      },
      progress: {
        completed: 27,
        formatted: ' 27',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C |  27 | 11:05:42 PM | DELETE_IN_PROGRESS | AWS::S3::Bucket | data/modelIntrospectionSchemaBucket (modelIntrospectionSchemaBucketF566B665)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C/b355b0f0-fe24-11ef-a0bd-020db6799971',
        EventId:
          'modelIntrospectionSchemaBucketF566B665-DELETE_IN_PROGRESS-2025-03-11T03:05:42.660Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C',
        LogicalResourceId: 'modelIntrospectionSchemaBucketF566B665',
        PhysicalResourceId:
          'amplify-sampleprojectapp--modelintrospectionschema-q5iuovbg1sue',
        ResourceType: 'AWS::S3::Bucket',
        Timestamp: new Date('2025-03-11T03:05:42.660'),
        ResourceStatus: 'DELETE_IN_PROGRESS',
        ResourceProperties:
          '{"Tags":[{"Value":"sandbox","Key":"amplify:deployment-type"},{"Value":"true","Key":"aws-cdk:auto-delete-objects"},{"Value":"true","Key":"aws-cdk:cr-owned:6e3f6317"},{"Value":"amplify","Key":"created-by"}]}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'modelIntrospectionSchemaBucketF566B665',
        },
        constructPath: 'data/modelIntrospectionSchemaBucket',
      },
      progress: {
        completed: 27,
        formatted: ' 27',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C |  26 | 11:05:42 PM | DELETE_COMPLETE | AWS::Lambda::Function | data/Custom::S3AutoDeleteObjectsCustomResourceProvider/Handler (CustomS3AutoDeleteObjectsCustomResourceProviderHandler9D90184F)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C/b355b0f0-fe24-11ef-a0bd-020db6799971',
        EventId:
          'CustomS3AutoDeleteObjectsCustomResourceProviderHandler9D90184F-DELETE_COMPLETE-2025-03-11T03:05:42.716Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C',
        LogicalResourceId:
          'CustomS3AutoDeleteObjectsCustomResourceProviderHandler9D90184F',
        PhysicalResourceId:
          'amplify-sampleprojectapp--CustomS3AutoDeleteObject-wJKnIElU6MiV',
        ResourceType: 'AWS::Lambda::Function',
        Timestamp: new Date('2025-03-11T03:05:42.716'),
        ResourceStatus: 'DELETE_COMPLETE',
        ResourceProperties:
          '{"Role":"arn:aws:iam::123456789012:role/amplify-sampleprojectapp--CustomS3AutoDeleteObjects-UEGEyfol9r26","MemorySize":"128","Runtime":"nodejs20.x","Description":"Lambda function for auto-deleting objects in amplify-sampleprojectapp--amplifydataamplifycodege-ndv73vbejv8r S3 bucket.","Timeout":"900","Handler":"index.handler","Code":{"S3Bucket":"cdk-hnb659fds-assets-123456789012-us-west-2","S3Key":"faa95a81ae7d7373f3e1f242268f904eb748d8d0fdd306e8a6fe515a1905a7d6.zip"}}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'CustomS3AutoDeleteObjectsCustomResourceProviderHandler9D90184F',
        },
        constructPath:
          'data/Custom::S3AutoDeleteObjectsCustomResourceProvider/Handler',
      },
      progress: {
        completed: 26,
        formatted: ' 26',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0e1752a889-storage0EC3F24A-FW28UHWGJFK9 |  26 | 11:05:42 PM | DELETE_IN_PROGRESS | AWS::IAM::Role | storage/BucketNotificationsHandler050a0587b7544547bf325f094a3db834/Role (BucketNotificationsHandler050a0587b7544547bf325f094a3db834RoleB6FB88EC)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0e1752a889-storage0EC3F24A-FW28UHWGJFK9/b34eac10-fe24-11ef-884b-028f2e174171',
        EventId:
          'BucketNotificationsHandler050a0587b7544547bf325f094a3db834RoleB6FB88EC-DELETE_IN_PROGRESS-2025-03-11T03:05:42.739Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0e1752a889-storage0EC3F24A-FW28UHWGJFK9',
        LogicalResourceId:
          'BucketNotificationsHandler050a0587b7544547bf325f094a3db834RoleB6FB88EC',
        PhysicalResourceId:
          'amplify-sampleprojectapp--BucketNotificationsHandle-MLaT6AFcXyTf',
        ResourceType: 'AWS::IAM::Role',
        Timestamp: new Date('2025-03-11T03:05:42.739'),
        ResourceStatus: 'DELETE_IN_PROGRESS',
        ResourceProperties:
          '{"ManagedPolicyArns":["arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"],"AssumeRolePolicyDocument":{"Version":"2012-10-17","Statement":[{"Action":"sts:AssumeRole","Effect":"Allow","Principal":{"Service":"lambda.amazonaws.com"}}]},"Tags":[{"Value":"sandbox","Key":"amplify:deployment-type"},{"Value":"amplify","Key":"created-by"}]}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'BucketNotificationsHandler050a0587b7544547bf325f094a3db834RoleB6FB88EC',
        },
        constructPath:
          'storage/BucketNotificationsHandler050a0587b7544547bf325f094a3db834/Role',
      },
      progress: {
        completed: 26,
        formatted: ' 26',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C |  26 | 11:05:43 PM | DELETE_IN_PROGRESS | AWS::S3::Bucket | data/amplifyData/AmplifyCodegenAssets/AmplifyCodegenAssetsBucket (amplifyDataAmplifyCodegenAssetsAmplifyCodegenAssetsBucket9CCB4ACA)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C/b355b0f0-fe24-11ef-a0bd-020db6799971',
        EventId:
          'amplifyDataAmplifyCodegenAssetsAmplifyCodegenAssetsBucket9CCB4ACA-DELETE_IN_PROGRESS-2025-03-11T03:05:43.092Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C',
        LogicalResourceId:
          'amplifyDataAmplifyCodegenAssetsAmplifyCodegenAssetsBucket9CCB4ACA',
        PhysicalResourceId:
          'amplify-sampleprojectapp--amplifydataamplifycodege-ndv73vbejv8r',
        ResourceType: 'AWS::S3::Bucket',
        Timestamp: new Date('2025-03-11T03:05:43.092'),
        ResourceStatus: 'DELETE_IN_PROGRESS',
        ResourceProperties:
          '{"CorsConfiguration":{"CorsRules":[{"AllowedMethods":["GET","HEAD"],"AllowedOrigins":["https://us-west-2.console.aws.amazon.com/amplify"],"AllowedHeaders":["*"]}]},"Tags":[{"Value":"sandbox","Key":"amplify:deployment-type"},{"Value":"amplifyData","Key":"amplify:friendly-name"},{"Value":"true","Key":"aws-cdk:auto-delete-objects"},{"Value":"true","Key":"aws-cdk:cr-owned:bb5e5747"},{"Value":"amplify","Key":"created-by"}]}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'amplifyDataAmplifyCodegenAssetsAmplifyCodegenAssetsBucket9CCB4ACA',
        },
        constructPath:
          'data/amplifyData/AmplifyCodegenAssets/AmplifyCodegenAssetsBucket',
      },
      progress: {
        completed: 26,
        formatted: ' 26',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C |  26 | 11:05:43 PM | DELETE_IN_PROGRESS | AWS::IAM::Role | data/Custom::S3AutoDeleteObjectsCustomResourceProvider/Role (CustomS3AutoDeleteObjectsCustomResourceProviderRole3B1BD092)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C/b355b0f0-fe24-11ef-a0bd-020db6799971',
        EventId:
          'CustomS3AutoDeleteObjectsCustomResourceProviderRole3B1BD092-DELETE_IN_PROGRESS-2025-03-11T03:05:43.229Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C',
        LogicalResourceId:
          'CustomS3AutoDeleteObjectsCustomResourceProviderRole3B1BD092',
        PhysicalResourceId:
          'amplify-sampleprojectapp--CustomS3AutoDeleteObjects-UEGEyfol9r26',
        ResourceType: 'AWS::IAM::Role',
        Timestamp: new Date('2025-03-11T03:05:43.229'),
        ResourceStatus: 'DELETE_IN_PROGRESS',
        ResourceProperties:
          '{"ManagedPolicyArns":["arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"],"AssumeRolePolicyDocument":{"Version":"2012-10-17","Statement":[{"Action":"sts:AssumeRole","Effect":"Allow","Principal":{"Service":"lambda.amazonaws.com"}}]}}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'CustomS3AutoDeleteObjectsCustomResourceProviderRole3B1BD092',
        },
        constructPath:
          'data/Custom::S3AutoDeleteObjectsCustomResourceProvider/Role',
      },
      progress: {
        completed: 26,
        formatted: ' 26',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0e1752a889-storage0EC3F24A-FW28UHWGJFK9 |  27 | 11:05:44 PM | DELETE_COMPLETE | AWS::S3::Bucket | storage/testName/Bucket (testNameBucketB4152AD5)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0e1752a889-storage0EC3F24A-FW28UHWGJFK9/b34eac10-fe24-11ef-884b-028f2e174171',
        EventId:
          'testNameBucketB4152AD5-DELETE_COMPLETE-2025-03-11T03:05:44.170Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0e1752a889-storage0EC3F24A-FW28UHWGJFK9',
        LogicalResourceId: 'testNameBucketB4152AD5',
        PhysicalResourceId:
          'amplify-sampleprojectapp-pr-testnamebucketb4152ad5-shsu6q3elmwn',
        ResourceType: 'AWS::S3::Bucket',
        Timestamp: new Date('2025-03-11T03:05:44.170'),
        ResourceStatus: 'DELETE_COMPLETE',
        ResourceProperties:
          '{"CorsConfiguration":{"CorsRules":[{"ExposedHeaders":["x-amz-server-side-encryption","x-amz-request-id","x-amz-id-2","ETag"],"AllowedMethods":["GET","HEAD","PUT","POST","DELETE"],"AllowedOrigins":["*"],"AllowedHeaders":["*"],"MaxAge":"3000"}]},"Tags":[{"Value":"sandbox","Key":"amplify:deployment-type"},{"Value":"testName","Key":"amplify:friendly-name"},{"Value":"true","Key":"aws-cdk:auto-delete-objects"},{"Value":"amplify","Key":"created-by"}]}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'testNameBucketB4152AD5',
        },
        constructPath: 'storage/testName/Bucket',
      },
      progress: {
        completed: 27,
        formatted: ' 27',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C |  28 | 11:05:44 PM | DELETE_COMPLETE | AWS::S3::Bucket | data/modelIntrospectionSchemaBucket (modelIntrospectionSchemaBucketF566B665)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C/b355b0f0-fe24-11ef-a0bd-020db6799971',
        EventId:
          'modelIntrospectionSchemaBucketF566B665-DELETE_COMPLETE-2025-03-11T03:05:44.290Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C',
        LogicalResourceId: 'modelIntrospectionSchemaBucketF566B665',
        PhysicalResourceId:
          'amplify-sampleprojectapp--modelintrospectionschema-q5iuovbg1sue',
        ResourceType: 'AWS::S3::Bucket',
        Timestamp: new Date('2025-03-11T03:05:44.290'),
        ResourceStatus: 'DELETE_COMPLETE',
        ResourceProperties:
          '{"Tags":[{"Value":"sandbox","Key":"amplify:deployment-type"},{"Value":"true","Key":"aws-cdk:auto-delete-objects"},{"Value":"true","Key":"aws-cdk:cr-owned:6e3f6317"},{"Value":"amplify","Key":"created-by"}]}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'modelIntrospectionSchemaBucketF566B665',
        },
        constructPath: 'data/modelIntrospectionSchemaBucket',
      },
      progress: {
        completed: 28,
        formatted: ' 28',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C |  29 | 11:05:44 PM | DELETE_COMPLETE | AWS::S3::Bucket | data/amplifyData/AmplifyCodegenAssets/AmplifyCodegenAssetsBucket (amplifyDataAmplifyCodegenAssetsAmplifyCodegenAssetsBucket9CCB4ACA)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C/b355b0f0-fe24-11ef-a0bd-020db6799971',
        EventId:
          'amplifyDataAmplifyCodegenAssetsAmplifyCodegenAssetsBucket9CCB4ACA-DELETE_COMPLETE-2025-03-11T03:05:44.920Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C',
        LogicalResourceId:
          'amplifyDataAmplifyCodegenAssetsAmplifyCodegenAssetsBucket9CCB4ACA',
        PhysicalResourceId:
          'amplify-sampleprojectapp--amplifydataamplifycodege-ndv73vbejv8r',
        ResourceType: 'AWS::S3::Bucket',
        Timestamp: new Date('2025-03-11T03:05:44.920'),
        ResourceStatus: 'DELETE_COMPLETE',
        ResourceProperties:
          '{"CorsConfiguration":{"CorsRules":[{"AllowedMethods":["GET","HEAD"],"AllowedOrigins":["https://us-west-2.console.aws.amazon.com/amplify"],"AllowedHeaders":["*"]}]},"Tags":[{"Value":"sandbox","Key":"amplify:deployment-type"},{"Value":"amplifyData","Key":"amplify:friendly-name"},{"Value":"true","Key":"aws-cdk:auto-delete-objects"},{"Value":"true","Key":"aws-cdk:cr-owned:bb5e5747"},{"Value":"amplify","Key":"created-by"}]}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'amplifyDataAmplifyCodegenAssetsAmplifyCodegenAssetsBucket9CCB4ACA',
        },
        constructPath:
          'data/amplifyData/AmplifyCodegenAssets/AmplifyCodegenAssetsBucket',
      },
      progress: {
        completed: 29,
        formatted: ' 29',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C |  30 | 11:05:45 PM | DELETE_COMPLETE | AWS::CloudFormation::Stack | data/amplifyData/ConnectionStack.NestedStack/ConnectionStack.NestedStackResource (amplifyDataConnectionStackNestedStackConnectionStackNestedStackResourceAB0F312B)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C/b355b0f0-fe24-11ef-a0bd-020db6799971',
        EventId:
          'amplifyDataConnectionStackNestedStackConnectionStackNestedStackResourceAB0F312B-DELETE_COMPLETE-2025-03-11T03:05:45.292Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C',
        LogicalResourceId:
          'amplifyDataConnectionStackNestedStackConnectionStackNestedStackResourceAB0F312B',
        PhysicalResourceId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataConnectionStackNestedStackConne-1RT45PFNMWNGH/026d3050-fe25-11ef-abb4-06dfee28c627',
        ResourceType: 'AWS::CloudFormation::Stack',
        Timestamp: new Date('2025-03-11T03:05:45.292'),
        ResourceStatus: 'DELETE_COMPLETE',
        ResourceProperties:
          '{"TemplateURL":"https://s3.us-west-2.amazonaws.com/cdk-hnb659fds-assets-123456789012-us-west-2/83ef1d85f437ccf9bf6d749fd82f93b06ce961419558f4618e4da3765db7a706.json","Parameters":{"referencetoamplifysampleprojectappusersandbox0e1752a889dataamplifyDataPostNestedStackPostNestedStackResource01FEDE53Outputsamplifysampleprojectappusersandbox0e1752a889dataamplifyDataPostPostTable365E2F9CTableArn":"arn:aws:dynamodb:us-west-2:123456789012:table/Post-ezabg7fk2jecvodrblowtgbsme-NONE","referencetoamplifysampleprojectappusersandbox0e1752a889dataamplifyDataPersonNestedStackPersonNestedStackResource35C2DCE5Outputsamplifysampleprojectappusersandbox0e1752a889dataamplifyDataPersonPersonTableF02A70DBTableArn":"arn:aws:dynamodb:us-west-2:123456789012:table/Person-ezabg7fk2jecvodrblowtgbsme-NONE","referencetoamplifysampleprojectappusersandbox0e1752a889authNestedStackauthNestedStackResource1C2A2D1EOutputsamplifysampleprojectappusersandbox0e1752a889authamplifyAuthIdentityPool5160F57DRef":"us-west-2:e3abf6f7-1ae5-4254-829e-0d8c9dc05bff","referencetoamplifysampleprojectappusersandbox0e1752a889dataamplifyDataPersonNestedStackPersonNestedStackResource35C2DCE5Outputsamplifysampleprojectappusersandbox0e1752a889dataamplifyDataPersonPersonDataSourceDA3812F2Name":"PersonTable","referencetoamplifysampleprojectappusersandbox0e1752a889dataamplifyDataGraphQLAPIB1F14B28ApiId":"ezabg7fk2jecvodrblowtgbsme","referencetoamplifysampleprojectappusersandbox0e1752a889authNestedStackauthNestedStackResource1C2A2D1EOutputsamplifysampleprojectappusersandbox0e1752a889authamplifyAuthunauthenticatedUserRoleC92E0CFERef":"amplify-sampleprojectapp--amplifyAuthunauthenticate-0ZSS9wsA6Aut","referencetoamplifysampleprojectappusersandbox0e1752a889dataamplifyDataGraphQLAPINONEDS97A6DFB0Name":"NONE_DS","referencetoamplifysampleprojectappusersandbox0e1752a889authNestedStackauthNestedStackResource1C2A2D1EOutputsamplifysampleprojectappusersandbox0e1752a889authamplifyAuthauthenticatedUserRole11751600Ref":"amplify-sampleprojectapp--amplifyAuthauthenticatedU-JksUKi7c8Bvh","referencetoamplifysampleprojectappusersandbox0e1752a889dataamplifyDataPostNestedStackPostNestedStackResource01FEDE53Outputsamplifysampleprojectappusersandbox0e1752a889dataamplifyDataPostPostDataSourceED97F46CName":"PostTable"},"Tags":[{"Value":"sandbox","Key":"amplify:deployment-type"},{"Value":"amplifyData","Key":"amplify:friendly-name"},{"Value":"amplify","Key":"created-by"}]}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'amplifyDataConnectionStackNestedStackConnectionStackNestedStackResourceAB0F312B',
        },
        constructPath:
          'data/amplifyData/ConnectionStack.NestedStack/ConnectionStack.NestedStackResource',
      },
      progress: {
        completed: 30,
        formatted: ' 30',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C |  30 | 11:05:45 PM | DELETE_IN_PROGRESS | AWS::CloudFormation::Stack | data/amplifyData/Post.NestedStack/Post.NestedStackResource (amplifyDataPostNestedStackPostNestedStackResourceB65AFCD3)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C/b355b0f0-fe24-11ef-a0bd-020db6799971',
        EventId:
          'amplifyDataPostNestedStackPostNestedStackResourceB65AFCD3-DELETE_IN_PROGRESS-2025-03-11T03:05:45.650Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C',
        LogicalResourceId:
          'amplifyDataPostNestedStackPostNestedStackResourceB65AFCD3',
        PhysicalResourceId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R/e5bef6f0-fe24-11ef-b7fc-06822b500091',
        ResourceType: 'AWS::CloudFormation::Stack',
        Timestamp: new Date('2025-03-11T03:05:45.650'),
        ResourceStatus: 'DELETE_IN_PROGRESS',
        ResourceProperties:
          '{"TemplateURL":"https://s3.us-west-2.amazonaws.com/cdk-hnb659fds-assets-123456789012-us-west-2/209a0048df688fe6a8997016c796a69b318d368ae30d416e1656d209d881a050.json","Parameters":{"DynamoDBModelTableReadIOPS":"5","referencetoamplifysampleprojectappusersandbox0e1752a889dataamplifyDataAmplifyTableManagerNestedStackAmplifyTableManagerNestedStackResource9097D1B4Outputsamplifysampleprojectappusersandbox0e1752a889dataamplifyDataAmplifyTableManagerT93BF9650":"arn:aws:lambda:us-west-2:123456789012:function:amplify-sampleprojectapp--TableManagerCustomProvid-ejRomWhpK7wD","referencetoamplifysampleprojectappusersandbox0e1752a889authNestedStackauthNestedStackResource1C2A2D1EOutputsamplifysampleprojectappusersandbox0e1752a889authamplifyAuthIdentityPool5160F57DRef":"us-west-2:e3abf6f7-1ae5-4254-829e-0d8c9dc05bff","DynamoDBEnableServerSideEncryption":"true","referencetoamplifysampleprojectappusersandbox0e1752a889dataamplifyDataGraphQLAPIB1F14B28ApiId":"ezabg7fk2jecvodrblowtgbsme","DynamoDBEnablePointInTimeRecovery":"false","referencetoamplifysampleprojectappusersandbox0e1752a889authNestedStackauthNestedStackResource1C2A2D1EOutputsamplifysampleprojectappusersandbox0e1752a889authamplifyAuthunauthenticatedUserRoleC92E0CFERef":"amplify-sampleprojectapp--amplifyAuthunauthenticate-0ZSS9wsA6Aut","DynamoDBBillingMode":"PAY_PER_REQUEST","referencetoamplifysampleprojectappusersandbox0e1752a889dataamplifyDataGraphQLAPINONEDS97A6DFB0Name":"NONE_DS","DynamoDBModelTableWriteIOPS":"5","referencetoamplifysampleprojectappusersandbox0e1752a889authNestedStackauthNestedStackResource1C2A2D1EOutputsamplifysampleprojectappusersandbox0e1752a889authamplifyAuthauthenticatedUserRole11751600Ref":"amplify-sampleprojectapp--amplifyAuthauthenticatedU-JksUKi7c8Bvh"},"Tags":[{"Value":"sandbox","Key":"amplify:deployment-type"},{"Value":"amplifyData","Key":"amplify:friendly-name"},{"Value":"amplify","Key":"created-by"}]}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'amplifyDataPostNestedStackPostNestedStackResourceB65AFCD3',
        },
        constructPath:
          'data/amplifyData/Post.NestedStack/Post.NestedStackResource',
      },
      progress: {
        completed: 30,
        formatted: ' 30',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C |  30 | 11:05:45 PM | DELETE_IN_PROGRESS | AWS::CloudFormation::Stack | data/amplifyData/Person.NestedStack/Person.NestedStackResource (amplifyDataPersonNestedStackPersonNestedStackResource28D60818)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C/b355b0f0-fe24-11ef-a0bd-020db6799971',
        EventId:
          'amplifyDataPersonNestedStackPersonNestedStackResource28D60818-DELETE_IN_PROGRESS-2025-03-11T03:05:45.671Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C',
        LogicalResourceId:
          'amplifyDataPersonNestedStackPersonNestedStackResource28D60818',
        PhysicalResourceId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB/e5b11440-fe24-11ef-98e6-0abc8a28bbed',
        ResourceType: 'AWS::CloudFormation::Stack',
        Timestamp: new Date('2025-03-11T03:05:45.671'),
        ResourceStatus: 'DELETE_IN_PROGRESS',
        ResourceProperties:
          '{"TemplateURL":"https://s3.us-west-2.amazonaws.com/cdk-hnb659fds-assets-123456789012-us-west-2/f7bafc4fb5028045158fda2645f666d5744ff73a7236cbd21784e1b94aaef720.json","Parameters":{"DynamoDBModelTableReadIOPS":"5","referencetoamplifysampleprojectappusersandbox0e1752a889dataamplifyDataAmplifyTableManagerNestedStackAmplifyTableManagerNestedStackResource9097D1B4Outputsamplifysampleprojectappusersandbox0e1752a889dataamplifyDataAmplifyTableManagerT93BF9650":"arn:aws:lambda:us-west-2:123456789012:function:amplify-sampleprojectapp--TableManagerCustomProvid-ejRomWhpK7wD","referencetoamplifysampleprojectappusersandbox0e1752a889authNestedStackauthNestedStackResource1C2A2D1EOutputsamplifysampleprojectappusersandbox0e1752a889authamplifyAuthIdentityPool5160F57DRef":"us-west-2:e3abf6f7-1ae5-4254-829e-0d8c9dc05bff","DynamoDBEnableServerSideEncryption":"true","referencetoamplifysampleprojectappusersandbox0e1752a889dataamplifyDataGraphQLAPIB1F14B28ApiId":"ezabg7fk2jecvodrblowtgbsme","DynamoDBEnablePointInTimeRecovery":"false","referencetoamplifysampleprojectappusersandbox0e1752a889authNestedStackauthNestedStackResource1C2A2D1EOutputsamplifysampleprojectappusersandbox0e1752a889authamplifyAuthunauthenticatedUserRoleC92E0CFERef":"amplify-sampleprojectapp--amplifyAuthunauthenticate-0ZSS9wsA6Aut","DynamoDBBillingMode":"PAY_PER_REQUEST","referencetoamplifysampleprojectappusersandbox0e1752a889dataamplifyDataGraphQLAPINONEDS97A6DFB0Name":"NONE_DS","DynamoDBModelTableWriteIOPS":"5","referencetoamplifysampleprojectappusersandbox0e1752a889authNestedStackauthNestedStackResource1C2A2D1EOutputsamplifysampleprojectappusersandbox0e1752a889authamplifyAuthauthenticatedUserRole11751600Ref":"amplify-sampleprojectapp--amplifyAuthauthenticatedU-JksUKi7c8Bvh"},"Tags":[{"Value":"sandbox","Key":"amplify:deployment-type"},{"Value":"amplifyData","Key":"amplify:friendly-name"},{"Value":"amplify","Key":"created-by"}]}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'amplifyDataPersonNestedStackPersonNestedStackResource28D60818',
        },
        constructPath:
          'data/amplifyData/Person.NestedStack/Person.NestedStackResource',
      },
      progress: {
        completed: 30,
        formatted: ' 30',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R |  30 | 11:05:46 PM | DELETE_IN_PROGRESS | AWS::CloudFormation::Stack | amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R User Initiated',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R/e5bef6f0-fe24-11ef-b7fc-06822b500091',
        EventId: 'ba14b8e0-fe25-11ef-9777-0a099064122b',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R',
        LogicalResourceId:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R',
        PhysicalResourceId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R/e5bef6f0-fe24-11ef-b7fc-06822b500091',
        ResourceType: 'AWS::CloudFormation::Stack',
        Timestamp: new Date('2025-03-11T03:05:46.081'),
        ResourceStatus: 'DELETE_IN_PROGRESS',
        ResourceStatusReason: 'User Initiated',
      },
      progress: {
        completed: 30,
        formatted: ' 30',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB |  30 | 11:05:46 PM | DELETE_IN_PROGRESS | AWS::CloudFormation::Stack | amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB User Initiated',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB/e5b11440-fe24-11ef-98e6-0abc8a28bbed',
        EventId: 'ba20ede0-fe25-11ef-a0cb-028c33008bad',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB',
        LogicalResourceId:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB',
        PhysicalResourceId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB/e5b11440-fe24-11ef-98e6-0abc8a28bbed',
        ResourceType: 'AWS::CloudFormation::Stack',
        Timestamp: new Date('2025-03-11T03:05:46.158'),
        ResourceStatus: 'DELETE_IN_PROGRESS',
        ResourceStatusReason: 'User Initiated',
      },
      progress: {
        completed: 30,
        formatted: ' 30',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB |  30 | 11:05:48 PM | DELETE_IN_PROGRESS | AWS::AppSync::Resolver | data/amplifyData/Person/queryGetPersonResolver (GetPersonResolver)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB/e5b11440-fe24-11ef-98e6-0abc8a28bbed',
        EventId:
          'GetPersonResolver-DELETE_IN_PROGRESS-2025-03-11T03:05:48.512Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB',
        LogicalResourceId: 'GetPersonResolver',
        PhysicalResourceId:
          'arn:aws:appsync:us-west-2:123456789012:apis/ezabg7fk2jecvodrblowtgbsme/types/Query/resolvers/getPerson',
        ResourceType: 'AWS::AppSync::Resolver',
        Timestamp: new Date('2025-03-11T03:05:48.512'),
        ResourceStatus: 'DELETE_IN_PROGRESS',
        ResourceProperties:
          '{"TypeName":"Query","PipelineConfig":{"Functions":["fxp6umnevrgejoc6ie4evhvbuy","j7ma7m72dzbbxlvwxnswquvp7m","mww5bpc3ijalfmgmgcbffy3br4","nkxgdfksvrh4ljuf6l5df2liye"]},"RequestMappingTemplate":"$util.qr($ctx.stash.put(\\"typeName\\", \\"Query\\"))\\n$util.qr($ctx.stash.put(\\"fieldName\\", \\"getPerson\\"))\\n$util.qr($ctx.stash.put(\\"conditions\\", []))\\n$util.qr($ctx.stash.put(\\"metadata\\", {}))\\n$util.qr($ctx.stash.metadata.put(\\"dataSourceType\\", \\"AMAZON_DYNAMODB\\"))\\n$util.qr($ctx.stash.metadata.put(\\"apiId\\", \\"ezabg7fk2jecvodrblowtgbsme\\"))\\n$util.qr($ctx.stash.put(\\"connectionAttributes\\", {}))\\n$util.qr($ctx.stash.put(\\"tableName\\", \\"Person-ezabg7fk2jecvodrblowtgbsme-NONE\\"))\\n$util.qr($ctx.stash.put(\\"authRole\\", \\"arn:aws:sts::123456789012:assumed-role/amplify-sampleprojectapp--amplifyAuthauthenticatedU-JksUKi7c8Bvh/CognitoIdentityCredentials\\"))\\n$util.qr($ctx.stash.put(\\"unauthRole\\", \\"arn:aws:sts::123456789012:assumed-role/amplify-sampleprojectapp--amplifyAuthunauthenticate-0ZSS9wsA6Aut/CognitoIdentityCredentials\\"))\\n$util.qr($ctx.stash.put(\\"identityPoolId\\", \\"us-west-2:e3abf6f7-1ae5-4254-829e-0d8c9dc05bff\\"))\\n$util.qr($ctx.stash.put(\\"adminRoles\\", []))\\n$util.toJson({})","ResponseMappingTemplate":"$util.toJson($ctx.prev.result)","Kind":"PIPELINE","ApiId":"ezabg7fk2jecvodrblowtgbsme","FieldName":"getPerson"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'GetPersonResolver',
        },
        constructPath: 'data/amplifyData/Person/queryGetPersonResolver',
      },
      progress: {
        completed: 30,
        formatted: ' 30',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB |  30 | 11:05:48 PM | DELETE_IN_PROGRESS | AWS::AppSync::Resolver | data/amplifyData/Person/mutationCreatePersonResolver (CreatePersonResolver)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB/e5b11440-fe24-11ef-98e6-0abc8a28bbed',
        EventId:
          'CreatePersonResolver-DELETE_IN_PROGRESS-2025-03-11T03:05:48.516Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB',
        LogicalResourceId: 'CreatePersonResolver',
        PhysicalResourceId:
          'arn:aws:appsync:us-west-2:123456789012:apis/ezabg7fk2jecvodrblowtgbsme/types/Mutation/resolvers/createPerson',
        ResourceType: 'AWS::AppSync::Resolver',
        Timestamp: new Date('2025-03-11T03:05:48.516'),
        ResourceStatus: 'DELETE_IN_PROGRESS',
        ResourceProperties:
          '{"TypeName":"Mutation","PipelineConfig":{"Functions":["xfd65c2hkjhalpwxglpuq5sx7y","noijgh2g7venfeqfik4qgptz54","mmpex5pwczgq3ha6xzzqb3hlfu","kbbjrr24ifda3j7gjbnesczhfm","sbejvx5gmrefhnll6svxvubhzm"]},"RequestMappingTemplate":"$util.qr($ctx.stash.put(\\"typeName\\", \\"Mutation\\"))\\n$util.qr($ctx.stash.put(\\"fieldName\\", \\"createPerson\\"))\\n$util.qr($ctx.stash.put(\\"conditions\\", []))\\n$util.qr($ctx.stash.put(\\"metadata\\", {}))\\n$util.qr($ctx.stash.metadata.put(\\"dataSourceType\\", \\"AMAZON_DYNAMODB\\"))\\n$util.qr($ctx.stash.metadata.put(\\"apiId\\", \\"ezabg7fk2jecvodrblowtgbsme\\"))\\n$util.qr($ctx.stash.put(\\"connectionAttributes\\", {}))\\n$util.qr($ctx.stash.put(\\"tableName\\", \\"Person-ezabg7fk2jecvodrblowtgbsme-NONE\\"))\\n$util.qr($ctx.stash.put(\\"authRole\\", \\"arn:aws:sts::123456789012:assumed-role/amplify-sampleprojectapp--amplifyAuthauthenticatedU-JksUKi7c8Bvh/CognitoIdentityCredentials\\"))\\n$util.qr($ctx.stash.put(\\"unauthRole\\", \\"arn:aws:sts::123456789012:assumed-role/amplify-sampleprojectapp--amplifyAuthunauthenticate-0ZSS9wsA6Aut/CognitoIdentityCredentials\\"))\\n$util.qr($ctx.stash.put(\\"identityPoolId\\", \\"us-west-2:e3abf6f7-1ae5-4254-829e-0d8c9dc05bff\\"))\\n$util.qr($ctx.stash.put(\\"adminRoles\\", []))\\n$util.toJson({})","ResponseMappingTemplate":"$util.toJson($ctx.prev.result)","Kind":"PIPELINE","ApiId":"ezabg7fk2jecvodrblowtgbsme","FieldName":"createPerson"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'CreatePersonResolver',
        },
        constructPath: 'data/amplifyData/Person/mutationCreatePersonResolver',
      },
      progress: {
        completed: 30,
        formatted: ' 30',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB |  30 | 11:05:48 PM | DELETE_IN_PROGRESS | AWS::CDK::Metadata | auth/CDKMetadata/Default (CDKMetadata)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB/e5b11440-fe24-11ef-98e6-0abc8a28bbed',
        EventId: 'CDKMetadata-DELETE_IN_PROGRESS-2025-03-11T03:05:48.521Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB',
        LogicalResourceId: 'CDKMetadata',
        PhysicalResourceId: 'e5b11440-fe24-11ef-98e6-0abc8a28bbed',
        ResourceType: 'AWS::CDK::Metadata',
        Timestamp: new Date('2025-03-11T03:05:48.521'),
        ResourceStatus: 'DELETE_IN_PROGRESS',
        ResourceProperties:
          '{"Analytics":"v2:deflate64:H4sIAAAAAAAA/1WOwW6DMAyGn6X34BV66XUF7dhNsHtlEoNSQoJip1WFePcJOnXa6fcnf7L/AvJjAfsd3jnTZsicbWE+EwuZRlAPquz8F0YcSSiuUAZvrNjgVU0cUtSkysQSxj/s/GvGO19m8/A4BtPCN7aOTsikLI4w18E97eBoUThN/PAa5mrTq7ZCweZ18j99JK/XEmXwne1TxK3R72d3o7goPlyQmYThfQ3FBzglPZCsBZbV/UwyJVHbuhHsre8X5YMhuPLbrdhDfoR8d2Vrs5i82JGgfuYPmws9YTYBAAA="}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'CDKMetadata',
        },
        constructPath: 'auth/CDKMetadata/Default',
      },
      progress: {
        completed: 30,
        formatted: ' 30',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB |  30 | 11:05:48 PM | DELETE_IN_PROGRESS | AWS::AppSync::Resolver | data/amplifyData/Person/subscriptionOnDeletePersonResolver (SubscriptiononDeletePersonResolver)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB/e5b11440-fe24-11ef-98e6-0abc8a28bbed',
        EventId:
          'SubscriptiononDeletePersonResolver-DELETE_IN_PROGRESS-2025-03-11T03:05:48.525Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB',
        LogicalResourceId: 'SubscriptiononDeletePersonResolver',
        PhysicalResourceId:
          'arn:aws:appsync:us-west-2:123456789012:apis/ezabg7fk2jecvodrblowtgbsme/types/Subscription/resolvers/onDeletePerson',
        ResourceType: 'AWS::AppSync::Resolver',
        Timestamp: new Date('2025-03-11T03:05:48.525'),
        ResourceStatus: 'DELETE_IN_PROGRESS',
        ResourceProperties:
          '{"TypeName":"Subscription","PipelineConfig":{"Functions":["kuqwbehgnnfqxhxwg6pd3q4i24","d7ymp3hiu5di3gcqhfyopzsqhm","5dnepofrwvgj5o55dn4kyzboiu"]},"RequestMappingTemplate":"$util.qr($ctx.stash.put(\\"typeName\\", \\"Subscription\\"))\\n$util.qr($ctx.stash.put(\\"fieldName\\", \\"onDeletePerson\\"))\\n$util.qr($ctx.stash.put(\\"conditions\\", []))\\n$util.qr($ctx.stash.put(\\"metadata\\", {}))\\n$util.qr($ctx.stash.metadata.put(\\"dataSourceType\\", \\"NONE\\"))\\n$util.qr($ctx.stash.metadata.put(\\"apiId\\", \\"ezabg7fk2jecvodrblowtgbsme\\"))\\n$util.qr($ctx.stash.put(\\"connectionAttributes\\", {}))\\n\\n$util.qr($ctx.stash.put(\\"authRole\\", \\"arn:aws:sts::123456789012:assumed-role/amplify-sampleprojectapp--amplifyAuthauthenticatedU-JksUKi7c8Bvh/CognitoIdentityCredentials\\"))\\n$util.qr($ctx.stash.put(\\"unauthRole\\", \\"arn:aws:sts::123456789012:assumed-role/amplify-sampleprojectapp--amplifyAuthunauthenticate-0ZSS9wsA6Aut/CognitoIdentityCredentials\\"))\\n$util.qr($ctx.stash.put(\\"identityPoolId\\", \\"us-west-2:e3abf6f7-1ae5-4254-829e-0d8c9dc05bff\\"))\\n$util.qr($ctx.stash.put(\\"adminRoles\\", []))\\n$util.toJson({})","ResponseMappingTemplate":"$util.toJson($ctx.prev.result)","Kind":"PIPELINE","ApiId":"ezabg7fk2jecvodrblowtgbsme","FieldName":"onDeletePerson"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'SubscriptiononDeletePersonResolver',
        },
        constructPath:
          'data/amplifyData/Person/subscriptionOnDeletePersonResolver',
      },
      progress: {
        completed: 30,
        formatted: ' 30',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB |  30 | 11:05:48 PM | DELETE_IN_PROGRESS | AWS::AppSync::Resolver | data/amplifyData/Person/queryListPeopleResolver (ListPersonResolver)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB/e5b11440-fe24-11ef-98e6-0abc8a28bbed',
        EventId:
          'ListPersonResolver-DELETE_IN_PROGRESS-2025-03-11T03:05:48.531Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB',
        LogicalResourceId: 'ListPersonResolver',
        PhysicalResourceId:
          'arn:aws:appsync:us-west-2:123456789012:apis/ezabg7fk2jecvodrblowtgbsme/types/Query/resolvers/listPeople',
        ResourceType: 'AWS::AppSync::Resolver',
        Timestamp: new Date('2025-03-11T03:05:48.531'),
        ResourceStatus: 'DELETE_IN_PROGRESS',
        ResourceProperties:
          '{"TypeName":"Query","PipelineConfig":{"Functions":["2mjgtot57ja4rovhifofn6n24i","uspzxifumjg5vdjo3c5oxxi2jm","vsx6d6l5mbfqzloqw3n4zt7qbm","nbxjndnqqzconosf5uqiaqqbwe"]},"RequestMappingTemplate":"$util.qr($ctx.stash.put(\\"typeName\\", \\"Query\\"))\\n$util.qr($ctx.stash.put(\\"fieldName\\", \\"listPeople\\"))\\n$util.qr($ctx.stash.put(\\"conditions\\", []))\\n$util.qr($ctx.stash.put(\\"metadata\\", {}))\\n$util.qr($ctx.stash.metadata.put(\\"dataSourceType\\", \\"AMAZON_DYNAMODB\\"))\\n$util.qr($ctx.stash.metadata.put(\\"apiId\\", \\"ezabg7fk2jecvodrblowtgbsme\\"))\\n$util.qr($ctx.stash.put(\\"connectionAttributes\\", {}))\\n$util.qr($ctx.stash.put(\\"tableName\\", \\"Person-ezabg7fk2jecvodrblowtgbsme-NONE\\"))\\n$util.qr($ctx.stash.put(\\"authRole\\", \\"arn:aws:sts::123456789012:assumed-role/amplify-sampleprojectapp--amplifyAuthauthenticatedU-JksUKi7c8Bvh/CognitoIdentityCredentials\\"))\\n$util.qr($ctx.stash.put(\\"unauthRole\\", \\"arn:aws:sts::123456789012:assumed-role/amplify-sampleprojectapp--amplifyAuthunauthenticate-0ZSS9wsA6Aut/CognitoIdentityCredentials\\"))\\n$util.qr($ctx.stash.put(\\"identityPoolId\\", \\"us-west-2:e3abf6f7-1ae5-4254-829e-0d8c9dc05bff\\"))\\n$util.qr($ctx.stash.put(\\"adminRoles\\", []))\\n$util.toJson({})","ResponseMappingTemplate":"$util.toJson($ctx.prev.result)","Kind":"PIPELINE","ApiId":"ezabg7fk2jecvodrblowtgbsme","FieldName":"listPeople"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'ListPersonResolver',
        },
        constructPath: 'data/amplifyData/Person/queryListPeopleResolver',
      },
      progress: {
        completed: 30,
        formatted: ' 30',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB |  30 | 11:05:48 PM | DELETE_IN_PROGRESS | AWS::AppSync::Resolver | data/amplifyData/Person/mutationUpdatePersonResolver (UpdatePersonResolver)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB/e5b11440-fe24-11ef-98e6-0abc8a28bbed',
        EventId:
          'UpdatePersonResolver-DELETE_IN_PROGRESS-2025-03-11T03:05:48.543Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB',
        LogicalResourceId: 'UpdatePersonResolver',
        PhysicalResourceId:
          'arn:aws:appsync:us-west-2:123456789012:apis/ezabg7fk2jecvodrblowtgbsme/types/Mutation/resolvers/updatePerson',
        ResourceType: 'AWS::AppSync::Resolver',
        Timestamp: new Date('2025-03-11T03:05:48.543'),
        ResourceStatus: 'DELETE_IN_PROGRESS',
        ResourceProperties:
          '{"TypeName":"Mutation","PipelineConfig":{"Functions":["lrz6kxtwtjfdfojnsv4nrgi2ja","tte6urkn75guvfbryioaqkzgaq","3dherkbr6rgdrinqosb6vezy7a","iyqtinipsfbsrlrhgb62o7llf4","serryhyg4fe7djdoxekx7gkabi"]},"RequestMappingTemplate":"$util.qr($ctx.stash.put(\\"typeName\\", \\"Mutation\\"))\\n$util.qr($ctx.stash.put(\\"fieldName\\", \\"updatePerson\\"))\\n$util.qr($ctx.stash.put(\\"conditions\\", []))\\n$util.qr($ctx.stash.put(\\"metadata\\", {}))\\n$util.qr($ctx.stash.metadata.put(\\"dataSourceType\\", \\"AMAZON_DYNAMODB\\"))\\n$util.qr($ctx.stash.metadata.put(\\"apiId\\", \\"ezabg7fk2jecvodrblowtgbsme\\"))\\n$util.qr($ctx.stash.put(\\"connectionAttributes\\", {}))\\n$util.qr($ctx.stash.put(\\"tableName\\", \\"Person-ezabg7fk2jecvodrblowtgbsme-NONE\\"))\\n$util.qr($ctx.stash.put(\\"authRole\\", \\"arn:aws:sts::123456789012:assumed-role/amplify-sampleprojectapp--amplifyAuthauthenticatedU-JksUKi7c8Bvh/CognitoIdentityCredentials\\"))\\n$util.qr($ctx.stash.put(\\"unauthRole\\", \\"arn:aws:sts::123456789012:assumed-role/amplify-sampleprojectapp--amplifyAuthunauthenticate-0ZSS9wsA6Aut/CognitoIdentityCredentials\\"))\\n$util.qr($ctx.stash.put(\\"identityPoolId\\", \\"us-west-2:e3abf6f7-1ae5-4254-829e-0d8c9dc05bff\\"))\\n$util.qr($ctx.stash.put(\\"adminRoles\\", []))\\n$util.toJson({})","ResponseMappingTemplate":"$util.toJson($ctx.prev.result)","Kind":"PIPELINE","ApiId":"ezabg7fk2jecvodrblowtgbsme","FieldName":"updatePerson"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'UpdatePersonResolver',
        },
        constructPath: 'data/amplifyData/Person/mutationUpdatePersonResolver',
      },
      progress: {
        completed: 30,
        formatted: ' 30',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB |  30 | 11:05:48 PM | DELETE_IN_PROGRESS | AWS::AppSync::Resolver | data/amplifyData/Person/subscriptionOnCreatePersonResolver (SubscriptiononCreatePersonResolver)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB/e5b11440-fe24-11ef-98e6-0abc8a28bbed',
        EventId:
          'SubscriptiononCreatePersonResolver-DELETE_IN_PROGRESS-2025-03-11T03:05:48.548Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB',
        LogicalResourceId: 'SubscriptiononCreatePersonResolver',
        PhysicalResourceId:
          'arn:aws:appsync:us-west-2:123456789012:apis/ezabg7fk2jecvodrblowtgbsme/types/Subscription/resolvers/onCreatePerson',
        ResourceType: 'AWS::AppSync::Resolver',
        Timestamp: new Date('2025-03-11T03:05:48.548'),
        ResourceStatus: 'DELETE_IN_PROGRESS',
        ResourceProperties:
          '{"TypeName":"Subscription","PipelineConfig":{"Functions":["3y32gczezfendjwyhg3limpemu","zd37h5lkzvf4lkimvnuzml3ady","rk2xwwynencundrx4j6we63tli"]},"RequestMappingTemplate":"$util.qr($ctx.stash.put(\\"typeName\\", \\"Subscription\\"))\\n$util.qr($ctx.stash.put(\\"fieldName\\", \\"onCreatePerson\\"))\\n$util.qr($ctx.stash.put(\\"conditions\\", []))\\n$util.qr($ctx.stash.put(\\"metadata\\", {}))\\n$util.qr($ctx.stash.metadata.put(\\"dataSourceType\\", \\"NONE\\"))\\n$util.qr($ctx.stash.metadata.put(\\"apiId\\", \\"ezabg7fk2jecvodrblowtgbsme\\"))\\n$util.qr($ctx.stash.put(\\"connectionAttributes\\", {}))\\n\\n$util.qr($ctx.stash.put(\\"authRole\\", \\"arn:aws:sts::123456789012:assumed-role/amplify-sampleprojectapp--amplifyAuthauthenticatedU-JksUKi7c8Bvh/CognitoIdentityCredentials\\"))\\n$util.qr($ctx.stash.put(\\"unauthRole\\", \\"arn:aws:sts::123456789012:assumed-role/amplify-sampleprojectapp--amplifyAuthunauthenticate-0ZSS9wsA6Aut/CognitoIdentityCredentials\\"))\\n$util.qr($ctx.stash.put(\\"identityPoolId\\", \\"us-west-2:e3abf6f7-1ae5-4254-829e-0d8c9dc05bff\\"))\\n$util.qr($ctx.stash.put(\\"adminRoles\\", []))\\n$util.toJson({})","ResponseMappingTemplate":"$util.toJson($ctx.prev.result)","Kind":"PIPELINE","ApiId":"ezabg7fk2jecvodrblowtgbsme","FieldName":"onCreatePerson"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'SubscriptiononCreatePersonResolver',
        },
        constructPath:
          'data/amplifyData/Person/subscriptionOnCreatePersonResolver',
      },
      progress: {
        completed: 30,
        formatted: ' 30',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB |  30 | 11:05:48 PM | DELETE_IN_PROGRESS | AWS::AppSync::Resolver | data/amplifyData/Person/subscriptionOnUpdatePersonResolver (SubscriptiononUpdatePersonResolver)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB/e5b11440-fe24-11ef-98e6-0abc8a28bbed',
        EventId:
          'SubscriptiononUpdatePersonResolver-DELETE_IN_PROGRESS-2025-03-11T03:05:48.554Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB',
        LogicalResourceId: 'SubscriptiononUpdatePersonResolver',
        PhysicalResourceId:
          'arn:aws:appsync:us-west-2:123456789012:apis/ezabg7fk2jecvodrblowtgbsme/types/Subscription/resolvers/onUpdatePerson',
        ResourceType: 'AWS::AppSync::Resolver',
        Timestamp: new Date('2025-03-11T03:05:48.554'),
        ResourceStatus: 'DELETE_IN_PROGRESS',
        ResourceProperties:
          '{"TypeName":"Subscription","PipelineConfig":{"Functions":["wgp453i5nrd6hi7zr7s4zns6sm","pmyspxat2vdmjiymvjummc7s7m","zlyqslxpyvhcjpwcrtcrdteczm"]},"RequestMappingTemplate":"$util.qr($ctx.stash.put(\\"typeName\\", \\"Subscription\\"))\\n$util.qr($ctx.stash.put(\\"fieldName\\", \\"onUpdatePerson\\"))\\n$util.qr($ctx.stash.put(\\"conditions\\", []))\\n$util.qr($ctx.stash.put(\\"metadata\\", {}))\\n$util.qr($ctx.stash.metadata.put(\\"dataSourceType\\", \\"NONE\\"))\\n$util.qr($ctx.stash.metadata.put(\\"apiId\\", \\"ezabg7fk2jecvodrblowtgbsme\\"))\\n$util.qr($ctx.stash.put(\\"connectionAttributes\\", {}))\\n\\n$util.qr($ctx.stash.put(\\"authRole\\", \\"arn:aws:sts::123456789012:assumed-role/amplify-sampleprojectapp--amplifyAuthauthenticatedU-JksUKi7c8Bvh/CognitoIdentityCredentials\\"))\\n$util.qr($ctx.stash.put(\\"unauthRole\\", \\"arn:aws:sts::123456789012:assumed-role/amplify-sampleprojectapp--amplifyAuthunauthenticate-0ZSS9wsA6Aut/CognitoIdentityCredentials\\"))\\n$util.qr($ctx.stash.put(\\"identityPoolId\\", \\"us-west-2:e3abf6f7-1ae5-4254-829e-0d8c9dc05bff\\"))\\n$util.qr($ctx.stash.put(\\"adminRoles\\", []))\\n$util.toJson({})","ResponseMappingTemplate":"$util.toJson($ctx.prev.result)","Kind":"PIPELINE","ApiId":"ezabg7fk2jecvodrblowtgbsme","FieldName":"onUpdatePerson"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'SubscriptiononUpdatePersonResolver',
        },
        constructPath:
          'data/amplifyData/Person/subscriptionOnUpdatePersonResolver',
      },
      progress: {
        completed: 30,
        formatted: ' 30',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB |  30 | 11:05:48 PM | DELETE_IN_PROGRESS | AWS::AppSync::Resolver | data/amplifyData/Person/mutationDeletePersonResolver (DeletePersonResolver)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB/e5b11440-fe24-11ef-98e6-0abc8a28bbed',
        EventId:
          'DeletePersonResolver-DELETE_IN_PROGRESS-2025-03-11T03:05:48.561Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB',
        LogicalResourceId: 'DeletePersonResolver',
        PhysicalResourceId:
          'arn:aws:appsync:us-west-2:123456789012:apis/ezabg7fk2jecvodrblowtgbsme/types/Mutation/resolvers/deletePerson',
        ResourceType: 'AWS::AppSync::Resolver',
        Timestamp: new Date('2025-03-11T03:05:48.561'),
        ResourceStatus: 'DELETE_IN_PROGRESS',
        ResourceProperties:
          '{"TypeName":"Mutation","PipelineConfig":{"Functions":["ldrtgv7fn5dg7lhfkxrybojlfu","nf25vwky2beofdyqls3l43y4mm","4t65yjjtgrer3gyv2yvx4sjqwa","q3wd2u6gazbqxdlkvcfjqvqo2e"]},"RequestMappingTemplate":"$util.qr($ctx.stash.put(\\"typeName\\", \\"Mutation\\"))\\n$util.qr($ctx.stash.put(\\"fieldName\\", \\"deletePerson\\"))\\n$util.qr($ctx.stash.put(\\"conditions\\", []))\\n$util.qr($ctx.stash.put(\\"metadata\\", {}))\\n$util.qr($ctx.stash.metadata.put(\\"dataSourceType\\", \\"AMAZON_DYNAMODB\\"))\\n$util.qr($ctx.stash.metadata.put(\\"apiId\\", \\"ezabg7fk2jecvodrblowtgbsme\\"))\\n$util.qr($ctx.stash.put(\\"connectionAttributes\\", {}))\\n$util.qr($ctx.stash.put(\\"tableName\\", \\"Person-ezabg7fk2jecvodrblowtgbsme-NONE\\"))\\n$util.qr($ctx.stash.put(\\"authRole\\", \\"arn:aws:sts::123456789012:assumed-role/amplify-sampleprojectapp--amplifyAuthauthenticatedU-JksUKi7c8Bvh/CognitoIdentityCredentials\\"))\\n$util.qr($ctx.stash.put(\\"unauthRole\\", \\"arn:aws:sts::123456789012:assumed-role/amplify-sampleprojectapp--amplifyAuthunauthenticate-0ZSS9wsA6Aut/CognitoIdentityCredentials\\"))\\n$util.qr($ctx.stash.put(\\"identityPoolId\\", \\"us-west-2:e3abf6f7-1ae5-4254-829e-0d8c9dc05bff\\"))\\n$util.qr($ctx.stash.put(\\"adminRoles\\", []))\\n$util.toJson({})","ResponseMappingTemplate":"$util.toJson($ctx.prev.result)","Kind":"PIPELINE","ApiId":"ezabg7fk2jecvodrblowtgbsme","FieldName":"deletePerson"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'DeletePersonResolver',
        },
        constructPath: 'data/amplifyData/Person/mutationDeletePersonResolver',
      },
      progress: {
        completed: 30,
        formatted: ' 30',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R |  30 | 11:05:48 PM | DELETE_IN_PROGRESS | AWS::AppSync::Resolver | data/amplifyData/Post/queryGetPostResolver (GetPostResolver)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R/e5bef6f0-fe24-11ef-b7fc-06822b500091',
        EventId: 'GetPostResolver-DELETE_IN_PROGRESS-2025-03-11T03:05:48.564Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R',
        LogicalResourceId: 'GetPostResolver',
        PhysicalResourceId:
          'arn:aws:appsync:us-west-2:123456789012:apis/ezabg7fk2jecvodrblowtgbsme/types/Query/resolvers/getPost',
        ResourceType: 'AWS::AppSync::Resolver',
        Timestamp: new Date('2025-03-11T03:05:48.564'),
        ResourceStatus: 'DELETE_IN_PROGRESS',
        ResourceProperties:
          '{"TypeName":"Query","PipelineConfig":{"Functions":["tw4hgwx3wvffhiipskyxymdndm","cd6gzhw2hvfhbiqbalcomoptvm","l5x4teownbcydhkadu72ph7ela"]},"RequestMappingTemplate":"$util.qr($ctx.stash.put(\\"typeName\\", \\"Query\\"))\\n$util.qr($ctx.stash.put(\\"fieldName\\", \\"getPost\\"))\\n$util.qr($ctx.stash.put(\\"conditions\\", []))\\n$util.qr($ctx.stash.put(\\"metadata\\", {}))\\n$util.qr($ctx.stash.metadata.put(\\"dataSourceType\\", \\"AMAZON_DYNAMODB\\"))\\n$util.qr($ctx.stash.metadata.put(\\"apiId\\", \\"ezabg7fk2jecvodrblowtgbsme\\"))\\n$util.qr($ctx.stash.put(\\"connectionAttributes\\", {}))\\n$util.qr($ctx.stash.put(\\"tableName\\", \\"Post-ezabg7fk2jecvodrblowtgbsme-NONE\\"))\\n$util.qr($ctx.stash.put(\\"authRole\\", \\"arn:aws:sts::123456789012:assumed-role/amplify-sampleprojectapp--amplifyAuthauthenticatedU-JksUKi7c8Bvh/CognitoIdentityCredentials\\"))\\n$util.qr($ctx.stash.put(\\"unauthRole\\", \\"arn:aws:sts::123456789012:assumed-role/amplify-sampleprojectapp--amplifyAuthunauthenticate-0ZSS9wsA6Aut/CognitoIdentityCredentials\\"))\\n$util.qr($ctx.stash.put(\\"identityPoolId\\", \\"us-west-2:e3abf6f7-1ae5-4254-829e-0d8c9dc05bff\\"))\\n$util.qr($ctx.stash.put(\\"adminRoles\\", []))\\n$util.toJson({})","ResponseMappingTemplate":"$util.toJson($ctx.prev.result)","Kind":"PIPELINE","ApiId":"ezabg7fk2jecvodrblowtgbsme","FieldName":"getPost"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'GetPostResolver',
        },
        constructPath: 'data/amplifyData/Post/queryGetPostResolver',
      },
      progress: {
        completed: 30,
        formatted: ' 30',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R |  30 | 11:05:48 PM | DELETE_IN_PROGRESS | AWS::CDK::Metadata | auth/CDKMetadata/Default (CDKMetadata)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R/e5bef6f0-fe24-11ef-b7fc-06822b500091',
        EventId: 'CDKMetadata-DELETE_IN_PROGRESS-2025-03-11T03:05:48.568Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R',
        LogicalResourceId: 'CDKMetadata',
        PhysicalResourceId: 'e5bef6f0-fe24-11ef-b7fc-06822b500091',
        ResourceType: 'AWS::CDK::Metadata',
        Timestamp: new Date('2025-03-11T03:05:48.568'),
        ResourceStatus: 'DELETE_IN_PROGRESS',
        ResourceProperties:
          '{"Analytics":"v2:deflate64:H4sIAAAAAAAA/1WOwW6DMAyGn6X34BV66XUF7dhNsHtlEoNSQoJip1WFePcJOnXa6fcnf7L/AvJjAfsd3jnTZsicbWE+EwuZRlAPquz8F0YcSSiuUAZvrNjgVU0cUtSkysQSxj/s/GvGO19m8/A4BtPCN7aOTsikLI4w18E97eBoUThN/PAa5mrTq7ZCweZ18j99JK/XEmXwne1TxK3R72d3o7goPlyQmYThfQ3FBzglPZCsBZbV/UwyJVHbuhHsre8X5YMhuPLbrdhDfoR8d2Vrs5i82JGgfuYPmws9YTYBAAA="}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'CDKMetadata',
        },
        constructPath: 'auth/CDKMetadata/Default',
      },
      progress: {
        completed: 30,
        formatted: ' 30',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R |  30 | 11:05:48 PM | DELETE_IN_PROGRESS | AWS::AppSync::Resolver | data/amplifyData/Post/subscriptionOnCreatePostResolver (SubscriptiononCreatePostResolver)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R/e5bef6f0-fe24-11ef-b7fc-06822b500091',
        EventId:
          'SubscriptiononCreatePostResolver-DELETE_IN_PROGRESS-2025-03-11T03:05:48.569Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R',
        LogicalResourceId: 'SubscriptiononCreatePostResolver',
        PhysicalResourceId:
          'arn:aws:appsync:us-west-2:123456789012:apis/ezabg7fk2jecvodrblowtgbsme/types/Subscription/resolvers/onCreatePost',
        ResourceType: 'AWS::AppSync::Resolver',
        Timestamp: new Date('2025-03-11T03:05:48.569'),
        ResourceStatus: 'DELETE_IN_PROGRESS',
        ResourceProperties:
          '{"TypeName":"Subscription","PipelineConfig":{"Functions":["2ezpsvojyjgodfyvewghqayxlu","fvc4vbangzhkzl3uvsowmwbjga","w2szpeqivngldep65ixycjfztu"]},"RequestMappingTemplate":"$util.qr($ctx.stash.put(\\"typeName\\", \\"Subscription\\"))\\n$util.qr($ctx.stash.put(\\"fieldName\\", \\"onCreatePost\\"))\\n$util.qr($ctx.stash.put(\\"conditions\\", []))\\n$util.qr($ctx.stash.put(\\"metadata\\", {}))\\n$util.qr($ctx.stash.metadata.put(\\"dataSourceType\\", \\"NONE\\"))\\n$util.qr($ctx.stash.metadata.put(\\"apiId\\", \\"ezabg7fk2jecvodrblowtgbsme\\"))\\n$util.qr($ctx.stash.put(\\"connectionAttributes\\", {}))\\n\\n$util.qr($ctx.stash.put(\\"authRole\\", \\"arn:aws:sts::123456789012:assumed-role/amplify-sampleprojectapp--amplifyAuthauthenticatedU-JksUKi7c8Bvh/CognitoIdentityCredentials\\"))\\n$util.qr($ctx.stash.put(\\"unauthRole\\", \\"arn:aws:sts::123456789012:assumed-role/amplify-sampleprojectapp--amplifyAuthunauthenticate-0ZSS9wsA6Aut/CognitoIdentityCredentials\\"))\\n$util.qr($ctx.stash.put(\\"identityPoolId\\", \\"us-west-2:e3abf6f7-1ae5-4254-829e-0d8c9dc05bff\\"))\\n$util.qr($ctx.stash.put(\\"adminRoles\\", []))\\n$util.toJson({})","ResponseMappingTemplate":"$util.toJson($ctx.prev.result)","Kind":"PIPELINE","ApiId":"ezabg7fk2jecvodrblowtgbsme","FieldName":"onCreatePost"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'SubscriptiononCreatePostResolver',
        },
        constructPath: 'data/amplifyData/Post/subscriptionOnCreatePostResolver',
      },
      progress: {
        completed: 30,
        formatted: ' 30',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R |  30 | 11:05:48 PM | DELETE_IN_PROGRESS | AWS::AppSync::Resolver | data/amplifyData/Post/queryListPostByAuthorNameResolver (QuerylistPostByAuthorNameResolver)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R/e5bef6f0-fe24-11ef-b7fc-06822b500091',
        EventId:
          'QuerylistPostByAuthorNameResolver-DELETE_IN_PROGRESS-2025-03-11T03:05:48.570Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R',
        LogicalResourceId: 'QuerylistPostByAuthorNameResolver',
        PhysicalResourceId:
          'arn:aws:appsync:us-west-2:123456789012:apis/ezabg7fk2jecvodrblowtgbsme/types/Query/resolvers/listPostByAuthorName',
        ResourceType: 'AWS::AppSync::Resolver',
        Timestamp: new Date('2025-03-11T03:05:48.570'),
        ResourceStatus: 'DELETE_IN_PROGRESS',
        ResourceProperties:
          '{"TypeName":"Query","PipelineConfig":{"Functions":["nh4b4ttgorhm3ndystgvvgue5i","iwl7wvprhja55d7jsqsaqtwtoy","vk2nxrjf2ffglez74knppfwjje"]},"RequestMappingTemplate":"$util.qr($ctx.stash.put(\\"typeName\\", \\"Query\\"))\\n$util.qr($ctx.stash.put(\\"fieldName\\", \\"listPostByAuthorName\\"))\\n$util.qr($ctx.stash.put(\\"conditions\\", []))\\n$util.qr($ctx.stash.put(\\"metadata\\", {}))\\n$util.qr($ctx.stash.metadata.put(\\"dataSourceType\\", \\"AMAZON_DYNAMODB\\"))\\n$util.qr($ctx.stash.metadata.put(\\"apiId\\", \\"ezabg7fk2jecvodrblowtgbsme\\"))\\n$util.qr($ctx.stash.put(\\"connectionAttributes\\", {}))\\n$util.qr($ctx.stash.put(\\"tableName\\", \\"Post-ezabg7fk2jecvodrblowtgbsme-NONE\\"))\\n$util.qr($ctx.stash.put(\\"authRole\\", \\"arn:aws:sts::123456789012:assumed-role/amplify-sampleprojectapp--amplifyAuthauthenticatedU-JksUKi7c8Bvh/CognitoIdentityCredentials\\"))\\n$util.qr($ctx.stash.put(\\"unauthRole\\", \\"arn:aws:sts::123456789012:assumed-role/amplify-sampleprojectapp--amplifyAuthunauthenticate-0ZSS9wsA6Aut/CognitoIdentityCredentials\\"))\\n$util.qr($ctx.stash.put(\\"identityPoolId\\", \\"us-west-2:e3abf6f7-1ae5-4254-829e-0d8c9dc05bff\\"))\\n$util.qr($ctx.stash.put(\\"adminRoles\\", []))\\n$util.toJson({})","ResponseMappingTemplate":"$util.toJson($ctx.prev.result)","Kind":"PIPELINE","ApiId":"ezabg7fk2jecvodrblowtgbsme","FieldName":"listPostByAuthorName"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'QuerylistPostByAuthorNameResolver',
        },
        constructPath:
          'data/amplifyData/Post/queryListPostByAuthorNameResolver',
      },
      progress: {
        completed: 30,
        formatted: ' 30',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R |  30 | 11:05:48 PM | DELETE_IN_PROGRESS | AWS::AppSync::Resolver | data/amplifyData/Post/mutationDeletePostResolver (DeletePostResolver)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R/e5bef6f0-fe24-11ef-b7fc-06822b500091',
        EventId:
          'DeletePostResolver-DELETE_IN_PROGRESS-2025-03-11T03:05:48.573Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R',
        LogicalResourceId: 'DeletePostResolver',
        PhysicalResourceId:
          'arn:aws:appsync:us-west-2:123456789012:apis/ezabg7fk2jecvodrblowtgbsme/types/Mutation/resolvers/deletePost',
        ResourceType: 'AWS::AppSync::Resolver',
        Timestamp: new Date('2025-03-11T03:05:48.573'),
        ResourceStatus: 'DELETE_IN_PROGRESS',
        ResourceProperties:
          '{"TypeName":"Mutation","PipelineConfig":{"Functions":["ssvyddouovceliw6q2m4kzzi5m","p56gezborzcgjfz3fwywfvftva","pvq3kk3khrfsbcrwzsbndmzauq"]},"RequestMappingTemplate":"$util.qr($ctx.stash.put(\\"typeName\\", \\"Mutation\\"))\\n$util.qr($ctx.stash.put(\\"fieldName\\", \\"deletePost\\"))\\n$util.qr($ctx.stash.put(\\"conditions\\", []))\\n$util.qr($ctx.stash.put(\\"metadata\\", {}))\\n$util.qr($ctx.stash.metadata.put(\\"dataSourceType\\", \\"AMAZON_DYNAMODB\\"))\\n$util.qr($ctx.stash.metadata.put(\\"apiId\\", \\"ezabg7fk2jecvodrblowtgbsme\\"))\\n$util.qr($ctx.stash.put(\\"connectionAttributes\\", {}))\\n$util.qr($ctx.stash.put(\\"tableName\\", \\"Post-ezabg7fk2jecvodrblowtgbsme-NONE\\"))\\n$util.qr($ctx.stash.put(\\"authRole\\", \\"arn:aws:sts::123456789012:assumed-role/amplify-sampleprojectapp--amplifyAuthauthenticatedU-JksUKi7c8Bvh/CognitoIdentityCredentials\\"))\\n$util.qr($ctx.stash.put(\\"unauthRole\\", \\"arn:aws:sts::123456789012:assumed-role/amplify-sampleprojectapp--amplifyAuthunauthenticate-0ZSS9wsA6Aut/CognitoIdentityCredentials\\"))\\n$util.qr($ctx.stash.put(\\"identityPoolId\\", \\"us-west-2:e3abf6f7-1ae5-4254-829e-0d8c9dc05bff\\"))\\n$util.qr($ctx.stash.put(\\"adminRoles\\", []))\\n$util.toJson({})","ResponseMappingTemplate":"$util.toJson($ctx.prev.result)","Kind":"PIPELINE","ApiId":"ezabg7fk2jecvodrblowtgbsme","FieldName":"deletePost"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'DeletePostResolver',
        },
        constructPath: 'data/amplifyData/Post/mutationDeletePostResolver',
      },
      progress: {
        completed: 30,
        formatted: ' 30',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R |  30 | 11:05:48 PM | DELETE_IN_PROGRESS | AWS::AppSync::Resolver | data/amplifyData/Post/mutationUpdatePostResolver (UpdatePostResolver)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R/e5bef6f0-fe24-11ef-b7fc-06822b500091',
        EventId:
          'UpdatePostResolver-DELETE_IN_PROGRESS-2025-03-11T03:05:48.579Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R',
        LogicalResourceId: 'UpdatePostResolver',
        PhysicalResourceId:
          'arn:aws:appsync:us-west-2:123456789012:apis/ezabg7fk2jecvodrblowtgbsme/types/Mutation/resolvers/updatePost',
        ResourceType: 'AWS::AppSync::Resolver',
        Timestamp: new Date('2025-03-11T03:05:48.579'),
        ResourceStatus: 'DELETE_IN_PROGRESS',
        ResourceProperties:
          '{"TypeName":"Mutation","PipelineConfig":{"Functions":["tocmffiltfgwrkdmfmvz64o6de","h56cyfin3jdzrcumvncqwrt3re","pvonullxbzd5paawkz3o6sqdku","5mqbvtdbbrcxngsvhc3fskgcre"]},"RequestMappingTemplate":"$util.qr($ctx.stash.put(\\"typeName\\", \\"Mutation\\"))\\n$util.qr($ctx.stash.put(\\"fieldName\\", \\"updatePost\\"))\\n$util.qr($ctx.stash.put(\\"conditions\\", []))\\n$util.qr($ctx.stash.put(\\"metadata\\", {}))\\n$util.qr($ctx.stash.metadata.put(\\"dataSourceType\\", \\"AMAZON_DYNAMODB\\"))\\n$util.qr($ctx.stash.metadata.put(\\"apiId\\", \\"ezabg7fk2jecvodrblowtgbsme\\"))\\n$util.qr($ctx.stash.put(\\"connectionAttributes\\", {}))\\n$util.qr($ctx.stash.put(\\"tableName\\", \\"Post-ezabg7fk2jecvodrblowtgbsme-NONE\\"))\\n$util.qr($ctx.stash.put(\\"authRole\\", \\"arn:aws:sts::123456789012:assumed-role/amplify-sampleprojectapp--amplifyAuthauthenticatedU-JksUKi7c8Bvh/CognitoIdentityCredentials\\"))\\n$util.qr($ctx.stash.put(\\"unauthRole\\", \\"arn:aws:sts::123456789012:assumed-role/amplify-sampleprojectapp--amplifyAuthunauthenticate-0ZSS9wsA6Aut/CognitoIdentityCredentials\\"))\\n$util.qr($ctx.stash.put(\\"identityPoolId\\", \\"us-west-2:e3abf6f7-1ae5-4254-829e-0d8c9dc05bff\\"))\\n$util.qr($ctx.stash.put(\\"adminRoles\\", []))\\n$util.toJson({})","ResponseMappingTemplate":"$util.toJson($ctx.prev.result)","Kind":"PIPELINE","ApiId":"ezabg7fk2jecvodrblowtgbsme","FieldName":"updatePost"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'UpdatePostResolver',
        },
        constructPath: 'data/amplifyData/Post/mutationUpdatePostResolver',
      },
      progress: {
        completed: 30,
        formatted: ' 30',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R |  30 | 11:05:48 PM | DELETE_IN_PROGRESS | AWS::AppSync::Resolver | data/amplifyData/Post/subscriptionOnDeletePostResolver (SubscriptiononDeletePostResolver)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R/e5bef6f0-fe24-11ef-b7fc-06822b500091',
        EventId:
          'SubscriptiononDeletePostResolver-DELETE_IN_PROGRESS-2025-03-11T03:05:48.580Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R',
        LogicalResourceId: 'SubscriptiononDeletePostResolver',
        PhysicalResourceId:
          'arn:aws:appsync:us-west-2:123456789012:apis/ezabg7fk2jecvodrblowtgbsme/types/Subscription/resolvers/onDeletePost',
        ResourceType: 'AWS::AppSync::Resolver',
        Timestamp: new Date('2025-03-11T03:05:48.580'),
        ResourceStatus: 'DELETE_IN_PROGRESS',
        ResourceProperties:
          '{"TypeName":"Subscription","PipelineConfig":{"Functions":["abcwe3nj6zbana67525efaysou","h5rnjjorqbh4rdgtd6jukqm6ui","27v6y4gs7fgyxdfidakwt5l2ei"]},"RequestMappingTemplate":"$util.qr($ctx.stash.put(\\"typeName\\", \\"Subscription\\"))\\n$util.qr($ctx.stash.put(\\"fieldName\\", \\"onDeletePost\\"))\\n$util.qr($ctx.stash.put(\\"conditions\\", []))\\n$util.qr($ctx.stash.put(\\"metadata\\", {}))\\n$util.qr($ctx.stash.metadata.put(\\"dataSourceType\\", \\"NONE\\"))\\n$util.qr($ctx.stash.metadata.put(\\"apiId\\", \\"ezabg7fk2jecvodrblowtgbsme\\"))\\n$util.qr($ctx.stash.put(\\"connectionAttributes\\", {}))\\n\\n$util.qr($ctx.stash.put(\\"authRole\\", \\"arn:aws:sts::123456789012:assumed-role/amplify-sampleprojectapp--amplifyAuthauthenticatedU-JksUKi7c8Bvh/CognitoIdentityCredentials\\"))\\n$util.qr($ctx.stash.put(\\"unauthRole\\", \\"arn:aws:sts::123456789012:assumed-role/amplify-sampleprojectapp--amplifyAuthunauthenticate-0ZSS9wsA6Aut/CognitoIdentityCredentials\\"))\\n$util.qr($ctx.stash.put(\\"identityPoolId\\", \\"us-west-2:e3abf6f7-1ae5-4254-829e-0d8c9dc05bff\\"))\\n$util.qr($ctx.stash.put(\\"adminRoles\\", []))\\n$util.toJson({})","ResponseMappingTemplate":"$util.toJson($ctx.prev.result)","Kind":"PIPELINE","ApiId":"ezabg7fk2jecvodrblowtgbsme","FieldName":"onDeletePost"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'SubscriptiononDeletePostResolver',
        },
        constructPath: 'data/amplifyData/Post/subscriptionOnDeletePostResolver',
      },
      progress: {
        completed: 30,
        formatted: ' 30',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R |  30 | 11:05:48 PM | DELETE_IN_PROGRESS | AWS::AppSync::Resolver | data/amplifyData/Post/subscriptionOnUpdatePostResolver (SubscriptiononUpdatePostResolver)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R/e5bef6f0-fe24-11ef-b7fc-06822b500091',
        EventId:
          'SubscriptiononUpdatePostResolver-DELETE_IN_PROGRESS-2025-03-11T03:05:48.593Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R',
        LogicalResourceId: 'SubscriptiononUpdatePostResolver',
        PhysicalResourceId:
          'arn:aws:appsync:us-west-2:123456789012:apis/ezabg7fk2jecvodrblowtgbsme/types/Subscription/resolvers/onUpdatePost',
        ResourceType: 'AWS::AppSync::Resolver',
        Timestamp: new Date('2025-03-11T03:05:48.593'),
        ResourceStatus: 'DELETE_IN_PROGRESS',
        ResourceProperties:
          '{"TypeName":"Subscription","PipelineConfig":{"Functions":["4nq46sd6azeahfci3acjcaw3tu","2qwfcvfbqzbkfo54joge3g6ura","cmbpw7wa25bczaekpahob2sml4"]},"RequestMappingTemplate":"$util.qr($ctx.stash.put(\\"typeName\\", \\"Subscription\\"))\\n$util.qr($ctx.stash.put(\\"fieldName\\", \\"onUpdatePost\\"))\\n$util.qr($ctx.stash.put(\\"conditions\\", []))\\n$util.qr($ctx.stash.put(\\"metadata\\", {}))\\n$util.qr($ctx.stash.metadata.put(\\"dataSourceType\\", \\"NONE\\"))\\n$util.qr($ctx.stash.metadata.put(\\"apiId\\", \\"ezabg7fk2jecvodrblowtgbsme\\"))\\n$util.qr($ctx.stash.put(\\"connectionAttributes\\", {}))\\n\\n$util.qr($ctx.stash.put(\\"authRole\\", \\"arn:aws:sts::123456789012:assumed-role/amplify-sampleprojectapp--amplifyAuthauthenticatedU-JksUKi7c8Bvh/CognitoIdentityCredentials\\"))\\n$util.qr($ctx.stash.put(\\"unauthRole\\", \\"arn:aws:sts::123456789012:assumed-role/amplify-sampleprojectapp--amplifyAuthunauthenticate-0ZSS9wsA6Aut/CognitoIdentityCredentials\\"))\\n$util.qr($ctx.stash.put(\\"identityPoolId\\", \\"us-west-2:e3abf6f7-1ae5-4254-829e-0d8c9dc05bff\\"))\\n$util.qr($ctx.stash.put(\\"adminRoles\\", []))\\n$util.toJson({})","ResponseMappingTemplate":"$util.toJson($ctx.prev.result)","Kind":"PIPELINE","ApiId":"ezabg7fk2jecvodrblowtgbsme","FieldName":"onUpdatePost"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'SubscriptiononUpdatePostResolver',
        },
        constructPath: 'data/amplifyData/Post/subscriptionOnUpdatePostResolver',
      },
      progress: {
        completed: 30,
        formatted: ' 30',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R |  30 | 11:05:48 PM | DELETE_IN_PROGRESS | AWS::AppSync::Resolver | data/amplifyData/Post/mutationCreatePostResolver (CreatePostResolver)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R/e5bef6f0-fe24-11ef-b7fc-06822b500091',
        EventId:
          'CreatePostResolver-DELETE_IN_PROGRESS-2025-03-11T03:05:48.596Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R',
        LogicalResourceId: 'CreatePostResolver',
        PhysicalResourceId:
          'arn:aws:appsync:us-west-2:123456789012:apis/ezabg7fk2jecvodrblowtgbsme/types/Mutation/resolvers/createPost',
        ResourceType: 'AWS::AppSync::Resolver',
        Timestamp: new Date('2025-03-11T03:05:48.596'),
        ResourceStatus: 'DELETE_IN_PROGRESS',
        ResourceProperties:
          '{"TypeName":"Mutation","PipelineConfig":{"Functions":["qfnbqqjwynb3dggxi5mblscjii","fo2zebakl5fgfe5kc447qiduti","3qgda5e5kvhxdjvqvlvluiztjm","jiwbcpe745fzrn4rwsgiqn6plq"]},"RequestMappingTemplate":"$util.qr($ctx.stash.put(\\"typeName\\", \\"Mutation\\"))\\n$util.qr($ctx.stash.put(\\"fieldName\\", \\"createPost\\"))\\n$util.qr($ctx.stash.put(\\"conditions\\", []))\\n$util.qr($ctx.stash.put(\\"metadata\\", {}))\\n$util.qr($ctx.stash.metadata.put(\\"dataSourceType\\", \\"AMAZON_DYNAMODB\\"))\\n$util.qr($ctx.stash.metadata.put(\\"apiId\\", \\"ezabg7fk2jecvodrblowtgbsme\\"))\\n$util.qr($ctx.stash.put(\\"connectionAttributes\\", {}))\\n$util.qr($ctx.stash.put(\\"tableName\\", \\"Post-ezabg7fk2jecvodrblowtgbsme-NONE\\"))\\n$util.qr($ctx.stash.put(\\"authRole\\", \\"arn:aws:sts::123456789012:assumed-role/amplify-sampleprojectapp--amplifyAuthauthenticatedU-JksUKi7c8Bvh/CognitoIdentityCredentials\\"))\\n$util.qr($ctx.stash.put(\\"unauthRole\\", \\"arn:aws:sts::123456789012:assumed-role/amplify-sampleprojectapp--amplifyAuthunauthenticate-0ZSS9wsA6Aut/CognitoIdentityCredentials\\"))\\n$util.qr($ctx.stash.put(\\"identityPoolId\\", \\"us-west-2:e3abf6f7-1ae5-4254-829e-0d8c9dc05bff\\"))\\n$util.qr($ctx.stash.put(\\"adminRoles\\", []))\\n$util.toJson({})","ResponseMappingTemplate":"$util.toJson($ctx.prev.result)","Kind":"PIPELINE","ApiId":"ezabg7fk2jecvodrblowtgbsme","FieldName":"createPost"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'CreatePostResolver',
        },
        constructPath: 'data/amplifyData/Post/mutationCreatePostResolver',
      },
      progress: {
        completed: 30,
        formatted: ' 30',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R |  30 | 11:05:48 PM | DELETE_IN_PROGRESS | AWS::AppSync::Resolver | data/amplifyData/Post/queryListPostsResolver (ListPostResolver)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R/e5bef6f0-fe24-11ef-b7fc-06822b500091',
        EventId: 'ListPostResolver-DELETE_IN_PROGRESS-2025-03-11T03:05:48.599Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R',
        LogicalResourceId: 'ListPostResolver',
        PhysicalResourceId:
          'arn:aws:appsync:us-west-2:123456789012:apis/ezabg7fk2jecvodrblowtgbsme/types/Query/resolvers/listPosts',
        ResourceType: 'AWS::AppSync::Resolver',
        Timestamp: new Date('2025-03-11T03:05:48.599'),
        ResourceStatus: 'DELETE_IN_PROGRESS',
        ResourceProperties:
          '{"TypeName":"Query","PipelineConfig":{"Functions":["6kxyzas33vbuvbhk3xajbz2z5y","dzerewvuincjxfwfmfgvar4xvq","clulgnswsve7rd4plicn4dtaaa"]},"RequestMappingTemplate":"$util.qr($ctx.stash.put(\\"typeName\\", \\"Query\\"))\\n$util.qr($ctx.stash.put(\\"fieldName\\", \\"listPosts\\"))\\n$util.qr($ctx.stash.put(\\"conditions\\", []))\\n$util.qr($ctx.stash.put(\\"metadata\\", {}))\\n$util.qr($ctx.stash.metadata.put(\\"dataSourceType\\", \\"AMAZON_DYNAMODB\\"))\\n$util.qr($ctx.stash.metadata.put(\\"apiId\\", \\"ezabg7fk2jecvodrblowtgbsme\\"))\\n$util.qr($ctx.stash.put(\\"connectionAttributes\\", {}))\\n$util.qr($ctx.stash.put(\\"tableName\\", \\"Post-ezabg7fk2jecvodrblowtgbsme-NONE\\"))\\n$util.qr($ctx.stash.put(\\"authRole\\", \\"arn:aws:sts::123456789012:assumed-role/amplify-sampleprojectapp--amplifyAuthauthenticatedU-JksUKi7c8Bvh/CognitoIdentityCredentials\\"))\\n$util.qr($ctx.stash.put(\\"unauthRole\\", \\"arn:aws:sts::123456789012:assumed-role/amplify-sampleprojectapp--amplifyAuthunauthenticate-0ZSS9wsA6Aut/CognitoIdentityCredentials\\"))\\n$util.qr($ctx.stash.put(\\"identityPoolId\\", \\"us-west-2:e3abf6f7-1ae5-4254-829e-0d8c9dc05bff\\"))\\n$util.qr($ctx.stash.put(\\"adminRoles\\", []))\\n$util.toJson({})","ResponseMappingTemplate":"$util.toJson($ctx.prev.result)","Kind":"PIPELINE","ApiId":"ezabg7fk2jecvodrblowtgbsme","FieldName":"listPosts"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'ListPostResolver',
        },
        constructPath: 'data/amplifyData/Post/queryListPostsResolver',
      },
      progress: {
        completed: 30,
        formatted: ' 30',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R |  29 | 11:05:49 PM | DELETE_COMPLETE | AWS::CDK::Metadata | auth/CDKMetadata/Default (CDKMetadata)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R/e5bef6f0-fe24-11ef-b7fc-06822b500091',
        EventId: 'CDKMetadata-DELETE_COMPLETE-2025-03-11T03:05:49.416Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R',
        LogicalResourceId: 'CDKMetadata',
        PhysicalResourceId: 'e5bef6f0-fe24-11ef-b7fc-06822b500091',
        ResourceType: 'AWS::CDK::Metadata',
        Timestamp: new Date('2025-03-11T03:05:49.416'),
        ResourceStatus: 'DELETE_COMPLETE',
        ResourceProperties:
          '{"Analytics":"v2:deflate64:H4sIAAAAAAAA/1WOwW6DMAyGn6X34BV66XUF7dhNsHtlEoNSQoJip1WFePcJOnXa6fcnf7L/AvJjAfsd3jnTZsicbWE+EwuZRlAPquz8F0YcSSiuUAZvrNjgVU0cUtSkysQSxj/s/GvGO19m8/A4BtPCN7aOTsikLI4w18E97eBoUThN/PAa5mrTq7ZCweZ18j99JK/XEmXwne1TxK3R72d3o7goPlyQmYThfQ3FBzglPZCsBZbV/UwyJVHbuhHsre8X5YMhuPLbrdhDfoR8d2Vrs5i82JGgfuYPmws9YTYBAAA="}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'CDKMetadata',
        },
        constructPath: 'auth/CDKMetadata/Default',
      },
      progress: {
        completed: 29,
        formatted: ' 29',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R |  30 | 11:05:49 PM | DELETE_COMPLETE | AWS::AppSync::Resolver | data/amplifyData/Post/queryGetPostResolver (GetPostResolver)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R/e5bef6f0-fe24-11ef-b7fc-06822b500091',
        EventId: 'GetPostResolver-DELETE_COMPLETE-2025-03-11T03:05:49.620Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R',
        LogicalResourceId: 'GetPostResolver',
        PhysicalResourceId:
          'arn:aws:appsync:us-west-2:123456789012:apis/ezabg7fk2jecvodrblowtgbsme/types/Query/resolvers/getPost',
        ResourceType: 'AWS::AppSync::Resolver',
        Timestamp: new Date('2025-03-11T03:05:49.620'),
        ResourceStatus: 'DELETE_COMPLETE',
        ResourceProperties:
          '{"TypeName":"Query","PipelineConfig":{"Functions":["tw4hgwx3wvffhiipskyxymdndm","cd6gzhw2hvfhbiqbalcomoptvm","l5x4teownbcydhkadu72ph7ela"]},"RequestMappingTemplate":"$util.qr($ctx.stash.put(\\"typeName\\", \\"Query\\"))\\n$util.qr($ctx.stash.put(\\"fieldName\\", \\"getPost\\"))\\n$util.qr($ctx.stash.put(\\"conditions\\", []))\\n$util.qr($ctx.stash.put(\\"metadata\\", {}))\\n$util.qr($ctx.stash.metadata.put(\\"dataSourceType\\", \\"AMAZON_DYNAMODB\\"))\\n$util.qr($ctx.stash.metadata.put(\\"apiId\\", \\"ezabg7fk2jecvodrblowtgbsme\\"))\\n$util.qr($ctx.stash.put(\\"connectionAttributes\\", {}))\\n$util.qr($ctx.stash.put(\\"tableName\\", \\"Post-ezabg7fk2jecvodrblowtgbsme-NONE\\"))\\n$util.qr($ctx.stash.put(\\"authRole\\", \\"arn:aws:sts::123456789012:assumed-role/amplify-sampleprojectapp--amplifyAuthauthenticatedU-JksUKi7c8Bvh/CognitoIdentityCredentials\\"))\\n$util.qr($ctx.stash.put(\\"unauthRole\\", \\"arn:aws:sts::123456789012:assumed-role/amplify-sampleprojectapp--amplifyAuthunauthenticate-0ZSS9wsA6Aut/CognitoIdentityCredentials\\"))\\n$util.qr($ctx.stash.put(\\"identityPoolId\\", \\"us-west-2:e3abf6f7-1ae5-4254-829e-0d8c9dc05bff\\"))\\n$util.qr($ctx.stash.put(\\"adminRoles\\", []))\\n$util.toJson({})","ResponseMappingTemplate":"$util.toJson($ctx.prev.result)","Kind":"PIPELINE","ApiId":"ezabg7fk2jecvodrblowtgbsme","FieldName":"getPost"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'GetPostResolver',
        },
        constructPath: 'data/amplifyData/Post/queryGetPostResolver',
      },
      progress: {
        completed: 30,
        formatted: ' 30',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R |  31 | 11:05:49 PM | DELETE_COMPLETE | AWS::AppSync::Resolver | data/amplifyData/Post/subscriptionOnUpdatePostResolver (SubscriptiononUpdatePostResolver)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R/e5bef6f0-fe24-11ef-b7fc-06822b500091',
        EventId:
          'SubscriptiononUpdatePostResolver-DELETE_COMPLETE-2025-03-11T03:05:49.705Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R',
        LogicalResourceId: 'SubscriptiononUpdatePostResolver',
        PhysicalResourceId:
          'arn:aws:appsync:us-west-2:123456789012:apis/ezabg7fk2jecvodrblowtgbsme/types/Subscription/resolvers/onUpdatePost',
        ResourceType: 'AWS::AppSync::Resolver',
        Timestamp: new Date('2025-03-11T03:05:49.705'),
        ResourceStatus: 'DELETE_COMPLETE',
        ResourceProperties:
          '{"TypeName":"Subscription","PipelineConfig":{"Functions":["4nq46sd6azeahfci3acjcaw3tu","2qwfcvfbqzbkfo54joge3g6ura","cmbpw7wa25bczaekpahob2sml4"]},"RequestMappingTemplate":"$util.qr($ctx.stash.put(\\"typeName\\", \\"Subscription\\"))\\n$util.qr($ctx.stash.put(\\"fieldName\\", \\"onUpdatePost\\"))\\n$util.qr($ctx.stash.put(\\"conditions\\", []))\\n$util.qr($ctx.stash.put(\\"metadata\\", {}))\\n$util.qr($ctx.stash.metadata.put(\\"dataSourceType\\", \\"NONE\\"))\\n$util.qr($ctx.stash.metadata.put(\\"apiId\\", \\"ezabg7fk2jecvodrblowtgbsme\\"))\\n$util.qr($ctx.stash.put(\\"connectionAttributes\\", {}))\\n\\n$util.qr($ctx.stash.put(\\"authRole\\", \\"arn:aws:sts::123456789012:assumed-role/amplify-sampleprojectapp--amplifyAuthauthenticatedU-JksUKi7c8Bvh/CognitoIdentityCredentials\\"))\\n$util.qr($ctx.stash.put(\\"unauthRole\\", \\"arn:aws:sts::123456789012:assumed-role/amplify-sampleprojectapp--amplifyAuthunauthenticate-0ZSS9wsA6Aut/CognitoIdentityCredentials\\"))\\n$util.qr($ctx.stash.put(\\"identityPoolId\\", \\"us-west-2:e3abf6f7-1ae5-4254-829e-0d8c9dc05bff\\"))\\n$util.qr($ctx.stash.put(\\"adminRoles\\", []))\\n$util.toJson({})","ResponseMappingTemplate":"$util.toJson($ctx.prev.result)","Kind":"PIPELINE","ApiId":"ezabg7fk2jecvodrblowtgbsme","FieldName":"onUpdatePost"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'SubscriptiononUpdatePostResolver',
        },
        constructPath: 'data/amplifyData/Post/subscriptionOnUpdatePostResolver',
      },
      progress: {
        completed: 31,
        formatted: ' 31',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R |  32 | 11:05:49 PM | DELETE_COMPLETE | AWS::AppSync::Resolver | data/amplifyData/Post/subscriptionOnCreatePostResolver (SubscriptiononCreatePostResolver)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R/e5bef6f0-fe24-11ef-b7fc-06822b500091',
        EventId:
          'SubscriptiononCreatePostResolver-DELETE_COMPLETE-2025-03-11T03:05:49.721Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R',
        LogicalResourceId: 'SubscriptiononCreatePostResolver',
        PhysicalResourceId:
          'arn:aws:appsync:us-west-2:123456789012:apis/ezabg7fk2jecvodrblowtgbsme/types/Subscription/resolvers/onCreatePost',
        ResourceType: 'AWS::AppSync::Resolver',
        Timestamp: new Date('2025-03-11T03:05:49.721'),
        ResourceStatus: 'DELETE_COMPLETE',
        ResourceProperties:
          '{"TypeName":"Subscription","PipelineConfig":{"Functions":["2ezpsvojyjgodfyvewghqayxlu","fvc4vbangzhkzl3uvsowmwbjga","w2szpeqivngldep65ixycjfztu"]},"RequestMappingTemplate":"$util.qr($ctx.stash.put(\\"typeName\\", \\"Subscription\\"))\\n$util.qr($ctx.stash.put(\\"fieldName\\", \\"onCreatePost\\"))\\n$util.qr($ctx.stash.put(\\"conditions\\", []))\\n$util.qr($ctx.stash.put(\\"metadata\\", {}))\\n$util.qr($ctx.stash.metadata.put(\\"dataSourceType\\", \\"NONE\\"))\\n$util.qr($ctx.stash.metadata.put(\\"apiId\\", \\"ezabg7fk2jecvodrblowtgbsme\\"))\\n$util.qr($ctx.stash.put(\\"connectionAttributes\\", {}))\\n\\n$util.qr($ctx.stash.put(\\"authRole\\", \\"arn:aws:sts::123456789012:assumed-role/amplify-sampleprojectapp--amplifyAuthauthenticatedU-JksUKi7c8Bvh/CognitoIdentityCredentials\\"))\\n$util.qr($ctx.stash.put(\\"unauthRole\\", \\"arn:aws:sts::123456789012:assumed-role/amplify-sampleprojectapp--amplifyAuthunauthenticate-0ZSS9wsA6Aut/CognitoIdentityCredentials\\"))\\n$util.qr($ctx.stash.put(\\"identityPoolId\\", \\"us-west-2:e3abf6f7-1ae5-4254-829e-0d8c9dc05bff\\"))\\n$util.qr($ctx.stash.put(\\"adminRoles\\", []))\\n$util.toJson({})","ResponseMappingTemplate":"$util.toJson($ctx.prev.result)","Kind":"PIPELINE","ApiId":"ezabg7fk2jecvodrblowtgbsme","FieldName":"onCreatePost"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'SubscriptiononCreatePostResolver',
        },
        constructPath: 'data/amplifyData/Post/subscriptionOnCreatePostResolver',
      },
      progress: {
        completed: 32,
        formatted: ' 32',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R |  33 | 11:05:49 PM | DELETE_COMPLETE | AWS::AppSync::Resolver | data/amplifyData/Post/queryListPostsResolver (ListPostResolver)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R/e5bef6f0-fe24-11ef-b7fc-06822b500091',
        EventId: 'ListPostResolver-DELETE_COMPLETE-2025-03-11T03:05:49.771Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R',
        LogicalResourceId: 'ListPostResolver',
        PhysicalResourceId:
          'arn:aws:appsync:us-west-2:123456789012:apis/ezabg7fk2jecvodrblowtgbsme/types/Query/resolvers/listPosts',
        ResourceType: 'AWS::AppSync::Resolver',
        Timestamp: new Date('2025-03-11T03:05:49.771'),
        ResourceStatus: 'DELETE_COMPLETE',
        ResourceProperties:
          '{"TypeName":"Query","PipelineConfig":{"Functions":["6kxyzas33vbuvbhk3xajbz2z5y","dzerewvuincjxfwfmfgvar4xvq","clulgnswsve7rd4plicn4dtaaa"]},"RequestMappingTemplate":"$util.qr($ctx.stash.put(\\"typeName\\", \\"Query\\"))\\n$util.qr($ctx.stash.put(\\"fieldName\\", \\"listPosts\\"))\\n$util.qr($ctx.stash.put(\\"conditions\\", []))\\n$util.qr($ctx.stash.put(\\"metadata\\", {}))\\n$util.qr($ctx.stash.metadata.put(\\"dataSourceType\\", \\"AMAZON_DYNAMODB\\"))\\n$util.qr($ctx.stash.metadata.put(\\"apiId\\", \\"ezabg7fk2jecvodrblowtgbsme\\"))\\n$util.qr($ctx.stash.put(\\"connectionAttributes\\", {}))\\n$util.qr($ctx.stash.put(\\"tableName\\", \\"Post-ezabg7fk2jecvodrblowtgbsme-NONE\\"))\\n$util.qr($ctx.stash.put(\\"authRole\\", \\"arn:aws:sts::123456789012:assumed-role/amplify-sampleprojectapp--amplifyAuthauthenticatedU-JksUKi7c8Bvh/CognitoIdentityCredentials\\"))\\n$util.qr($ctx.stash.put(\\"unauthRole\\", \\"arn:aws:sts::123456789012:assumed-role/amplify-sampleprojectapp--amplifyAuthunauthenticate-0ZSS9wsA6Aut/CognitoIdentityCredentials\\"))\\n$util.qr($ctx.stash.put(\\"identityPoolId\\", \\"us-west-2:e3abf6f7-1ae5-4254-829e-0d8c9dc05bff\\"))\\n$util.qr($ctx.stash.put(\\"adminRoles\\", []))\\n$util.toJson({})","ResponseMappingTemplate":"$util.toJson($ctx.prev.result)","Kind":"PIPELINE","ApiId":"ezabg7fk2jecvodrblowtgbsme","FieldName":"listPosts"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'ListPostResolver',
        },
        constructPath: 'data/amplifyData/Post/queryListPostsResolver',
      },
      progress: {
        completed: 33,
        formatted: ' 33',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R |  34 | 11:05:49 PM | DELETE_COMPLETE | AWS::AppSync::Resolver | data/amplifyData/Post/mutationDeletePostResolver (DeletePostResolver)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R/e5bef6f0-fe24-11ef-b7fc-06822b500091',
        EventId: 'DeletePostResolver-DELETE_COMPLETE-2025-03-11T03:05:49.775Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R',
        LogicalResourceId: 'DeletePostResolver',
        PhysicalResourceId:
          'arn:aws:appsync:us-west-2:123456789012:apis/ezabg7fk2jecvodrblowtgbsme/types/Mutation/resolvers/deletePost',
        ResourceType: 'AWS::AppSync::Resolver',
        Timestamp: new Date('2025-03-11T03:05:49.775'),
        ResourceStatus: 'DELETE_COMPLETE',
        ResourceProperties:
          '{"TypeName":"Mutation","PipelineConfig":{"Functions":["ssvyddouovceliw6q2m4kzzi5m","p56gezborzcgjfz3fwywfvftva","pvq3kk3khrfsbcrwzsbndmzauq"]},"RequestMappingTemplate":"$util.qr($ctx.stash.put(\\"typeName\\", \\"Mutation\\"))\\n$util.qr($ctx.stash.put(\\"fieldName\\", \\"deletePost\\"))\\n$util.qr($ctx.stash.put(\\"conditions\\", []))\\n$util.qr($ctx.stash.put(\\"metadata\\", {}))\\n$util.qr($ctx.stash.metadata.put(\\"dataSourceType\\", \\"AMAZON_DYNAMODB\\"))\\n$util.qr($ctx.stash.metadata.put(\\"apiId\\", \\"ezabg7fk2jecvodrblowtgbsme\\"))\\n$util.qr($ctx.stash.put(\\"connectionAttributes\\", {}))\\n$util.qr($ctx.stash.put(\\"tableName\\", \\"Post-ezabg7fk2jecvodrblowtgbsme-NONE\\"))\\n$util.qr($ctx.stash.put(\\"authRole\\", \\"arn:aws:sts::123456789012:assumed-role/amplify-sampleprojectapp--amplifyAuthauthenticatedU-JksUKi7c8Bvh/CognitoIdentityCredentials\\"))\\n$util.qr($ctx.stash.put(\\"unauthRole\\", \\"arn:aws:sts::123456789012:assumed-role/amplify-sampleprojectapp--amplifyAuthunauthenticate-0ZSS9wsA6Aut/CognitoIdentityCredentials\\"))\\n$util.qr($ctx.stash.put(\\"identityPoolId\\", \\"us-west-2:e3abf6f7-1ae5-4254-829e-0d8c9dc05bff\\"))\\n$util.qr($ctx.stash.put(\\"adminRoles\\", []))\\n$util.toJson({})","ResponseMappingTemplate":"$util.toJson($ctx.prev.result)","Kind":"PIPELINE","ApiId":"ezabg7fk2jecvodrblowtgbsme","FieldName":"deletePost"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'DeletePostResolver',
        },
        constructPath: 'data/amplifyData/Post/mutationDeletePostResolver',
      },
      progress: {
        completed: 34,
        formatted: ' 34',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R |  35 | 11:05:49 PM | DELETE_COMPLETE | AWS::AppSync::Resolver | data/amplifyData/Post/queryListPostByAuthorNameResolver (QuerylistPostByAuthorNameResolver)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R/e5bef6f0-fe24-11ef-b7fc-06822b500091',
        EventId:
          'QuerylistPostByAuthorNameResolver-DELETE_COMPLETE-2025-03-11T03:05:49.776Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R',
        LogicalResourceId: 'QuerylistPostByAuthorNameResolver',
        PhysicalResourceId:
          'arn:aws:appsync:us-west-2:123456789012:apis/ezabg7fk2jecvodrblowtgbsme/types/Query/resolvers/listPostByAuthorName',
        ResourceType: 'AWS::AppSync::Resolver',
        Timestamp: new Date('2025-03-11T03:05:49.776'),
        ResourceStatus: 'DELETE_COMPLETE',
        ResourceProperties:
          '{"TypeName":"Query","PipelineConfig":{"Functions":["nh4b4ttgorhm3ndystgvvgue5i","iwl7wvprhja55d7jsqsaqtwtoy","vk2nxrjf2ffglez74knppfwjje"]},"RequestMappingTemplate":"$util.qr($ctx.stash.put(\\"typeName\\", \\"Query\\"))\\n$util.qr($ctx.stash.put(\\"fieldName\\", \\"listPostByAuthorName\\"))\\n$util.qr($ctx.stash.put(\\"conditions\\", []))\\n$util.qr($ctx.stash.put(\\"metadata\\", {}))\\n$util.qr($ctx.stash.metadata.put(\\"dataSourceType\\", \\"AMAZON_DYNAMODB\\"))\\n$util.qr($ctx.stash.metadata.put(\\"apiId\\", \\"ezabg7fk2jecvodrblowtgbsme\\"))\\n$util.qr($ctx.stash.put(\\"connectionAttributes\\", {}))\\n$util.qr($ctx.stash.put(\\"tableName\\", \\"Post-ezabg7fk2jecvodrblowtgbsme-NONE\\"))\\n$util.qr($ctx.stash.put(\\"authRole\\", \\"arn:aws:sts::123456789012:assumed-role/amplify-sampleprojectapp--amplifyAuthauthenticatedU-JksUKi7c8Bvh/CognitoIdentityCredentials\\"))\\n$util.qr($ctx.stash.put(\\"unauthRole\\", \\"arn:aws:sts::123456789012:assumed-role/amplify-sampleprojectapp--amplifyAuthunauthenticate-0ZSS9wsA6Aut/CognitoIdentityCredentials\\"))\\n$util.qr($ctx.stash.put(\\"identityPoolId\\", \\"us-west-2:e3abf6f7-1ae5-4254-829e-0d8c9dc05bff\\"))\\n$util.qr($ctx.stash.put(\\"adminRoles\\", []))\\n$util.toJson({})","ResponseMappingTemplate":"$util.toJson($ctx.prev.result)","Kind":"PIPELINE","ApiId":"ezabg7fk2jecvodrblowtgbsme","FieldName":"listPostByAuthorName"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'QuerylistPostByAuthorNameResolver',
        },
        constructPath:
          'data/amplifyData/Post/queryListPostByAuthorNameResolver',
      },
      progress: {
        completed: 35,
        formatted: ' 35',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R |  36 | 11:05:49 PM | DELETE_COMPLETE | AWS::AppSync::Resolver | data/amplifyData/Post/mutationCreatePostResolver (CreatePostResolver)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R/e5bef6f0-fe24-11ef-b7fc-06822b500091',
        EventId: 'CreatePostResolver-DELETE_COMPLETE-2025-03-11T03:05:49.826Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R',
        LogicalResourceId: 'CreatePostResolver',
        PhysicalResourceId:
          'arn:aws:appsync:us-west-2:123456789012:apis/ezabg7fk2jecvodrblowtgbsme/types/Mutation/resolvers/createPost',
        ResourceType: 'AWS::AppSync::Resolver',
        Timestamp: new Date('2025-03-11T03:05:49.826'),
        ResourceStatus: 'DELETE_COMPLETE',
        ResourceProperties:
          '{"TypeName":"Mutation","PipelineConfig":{"Functions":["qfnbqqjwynb3dggxi5mblscjii","fo2zebakl5fgfe5kc447qiduti","3qgda5e5kvhxdjvqvlvluiztjm","jiwbcpe745fzrn4rwsgiqn6plq"]},"RequestMappingTemplate":"$util.qr($ctx.stash.put(\\"typeName\\", \\"Mutation\\"))\\n$util.qr($ctx.stash.put(\\"fieldName\\", \\"createPost\\"))\\n$util.qr($ctx.stash.put(\\"conditions\\", []))\\n$util.qr($ctx.stash.put(\\"metadata\\", {}))\\n$util.qr($ctx.stash.metadata.put(\\"dataSourceType\\", \\"AMAZON_DYNAMODB\\"))\\n$util.qr($ctx.stash.metadata.put(\\"apiId\\", \\"ezabg7fk2jecvodrblowtgbsme\\"))\\n$util.qr($ctx.stash.put(\\"connectionAttributes\\", {}))\\n$util.qr($ctx.stash.put(\\"tableName\\", \\"Post-ezabg7fk2jecvodrblowtgbsme-NONE\\"))\\n$util.qr($ctx.stash.put(\\"authRole\\", \\"arn:aws:sts::123456789012:assumed-role/amplify-sampleprojectapp--amplifyAuthauthenticatedU-JksUKi7c8Bvh/CognitoIdentityCredentials\\"))\\n$util.qr($ctx.stash.put(\\"unauthRole\\", \\"arn:aws:sts::123456789012:assumed-role/amplify-sampleprojectapp--amplifyAuthunauthenticate-0ZSS9wsA6Aut/CognitoIdentityCredentials\\"))\\n$util.qr($ctx.stash.put(\\"identityPoolId\\", \\"us-west-2:e3abf6f7-1ae5-4254-829e-0d8c9dc05bff\\"))\\n$util.qr($ctx.stash.put(\\"adminRoles\\", []))\\n$util.toJson({})","ResponseMappingTemplate":"$util.toJson($ctx.prev.result)","Kind":"PIPELINE","ApiId":"ezabg7fk2jecvodrblowtgbsme","FieldName":"createPost"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'CreatePostResolver',
        },
        constructPath: 'data/amplifyData/Post/mutationCreatePostResolver',
      },
      progress: {
        completed: 36,
        formatted: ' 36',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R |  37 | 11:05:49 PM | DELETE_COMPLETE | AWS::AppSync::Resolver | data/amplifyData/Post/subscriptionOnDeletePostResolver (SubscriptiononDeletePostResolver)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R/e5bef6f0-fe24-11ef-b7fc-06822b500091',
        EventId:
          'SubscriptiononDeletePostResolver-DELETE_COMPLETE-2025-03-11T03:05:49.851Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R',
        LogicalResourceId: 'SubscriptiononDeletePostResolver',
        PhysicalResourceId:
          'arn:aws:appsync:us-west-2:123456789012:apis/ezabg7fk2jecvodrblowtgbsme/types/Subscription/resolvers/onDeletePost',
        ResourceType: 'AWS::AppSync::Resolver',
        Timestamp: new Date('2025-03-11T03:05:49.851'),
        ResourceStatus: 'DELETE_COMPLETE',
        ResourceProperties:
          '{"TypeName":"Subscription","PipelineConfig":{"Functions":["abcwe3nj6zbana67525efaysou","h5rnjjorqbh4rdgtd6jukqm6ui","27v6y4gs7fgyxdfidakwt5l2ei"]},"RequestMappingTemplate":"$util.qr($ctx.stash.put(\\"typeName\\", \\"Subscription\\"))\\n$util.qr($ctx.stash.put(\\"fieldName\\", \\"onDeletePost\\"))\\n$util.qr($ctx.stash.put(\\"conditions\\", []))\\n$util.qr($ctx.stash.put(\\"metadata\\", {}))\\n$util.qr($ctx.stash.metadata.put(\\"dataSourceType\\", \\"NONE\\"))\\n$util.qr($ctx.stash.metadata.put(\\"apiId\\", \\"ezabg7fk2jecvodrblowtgbsme\\"))\\n$util.qr($ctx.stash.put(\\"connectionAttributes\\", {}))\\n\\n$util.qr($ctx.stash.put(\\"authRole\\", \\"arn:aws:sts::123456789012:assumed-role/amplify-sampleprojectapp--amplifyAuthauthenticatedU-JksUKi7c8Bvh/CognitoIdentityCredentials\\"))\\n$util.qr($ctx.stash.put(\\"unauthRole\\", \\"arn:aws:sts::123456789012:assumed-role/amplify-sampleprojectapp--amplifyAuthunauthenticate-0ZSS9wsA6Aut/CognitoIdentityCredentials\\"))\\n$util.qr($ctx.stash.put(\\"identityPoolId\\", \\"us-west-2:e3abf6f7-1ae5-4254-829e-0d8c9dc05bff\\"))\\n$util.qr($ctx.stash.put(\\"adminRoles\\", []))\\n$util.toJson({})","ResponseMappingTemplate":"$util.toJson($ctx.prev.result)","Kind":"PIPELINE","ApiId":"ezabg7fk2jecvodrblowtgbsme","FieldName":"onDeletePost"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'SubscriptiononDeletePostResolver',
        },
        constructPath: 'data/amplifyData/Post/subscriptionOnDeletePostResolver',
      },
      progress: {
        completed: 37,
        formatted: ' 37',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R |  37 | 11:05:49 PM | DELETE_IN_PROGRESS | AWS::AppSync::FunctionConfiguration | data/amplifyData/Post/QueryGetPostDataResolverFn/QueryGetPostDataResolverFn.AppSyncFunction (QueryGetPostDataResolverFnQueryGetPostDataResolverFnAppSyncFunction06724190)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R/e5bef6f0-fe24-11ef-b7fc-06822b500091',
        EventId:
          'QueryGetPostDataResolverFnQueryGetPostDataResolverFnAppSyncFunction06724190-DELETE_IN_PROGRESS-2025-03-11T03:05:49.995Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R',
        LogicalResourceId:
          'QueryGetPostDataResolverFnQueryGetPostDataResolverFnAppSyncFunction06724190',
        PhysicalResourceId:
          'arn:aws:appsync:us-west-2:123456789012:apis/ezabg7fk2jecvodrblowtgbsme/functions/l5x4teownbcydhkadu72ph7ela',
        ResourceType: 'AWS::AppSync::FunctionConfiguration',
        Timestamp: new Date('2025-03-11T03:05:49.995'),
        ResourceStatus: 'DELETE_IN_PROGRESS',
        ResourceProperties:
          '{"ResponseMappingTemplateS3Location":"s3://cdk-hnb659fds-assets-123456789012-us-west-2/4c6a2d29f01c6091bd1d9afe16e5849d456c96f17c3b215938c8067399532719.vtl","DataSourceName":"PostTable","FunctionVersion":"2018-05-29","RequestMappingTemplateS3Location":"s3://cdk-hnb659fds-assets-123456789012-us-west-2/08f4d557693d96c1a4efba0f9dc91330e4b19772fd5477c156468843e3d9cb5e.vtl","ApiId":"ezabg7fk2jecvodrblowtgbsme","Name":"QueryGetPostDataResolverFn"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'QueryGetPostDataResolverFnQueryGetPostDataResolverFnAppSyncFunction06724190',
        },
        constructPath:
          'data/amplifyData/Post/QueryGetPostDataResolverFn/QueryGetPostDataResolverFn.AppSyncFunction',
      },
      progress: {
        completed: 37,
        formatted: ' 37',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R |  38 | 11:05:50 PM | DELETE_COMPLETE | AWS::AppSync::Resolver | data/amplifyData/Post/mutationUpdatePostResolver (UpdatePostResolver)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R/e5bef6f0-fe24-11ef-b7fc-06822b500091',
        EventId: 'UpdatePostResolver-DELETE_COMPLETE-2025-03-11T03:05:50.001Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R',
        LogicalResourceId: 'UpdatePostResolver',
        PhysicalResourceId:
          'arn:aws:appsync:us-west-2:123456789012:apis/ezabg7fk2jecvodrblowtgbsme/types/Mutation/resolvers/updatePost',
        ResourceType: 'AWS::AppSync::Resolver',
        Timestamp: new Date('2025-03-11T03:05:50.001'),
        ResourceStatus: 'DELETE_COMPLETE',
        ResourceProperties:
          '{"TypeName":"Mutation","PipelineConfig":{"Functions":["tocmffiltfgwrkdmfmvz64o6de","h56cyfin3jdzrcumvncqwrt3re","pvonullxbzd5paawkz3o6sqdku","5mqbvtdbbrcxngsvhc3fskgcre"]},"RequestMappingTemplate":"$util.qr($ctx.stash.put(\\"typeName\\", \\"Mutation\\"))\\n$util.qr($ctx.stash.put(\\"fieldName\\", \\"updatePost\\"))\\n$util.qr($ctx.stash.put(\\"conditions\\", []))\\n$util.qr($ctx.stash.put(\\"metadata\\", {}))\\n$util.qr($ctx.stash.metadata.put(\\"dataSourceType\\", \\"AMAZON_DYNAMODB\\"))\\n$util.qr($ctx.stash.metadata.put(\\"apiId\\", \\"ezabg7fk2jecvodrblowtgbsme\\"))\\n$util.qr($ctx.stash.put(\\"connectionAttributes\\", {}))\\n$util.qr($ctx.stash.put(\\"tableName\\", \\"Post-ezabg7fk2jecvodrblowtgbsme-NONE\\"))\\n$util.qr($ctx.stash.put(\\"authRole\\", \\"arn:aws:sts::123456789012:assumed-role/amplify-sampleprojectapp--amplifyAuthauthenticatedU-JksUKi7c8Bvh/CognitoIdentityCredentials\\"))\\n$util.qr($ctx.stash.put(\\"unauthRole\\", \\"arn:aws:sts::123456789012:assumed-role/amplify-sampleprojectapp--amplifyAuthunauthenticate-0ZSS9wsA6Aut/CognitoIdentityCredentials\\"))\\n$util.qr($ctx.stash.put(\\"identityPoolId\\", \\"us-west-2:e3abf6f7-1ae5-4254-829e-0d8c9dc05bff\\"))\\n$util.qr($ctx.stash.put(\\"adminRoles\\", []))\\n$util.toJson({})","ResponseMappingTemplate":"$util.toJson($ctx.prev.result)","Kind":"PIPELINE","ApiId":"ezabg7fk2jecvodrblowtgbsme","FieldName":"updatePost"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'UpdatePostResolver',
        },
        constructPath: 'data/amplifyData/Post/mutationUpdatePostResolver',
      },
      progress: {
        completed: 38,
        formatted: ' 38',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R |  38 | 11:05:50 PM | DELETE_IN_PROGRESS | AWS::AppSync::FunctionConfiguration | data/amplifyData/Post/QuerygetPostpostAuth0Function/QuerygetPostpostAuth0Function.AppSyncFunction (QuerygetPostpostAuth0FunctionQuerygetPostpostAuth0FunctionAppSyncFunctionC72E5C0F)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R/e5bef6f0-fe24-11ef-b7fc-06822b500091',
        EventId:
          'QuerygetPostpostAuth0FunctionQuerygetPostpostAuth0FunctionAppSyncFunctionC72E5C0F-DELETE_IN_PROGRESS-2025-03-11T03:05:50.013Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R',
        LogicalResourceId:
          'QuerygetPostpostAuth0FunctionQuerygetPostpostAuth0FunctionAppSyncFunctionC72E5C0F',
        PhysicalResourceId:
          'arn:aws:appsync:us-west-2:123456789012:apis/ezabg7fk2jecvodrblowtgbsme/functions/cd6gzhw2hvfhbiqbalcomoptvm',
        ResourceType: 'AWS::AppSync::FunctionConfiguration',
        Timestamp: new Date('2025-03-11T03:05:50.013'),
        ResourceStatus: 'DELETE_IN_PROGRESS',
        ResourceProperties:
          '{"DataSourceName":"NONE_DS","ResponseMappingTemplate":"$util.toJson({})","FunctionVersion":"2018-05-29","RequestMappingTemplateS3Location":"s3://cdk-hnb659fds-assets-123456789012-us-west-2/c1721bcd774e27c514d3454b5be4f9bdd094c0161b57ddf053d618e3b0086a77.vtl","ApiId":"ezabg7fk2jecvodrblowtgbsme","Name":"QuerygetPostpostAuth0Function"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'QuerygetPostpostAuth0FunctionQuerygetPostpostAuth0FunctionAppSyncFunctionC72E5C0F',
        },
        constructPath:
          'data/amplifyData/Post/QuerygetPostpostAuth0Function/QuerygetPostpostAuth0Function.AppSyncFunction',
      },
      progress: {
        completed: 38,
        formatted: ' 38',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R |  38 | 11:05:50 PM | DELETE_IN_PROGRESS | AWS::AppSync::FunctionConfiguration | data/amplifyData/Post/QuerygetPostauth0Function/QuerygetPostauth0Function.AppSyncFunction (QuerygetPostauth0FunctionQuerygetPostauth0FunctionAppSyncFunctionB1D588DF)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R/e5bef6f0-fe24-11ef-b7fc-06822b500091',
        EventId:
          'QuerygetPostauth0FunctionQuerygetPostauth0FunctionAppSyncFunctionB1D588DF-DELETE_IN_PROGRESS-2025-03-11T03:05:50.025Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R',
        LogicalResourceId:
          'QuerygetPostauth0FunctionQuerygetPostauth0FunctionAppSyncFunctionB1D588DF',
        PhysicalResourceId:
          'arn:aws:appsync:us-west-2:123456789012:apis/ezabg7fk2jecvodrblowtgbsme/functions/tw4hgwx3wvffhiipskyxymdndm',
        ResourceType: 'AWS::AppSync::FunctionConfiguration',
        Timestamp: new Date('2025-03-11T03:05:50.025'),
        ResourceStatus: 'DELETE_IN_PROGRESS',
        ResourceProperties:
          '{"DataSourceName":"NONE_DS","ResponseMappingTemplate":"$util.toJson({})","FunctionVersion":"2018-05-29","RequestMappingTemplateS3Location":"s3://cdk-hnb659fds-assets-123456789012-us-west-2/88d5b7081b0dc9c39fd0bffedf56f011b2a7cf1ce5cc227f47a1e94efee8067c.vtl","ApiId":"ezabg7fk2jecvodrblowtgbsme","Name":"QuerygetPostauth0Function"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'QuerygetPostauth0FunctionQuerygetPostauth0FunctionAppSyncFunctionB1D588DF',
        },
        constructPath:
          'data/amplifyData/Post/QuerygetPostauth0Function/QuerygetPostauth0Function.AppSyncFunction',
      },
      progress: {
        completed: 38,
        formatted: ' 38',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R |  38 | 11:05:50 PM | DELETE_IN_PROGRESS | AWS::AppSync::FunctionConfiguration | data/amplifyData/Post/SubscriptiononUpdatePostpostAuth0Function/SubscriptiononUpdatePostpostAuth0Function.AppSyncFunction (SubscriptiononUpdatePostpostAuth0FunctionSubscriptiononUpdatePostpostAuth0FunctionAppSyncFunction3D79B6CB)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R/e5bef6f0-fe24-11ef-b7fc-06822b500091',
        EventId:
          'SubscriptiononUpdatePostpostAuth0FunctionSubscriptiononUpdatePostpostAuth0FunctionAppSyncFunction3D79B6CB-DELETE_IN_PROGRESS-2025-03-11T03:05:50.097Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R',
        LogicalResourceId:
          'SubscriptiononUpdatePostpostAuth0FunctionSubscriptiononUpdatePostpostAuth0FunctionAppSyncFunction3D79B6CB',
        PhysicalResourceId:
          'arn:aws:appsync:us-west-2:123456789012:apis/ezabg7fk2jecvodrblowtgbsme/functions/2qwfcvfbqzbkfo54joge3g6ura',
        ResourceType: 'AWS::AppSync::FunctionConfiguration',
        Timestamp: new Date('2025-03-11T03:05:50.097'),
        ResourceStatus: 'DELETE_IN_PROGRESS',
        ResourceProperties:
          '{"DataSourceName":"NONE_DS","ResponseMappingTemplate":"$util.toJson({})","FunctionVersion":"2018-05-29","RequestMappingTemplateS3Location":"s3://cdk-hnb659fds-assets-123456789012-us-west-2/c1721bcd774e27c514d3454b5be4f9bdd094c0161b57ddf053d618e3b0086a77.vtl","ApiId":"ezabg7fk2jecvodrblowtgbsme","Name":"SubscriptiononUpdatePostpostAuth0Function"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'SubscriptiononUpdatePostpostAuth0FunctionSubscriptiononUpdatePostpostAuth0FunctionAppSyncFunction3D79B6CB',
        },
        constructPath:
          'data/amplifyData/Post/SubscriptiononUpdatePostpostAuth0Function/SubscriptiononUpdatePostpostAuth0Function.AppSyncFunction',
      },
      progress: {
        completed: 38,
        formatted: ' 38',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R |  38 | 11:05:50 PM | DELETE_IN_PROGRESS | AWS::AppSync::FunctionConfiguration | data/amplifyData/Post/SubscriptionOnUpdatePostDataResolverFn/SubscriptionOnUpdatePostDataResolverFn.AppSyncFunction (SubscriptionOnUpdatePostDataResolverFnSubscriptionOnUpdatePostDataResolverFnAppSyncFunction325AAFC9)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R/e5bef6f0-fe24-11ef-b7fc-06822b500091',
        EventId:
          'SubscriptionOnUpdatePostDataResolverFnSubscriptionOnUpdatePostDataResolverFnAppSyncFunction325AAFC9-DELETE_IN_PROGRESS-2025-03-11T03:05:50.111Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R',
        LogicalResourceId:
          'SubscriptionOnUpdatePostDataResolverFnSubscriptionOnUpdatePostDataResolverFnAppSyncFunction325AAFC9',
        PhysicalResourceId:
          'arn:aws:appsync:us-west-2:123456789012:apis/ezabg7fk2jecvodrblowtgbsme/functions/cmbpw7wa25bczaekpahob2sml4',
        ResourceType: 'AWS::AppSync::FunctionConfiguration',
        Timestamp: new Date('2025-03-11T03:05:50.111'),
        ResourceStatus: 'DELETE_IN_PROGRESS',
        ResourceProperties:
          '{"ResponseMappingTemplateS3Location":"s3://cdk-hnb659fds-assets-123456789012-us-west-2/e0cff47fb007f0bbf2a4e43ca256d6aa7ec109821769fd79fa7c5e83f0e7f9fc.vtl","DataSourceName":"NONE_DS","FunctionVersion":"2018-05-29","RequestMappingTemplateS3Location":"s3://cdk-hnb659fds-assets-123456789012-us-west-2/fe3c43ada4b9d681a5e2312663ef7a73386424d73b73e51f8e2e9d4b50f7c502.vtl","ApiId":"ezabg7fk2jecvodrblowtgbsme","Name":"SubscriptionOnUpdatePostDataResolverFn"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'SubscriptionOnUpdatePostDataResolverFnSubscriptionOnUpdatePostDataResolverFnAppSyncFunction325AAFC9',
        },
        constructPath:
          'data/amplifyData/Post/SubscriptionOnUpdatePostDataResolverFn/SubscriptionOnUpdatePostDataResolverFn.AppSyncFunction',
      },
      progress: {
        completed: 38,
        formatted: ' 38',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R |  38 | 11:05:50 PM | DELETE_IN_PROGRESS | AWS::AppSync::FunctionConfiguration | data/amplifyData/Post/QuerylistPostsauth0Function/QuerylistPostsauth0Function.AppSyncFunction (QuerylistPostsauth0FunctionQuerylistPostsauth0FunctionAppSyncFunctionCDCF8956)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R/e5bef6f0-fe24-11ef-b7fc-06822b500091',
        EventId:
          'QuerylistPostsauth0FunctionQuerylistPostsauth0FunctionAppSyncFunctionCDCF8956-DELETE_IN_PROGRESS-2025-03-11T03:05:50.119Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R',
        LogicalResourceId:
          'QuerylistPostsauth0FunctionQuerylistPostsauth0FunctionAppSyncFunctionCDCF8956',
        PhysicalResourceId:
          'arn:aws:appsync:us-west-2:123456789012:apis/ezabg7fk2jecvodrblowtgbsme/functions/6kxyzas33vbuvbhk3xajbz2z5y',
        ResourceType: 'AWS::AppSync::FunctionConfiguration',
        Timestamp: new Date('2025-03-11T03:05:50.119'),
        ResourceStatus: 'DELETE_IN_PROGRESS',
        ResourceProperties:
          '{"DataSourceName":"NONE_DS","ResponseMappingTemplate":"$util.toJson({})","FunctionVersion":"2018-05-29","RequestMappingTemplateS3Location":"s3://cdk-hnb659fds-assets-123456789012-us-west-2/88d5b7081b0dc9c39fd0bffedf56f011b2a7cf1ce5cc227f47a1e94efee8067c.vtl","ApiId":"ezabg7fk2jecvodrblowtgbsme","Name":"QuerylistPostsauth0Function"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'QuerylistPostsauth0FunctionQuerylistPostsauth0FunctionAppSyncFunctionCDCF8956',
        },
        constructPath:
          'data/amplifyData/Post/QuerylistPostsauth0Function/QuerylistPostsauth0Function.AppSyncFunction',
      },
      progress: {
        completed: 38,
        formatted: ' 38',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R |  38 | 11:05:50 PM | DELETE_IN_PROGRESS | AWS::AppSync::FunctionConfiguration | data/amplifyData/Post/QueryListPostsDataResolverFn/QueryListPostsDataResolverFn.AppSyncFunction (QueryListPostsDataResolverFnQueryListPostsDataResolverFnAppSyncFunction3D526AB7)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R/e5bef6f0-fe24-11ef-b7fc-06822b500091',
        EventId:
          'QueryListPostsDataResolverFnQueryListPostsDataResolverFnAppSyncFunction3D526AB7-DELETE_IN_PROGRESS-2025-03-11T03:05:50.139Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R',
        LogicalResourceId:
          'QueryListPostsDataResolverFnQueryListPostsDataResolverFnAppSyncFunction3D526AB7',
        PhysicalResourceId:
          'arn:aws:appsync:us-west-2:123456789012:apis/ezabg7fk2jecvodrblowtgbsme/functions/clulgnswsve7rd4plicn4dtaaa',
        ResourceType: 'AWS::AppSync::FunctionConfiguration',
        Timestamp: new Date('2025-03-11T03:05:50.139'),
        ResourceStatus: 'DELETE_IN_PROGRESS',
        ResourceProperties:
          '{"ResponseMappingTemplateS3Location":"s3://cdk-hnb659fds-assets-123456789012-us-west-2/cc01911d0269d4080ea57505dc445dfc315ef7ad85d3d9d4ea1357858bff451d.vtl","DataSourceName":"PostTable","FunctionVersion":"2018-05-29","RequestMappingTemplateS3Location":"s3://cdk-hnb659fds-assets-123456789012-us-west-2/9fcbe070ecd3023c5bf5b966fa9584757db9762eef123bad0820bd87591b2174.vtl","ApiId":"ezabg7fk2jecvodrblowtgbsme","Name":"QueryListPostsDataResolverFn"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'QueryListPostsDataResolverFnQueryListPostsDataResolverFnAppSyncFunction3D526AB7',
        },
        constructPath:
          'data/amplifyData/Post/QueryListPostsDataResolverFn/QueryListPostsDataResolverFn.AppSyncFunction',
      },
      progress: {
        completed: 38,
        formatted: ' 38',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R |  38 | 11:05:50 PM | DELETE_IN_PROGRESS | AWS::AppSync::FunctionConfiguration | data/amplifyData/Post/SubscriptiononUpdatePostauth0Function/SubscriptiononUpdatePostauth0Function.AppSyncFunction (SubscriptiononUpdatePostauth0FunctionSubscriptiononUpdatePostauth0FunctionAppSyncFunction503CE6B6)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R/e5bef6f0-fe24-11ef-b7fc-06822b500091',
        EventId:
          'SubscriptiononUpdatePostauth0FunctionSubscriptiononUpdatePostauth0FunctionAppSyncFunction503CE6B6-DELETE_IN_PROGRESS-2025-03-11T03:05:50.143Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R',
        LogicalResourceId:
          'SubscriptiononUpdatePostauth0FunctionSubscriptiononUpdatePostauth0FunctionAppSyncFunction503CE6B6',
        PhysicalResourceId:
          'arn:aws:appsync:us-west-2:123456789012:apis/ezabg7fk2jecvodrblowtgbsme/functions/4nq46sd6azeahfci3acjcaw3tu',
        ResourceType: 'AWS::AppSync::FunctionConfiguration',
        Timestamp: new Date('2025-03-11T03:05:50.143'),
        ResourceStatus: 'DELETE_IN_PROGRESS',
        ResourceProperties:
          '{"DataSourceName":"NONE_DS","ResponseMappingTemplate":"$util.toJson({})","FunctionVersion":"2018-05-29","RequestMappingTemplateS3Location":"s3://cdk-hnb659fds-assets-123456789012-us-west-2/6f3a2a9d562ae3058cc1aed6741edbf5edcaef7b3df7b03f52478816a1c95ffb.vtl","ApiId":"ezabg7fk2jecvodrblowtgbsme","Name":"SubscriptiononUpdatePostauth0Function"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'SubscriptiononUpdatePostauth0FunctionSubscriptiononUpdatePostauth0FunctionAppSyncFunction503CE6B6',
        },
        constructPath:
          'data/amplifyData/Post/SubscriptiononUpdatePostauth0Function/SubscriptiononUpdatePostauth0Function.AppSyncFunction',
      },
      progress: {
        completed: 38,
        formatted: ' 38',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R |  38 | 11:05:50 PM | DELETE_IN_PROGRESS | AWS::AppSync::FunctionConfiguration | data/amplifyData/Post/QuerylistPostByAuthorNamepostAuth0Function/QuerylistPostByAuthorNamepostAuth0Function.AppSyncFunction (QuerylistPostByAuthorNamepostAuth0FunctionQuerylistPostByAuthorNamepostAuth0FunctionAppSyncFunctionAF7022BA)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R/e5bef6f0-fe24-11ef-b7fc-06822b500091',
        EventId:
          'QuerylistPostByAuthorNamepostAuth0FunctionQuerylistPostByAuthorNamepostAuth0FunctionAppSyncFunctionAF7022BA-DELETE_IN_PROGRESS-2025-03-11T03:05:50.175Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R',
        LogicalResourceId:
          'QuerylistPostByAuthorNamepostAuth0FunctionQuerylistPostByAuthorNamepostAuth0FunctionAppSyncFunctionAF7022BA',
        PhysicalResourceId:
          'arn:aws:appsync:us-west-2:123456789012:apis/ezabg7fk2jecvodrblowtgbsme/functions/iwl7wvprhja55d7jsqsaqtwtoy',
        ResourceType: 'AWS::AppSync::FunctionConfiguration',
        Timestamp: new Date('2025-03-11T03:05:50.175'),
        ResourceStatus: 'DELETE_IN_PROGRESS',
        ResourceProperties:
          '{"DataSourceName":"NONE_DS","ResponseMappingTemplate":"$util.toJson({})","FunctionVersion":"2018-05-29","RequestMappingTemplateS3Location":"s3://cdk-hnb659fds-assets-123456789012-us-west-2/c1721bcd774e27c514d3454b5be4f9bdd094c0161b57ddf053d618e3b0086a77.vtl","ApiId":"ezabg7fk2jecvodrblowtgbsme","Name":"QuerylistPostByAuthorNamepostAuth0Function"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'QuerylistPostByAuthorNamepostAuth0FunctionQuerylistPostByAuthorNamepostAuth0FunctionAppSyncFunctionAF7022BA',
        },
        constructPath:
          'data/amplifyData/Post/QuerylistPostByAuthorNamepostAuth0Function/QuerylistPostByAuthorNamepostAuth0Function.AppSyncFunction',
      },
      progress: {
        completed: 38,
        formatted: ' 38',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R |  38 | 11:05:50 PM | DELETE_IN_PROGRESS | AWS::AppSync::FunctionConfiguration | data/amplifyData/Post/MutationcreatePostinit0Function/MutationcreatePostinit0Function.AppSyncFunction (MutationcreatePostinit0FunctionMutationcreatePostinit0FunctionAppSyncFunction9E444A7F)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R/e5bef6f0-fe24-11ef-b7fc-06822b500091',
        EventId:
          'MutationcreatePostinit0FunctionMutationcreatePostinit0FunctionAppSyncFunction9E444A7F-DELETE_IN_PROGRESS-2025-03-11T03:05:50.177Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R',
        LogicalResourceId:
          'MutationcreatePostinit0FunctionMutationcreatePostinit0FunctionAppSyncFunction9E444A7F',
        PhysicalResourceId:
          'arn:aws:appsync:us-west-2:123456789012:apis/ezabg7fk2jecvodrblowtgbsme/functions/qfnbqqjwynb3dggxi5mblscjii',
        ResourceType: 'AWS::AppSync::FunctionConfiguration',
        Timestamp: new Date('2025-03-11T03:05:50.177'),
        ResourceStatus: 'DELETE_IN_PROGRESS',
        ResourceProperties:
          '{"DataSourceName":"NONE_DS","ResponseMappingTemplate":"$util.toJson({})","FunctionVersion":"2018-05-29","RequestMappingTemplateS3Location":"s3://cdk-hnb659fds-assets-123456789012-us-west-2/a183ddccbd956316c38ef97177b8f088ef0826f62023323f5ae6053d348ccffc.vtl","ApiId":"ezabg7fk2jecvodrblowtgbsme","Name":"MutationcreatePostinit0Function"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'MutationcreatePostinit0FunctionMutationcreatePostinit0FunctionAppSyncFunction9E444A7F',
        },
        constructPath:
          'data/amplifyData/Post/MutationcreatePostinit0Function/MutationcreatePostinit0Function.AppSyncFunction',
      },
      progress: {
        completed: 38,
        formatted: ' 38',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R |  38 | 11:05:50 PM | DELETE_IN_PROGRESS | AWS::AppSync::FunctionConfiguration | data/amplifyData/Post/MutationcreatePostpostAuth0Function/MutationcreatePostpostAuth0Function.AppSyncFunction (MutationcreatePostpostAuth0FunctionMutationcreatePostpostAuth0FunctionAppSyncFunction2C708069)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R/e5bef6f0-fe24-11ef-b7fc-06822b500091',
        EventId:
          'MutationcreatePostpostAuth0FunctionMutationcreatePostpostAuth0FunctionAppSyncFunction2C708069-DELETE_IN_PROGRESS-2025-03-11T03:05:50.187Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R',
        LogicalResourceId:
          'MutationcreatePostpostAuth0FunctionMutationcreatePostpostAuth0FunctionAppSyncFunction2C708069',
        PhysicalResourceId:
          'arn:aws:appsync:us-west-2:123456789012:apis/ezabg7fk2jecvodrblowtgbsme/functions/3qgda5e5kvhxdjvqvlvluiztjm',
        ResourceType: 'AWS::AppSync::FunctionConfiguration',
        Timestamp: new Date('2025-03-11T03:05:50.187'),
        ResourceStatus: 'DELETE_IN_PROGRESS',
        ResourceProperties:
          '{"DataSourceName":"NONE_DS","ResponseMappingTemplate":"$util.toJson({})","FunctionVersion":"2018-05-29","RequestMappingTemplateS3Location":"s3://cdk-hnb659fds-assets-123456789012-us-west-2/c1721bcd774e27c514d3454b5be4f9bdd094c0161b57ddf053d618e3b0086a77.vtl","ApiId":"ezabg7fk2jecvodrblowtgbsme","Name":"MutationcreatePostpostAuth0Function"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'MutationcreatePostpostAuth0FunctionMutationcreatePostpostAuth0FunctionAppSyncFunction2C708069',
        },
        constructPath:
          'data/amplifyData/Post/MutationcreatePostpostAuth0Function/MutationcreatePostpostAuth0Function.AppSyncFunction',
      },
      progress: {
        completed: 38,
        formatted: ' 38',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R |  38 | 11:05:50 PM | DELETE_IN_PROGRESS | AWS::AppSync::FunctionConfiguration | data/amplifyData/Post/QuerylistPostByAuthorNameauth0Function/QuerylistPostByAuthorNameauth0Function.AppSyncFunction (QuerylistPostByAuthorNameauth0FunctionQuerylistPostByAuthorNameauth0FunctionAppSyncFunction06AD9EED)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R/e5bef6f0-fe24-11ef-b7fc-06822b500091',
        EventId:
          'QuerylistPostByAuthorNameauth0FunctionQuerylistPostByAuthorNameauth0FunctionAppSyncFunction06AD9EED-DELETE_IN_PROGRESS-2025-03-11T03:05:50.192Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R',
        LogicalResourceId:
          'QuerylistPostByAuthorNameauth0FunctionQuerylistPostByAuthorNameauth0FunctionAppSyncFunction06AD9EED',
        PhysicalResourceId:
          'arn:aws:appsync:us-west-2:123456789012:apis/ezabg7fk2jecvodrblowtgbsme/functions/nh4b4ttgorhm3ndystgvvgue5i',
        ResourceType: 'AWS::AppSync::FunctionConfiguration',
        Timestamp: new Date('2025-03-11T03:05:50.192'),
        ResourceStatus: 'DELETE_IN_PROGRESS',
        ResourceProperties:
          '{"DataSourceName":"NONE_DS","ResponseMappingTemplate":"$util.toJson({})","FunctionVersion":"2018-05-29","RequestMappingTemplateS3Location":"s3://cdk-hnb659fds-assets-123456789012-us-west-2/88d5b7081b0dc9c39fd0bffedf56f011b2a7cf1ce5cc227f47a1e94efee8067c.vtl","ApiId":"ezabg7fk2jecvodrblowtgbsme","Name":"QuerylistPostByAuthorNameauth0Function"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'QuerylistPostByAuthorNameauth0FunctionQuerylistPostByAuthorNameauth0FunctionAppSyncFunction06AD9EED',
        },
        constructPath:
          'data/amplifyData/Post/QuerylistPostByAuthorNameauth0Function/QuerylistPostByAuthorNameauth0Function.AppSyncFunction',
      },
      progress: {
        completed: 38,
        formatted: ' 38',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R |  38 | 11:05:50 PM | DELETE_IN_PROGRESS | AWS::AppSync::FunctionConfiguration | data/amplifyData/Post/QueryListPostByAuthorNameDataResolverFn/QueryListPostByAuthorNameDataResolverFn.AppSyncFunction (QueryListPostByAuthorNameDataResolverFnQueryListPostByAuthorNameDataResolverFnAppSyncFunction1850214D)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R/e5bef6f0-fe24-11ef-b7fc-06822b500091',
        EventId:
          'QueryListPostByAuthorNameDataResolverFnQueryListPostByAuthorNameDataResolverFnAppSyncFunction1850214D-DELETE_IN_PROGRESS-2025-03-11T03:05:50.204Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R',
        LogicalResourceId:
          'QueryListPostByAuthorNameDataResolverFnQueryListPostByAuthorNameDataResolverFnAppSyncFunction1850214D',
        PhysicalResourceId:
          'arn:aws:appsync:us-west-2:123456789012:apis/ezabg7fk2jecvodrblowtgbsme/functions/vk2nxrjf2ffglez74knppfwjje',
        ResourceType: 'AWS::AppSync::FunctionConfiguration',
        Timestamp: new Date('2025-03-11T03:05:50.204'),
        ResourceStatus: 'DELETE_IN_PROGRESS',
        ResourceProperties:
          '{"ResponseMappingTemplateS3Location":"s3://cdk-hnb659fds-assets-123456789012-us-west-2/098c998f215c333f57348ca8912f66057ae6b574fe34013033dc54362ee2372c.vtl","DataSourceName":"PostTable","FunctionVersion":"2018-05-29","RequestMappingTemplateS3Location":"s3://cdk-hnb659fds-assets-123456789012-us-west-2/c89821d3a34d8f9a69feb7faded2de554cfee32627d772bc8d842a1a145408f5.vtl","ApiId":"ezabg7fk2jecvodrblowtgbsme","Name":"QueryListPostByAuthorNameDataResolverFn"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'QueryListPostByAuthorNameDataResolverFnQueryListPostByAuthorNameDataResolverFnAppSyncFunction1850214D',
        },
        constructPath:
          'data/amplifyData/Post/QueryListPostByAuthorNameDataResolverFn/QueryListPostByAuthorNameDataResolverFn.AppSyncFunction',
      },
      progress: {
        completed: 38,
        formatted: ' 38',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R |  38 | 11:05:50 PM | DELETE_IN_PROGRESS | AWS::AppSync::FunctionConfiguration | data/amplifyData/Post/MutationcreatePostauth0Function/MutationcreatePostauth0Function.AppSyncFunction (MutationcreatePostauth0FunctionMutationcreatePostauth0FunctionAppSyncFunctionF347AB28)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R/e5bef6f0-fe24-11ef-b7fc-06822b500091',
        EventId:
          'MutationcreatePostauth0FunctionMutationcreatePostauth0FunctionAppSyncFunctionF347AB28-DELETE_IN_PROGRESS-2025-03-11T03:05:50.208Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R',
        LogicalResourceId:
          'MutationcreatePostauth0FunctionMutationcreatePostauth0FunctionAppSyncFunctionF347AB28',
        PhysicalResourceId:
          'arn:aws:appsync:us-west-2:123456789012:apis/ezabg7fk2jecvodrblowtgbsme/functions/fo2zebakl5fgfe5kc447qiduti',
        ResourceType: 'AWS::AppSync::FunctionConfiguration',
        Timestamp: new Date('2025-03-11T03:05:50.208'),
        ResourceStatus: 'DELETE_IN_PROGRESS',
        ResourceProperties:
          '{"DataSourceName":"NONE_DS","ResponseMappingTemplate":"$util.toJson({})","FunctionVersion":"2018-05-29","RequestMappingTemplateS3Location":"s3://cdk-hnb659fds-assets-123456789012-us-west-2/b371d68ddfbdd11b176756ce33b2c4e79d26fcc2fd4b7c0c9e75d06efacee90e.vtl","ApiId":"ezabg7fk2jecvodrblowtgbsme","Name":"MutationcreatePostauth0Function"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'MutationcreatePostauth0FunctionMutationcreatePostauth0FunctionAppSyncFunctionF347AB28',
        },
        constructPath:
          'data/amplifyData/Post/MutationcreatePostauth0Function/MutationcreatePostauth0Function.AppSyncFunction',
      },
      progress: {
        completed: 38,
        formatted: ' 38',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R |  38 | 11:05:50 PM | DELETE_IN_PROGRESS | AWS::AppSync::FunctionConfiguration | data/amplifyData/Post/SubscriptionOnDeletePostDataResolverFn/SubscriptionOnDeletePostDataResolverFn.AppSyncFunction (SubscriptionOnDeletePostDataResolverFnSubscriptionOnDeletePostDataResolverFnAppSyncFunction9D84E829)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R/e5bef6f0-fe24-11ef-b7fc-06822b500091',
        EventId:
          'SubscriptionOnDeletePostDataResolverFnSubscriptionOnDeletePostDataResolverFnAppSyncFunction9D84E829-DELETE_IN_PROGRESS-2025-03-11T03:05:50.218Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R',
        LogicalResourceId:
          'SubscriptionOnDeletePostDataResolverFnSubscriptionOnDeletePostDataResolverFnAppSyncFunction9D84E829',
        PhysicalResourceId:
          'arn:aws:appsync:us-west-2:123456789012:apis/ezabg7fk2jecvodrblowtgbsme/functions/27v6y4gs7fgyxdfidakwt5l2ei',
        ResourceType: 'AWS::AppSync::FunctionConfiguration',
        Timestamp: new Date('2025-03-11T03:05:50.218'),
        ResourceStatus: 'DELETE_IN_PROGRESS',
        ResourceProperties:
          '{"ResponseMappingTemplateS3Location":"s3://cdk-hnb659fds-assets-123456789012-us-west-2/e0cff47fb007f0bbf2a4e43ca256d6aa7ec109821769fd79fa7c5e83f0e7f9fc.vtl","DataSourceName":"NONE_DS","FunctionVersion":"2018-05-29","RequestMappingTemplateS3Location":"s3://cdk-hnb659fds-assets-123456789012-us-west-2/fe3c43ada4b9d681a5e2312663ef7a73386424d73b73e51f8e2e9d4b50f7c502.vtl","ApiId":"ezabg7fk2jecvodrblowtgbsme","Name":"SubscriptionOnDeletePostDataResolverFn"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'SubscriptionOnDeletePostDataResolverFnSubscriptionOnDeletePostDataResolverFnAppSyncFunction9D84E829',
        },
        constructPath:
          'data/amplifyData/Post/SubscriptionOnDeletePostDataResolverFn/SubscriptionOnDeletePostDataResolverFn.AppSyncFunction',
      },
      progress: {
        completed: 38,
        formatted: ' 38',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R |  38 | 11:05:50 PM | DELETE_IN_PROGRESS | AWS::AppSync::FunctionConfiguration | data/amplifyData/Post/MutationCreatePostDataResolverFn/MutationCreatePostDataResolverFn.AppSyncFunction (MutationCreatePostDataResolverFnMutationCreatePostDataResolverFnAppSyncFunctionE45E2000)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R/e5bef6f0-fe24-11ef-b7fc-06822b500091',
        EventId:
          'MutationCreatePostDataResolverFnMutationCreatePostDataResolverFnAppSyncFunctionE45E2000-DELETE_IN_PROGRESS-2025-03-11T03:05:50.236Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R',
        LogicalResourceId:
          'MutationCreatePostDataResolverFnMutationCreatePostDataResolverFnAppSyncFunctionE45E2000',
        PhysicalResourceId:
          'arn:aws:appsync:us-west-2:123456789012:apis/ezabg7fk2jecvodrblowtgbsme/functions/jiwbcpe745fzrn4rwsgiqn6plq',
        ResourceType: 'AWS::AppSync::FunctionConfiguration',
        Timestamp: new Date('2025-03-11T03:05:50.236'),
        ResourceStatus: 'DELETE_IN_PROGRESS',
        ResourceProperties:
          '{"ResponseMappingTemplateS3Location":"s3://cdk-hnb659fds-assets-123456789012-us-west-2/f4a52b72209a9dfa197b5e7367a5c378c5bb86de6e29ddd9e48b49a3fe54b249.vtl","DataSourceName":"PostTable","FunctionVersion":"2018-05-29","RequestMappingTemplateS3Location":"s3://cdk-hnb659fds-assets-123456789012-us-west-2/47614d6b888488252a8a44b7911b69efcddb1eb2454ca31132d72d6444247204.vtl","ApiId":"ezabg7fk2jecvodrblowtgbsme","Name":"MutationCreatePostDataResolverFn"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'MutationCreatePostDataResolverFnMutationCreatePostDataResolverFnAppSyncFunctionE45E2000',
        },
        constructPath:
          'data/amplifyData/Post/MutationCreatePostDataResolverFn/MutationCreatePostDataResolverFn.AppSyncFunction',
      },
      progress: {
        completed: 38,
        formatted: ' 38',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R |  38 | 11:05:50 PM | DELETE_IN_PROGRESS | AWS::AppSync::FunctionConfiguration | data/amplifyData/Post/QuerylistPostspostAuth0Function/QuerylistPostspostAuth0Function.AppSyncFunction (QuerylistPostspostAuth0FunctionQuerylistPostspostAuth0FunctionAppSyncFunction3585C8F4)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R/e5bef6f0-fe24-11ef-b7fc-06822b500091',
        EventId:
          'QuerylistPostspostAuth0FunctionQuerylistPostspostAuth0FunctionAppSyncFunction3585C8F4-DELETE_IN_PROGRESS-2025-03-11T03:05:50.241Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R',
        LogicalResourceId:
          'QuerylistPostspostAuth0FunctionQuerylistPostspostAuth0FunctionAppSyncFunction3585C8F4',
        PhysicalResourceId:
          'arn:aws:appsync:us-west-2:123456789012:apis/ezabg7fk2jecvodrblowtgbsme/functions/dzerewvuincjxfwfmfgvar4xvq',
        ResourceType: 'AWS::AppSync::FunctionConfiguration',
        Timestamp: new Date('2025-03-11T03:05:50.241'),
        ResourceStatus: 'DELETE_IN_PROGRESS',
        ResourceProperties:
          '{"DataSourceName":"NONE_DS","ResponseMappingTemplate":"$util.toJson({})","FunctionVersion":"2018-05-29","RequestMappingTemplateS3Location":"s3://cdk-hnb659fds-assets-123456789012-us-west-2/c1721bcd774e27c514d3454b5be4f9bdd094c0161b57ddf053d618e3b0086a77.vtl","ApiId":"ezabg7fk2jecvodrblowtgbsme","Name":"QuerylistPostspostAuth0Function"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'QuerylistPostspostAuth0FunctionQuerylistPostspostAuth0FunctionAppSyncFunction3585C8F4',
        },
        constructPath:
          'data/amplifyData/Post/QuerylistPostspostAuth0Function/QuerylistPostspostAuth0Function.AppSyncFunction',
      },
      progress: {
        completed: 38,
        formatted: ' 38',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R |  38 | 11:05:50 PM | DELETE_IN_PROGRESS | AWS::AppSync::FunctionConfiguration | data/amplifyData/Post/SubscriptiononDeletePostpostAuth0Function/SubscriptiononDeletePostpostAuth0Function.AppSyncFunction (SubscriptiononDeletePostpostAuth0FunctionSubscriptiononDeletePostpostAuth0FunctionAppSyncFunction80B1275A)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R/e5bef6f0-fe24-11ef-b7fc-06822b500091',
        EventId:
          'SubscriptiononDeletePostpostAuth0FunctionSubscriptiononDeletePostpostAuth0FunctionAppSyncFunction80B1275A-DELETE_IN_PROGRESS-2025-03-11T03:05:50.265Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R',
        LogicalResourceId:
          'SubscriptiononDeletePostpostAuth0FunctionSubscriptiononDeletePostpostAuth0FunctionAppSyncFunction80B1275A',
        PhysicalResourceId:
          'arn:aws:appsync:us-west-2:123456789012:apis/ezabg7fk2jecvodrblowtgbsme/functions/h5rnjjorqbh4rdgtd6jukqm6ui',
        ResourceType: 'AWS::AppSync::FunctionConfiguration',
        Timestamp: new Date('2025-03-11T03:05:50.265'),
        ResourceStatus: 'DELETE_IN_PROGRESS',
        ResourceProperties:
          '{"DataSourceName":"NONE_DS","ResponseMappingTemplate":"$util.toJson({})","FunctionVersion":"2018-05-29","RequestMappingTemplateS3Location":"s3://cdk-hnb659fds-assets-123456789012-us-west-2/c1721bcd774e27c514d3454b5be4f9bdd094c0161b57ddf053d618e3b0086a77.vtl","ApiId":"ezabg7fk2jecvodrblowtgbsme","Name":"SubscriptiononDeletePostpostAuth0Function"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'SubscriptiononDeletePostpostAuth0FunctionSubscriptiononDeletePostpostAuth0FunctionAppSyncFunction80B1275A',
        },
        constructPath:
          'data/amplifyData/Post/SubscriptiononDeletePostpostAuth0Function/SubscriptiononDeletePostpostAuth0Function.AppSyncFunction',
      },
      progress: {
        completed: 38,
        formatted: ' 38',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R |  38 | 11:05:50 PM | DELETE_IN_PROGRESS | AWS::AppSync::FunctionConfiguration | data/amplifyData/Post/SubscriptiononDeletePostauth0Function/SubscriptiononDeletePostauth0Function.AppSyncFunction (SubscriptiononDeletePostauth0FunctionSubscriptiononDeletePostauth0FunctionAppSyncFunction79C0574D)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R/e5bef6f0-fe24-11ef-b7fc-06822b500091',
        EventId:
          'SubscriptiononDeletePostauth0FunctionSubscriptiononDeletePostauth0FunctionAppSyncFunction79C0574D-DELETE_IN_PROGRESS-2025-03-11T03:05:50.272Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R',
        LogicalResourceId:
          'SubscriptiononDeletePostauth0FunctionSubscriptiononDeletePostauth0FunctionAppSyncFunction79C0574D',
        PhysicalResourceId:
          'arn:aws:appsync:us-west-2:123456789012:apis/ezabg7fk2jecvodrblowtgbsme/functions/abcwe3nj6zbana67525efaysou',
        ResourceType: 'AWS::AppSync::FunctionConfiguration',
        Timestamp: new Date('2025-03-11T03:05:50.272'),
        ResourceStatus: 'DELETE_IN_PROGRESS',
        ResourceProperties:
          '{"DataSourceName":"NONE_DS","ResponseMappingTemplate":"$util.toJson({})","FunctionVersion":"2018-05-29","RequestMappingTemplateS3Location":"s3://cdk-hnb659fds-assets-123456789012-us-west-2/6f3a2a9d562ae3058cc1aed6741edbf5edcaef7b3df7b03f52478816a1c95ffb.vtl","ApiId":"ezabg7fk2jecvodrblowtgbsme","Name":"SubscriptiononDeletePostauth0Function"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'SubscriptiononDeletePostauth0FunctionSubscriptiononDeletePostauth0FunctionAppSyncFunction79C0574D',
        },
        constructPath:
          'data/amplifyData/Post/SubscriptiononDeletePostauth0Function/SubscriptiononDeletePostauth0Function.AppSyncFunction',
      },
      progress: {
        completed: 38,
        formatted: ' 38',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R |  38 | 11:05:50 PM | DELETE_IN_PROGRESS | AWS::AppSync::FunctionConfiguration | data/amplifyData/Post/MutationdeletePostpostAuth0Function/MutationdeletePostpostAuth0Function.AppSyncFunction (MutationdeletePostpostAuth0FunctionMutationdeletePostpostAuth0FunctionAppSyncFunctionFF4E884F)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R/e5bef6f0-fe24-11ef-b7fc-06822b500091',
        EventId:
          'MutationdeletePostpostAuth0FunctionMutationdeletePostpostAuth0FunctionAppSyncFunctionFF4E884F-DELETE_IN_PROGRESS-2025-03-11T03:05:50.342Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R',
        LogicalResourceId:
          'MutationdeletePostpostAuth0FunctionMutationdeletePostpostAuth0FunctionAppSyncFunctionFF4E884F',
        PhysicalResourceId:
          'arn:aws:appsync:us-west-2:123456789012:apis/ezabg7fk2jecvodrblowtgbsme/functions/p56gezborzcgjfz3fwywfvftva',
        ResourceType: 'AWS::AppSync::FunctionConfiguration',
        Timestamp: new Date('2025-03-11T03:05:50.342'),
        ResourceStatus: 'DELETE_IN_PROGRESS',
        ResourceProperties:
          '{"DataSourceName":"NONE_DS","ResponseMappingTemplate":"$util.toJson({})","FunctionVersion":"2018-05-29","RequestMappingTemplateS3Location":"s3://cdk-hnb659fds-assets-123456789012-us-west-2/c1721bcd774e27c514d3454b5be4f9bdd094c0161b57ddf053d618e3b0086a77.vtl","ApiId":"ezabg7fk2jecvodrblowtgbsme","Name":"MutationdeletePostpostAuth0Function"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'MutationdeletePostpostAuth0FunctionMutationdeletePostpostAuth0FunctionAppSyncFunctionFF4E884F',
        },
        constructPath:
          'data/amplifyData/Post/MutationdeletePostpostAuth0Function/MutationdeletePostpostAuth0Function.AppSyncFunction',
      },
      progress: {
        completed: 38,
        formatted: ' 38',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R |  38 | 11:05:50 PM | DELETE_IN_PROGRESS | AWS::AppSync::FunctionConfiguration | data/amplifyData/Post/MutationDeletePostDataResolverFn/MutationDeletePostDataResolverFn.AppSyncFunction (MutationDeletePostDataResolverFnMutationDeletePostDataResolverFnAppSyncFunction45B37C12)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R/e5bef6f0-fe24-11ef-b7fc-06822b500091',
        EventId:
          'MutationDeletePostDataResolverFnMutationDeletePostDataResolverFnAppSyncFunction45B37C12-DELETE_IN_PROGRESS-2025-03-11T03:05:50.360Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R',
        LogicalResourceId:
          'MutationDeletePostDataResolverFnMutationDeletePostDataResolverFnAppSyncFunction45B37C12',
        PhysicalResourceId:
          'arn:aws:appsync:us-west-2:123456789012:apis/ezabg7fk2jecvodrblowtgbsme/functions/pvq3kk3khrfsbcrwzsbndmzauq',
        ResourceType: 'AWS::AppSync::FunctionConfiguration',
        Timestamp: new Date('2025-03-11T03:05:50.360'),
        ResourceStatus: 'DELETE_IN_PROGRESS',
        ResourceProperties:
          '{"ResponseMappingTemplateS3Location":"s3://cdk-hnb659fds-assets-123456789012-us-west-2/f4a52b72209a9dfa197b5e7367a5c378c5bb86de6e29ddd9e48b49a3fe54b249.vtl","DataSourceName":"PostTable","FunctionVersion":"2018-05-29","RequestMappingTemplateS3Location":"s3://cdk-hnb659fds-assets-123456789012-us-west-2/4f7907d1209a2c9953a0c053df402c634e359546d70c7cc5c2e8e21ea734880f.vtl","ApiId":"ezabg7fk2jecvodrblowtgbsme","Name":"MutationDeletePostDataResolverFn"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'MutationDeletePostDataResolverFnMutationDeletePostDataResolverFnAppSyncFunction45B37C12',
        },
        constructPath:
          'data/amplifyData/Post/MutationDeletePostDataResolverFn/MutationDeletePostDataResolverFn.AppSyncFunction',
      },
      progress: {
        completed: 38,
        formatted: ' 38',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R |  38 | 11:05:50 PM | DELETE_IN_PROGRESS | AWS::AppSync::FunctionConfiguration | data/amplifyData/Post/MutationdeletePostauth0Function/MutationdeletePostauth0Function.AppSyncFunction (MutationdeletePostauth0FunctionMutationdeletePostauth0FunctionAppSyncFunctionFBE21CB7)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R/e5bef6f0-fe24-11ef-b7fc-06822b500091',
        EventId:
          'MutationdeletePostauth0FunctionMutationdeletePostauth0FunctionAppSyncFunctionFBE21CB7-DELETE_IN_PROGRESS-2025-03-11T03:05:50.384Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R',
        LogicalResourceId:
          'MutationdeletePostauth0FunctionMutationdeletePostauth0FunctionAppSyncFunctionFBE21CB7',
        PhysicalResourceId:
          'arn:aws:appsync:us-west-2:123456789012:apis/ezabg7fk2jecvodrblowtgbsme/functions/ssvyddouovceliw6q2m4kzzi5m',
        ResourceType: 'AWS::AppSync::FunctionConfiguration',
        Timestamp: new Date('2025-03-11T03:05:50.384'),
        ResourceStatus: 'DELETE_IN_PROGRESS',
        ResourceProperties:
          '{"ResponseMappingTemplateS3Location":"s3://cdk-hnb659fds-assets-123456789012-us-west-2/29e4bdb03133f87f2b1acb547959ffd4cfd22804026994c5b61db33084127353.vtl","DataSourceName":"PostTable","FunctionVersion":"2018-05-29","RequestMappingTemplateS3Location":"s3://cdk-hnb659fds-assets-123456789012-us-west-2/1f5fed297da9c32ae3af922bf3a38ccf23b956078887d16891ec06c20c64722c.vtl","ApiId":"ezabg7fk2jecvodrblowtgbsme","Name":"MutationdeletePostauth0Function"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'MutationdeletePostauth0FunctionMutationdeletePostauth0FunctionAppSyncFunctionFBE21CB7',
        },
        constructPath:
          'data/amplifyData/Post/MutationdeletePostauth0Function/MutationdeletePostauth0Function.AppSyncFunction',
      },
      progress: {
        completed: 38,
        formatted: ' 38',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R |  38 | 11:05:50 PM | DELETE_IN_PROGRESS | AWS::AppSync::FunctionConfiguration | data/amplifyData/Post/MutationupdatePostinit0Function/MutationupdatePostinit0Function.AppSyncFunction (MutationupdatePostinit0FunctionMutationupdatePostinit0FunctionAppSyncFunctionBAC7D532)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R/e5bef6f0-fe24-11ef-b7fc-06822b500091',
        EventId:
          'MutationupdatePostinit0FunctionMutationupdatePostinit0FunctionAppSyncFunctionBAC7D532-DELETE_IN_PROGRESS-2025-03-11T03:05:50.471Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R',
        LogicalResourceId:
          'MutationupdatePostinit0FunctionMutationupdatePostinit0FunctionAppSyncFunctionBAC7D532',
        PhysicalResourceId:
          'arn:aws:appsync:us-west-2:123456789012:apis/ezabg7fk2jecvodrblowtgbsme/functions/tocmffiltfgwrkdmfmvz64o6de',
        ResourceType: 'AWS::AppSync::FunctionConfiguration',
        Timestamp: new Date('2025-03-11T03:05:50.471'),
        ResourceStatus: 'DELETE_IN_PROGRESS',
        ResourceProperties:
          '{"DataSourceName":"NONE_DS","ResponseMappingTemplate":"$util.toJson({})","FunctionVersion":"2018-05-29","RequestMappingTemplateS3Location":"s3://cdk-hnb659fds-assets-123456789012-us-west-2/06db846fd14e6fc371f22b12b5545ba8e2dbfeda85d8c8d586c71c282166657b.vtl","ApiId":"ezabg7fk2jecvodrblowtgbsme","Name":"MutationupdatePostinit0Function"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'MutationupdatePostinit0FunctionMutationupdatePostinit0FunctionAppSyncFunctionBAC7D532',
        },
        constructPath:
          'data/amplifyData/Post/MutationupdatePostinit0Function/MutationupdatePostinit0Function.AppSyncFunction',
      },
      progress: {
        completed: 38,
        formatted: ' 38',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R |  38 | 11:05:50 PM | DELETE_IN_PROGRESS | AWS::AppSync::FunctionConfiguration | data/amplifyData/Post/MutationUpdatePostDataResolverFn/MutationUpdatePostDataResolverFn.AppSyncFunction (MutationUpdatePostDataResolverFnMutationUpdatePostDataResolverFnAppSyncFunctionBF7D410D)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R/e5bef6f0-fe24-11ef-b7fc-06822b500091',
        EventId:
          'MutationUpdatePostDataResolverFnMutationUpdatePostDataResolverFnAppSyncFunctionBF7D410D-DELETE_IN_PROGRESS-2025-03-11T03:05:50.505Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R',
        LogicalResourceId:
          'MutationUpdatePostDataResolverFnMutationUpdatePostDataResolverFnAppSyncFunctionBF7D410D',
        PhysicalResourceId:
          'arn:aws:appsync:us-west-2:123456789012:apis/ezabg7fk2jecvodrblowtgbsme/functions/5mqbvtdbbrcxngsvhc3fskgcre',
        ResourceType: 'AWS::AppSync::FunctionConfiguration',
        Timestamp: new Date('2025-03-11T03:05:50.505'),
        ResourceStatus: 'DELETE_IN_PROGRESS',
        ResourceProperties:
          '{"ResponseMappingTemplateS3Location":"s3://cdk-hnb659fds-assets-123456789012-us-west-2/f4a52b72209a9dfa197b5e7367a5c378c5bb86de6e29ddd9e48b49a3fe54b249.vtl","DataSourceName":"PostTable","FunctionVersion":"2018-05-29","RequestMappingTemplateS3Location":"s3://cdk-hnb659fds-assets-123456789012-us-west-2/474bf0776ec2164a13191d1a0a9e057154931e4918fea5086f49850d02a5371b.vtl","ApiId":"ezabg7fk2jecvodrblowtgbsme","Name":"MutationUpdatePostDataResolverFn"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'MutationUpdatePostDataResolverFnMutationUpdatePostDataResolverFnAppSyncFunctionBF7D410D',
        },
        constructPath:
          'data/amplifyData/Post/MutationUpdatePostDataResolverFn/MutationUpdatePostDataResolverFn.AppSyncFunction',
      },
      progress: {
        completed: 38,
        formatted: ' 38',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R |  38 | 11:05:50 PM | DELETE_IN_PROGRESS | AWS::AppSync::FunctionConfiguration | data/amplifyData/Post/MutationupdatePostpostAuth0Function/MutationupdatePostpostAuth0Function.AppSyncFunction (MutationupdatePostpostAuth0FunctionMutationupdatePostpostAuth0FunctionAppSyncFunctionB977D8DD)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R/e5bef6f0-fe24-11ef-b7fc-06822b500091',
        EventId:
          'MutationupdatePostpostAuth0FunctionMutationupdatePostpostAuth0FunctionAppSyncFunctionB977D8DD-DELETE_IN_PROGRESS-2025-03-11T03:05:50.506Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R',
        LogicalResourceId:
          'MutationupdatePostpostAuth0FunctionMutationupdatePostpostAuth0FunctionAppSyncFunctionB977D8DD',
        PhysicalResourceId:
          'arn:aws:appsync:us-west-2:123456789012:apis/ezabg7fk2jecvodrblowtgbsme/functions/pvonullxbzd5paawkz3o6sqdku',
        ResourceType: 'AWS::AppSync::FunctionConfiguration',
        Timestamp: new Date('2025-03-11T03:05:50.506'),
        ResourceStatus: 'DELETE_IN_PROGRESS',
        ResourceProperties:
          '{"DataSourceName":"NONE_DS","ResponseMappingTemplate":"$util.toJson({})","FunctionVersion":"2018-05-29","RequestMappingTemplateS3Location":"s3://cdk-hnb659fds-assets-123456789012-us-west-2/c1721bcd774e27c514d3454b5be4f9bdd094c0161b57ddf053d618e3b0086a77.vtl","ApiId":"ezabg7fk2jecvodrblowtgbsme","Name":"MutationupdatePostpostAuth0Function"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'MutationupdatePostpostAuth0FunctionMutationupdatePostpostAuth0FunctionAppSyncFunctionB977D8DD',
        },
        constructPath:
          'data/amplifyData/Post/MutationupdatePostpostAuth0Function/MutationupdatePostpostAuth0Function.AppSyncFunction',
      },
      progress: {
        completed: 38,
        formatted: ' 38',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R |  38 | 11:05:50 PM | DELETE_IN_PROGRESS | AWS::AppSync::FunctionConfiguration | data/amplifyData/Post/MutationupdatePostauth0Function/MutationupdatePostauth0Function.AppSyncFunction (MutationupdatePostauth0FunctionMutationupdatePostauth0FunctionAppSyncFunction3E057835)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R/e5bef6f0-fe24-11ef-b7fc-06822b500091',
        EventId:
          'MutationupdatePostauth0FunctionMutationupdatePostauth0FunctionAppSyncFunction3E057835-DELETE_IN_PROGRESS-2025-03-11T03:05:50.531Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R',
        LogicalResourceId:
          'MutationupdatePostauth0FunctionMutationupdatePostauth0FunctionAppSyncFunction3E057835',
        PhysicalResourceId:
          'arn:aws:appsync:us-west-2:123456789012:apis/ezabg7fk2jecvodrblowtgbsme/functions/h56cyfin3jdzrcumvncqwrt3re',
        ResourceType: 'AWS::AppSync::FunctionConfiguration',
        Timestamp: new Date('2025-03-11T03:05:50.531'),
        ResourceStatus: 'DELETE_IN_PROGRESS',
        ResourceProperties:
          '{"ResponseMappingTemplateS3Location":"s3://cdk-hnb659fds-assets-123456789012-us-west-2/245ed8ac5185462a6923b7e45a318fec4c9ba0c45d1d720abd5b20317aa3dc6a.vtl","DataSourceName":"PostTable","FunctionVersion":"2018-05-29","RequestMappingTemplateS3Location":"s3://cdk-hnb659fds-assets-123456789012-us-west-2/1f5fed297da9c32ae3af922bf3a38ccf23b956078887d16891ec06c20c64722c.vtl","ApiId":"ezabg7fk2jecvodrblowtgbsme","Name":"MutationupdatePostauth0Function"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'MutationupdatePostauth0FunctionMutationupdatePostauth0FunctionAppSyncFunction3E057835',
        },
        constructPath:
          'data/amplifyData/Post/MutationupdatePostauth0Function/MutationupdatePostauth0Function.AppSyncFunction',
      },
      progress: {
        completed: 38,
        formatted: ' 38',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I0000',
    message:
      '[sdk info] CloudFormation.DescribeStackEvents({"StackName":"amplify-sampleprojectapp-user-sandbox-0e1752a889"}) -> OK',
  },
  {
    code: 'CDK_TOOLKIT_I0000',
    message:
      '[sdk info] CloudFormation.DescribeStackEvents({"StackName":"arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0e1752a889-MyCustomResourcesBB610599-8G262VTBDJMK/96f8f2f0-fe24-11ef-a75d-0aa9ea96647d"}) -> OK',
  },
  {
    code: 'CDK_TOOLKIT_I0000',
    message:
      '[sdk info] CloudFormation.DescribeStackEvents({"StackName":"arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0e1752a889-storage0EC3F24A-FW28UHWGJFK9/b34eac10-fe24-11ef-884b-028f2e174171"}) -> OK',
  },
  {
    code: 'CDK_TOOLKIT_I0000',
    message:
      '[sdk info] CloudFormation.DescribeStacks({"StackName":"amplify-sampleprojectapp-user-sandbox-0e1752a889"}) -> OK',
  },
  {
    code: 'CDK_TOOLKIT_I0000',
    message:
      'Stack amplify-sampleprojectapp-user-sandbox-0e1752a889 has an ongoing operation in progress and is not stable (DELETE_IN_PROGRESS)',
  },
  {
    code: 'CDK_TOOLKIT_I0000',
    message:
      '[sdk info] CloudFormation.DescribeStackEvents({"StackName":"arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C/b355b0f0-fe24-11ef-a0bd-020db6799971"}) -> OK',
  },
  {
    code: 'CDK_TOOLKIT_I0000',
    message:
      '[sdk info] CloudFormation.DescribeStackEvents({"StackName":"arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB/e5b11440-fe24-11ef-98e6-0abc8a28bbed"}) -> OK',
  },
  {
    code: 'CDK_TOOLKIT_I0000',
    message:
      '[sdk info] CloudFormation.DescribeStackEvents({"StackName":"arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R/e5bef6f0-fe24-11ef-b7fc-06822b500091"}) -> OK',
  },
  {
    code: 'CDK_TOOLKIT_I0000',
    message:
      '[sdk info] CloudFormation.DescribeStackEvents({"StackName":"arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0e1752a889-function1351588B-K1KSYX88PE55/96d9ab20-fe24-11ef-ade0-0ac4f18960c3"}) -> OK',
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB |  37 | 11:05:49 PM | DELETE_COMPLETE | AWS::CDK::Metadata | auth/CDKMetadata/Default (CDKMetadata)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB/e5b11440-fe24-11ef-98e6-0abc8a28bbed',
        EventId: 'CDKMetadata-DELETE_COMPLETE-2025-03-11T03:05:49.469Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB',
        LogicalResourceId: 'CDKMetadata',
        PhysicalResourceId: 'e5b11440-fe24-11ef-98e6-0abc8a28bbed',
        ResourceType: 'AWS::CDK::Metadata',
        Timestamp: new Date('2025-03-11T03:05:49.469'),
        ResourceStatus: 'DELETE_COMPLETE',
        ResourceProperties:
          '{"Analytics":"v2:deflate64:H4sIAAAAAAAA/1WOwW6DMAyGn6X34BV66XUF7dhNsHtlEoNSQoJip1WFePcJOnXa6fcnf7L/AvJjAfsd3jnTZsicbWE+EwuZRlAPquz8F0YcSSiuUAZvrNjgVU0cUtSkysQSxj/s/GvGO19m8/A4BtPCN7aOTsikLI4w18E97eBoUThN/PAa5mrTq7ZCweZ18j99JK/XEmXwne1TxK3R72d3o7goPlyQmYThfQ3FBzglPZCsBZbV/UwyJVHbuhHsre8X5YMhuPLbrdhDfoR8d2Vrs5i82JGgfuYPmws9YTYBAAA="}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'CDKMetadata',
        },
        constructPath: 'auth/CDKMetadata/Default',
      },
      progress: {
        completed: 37,
        formatted: ' 37',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB |  38 | 11:05:49 PM | DELETE_COMPLETE | AWS::AppSync::Resolver | data/amplifyData/Person/queryGetPersonResolver (GetPersonResolver)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB/e5b11440-fe24-11ef-98e6-0abc8a28bbed',
        EventId: 'GetPersonResolver-DELETE_COMPLETE-2025-03-11T03:05:49.711Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB',
        LogicalResourceId: 'GetPersonResolver',
        PhysicalResourceId:
          'arn:aws:appsync:us-west-2:123456789012:apis/ezabg7fk2jecvodrblowtgbsme/types/Query/resolvers/getPerson',
        ResourceType: 'AWS::AppSync::Resolver',
        Timestamp: new Date('2025-03-11T03:05:49.711'),
        ResourceStatus: 'DELETE_COMPLETE',
        ResourceProperties:
          '{"TypeName":"Query","PipelineConfig":{"Functions":["fxp6umnevrgejoc6ie4evhvbuy","j7ma7m72dzbbxlvwxnswquvp7m","mww5bpc3ijalfmgmgcbffy3br4","nkxgdfksvrh4ljuf6l5df2liye"]},"RequestMappingTemplate":"$util.qr($ctx.stash.put(\\"typeName\\", \\"Query\\"))\\n$util.qr($ctx.stash.put(\\"fieldName\\", \\"getPerson\\"))\\n$util.qr($ctx.stash.put(\\"conditions\\", []))\\n$util.qr($ctx.stash.put(\\"metadata\\", {}))\\n$util.qr($ctx.stash.metadata.put(\\"dataSourceType\\", \\"AMAZON_DYNAMODB\\"))\\n$util.qr($ctx.stash.metadata.put(\\"apiId\\", \\"ezabg7fk2jecvodrblowtgbsme\\"))\\n$util.qr($ctx.stash.put(\\"connectionAttributes\\", {}))\\n$util.qr($ctx.stash.put(\\"tableName\\", \\"Person-ezabg7fk2jecvodrblowtgbsme-NONE\\"))\\n$util.qr($ctx.stash.put(\\"authRole\\", \\"arn:aws:sts::123456789012:assumed-role/amplify-sampleprojectapp--amplifyAuthauthenticatedU-JksUKi7c8Bvh/CognitoIdentityCredentials\\"))\\n$util.qr($ctx.stash.put(\\"unauthRole\\", \\"arn:aws:sts::123456789012:assumed-role/amplify-sampleprojectapp--amplifyAuthunauthenticate-0ZSS9wsA6Aut/CognitoIdentityCredentials\\"))\\n$util.qr($ctx.stash.put(\\"identityPoolId\\", \\"us-west-2:e3abf6f7-1ae5-4254-829e-0d8c9dc05bff\\"))\\n$util.qr($ctx.stash.put(\\"adminRoles\\", []))\\n$util.toJson({})","ResponseMappingTemplate":"$util.toJson($ctx.prev.result)","Kind":"PIPELINE","ApiId":"ezabg7fk2jecvodrblowtgbsme","FieldName":"getPerson"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'GetPersonResolver',
        },
        constructPath: 'data/amplifyData/Person/queryGetPersonResolver',
      },
      progress: {
        completed: 38,
        formatted: ' 38',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB |  39 | 11:05:49 PM | DELETE_COMPLETE | AWS::AppSync::Resolver | data/amplifyData/Person/subscriptionOnCreatePersonResolver (SubscriptiononCreatePersonResolver)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB/e5b11440-fe24-11ef-98e6-0abc8a28bbed',
        EventId:
          'SubscriptiononCreatePersonResolver-DELETE_COMPLETE-2025-03-11T03:05:49.716Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB',
        LogicalResourceId: 'SubscriptiononCreatePersonResolver',
        PhysicalResourceId:
          'arn:aws:appsync:us-west-2:123456789012:apis/ezabg7fk2jecvodrblowtgbsme/types/Subscription/resolvers/onCreatePerson',
        ResourceType: 'AWS::AppSync::Resolver',
        Timestamp: new Date('2025-03-11T03:05:49.716'),
        ResourceStatus: 'DELETE_COMPLETE',
        ResourceProperties:
          '{"TypeName":"Subscription","PipelineConfig":{"Functions":["3y32gczezfendjwyhg3limpemu","zd37h5lkzvf4lkimvnuzml3ady","rk2xwwynencundrx4j6we63tli"]},"RequestMappingTemplate":"$util.qr($ctx.stash.put(\\"typeName\\", \\"Subscription\\"))\\n$util.qr($ctx.stash.put(\\"fieldName\\", \\"onCreatePerson\\"))\\n$util.qr($ctx.stash.put(\\"conditions\\", []))\\n$util.qr($ctx.stash.put(\\"metadata\\", {}))\\n$util.qr($ctx.stash.metadata.put(\\"dataSourceType\\", \\"NONE\\"))\\n$util.qr($ctx.stash.metadata.put(\\"apiId\\", \\"ezabg7fk2jecvodrblowtgbsme\\"))\\n$util.qr($ctx.stash.put(\\"connectionAttributes\\", {}))\\n\\n$util.qr($ctx.stash.put(\\"authRole\\", \\"arn:aws:sts::123456789012:assumed-role/amplify-sampleprojectapp--amplifyAuthauthenticatedU-JksUKi7c8Bvh/CognitoIdentityCredentials\\"))\\n$util.qr($ctx.stash.put(\\"unauthRole\\", \\"arn:aws:sts::123456789012:assumed-role/amplify-sampleprojectapp--amplifyAuthunauthenticate-0ZSS9wsA6Aut/CognitoIdentityCredentials\\"))\\n$util.qr($ctx.stash.put(\\"identityPoolId\\", \\"us-west-2:e3abf6f7-1ae5-4254-829e-0d8c9dc05bff\\"))\\n$util.qr($ctx.stash.put(\\"adminRoles\\", []))\\n$util.toJson({})","ResponseMappingTemplate":"$util.toJson($ctx.prev.result)","Kind":"PIPELINE","ApiId":"ezabg7fk2jecvodrblowtgbsme","FieldName":"onCreatePerson"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'SubscriptiononCreatePersonResolver',
        },
        constructPath:
          'data/amplifyData/Person/subscriptionOnCreatePersonResolver',
      },
      progress: {
        completed: 39,
        formatted: ' 39',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB |  40 | 11:05:49 PM | DELETE_COMPLETE | AWS::AppSync::Resolver | data/amplifyData/Person/mutationCreatePersonResolver (CreatePersonResolver)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB/e5b11440-fe24-11ef-98e6-0abc8a28bbed',
        EventId:
          'CreatePersonResolver-DELETE_COMPLETE-2025-03-11T03:05:49.722Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB',
        LogicalResourceId: 'CreatePersonResolver',
        PhysicalResourceId:
          'arn:aws:appsync:us-west-2:123456789012:apis/ezabg7fk2jecvodrblowtgbsme/types/Mutation/resolvers/createPerson',
        ResourceType: 'AWS::AppSync::Resolver',
        Timestamp: new Date('2025-03-11T03:05:49.722'),
        ResourceStatus: 'DELETE_COMPLETE',
        ResourceProperties:
          '{"TypeName":"Mutation","PipelineConfig":{"Functions":["xfd65c2hkjhalpwxglpuq5sx7y","noijgh2g7venfeqfik4qgptz54","mmpex5pwczgq3ha6xzzqb3hlfu","kbbjrr24ifda3j7gjbnesczhfm","sbejvx5gmrefhnll6svxvubhzm"]},"RequestMappingTemplate":"$util.qr($ctx.stash.put(\\"typeName\\", \\"Mutation\\"))\\n$util.qr($ctx.stash.put(\\"fieldName\\", \\"createPerson\\"))\\n$util.qr($ctx.stash.put(\\"conditions\\", []))\\n$util.qr($ctx.stash.put(\\"metadata\\", {}))\\n$util.qr($ctx.stash.metadata.put(\\"dataSourceType\\", \\"AMAZON_DYNAMODB\\"))\\n$util.qr($ctx.stash.metadata.put(\\"apiId\\", \\"ezabg7fk2jecvodrblowtgbsme\\"))\\n$util.qr($ctx.stash.put(\\"connectionAttributes\\", {}))\\n$util.qr($ctx.stash.put(\\"tableName\\", \\"Person-ezabg7fk2jecvodrblowtgbsme-NONE\\"))\\n$util.qr($ctx.stash.put(\\"authRole\\", \\"arn:aws:sts::123456789012:assumed-role/amplify-sampleprojectapp--amplifyAuthauthenticatedU-JksUKi7c8Bvh/CognitoIdentityCredentials\\"))\\n$util.qr($ctx.stash.put(\\"unauthRole\\", \\"arn:aws:sts::123456789012:assumed-role/amplify-sampleprojectapp--amplifyAuthunauthenticate-0ZSS9wsA6Aut/CognitoIdentityCredentials\\"))\\n$util.qr($ctx.stash.put(\\"identityPoolId\\", \\"us-west-2:e3abf6f7-1ae5-4254-829e-0d8c9dc05bff\\"))\\n$util.qr($ctx.stash.put(\\"adminRoles\\", []))\\n$util.toJson({})","ResponseMappingTemplate":"$util.toJson($ctx.prev.result)","Kind":"PIPELINE","ApiId":"ezabg7fk2jecvodrblowtgbsme","FieldName":"createPerson"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'CreatePersonResolver',
        },
        constructPath: 'data/amplifyData/Person/mutationCreatePersonResolver',
      },
      progress: {
        completed: 40,
        formatted: ' 40',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB |  41 | 11:05:49 PM | DELETE_COMPLETE | AWS::AppSync::Resolver | data/amplifyData/Person/subscriptionOnUpdatePersonResolver (SubscriptiononUpdatePersonResolver)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB/e5b11440-fe24-11ef-98e6-0abc8a28bbed',
        EventId:
          'SubscriptiononUpdatePersonResolver-DELETE_COMPLETE-2025-03-11T03:05:49.726Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB',
        LogicalResourceId: 'SubscriptiononUpdatePersonResolver',
        PhysicalResourceId:
          'arn:aws:appsync:us-west-2:123456789012:apis/ezabg7fk2jecvodrblowtgbsme/types/Subscription/resolvers/onUpdatePerson',
        ResourceType: 'AWS::AppSync::Resolver',
        Timestamp: new Date('2025-03-11T03:05:49.726'),
        ResourceStatus: 'DELETE_COMPLETE',
        ResourceProperties:
          '{"TypeName":"Subscription","PipelineConfig":{"Functions":["wgp453i5nrd6hi7zr7s4zns6sm","pmyspxat2vdmjiymvjummc7s7m","zlyqslxpyvhcjpwcrtcrdteczm"]},"RequestMappingTemplate":"$util.qr($ctx.stash.put(\\"typeName\\", \\"Subscription\\"))\\n$util.qr($ctx.stash.put(\\"fieldName\\", \\"onUpdatePerson\\"))\\n$util.qr($ctx.stash.put(\\"conditions\\", []))\\n$util.qr($ctx.stash.put(\\"metadata\\", {}))\\n$util.qr($ctx.stash.metadata.put(\\"dataSourceType\\", \\"NONE\\"))\\n$util.qr($ctx.stash.metadata.put(\\"apiId\\", \\"ezabg7fk2jecvodrblowtgbsme\\"))\\n$util.qr($ctx.stash.put(\\"connectionAttributes\\", {}))\\n\\n$util.qr($ctx.stash.put(\\"authRole\\", \\"arn:aws:sts::123456789012:assumed-role/amplify-sampleprojectapp--amplifyAuthauthenticatedU-JksUKi7c8Bvh/CognitoIdentityCredentials\\"))\\n$util.qr($ctx.stash.put(\\"unauthRole\\", \\"arn:aws:sts::123456789012:assumed-role/amplify-sampleprojectapp--amplifyAuthunauthenticate-0ZSS9wsA6Aut/CognitoIdentityCredentials\\"))\\n$util.qr($ctx.stash.put(\\"identityPoolId\\", \\"us-west-2:e3abf6f7-1ae5-4254-829e-0d8c9dc05bff\\"))\\n$util.qr($ctx.stash.put(\\"adminRoles\\", []))\\n$util.toJson({})","ResponseMappingTemplate":"$util.toJson($ctx.prev.result)","Kind":"PIPELINE","ApiId":"ezabg7fk2jecvodrblowtgbsme","FieldName":"onUpdatePerson"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'SubscriptiononUpdatePersonResolver',
        },
        constructPath:
          'data/amplifyData/Person/subscriptionOnUpdatePersonResolver',
      },
      progress: {
        completed: 41,
        formatted: ' 41',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB |  42 | 11:05:49 PM | DELETE_COMPLETE | AWS::AppSync::Resolver | data/amplifyData/Person/queryListPeopleResolver (ListPersonResolver)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB/e5b11440-fe24-11ef-98e6-0abc8a28bbed',
        EventId: 'ListPersonResolver-DELETE_COMPLETE-2025-03-11T03:05:49.832Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB',
        LogicalResourceId: 'ListPersonResolver',
        PhysicalResourceId:
          'arn:aws:appsync:us-west-2:123456789012:apis/ezabg7fk2jecvodrblowtgbsme/types/Query/resolvers/listPeople',
        ResourceType: 'AWS::AppSync::Resolver',
        Timestamp: new Date('2025-03-11T03:05:49.832'),
        ResourceStatus: 'DELETE_COMPLETE',
        ResourceProperties:
          '{"TypeName":"Query","PipelineConfig":{"Functions":["2mjgtot57ja4rovhifofn6n24i","uspzxifumjg5vdjo3c5oxxi2jm","vsx6d6l5mbfqzloqw3n4zt7qbm","nbxjndnqqzconosf5uqiaqqbwe"]},"RequestMappingTemplate":"$util.qr($ctx.stash.put(\\"typeName\\", \\"Query\\"))\\n$util.qr($ctx.stash.put(\\"fieldName\\", \\"listPeople\\"))\\n$util.qr($ctx.stash.put(\\"conditions\\", []))\\n$util.qr($ctx.stash.put(\\"metadata\\", {}))\\n$util.qr($ctx.stash.metadata.put(\\"dataSourceType\\", \\"AMAZON_DYNAMODB\\"))\\n$util.qr($ctx.stash.metadata.put(\\"apiId\\", \\"ezabg7fk2jecvodrblowtgbsme\\"))\\n$util.qr($ctx.stash.put(\\"connectionAttributes\\", {}))\\n$util.qr($ctx.stash.put(\\"tableName\\", \\"Person-ezabg7fk2jecvodrblowtgbsme-NONE\\"))\\n$util.qr($ctx.stash.put(\\"authRole\\", \\"arn:aws:sts::123456789012:assumed-role/amplify-sampleprojectapp--amplifyAuthauthenticatedU-JksUKi7c8Bvh/CognitoIdentityCredentials\\"))\\n$util.qr($ctx.stash.put(\\"unauthRole\\", \\"arn:aws:sts::123456789012:assumed-role/amplify-sampleprojectapp--amplifyAuthunauthenticate-0ZSS9wsA6Aut/CognitoIdentityCredentials\\"))\\n$util.qr($ctx.stash.put(\\"identityPoolId\\", \\"us-west-2:e3abf6f7-1ae5-4254-829e-0d8c9dc05bff\\"))\\n$util.qr($ctx.stash.put(\\"adminRoles\\", []))\\n$util.toJson({})","ResponseMappingTemplate":"$util.toJson($ctx.prev.result)","Kind":"PIPELINE","ApiId":"ezabg7fk2jecvodrblowtgbsme","FieldName":"listPeople"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'ListPersonResolver',
        },
        constructPath: 'data/amplifyData/Person/queryListPeopleResolver',
      },
      progress: {
        completed: 42,
        formatted: ' 42',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB |  43 | 11:05:50 PM | DELETE_COMPLETE | AWS::AppSync::Resolver | data/amplifyData/Person/mutationUpdatePersonResolver (UpdatePersonResolver)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB/e5b11440-fe24-11ef-98e6-0abc8a28bbed',
        EventId:
          'UpdatePersonResolver-DELETE_COMPLETE-2025-03-11T03:05:50.006Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB',
        LogicalResourceId: 'UpdatePersonResolver',
        PhysicalResourceId:
          'arn:aws:appsync:us-west-2:123456789012:apis/ezabg7fk2jecvodrblowtgbsme/types/Mutation/resolvers/updatePerson',
        ResourceType: 'AWS::AppSync::Resolver',
        Timestamp: new Date('2025-03-11T03:05:50.006'),
        ResourceStatus: 'DELETE_COMPLETE',
        ResourceProperties:
          '{"TypeName":"Mutation","PipelineConfig":{"Functions":["lrz6kxtwtjfdfojnsv4nrgi2ja","tte6urkn75guvfbryioaqkzgaq","3dherkbr6rgdrinqosb6vezy7a","iyqtinipsfbsrlrhgb62o7llf4","serryhyg4fe7djdoxekx7gkabi"]},"RequestMappingTemplate":"$util.qr($ctx.stash.put(\\"typeName\\", \\"Mutation\\"))\\n$util.qr($ctx.stash.put(\\"fieldName\\", \\"updatePerson\\"))\\n$util.qr($ctx.stash.put(\\"conditions\\", []))\\n$util.qr($ctx.stash.put(\\"metadata\\", {}))\\n$util.qr($ctx.stash.metadata.put(\\"dataSourceType\\", \\"AMAZON_DYNAMODB\\"))\\n$util.qr($ctx.stash.metadata.put(\\"apiId\\", \\"ezabg7fk2jecvodrblowtgbsme\\"))\\n$util.qr($ctx.stash.put(\\"connectionAttributes\\", {}))\\n$util.qr($ctx.stash.put(\\"tableName\\", \\"Person-ezabg7fk2jecvodrblowtgbsme-NONE\\"))\\n$util.qr($ctx.stash.put(\\"authRole\\", \\"arn:aws:sts::123456789012:assumed-role/amplify-sampleprojectapp--amplifyAuthauthenticatedU-JksUKi7c8Bvh/CognitoIdentityCredentials\\"))\\n$util.qr($ctx.stash.put(\\"unauthRole\\", \\"arn:aws:sts::123456789012:assumed-role/amplify-sampleprojectapp--amplifyAuthunauthenticate-0ZSS9wsA6Aut/CognitoIdentityCredentials\\"))\\n$util.qr($ctx.stash.put(\\"identityPoolId\\", \\"us-west-2:e3abf6f7-1ae5-4254-829e-0d8c9dc05bff\\"))\\n$util.qr($ctx.stash.put(\\"adminRoles\\", []))\\n$util.toJson({})","ResponseMappingTemplate":"$util.toJson($ctx.prev.result)","Kind":"PIPELINE","ApiId":"ezabg7fk2jecvodrblowtgbsme","FieldName":"updatePerson"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'UpdatePersonResolver',
        },
        constructPath: 'data/amplifyData/Person/mutationUpdatePersonResolver',
      },
      progress: {
        completed: 43,
        formatted: ' 43',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB |  43 | 11:05:50 PM | DELETE_IN_PROGRESS | AWS::AppSync::FunctionConfiguration | data/amplifyData/Person/SubscriptiononCreatePersonauth0Function/SubscriptiononCreatePersonauth0Function.AppSyncFunction (SubscriptiononCreatePersonauth0FunctionSubscriptiononCreatePersonauth0FunctionAppSyncFunctionF5035C7D)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB/e5b11440-fe24-11ef-98e6-0abc8a28bbed',
        EventId:
          'SubscriptiononCreatePersonauth0FunctionSubscriptiononCreatePersonauth0FunctionAppSyncFunctionF5035C7D-DELETE_IN_PROGRESS-2025-03-11T03:05:50.071Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB',
        LogicalResourceId:
          'SubscriptiononCreatePersonauth0FunctionSubscriptiononCreatePersonauth0FunctionAppSyncFunctionF5035C7D',
        PhysicalResourceId:
          'arn:aws:appsync:us-west-2:123456789012:apis/ezabg7fk2jecvodrblowtgbsme/functions/3y32gczezfendjwyhg3limpemu',
        ResourceType: 'AWS::AppSync::FunctionConfiguration',
        Timestamp: new Date('2025-03-11T03:05:50.071'),
        ResourceStatus: 'DELETE_IN_PROGRESS',
        ResourceProperties:
          '{"DataSourceName":"NONE_DS","ResponseMappingTemplate":"$util.toJson({})","FunctionVersion":"2018-05-29","RequestMappingTemplateS3Location":"s3://cdk-hnb659fds-assets-123456789012-us-west-2/6f3a2a9d562ae3058cc1aed6741edbf5edcaef7b3df7b03f52478816a1c95ffb.vtl","ApiId":"ezabg7fk2jecvodrblowtgbsme","Name":"SubscriptiononCreatePersonauth0Function"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'SubscriptiononCreatePersonauth0FunctionSubscriptiononCreatePersonauth0FunctionAppSyncFunctionF5035C7D',
        },
        constructPath:
          'data/amplifyData/Person/SubscriptiononCreatePersonauth0Function/SubscriptiononCreatePersonauth0Function.AppSyncFunction',
      },
      progress: {
        completed: 43,
        formatted: ' 43',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB |  43 | 11:05:50 PM | DELETE_IN_PROGRESS | AWS::AppSync::FunctionConfiguration | data/amplifyData/Person/SubscriptiononCreatePersonpostAuth0Function/SubscriptiononCreatePersonpostAuth0Function.AppSyncFunction (SubscriptiononCreatePersonpostAuth0FunctionSubscriptiononCreatePersonpostAuth0FunctionAppSyncFunction5919295E)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB/e5b11440-fe24-11ef-98e6-0abc8a28bbed',
        EventId:
          'SubscriptiononCreatePersonpostAuth0FunctionSubscriptiononCreatePersonpostAuth0FunctionAppSyncFunction5919295E-DELETE_IN_PROGRESS-2025-03-11T03:05:50.087Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB',
        LogicalResourceId:
          'SubscriptiononCreatePersonpostAuth0FunctionSubscriptiononCreatePersonpostAuth0FunctionAppSyncFunction5919295E',
        PhysicalResourceId:
          'arn:aws:appsync:us-west-2:123456789012:apis/ezabg7fk2jecvodrblowtgbsme/functions/zd37h5lkzvf4lkimvnuzml3ady',
        ResourceType: 'AWS::AppSync::FunctionConfiguration',
        Timestamp: new Date('2025-03-11T03:05:50.087'),
        ResourceStatus: 'DELETE_IN_PROGRESS',
        ResourceProperties:
          '{"DataSourceName":"NONE_DS","ResponseMappingTemplate":"$util.toJson({})","FunctionVersion":"2018-05-29","RequestMappingTemplateS3Location":"s3://cdk-hnb659fds-assets-123456789012-us-west-2/c1721bcd774e27c514d3454b5be4f9bdd094c0161b57ddf053d618e3b0086a77.vtl","ApiId":"ezabg7fk2jecvodrblowtgbsme","Name":"SubscriptiononCreatePersonpostAuth0Function"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'SubscriptiononCreatePersonpostAuth0FunctionSubscriptiononCreatePersonpostAuth0FunctionAppSyncFunction5919295E',
        },
        constructPath:
          'data/amplifyData/Person/SubscriptiononCreatePersonpostAuth0Function/SubscriptiononCreatePersonpostAuth0Function.AppSyncFunction',
      },
      progress: {
        completed: 43,
        formatted: ' 43',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB |  44 | 11:05:50 PM | DELETE_COMPLETE | AWS::AppSync::Resolver | data/amplifyData/Person/subscriptionOnDeletePersonResolver (SubscriptiononDeletePersonResolver)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB/e5b11440-fe24-11ef-98e6-0abc8a28bbed',
        EventId:
          'SubscriptiononDeletePersonResolver-DELETE_COMPLETE-2025-03-11T03:05:50.096Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB',
        LogicalResourceId: 'SubscriptiononDeletePersonResolver',
        PhysicalResourceId:
          'arn:aws:appsync:us-west-2:123456789012:apis/ezabg7fk2jecvodrblowtgbsme/types/Subscription/resolvers/onDeletePerson',
        ResourceType: 'AWS::AppSync::Resolver',
        Timestamp: new Date('2025-03-11T03:05:50.096'),
        ResourceStatus: 'DELETE_COMPLETE',
        ResourceProperties:
          '{"TypeName":"Subscription","PipelineConfig":{"Functions":["kuqwbehgnnfqxhxwg6pd3q4i24","d7ymp3hiu5di3gcqhfyopzsqhm","5dnepofrwvgj5o55dn4kyzboiu"]},"RequestMappingTemplate":"$util.qr($ctx.stash.put(\\"typeName\\", \\"Subscription\\"))\\n$util.qr($ctx.stash.put(\\"fieldName\\", \\"onDeletePerson\\"))\\n$util.qr($ctx.stash.put(\\"conditions\\", []))\\n$util.qr($ctx.stash.put(\\"metadata\\", {}))\\n$util.qr($ctx.stash.metadata.put(\\"dataSourceType\\", \\"NONE\\"))\\n$util.qr($ctx.stash.metadata.put(\\"apiId\\", \\"ezabg7fk2jecvodrblowtgbsme\\"))\\n$util.qr($ctx.stash.put(\\"connectionAttributes\\", {}))\\n\\n$util.qr($ctx.stash.put(\\"authRole\\", \\"arn:aws:sts::123456789012:assumed-role/amplify-sampleprojectapp--amplifyAuthauthenticatedU-JksUKi7c8Bvh/CognitoIdentityCredentials\\"))\\n$util.qr($ctx.stash.put(\\"unauthRole\\", \\"arn:aws:sts::123456789012:assumed-role/amplify-sampleprojectapp--amplifyAuthunauthenticate-0ZSS9wsA6Aut/CognitoIdentityCredentials\\"))\\n$util.qr($ctx.stash.put(\\"identityPoolId\\", \\"us-west-2:e3abf6f7-1ae5-4254-829e-0d8c9dc05bff\\"))\\n$util.qr($ctx.stash.put(\\"adminRoles\\", []))\\n$util.toJson({})","ResponseMappingTemplate":"$util.toJson($ctx.prev.result)","Kind":"PIPELINE","ApiId":"ezabg7fk2jecvodrblowtgbsme","FieldName":"onDeletePerson"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'SubscriptiononDeletePersonResolver',
        },
        constructPath:
          'data/amplifyData/Person/subscriptionOnDeletePersonResolver',
      },
      progress: {
        completed: 44,
        formatted: ' 44',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB |  44 | 11:05:50 PM | DELETE_IN_PROGRESS | AWS::AppSync::FunctionConfiguration | data/amplifyData/Person/QuerygetPersonpostAuth0Function/QuerygetPersonpostAuth0Function.AppSyncFunction (QuerygetPersonpostAuth0FunctionQuerygetPersonpostAuth0FunctionAppSyncFunctionF5352000)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB/e5b11440-fe24-11ef-98e6-0abc8a28bbed',
        EventId:
          'QuerygetPersonpostAuth0FunctionQuerygetPersonpostAuth0FunctionAppSyncFunctionF5352000-DELETE_IN_PROGRESS-2025-03-11T03:05:50.118Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB',
        LogicalResourceId:
          'QuerygetPersonpostAuth0FunctionQuerygetPersonpostAuth0FunctionAppSyncFunctionF5352000',
        PhysicalResourceId:
          'arn:aws:appsync:us-west-2:123456789012:apis/ezabg7fk2jecvodrblowtgbsme/functions/mww5bpc3ijalfmgmgcbffy3br4',
        ResourceType: 'AWS::AppSync::FunctionConfiguration',
        Timestamp: new Date('2025-03-11T03:05:50.118'),
        ResourceStatus: 'DELETE_IN_PROGRESS',
        ResourceProperties:
          '{"DataSourceName":"NONE_DS","ResponseMappingTemplate":"$util.toJson({})","FunctionVersion":"2018-05-29","RequestMappingTemplateS3Location":"s3://cdk-hnb659fds-assets-123456789012-us-west-2/c1721bcd774e27c514d3454b5be4f9bdd094c0161b57ddf053d618e3b0086a77.vtl","ApiId":"ezabg7fk2jecvodrblowtgbsme","Name":"QuerygetPersonpostAuth0Function"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'QuerygetPersonpostAuth0FunctionQuerygetPersonpostAuth0FunctionAppSyncFunctionF5352000',
        },
        constructPath:
          'data/amplifyData/Person/QuerygetPersonpostAuth0Function/QuerygetPersonpostAuth0Function.AppSyncFunction',
      },
      progress: {
        completed: 44,
        formatted: ' 44',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB |  44 | 11:05:50 PM | DELETE_IN_PROGRESS | AWS::AppSync::FunctionConfiguration | data/amplifyData/Person/SubscriptionOnCreatePersonDataResolverFn/SubscriptionOnCreatePersonDataResolverFn.AppSyncFunction (SubscriptionOnCreatePersonDataResolverFnSubscriptionOnCreatePersonDataResolverFnAppSyncFunctionCDDD5891)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB/e5b11440-fe24-11ef-98e6-0abc8a28bbed',
        EventId:
          'SubscriptionOnCreatePersonDataResolverFnSubscriptionOnCreatePersonDataResolverFnAppSyncFunctionCDDD5891-DELETE_IN_PROGRESS-2025-03-11T03:05:50.120Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB',
        LogicalResourceId:
          'SubscriptionOnCreatePersonDataResolverFnSubscriptionOnCreatePersonDataResolverFnAppSyncFunctionCDDD5891',
        PhysicalResourceId:
          'arn:aws:appsync:us-west-2:123456789012:apis/ezabg7fk2jecvodrblowtgbsme/functions/rk2xwwynencundrx4j6we63tli',
        ResourceType: 'AWS::AppSync::FunctionConfiguration',
        Timestamp: new Date('2025-03-11T03:05:50.120'),
        ResourceStatus: 'DELETE_IN_PROGRESS',
        ResourceProperties:
          '{"ResponseMappingTemplateS3Location":"s3://cdk-hnb659fds-assets-123456789012-us-west-2/e0cff47fb007f0bbf2a4e43ca256d6aa7ec109821769fd79fa7c5e83f0e7f9fc.vtl","DataSourceName":"NONE_DS","FunctionVersion":"2018-05-29","RequestMappingTemplateS3Location":"s3://cdk-hnb659fds-assets-123456789012-us-west-2/fe3c43ada4b9d681a5e2312663ef7a73386424d73b73e51f8e2e9d4b50f7c502.vtl","ApiId":"ezabg7fk2jecvodrblowtgbsme","Name":"SubscriptionOnCreatePersonDataResolverFn"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'SubscriptionOnCreatePersonDataResolverFnSubscriptionOnCreatePersonDataResolverFnAppSyncFunctionCDDD5891',
        },
        constructPath:
          'data/amplifyData/Person/SubscriptionOnCreatePersonDataResolverFn/SubscriptionOnCreatePersonDataResolverFn.AppSyncFunction',
      },
      progress: {
        completed: 44,
        formatted: ' 44',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB |  44 | 11:05:50 PM | DELETE_IN_PROGRESS | AWS::AppSync::FunctionConfiguration | data/amplifyData/Person/MutationCreatePersonDataResolverFn/MutationCreatePersonDataResolverFn.AppSyncFunction (MutationCreatePersonDataResolverFnMutationCreatePersonDataResolverFnAppSyncFunctionD6255519)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB/e5b11440-fe24-11ef-98e6-0abc8a28bbed',
        EventId:
          'MutationCreatePersonDataResolverFnMutationCreatePersonDataResolverFnAppSyncFunctionD6255519-DELETE_IN_PROGRESS-2025-03-11T03:05:50.144Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB',
        LogicalResourceId:
          'MutationCreatePersonDataResolverFnMutationCreatePersonDataResolverFnAppSyncFunctionD6255519',
        PhysicalResourceId:
          'arn:aws:appsync:us-west-2:123456789012:apis/ezabg7fk2jecvodrblowtgbsme/functions/sbejvx5gmrefhnll6svxvubhzm',
        ResourceType: 'AWS::AppSync::FunctionConfiguration',
        Timestamp: new Date('2025-03-11T03:05:50.144'),
        ResourceStatus: 'DELETE_IN_PROGRESS',
        ResourceProperties:
          '{"ResponseMappingTemplateS3Location":"s3://cdk-hnb659fds-assets-123456789012-us-west-2/f4a52b72209a9dfa197b5e7367a5c378c5bb86de6e29ddd9e48b49a3fe54b249.vtl","DataSourceName":"PersonTable","FunctionVersion":"2018-05-29","RequestMappingTemplateS3Location":"s3://cdk-hnb659fds-assets-123456789012-us-west-2/725b7ed3971927a1e99c853643b4ca575c3d612fff9b50d3f616c4feeb79a7d7.vtl","ApiId":"ezabg7fk2jecvodrblowtgbsme","Name":"MutationCreatePersonDataResolverFn"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'MutationCreatePersonDataResolverFnMutationCreatePersonDataResolverFnAppSyncFunctionD6255519',
        },
        constructPath:
          'data/amplifyData/Person/MutationCreatePersonDataResolverFn/MutationCreatePersonDataResolverFn.AppSyncFunction',
      },
      progress: {
        completed: 44,
        formatted: ' 44',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB |  44 | 11:05:50 PM | DELETE_IN_PROGRESS | AWS::AppSync::FunctionConfiguration | data/amplifyData/Person/QuerygetPersonpreAuth0Function/QuerygetPersonpreAuth0Function.AppSyncFunction (QuerygetPersonpreAuth0FunctionQuerygetPersonpreAuth0FunctionAppSyncFunction3473CCE0)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB/e5b11440-fe24-11ef-98e6-0abc8a28bbed',
        EventId:
          'QuerygetPersonpreAuth0FunctionQuerygetPersonpreAuth0FunctionAppSyncFunction3473CCE0-DELETE_IN_PROGRESS-2025-03-11T03:05:50.145Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB',
        LogicalResourceId:
          'QuerygetPersonpreAuth0FunctionQuerygetPersonpreAuth0FunctionAppSyncFunction3473CCE0',
        PhysicalResourceId:
          'arn:aws:appsync:us-west-2:123456789012:apis/ezabg7fk2jecvodrblowtgbsme/functions/fxp6umnevrgejoc6ie4evhvbuy',
        ResourceType: 'AWS::AppSync::FunctionConfiguration',
        Timestamp: new Date('2025-03-11T03:05:50.145'),
        ResourceStatus: 'DELETE_IN_PROGRESS',
        ResourceProperties:
          '{"DataSourceName":"NONE_DS","ResponseMappingTemplate":"$util.toJson({})","FunctionVersion":"2018-05-29","RequestMappingTemplateS3Location":"s3://cdk-hnb659fds-assets-123456789012-us-west-2/6479af76f5a4d8b61b53dd3cee8e18ae192b629ad15ced7b342690a9ebbdd8c2.vtl","ApiId":"ezabg7fk2jecvodrblowtgbsme","Name":"QuerygetPersonpreAuth0Function"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'QuerygetPersonpreAuth0FunctionQuerygetPersonpreAuth0FunctionAppSyncFunction3473CCE0',
        },
        constructPath:
          'data/amplifyData/Person/QuerygetPersonpreAuth0Function/QuerygetPersonpreAuth0Function.AppSyncFunction',
      },
      progress: {
        completed: 44,
        formatted: ' 44',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB |  44 | 11:05:50 PM | DELETE_IN_PROGRESS | AWS::AppSync::FunctionConfiguration | data/amplifyData/Person/MutationcreatePersonpostAuth0Function/MutationcreatePersonpostAuth0Function.AppSyncFunction (MutationcreatePersonpostAuth0FunctionMutationcreatePersonpostAuth0FunctionAppSyncFunction04EFC40F)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB/e5b11440-fe24-11ef-98e6-0abc8a28bbed',
        EventId:
          'MutationcreatePersonpostAuth0FunctionMutationcreatePersonpostAuth0FunctionAppSyncFunction04EFC40F-DELETE_IN_PROGRESS-2025-03-11T03:05:50.146Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB',
        LogicalResourceId:
          'MutationcreatePersonpostAuth0FunctionMutationcreatePersonpostAuth0FunctionAppSyncFunction04EFC40F',
        PhysicalResourceId:
          'arn:aws:appsync:us-west-2:123456789012:apis/ezabg7fk2jecvodrblowtgbsme/functions/kbbjrr24ifda3j7gjbnesczhfm',
        ResourceType: 'AWS::AppSync::FunctionConfiguration',
        Timestamp: new Date('2025-03-11T03:05:50.146'),
        ResourceStatus: 'DELETE_IN_PROGRESS',
        ResourceProperties:
          '{"DataSourceName":"NONE_DS","ResponseMappingTemplate":"$util.toJson({})","FunctionVersion":"2018-05-29","RequestMappingTemplateS3Location":"s3://cdk-hnb659fds-assets-123456789012-us-west-2/c1721bcd774e27c514d3454b5be4f9bdd094c0161b57ddf053d618e3b0086a77.vtl","ApiId":"ezabg7fk2jecvodrblowtgbsme","Name":"MutationcreatePersonpostAuth0Function"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'MutationcreatePersonpostAuth0FunctionMutationcreatePersonpostAuth0FunctionAppSyncFunction04EFC40F',
        },
        constructPath:
          'data/amplifyData/Person/MutationcreatePersonpostAuth0Function/MutationcreatePersonpostAuth0Function.AppSyncFunction',
      },
      progress: {
        completed: 44,
        formatted: ' 44',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB |  44 | 11:05:50 PM | DELETE_IN_PROGRESS | AWS::AppSync::FunctionConfiguration | data/amplifyData/Person/MutationcreatePersoninit0Function/MutationcreatePersoninit0Function.AppSyncFunction (MutationcreatePersoninit0FunctionMutationcreatePersoninit0FunctionAppSyncFunctionD4A94967)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB/e5b11440-fe24-11ef-98e6-0abc8a28bbed',
        EventId:
          'MutationcreatePersoninit0FunctionMutationcreatePersoninit0FunctionAppSyncFunctionD4A94967-DELETE_IN_PROGRESS-2025-03-11T03:05:50.154Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB',
        LogicalResourceId:
          'MutationcreatePersoninit0FunctionMutationcreatePersoninit0FunctionAppSyncFunctionD4A94967',
        PhysicalResourceId:
          'arn:aws:appsync:us-west-2:123456789012:apis/ezabg7fk2jecvodrblowtgbsme/functions/xfd65c2hkjhalpwxglpuq5sx7y',
        ResourceType: 'AWS::AppSync::FunctionConfiguration',
        Timestamp: new Date('2025-03-11T03:05:50.154'),
        ResourceStatus: 'DELETE_IN_PROGRESS',
        ResourceProperties:
          '{"DataSourceName":"NONE_DS","ResponseMappingTemplate":"$util.toJson({})","FunctionVersion":"2018-05-29","RequestMappingTemplateS3Location":"s3://cdk-hnb659fds-assets-123456789012-us-west-2/3cf32e28e3985b88b598dacbcc9a81cbb12cab62b6507082eb20a0702d3c197e.vtl","ApiId":"ezabg7fk2jecvodrblowtgbsme","Name":"MutationcreatePersoninit0Function"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'MutationcreatePersoninit0FunctionMutationcreatePersoninit0FunctionAppSyncFunctionD4A94967',
        },
        constructPath:
          'data/amplifyData/Person/MutationcreatePersoninit0Function/MutationcreatePersoninit0Function.AppSyncFunction',
      },
      progress: {
        completed: 44,
        formatted: ' 44',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB |  44 | 11:05:50 PM | DELETE_IN_PROGRESS | AWS::AppSync::FunctionConfiguration | data/amplifyData/Person/QueryGetPersonDataResolverFn/QueryGetPersonDataResolverFn.AppSyncFunction (QueryGetPersonDataResolverFnQueryGetPersonDataResolverFnAppSyncFunction9DC39353)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB/e5b11440-fe24-11ef-98e6-0abc8a28bbed',
        EventId:
          'QueryGetPersonDataResolverFnQueryGetPersonDataResolverFnAppSyncFunction9DC39353-DELETE_IN_PROGRESS-2025-03-11T03:05:50.155Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB',
        LogicalResourceId:
          'QueryGetPersonDataResolverFnQueryGetPersonDataResolverFnAppSyncFunction9DC39353',
        PhysicalResourceId:
          'arn:aws:appsync:us-west-2:123456789012:apis/ezabg7fk2jecvodrblowtgbsme/functions/nkxgdfksvrh4ljuf6l5df2liye',
        ResourceType: 'AWS::AppSync::FunctionConfiguration',
        Timestamp: new Date('2025-03-11T03:05:50.155'),
        ResourceStatus: 'DELETE_IN_PROGRESS',
        ResourceProperties:
          '{"ResponseMappingTemplateS3Location":"s3://cdk-hnb659fds-assets-123456789012-us-west-2/4c6a2d29f01c6091bd1d9afe16e5849d456c96f17c3b215938c8067399532719.vtl","DataSourceName":"PersonTable","FunctionVersion":"2018-05-29","RequestMappingTemplateS3Location":"s3://cdk-hnb659fds-assets-123456789012-us-west-2/08f4d557693d96c1a4efba0f9dc91330e4b19772fd5477c156468843e3d9cb5e.vtl","ApiId":"ezabg7fk2jecvodrblowtgbsme","Name":"QueryGetPersonDataResolverFn"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'QueryGetPersonDataResolverFnQueryGetPersonDataResolverFnAppSyncFunction9DC39353',
        },
        constructPath:
          'data/amplifyData/Person/QueryGetPersonDataResolverFn/QueryGetPersonDataResolverFn.AppSyncFunction',
      },
      progress: {
        completed: 44,
        formatted: ' 44',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB |  44 | 11:05:50 PM | DELETE_IN_PROGRESS | AWS::AppSync::FunctionConfiguration | data/amplifyData/Person/MutationcreatePersonpreAuth0Function/MutationcreatePersonpreAuth0Function.AppSyncFunction (MutationcreatePersonpreAuth0FunctionMutationcreatePersonpreAuth0FunctionAppSyncFunction335C1A9F)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB/e5b11440-fe24-11ef-98e6-0abc8a28bbed',
        EventId:
          'MutationcreatePersonpreAuth0FunctionMutationcreatePersonpreAuth0FunctionAppSyncFunction335C1A9F-DELETE_IN_PROGRESS-2025-03-11T03:05:50.157Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB',
        LogicalResourceId:
          'MutationcreatePersonpreAuth0FunctionMutationcreatePersonpreAuth0FunctionAppSyncFunction335C1A9F',
        PhysicalResourceId:
          'arn:aws:appsync:us-west-2:123456789012:apis/ezabg7fk2jecvodrblowtgbsme/functions/noijgh2g7venfeqfik4qgptz54',
        ResourceType: 'AWS::AppSync::FunctionConfiguration',
        Timestamp: new Date('2025-03-11T03:05:50.157'),
        ResourceStatus: 'DELETE_IN_PROGRESS',
        ResourceProperties:
          '{"DataSourceName":"NONE_DS","ResponseMappingTemplate":"$util.toJson({})","FunctionVersion":"2018-05-29","RequestMappingTemplateS3Location":"s3://cdk-hnb659fds-assets-123456789012-us-west-2/fface358117b1edafc4dbe09854c750ff9d1cad2ab9aed9cff18b5df478d3d5d.vtl","ApiId":"ezabg7fk2jecvodrblowtgbsme","Name":"MutationcreatePersonpreAuth0Function"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'MutationcreatePersonpreAuth0FunctionMutationcreatePersonpreAuth0FunctionAppSyncFunction335C1A9F',
        },
        constructPath:
          'data/amplifyData/Person/MutationcreatePersonpreAuth0Function/MutationcreatePersonpreAuth0Function.AppSyncFunction',
      },
      progress: {
        completed: 44,
        formatted: ' 44',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB |  44 | 11:05:50 PM | DELETE_IN_PROGRESS | AWS::AppSync::FunctionConfiguration | data/amplifyData/Person/QuerygetPersonauth0Function/QuerygetPersonauth0Function.AppSyncFunction (QuerygetPersonauth0FunctionQuerygetPersonauth0FunctionAppSyncFunction6DF9D0C4)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB/e5b11440-fe24-11ef-98e6-0abc8a28bbed',
        EventId:
          'QuerygetPersonauth0FunctionQuerygetPersonauth0FunctionAppSyncFunction6DF9D0C4-DELETE_IN_PROGRESS-2025-03-11T03:05:50.159Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB',
        LogicalResourceId:
          'QuerygetPersonauth0FunctionQuerygetPersonauth0FunctionAppSyncFunction6DF9D0C4',
        PhysicalResourceId:
          'arn:aws:appsync:us-west-2:123456789012:apis/ezabg7fk2jecvodrblowtgbsme/functions/j7ma7m72dzbbxlvwxnswquvp7m',
        ResourceType: 'AWS::AppSync::FunctionConfiguration',
        Timestamp: new Date('2025-03-11T03:05:50.159'),
        ResourceStatus: 'DELETE_IN_PROGRESS',
        ResourceProperties:
          '{"DataSourceName":"NONE_DS","ResponseMappingTemplate":"$util.toJson({})","FunctionVersion":"2018-05-29","RequestMappingTemplateS3Location":"s3://cdk-hnb659fds-assets-123456789012-us-west-2/88d5b7081b0dc9c39fd0bffedf56f011b2a7cf1ce5cc227f47a1e94efee8067c.vtl","ApiId":"ezabg7fk2jecvodrblowtgbsme","Name":"QuerygetPersonauth0Function"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'QuerygetPersonauth0FunctionQuerygetPersonauth0FunctionAppSyncFunction6DF9D0C4',
        },
        constructPath:
          'data/amplifyData/Person/QuerygetPersonauth0Function/QuerygetPersonauth0Function.AppSyncFunction',
      },
      progress: {
        completed: 44,
        formatted: ' 44',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB |  44 | 11:05:50 PM | DELETE_IN_PROGRESS | AWS::AppSync::FunctionConfiguration | data/amplifyData/Person/MutationcreatePersonauth0Function/MutationcreatePersonauth0Function.AppSyncFunction (MutationcreatePersonauth0FunctionMutationcreatePersonauth0FunctionAppSyncFunctionEAFBF427)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB/e5b11440-fe24-11ef-98e6-0abc8a28bbed',
        EventId:
          'MutationcreatePersonauth0FunctionMutationcreatePersonauth0FunctionAppSyncFunctionEAFBF427-DELETE_IN_PROGRESS-2025-03-11T03:05:50.169Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB',
        LogicalResourceId:
          'MutationcreatePersonauth0FunctionMutationcreatePersonauth0FunctionAppSyncFunctionEAFBF427',
        PhysicalResourceId:
          'arn:aws:appsync:us-west-2:123456789012:apis/ezabg7fk2jecvodrblowtgbsme/functions/mmpex5pwczgq3ha6xzzqb3hlfu',
        ResourceType: 'AWS::AppSync::FunctionConfiguration',
        Timestamp: new Date('2025-03-11T03:05:50.169'),
        ResourceStatus: 'DELETE_IN_PROGRESS',
        ResourceProperties:
          '{"DataSourceName":"NONE_DS","ResponseMappingTemplate":"$util.toJson({})","FunctionVersion":"2018-05-29","RequestMappingTemplateS3Location":"s3://cdk-hnb659fds-assets-123456789012-us-west-2/b371d68ddfbdd11b176756ce33b2c4e79d26fcc2fd4b7c0c9e75d06efacee90e.vtl","ApiId":"ezabg7fk2jecvodrblowtgbsme","Name":"MutationcreatePersonauth0Function"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'MutationcreatePersonauth0FunctionMutationcreatePersonauth0FunctionAppSyncFunctionEAFBF427',
        },
        constructPath:
          'data/amplifyData/Person/MutationcreatePersonauth0Function/MutationcreatePersonauth0Function.AppSyncFunction',
      },
      progress: {
        completed: 44,
        formatted: ' 44',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB |  44 | 11:05:50 PM | DELETE_IN_PROGRESS | AWS::AppSync::FunctionConfiguration | data/amplifyData/Person/QuerylistPeopleauth0Function/QuerylistPeopleauth0Function.AppSyncFunction (QuerylistPeopleauth0FunctionQuerylistPeopleauth0FunctionAppSyncFunction54C0D154)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB/e5b11440-fe24-11ef-98e6-0abc8a28bbed',
        EventId:
          'QuerylistPeopleauth0FunctionQuerylistPeopleauth0FunctionAppSyncFunction54C0D154-DELETE_IN_PROGRESS-2025-03-11T03:05:50.204Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB',
        LogicalResourceId:
          'QuerylistPeopleauth0FunctionQuerylistPeopleauth0FunctionAppSyncFunction54C0D154',
        PhysicalResourceId:
          'arn:aws:appsync:us-west-2:123456789012:apis/ezabg7fk2jecvodrblowtgbsme/functions/uspzxifumjg5vdjo3c5oxxi2jm',
        ResourceType: 'AWS::AppSync::FunctionConfiguration',
        Timestamp: new Date('2025-03-11T03:05:50.204'),
        ResourceStatus: 'DELETE_IN_PROGRESS',
        ResourceProperties:
          '{"DataSourceName":"NONE_DS","ResponseMappingTemplate":"$util.toJson({})","FunctionVersion":"2018-05-29","RequestMappingTemplateS3Location":"s3://cdk-hnb659fds-assets-123456789012-us-west-2/88d5b7081b0dc9c39fd0bffedf56f011b2a7cf1ce5cc227f47a1e94efee8067c.vtl","ApiId":"ezabg7fk2jecvodrblowtgbsme","Name":"QuerylistPeopleauth0Function"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'QuerylistPeopleauth0FunctionQuerylistPeopleauth0FunctionAppSyncFunction54C0D154',
        },
        constructPath:
          'data/amplifyData/Person/QuerylistPeopleauth0Function/QuerylistPeopleauth0Function.AppSyncFunction',
      },
      progress: {
        completed: 44,
        formatted: ' 44',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB |  44 | 11:05:50 PM | DELETE_IN_PROGRESS | AWS::AppSync::FunctionConfiguration | data/amplifyData/Person/QuerylistPeoplepostAuth0Function/QuerylistPeoplepostAuth0Function.AppSyncFunction (QuerylistPeoplepostAuth0FunctionQuerylistPeoplepostAuth0FunctionAppSyncFunction1786EC37)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB/e5b11440-fe24-11ef-98e6-0abc8a28bbed',
        EventId:
          'QuerylistPeoplepostAuth0FunctionQuerylistPeoplepostAuth0FunctionAppSyncFunction1786EC37-DELETE_IN_PROGRESS-2025-03-11T03:05:50.219Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB',
        LogicalResourceId:
          'QuerylistPeoplepostAuth0FunctionQuerylistPeoplepostAuth0FunctionAppSyncFunction1786EC37',
        PhysicalResourceId:
          'arn:aws:appsync:us-west-2:123456789012:apis/ezabg7fk2jecvodrblowtgbsme/functions/vsx6d6l5mbfqzloqw3n4zt7qbm',
        ResourceType: 'AWS::AppSync::FunctionConfiguration',
        Timestamp: new Date('2025-03-11T03:05:50.219'),
        ResourceStatus: 'DELETE_IN_PROGRESS',
        ResourceProperties:
          '{"DataSourceName":"NONE_DS","ResponseMappingTemplate":"$util.toJson({})","FunctionVersion":"2018-05-29","RequestMappingTemplateS3Location":"s3://cdk-hnb659fds-assets-123456789012-us-west-2/c1721bcd774e27c514d3454b5be4f9bdd094c0161b57ddf053d618e3b0086a77.vtl","ApiId":"ezabg7fk2jecvodrblowtgbsme","Name":"QuerylistPeoplepostAuth0Function"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'QuerylistPeoplepostAuth0FunctionQuerylistPeoplepostAuth0FunctionAppSyncFunction1786EC37',
        },
        constructPath:
          'data/amplifyData/Person/QuerylistPeoplepostAuth0Function/QuerylistPeoplepostAuth0Function.AppSyncFunction',
      },
      progress: {
        completed: 44,
        formatted: ' 44',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB |  44 | 11:05:50 PM | DELETE_IN_PROGRESS | AWS::AppSync::FunctionConfiguration | data/amplifyData/Person/QuerylistPeoplepreAuth0Function/QuerylistPeoplepreAuth0Function.AppSyncFunction (QuerylistPeoplepreAuth0FunctionQuerylistPeoplepreAuth0FunctionAppSyncFunction8DA9EDA1)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB/e5b11440-fe24-11ef-98e6-0abc8a28bbed',
        EventId:
          'QuerylistPeoplepreAuth0FunctionQuerylistPeoplepreAuth0FunctionAppSyncFunction8DA9EDA1-DELETE_IN_PROGRESS-2025-03-11T03:05:50.223Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB',
        LogicalResourceId:
          'QuerylistPeoplepreAuth0FunctionQuerylistPeoplepreAuth0FunctionAppSyncFunction8DA9EDA1',
        PhysicalResourceId:
          'arn:aws:appsync:us-west-2:123456789012:apis/ezabg7fk2jecvodrblowtgbsme/functions/2mjgtot57ja4rovhifofn6n24i',
        ResourceType: 'AWS::AppSync::FunctionConfiguration',
        Timestamp: new Date('2025-03-11T03:05:50.223'),
        ResourceStatus: 'DELETE_IN_PROGRESS',
        ResourceProperties:
          '{"DataSourceName":"NONE_DS","ResponseMappingTemplate":"$util.toJson({})","FunctionVersion":"2018-05-29","RequestMappingTemplateS3Location":"s3://cdk-hnb659fds-assets-123456789012-us-west-2/6ce8d75a422db2491407ccfc9807e5de43e86bed091909b805008adb8243b05d.vtl","ApiId":"ezabg7fk2jecvodrblowtgbsme","Name":"QuerylistPeoplepreAuth0Function"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'QuerylistPeoplepreAuth0FunctionQuerylistPeoplepreAuth0FunctionAppSyncFunction8DA9EDA1',
        },
        constructPath:
          'data/amplifyData/Person/QuerylistPeoplepreAuth0Function/QuerylistPeoplepreAuth0Function.AppSyncFunction',
      },
      progress: {
        completed: 44,
        formatted: ' 44',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB |  44 | 11:05:50 PM | DELETE_IN_PROGRESS | AWS::AppSync::FunctionConfiguration | data/amplifyData/Person/QueryListPeopleDataResolverFn/QueryListPeopleDataResolverFn.AppSyncFunction (QueryListPeopleDataResolverFnQueryListPeopleDataResolverFnAppSyncFunction7527A154)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB/e5b11440-fe24-11ef-98e6-0abc8a28bbed',
        EventId:
          'QueryListPeopleDataResolverFnQueryListPeopleDataResolverFnAppSyncFunction7527A154-DELETE_IN_PROGRESS-2025-03-11T03:05:50.227Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB',
        LogicalResourceId:
          'QueryListPeopleDataResolverFnQueryListPeopleDataResolverFnAppSyncFunction7527A154',
        PhysicalResourceId:
          'arn:aws:appsync:us-west-2:123456789012:apis/ezabg7fk2jecvodrblowtgbsme/functions/nbxjndnqqzconosf5uqiaqqbwe',
        ResourceType: 'AWS::AppSync::FunctionConfiguration',
        Timestamp: new Date('2025-03-11T03:05:50.227'),
        ResourceStatus: 'DELETE_IN_PROGRESS',
        ResourceProperties:
          '{"ResponseMappingTemplateS3Location":"s3://cdk-hnb659fds-assets-123456789012-us-west-2/cc01911d0269d4080ea57505dc445dfc315ef7ad85d3d9d4ea1357858bff451d.vtl","DataSourceName":"PersonTable","FunctionVersion":"2018-05-29","RequestMappingTemplateS3Location":"s3://cdk-hnb659fds-assets-123456789012-us-west-2/9fcbe070ecd3023c5bf5b966fa9584757db9762eef123bad0820bd87591b2174.vtl","ApiId":"ezabg7fk2jecvodrblowtgbsme","Name":"QueryListPeopleDataResolverFn"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'QueryListPeopleDataResolverFnQueryListPeopleDataResolverFnAppSyncFunction7527A154',
        },
        constructPath:
          'data/amplifyData/Person/QueryListPeopleDataResolverFn/QueryListPeopleDataResolverFn.AppSyncFunction',
      },
      progress: {
        completed: 44,
        formatted: ' 44',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB |  44 | 11:05:50 PM | DELETE_IN_PROGRESS | AWS::AppSync::FunctionConfiguration | data/amplifyData/Person/MutationupdatePersoninit0Function/MutationupdatePersoninit0Function.AppSyncFunction (MutationupdatePersoninit0FunctionMutationupdatePersoninit0FunctionAppSyncFunction1245D23B)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB/e5b11440-fe24-11ef-98e6-0abc8a28bbed',
        EventId:
          'MutationupdatePersoninit0FunctionMutationupdatePersoninit0FunctionAppSyncFunction1245D23B-DELETE_IN_PROGRESS-2025-03-11T03:05:50.369Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB',
        LogicalResourceId:
          'MutationupdatePersoninit0FunctionMutationupdatePersoninit0FunctionAppSyncFunction1245D23B',
        PhysicalResourceId:
          'arn:aws:appsync:us-west-2:123456789012:apis/ezabg7fk2jecvodrblowtgbsme/functions/lrz6kxtwtjfdfojnsv4nrgi2ja',
        ResourceType: 'AWS::AppSync::FunctionConfiguration',
        Timestamp: new Date('2025-03-11T03:05:50.369'),
        ResourceStatus: 'DELETE_IN_PROGRESS',
        ResourceProperties:
          '{"DataSourceName":"NONE_DS","ResponseMappingTemplate":"$util.toJson({})","FunctionVersion":"2018-05-29","RequestMappingTemplateS3Location":"s3://cdk-hnb659fds-assets-123456789012-us-west-2/06db846fd14e6fc371f22b12b5545ba8e2dbfeda85d8c8d586c71c282166657b.vtl","ApiId":"ezabg7fk2jecvodrblowtgbsme","Name":"MutationupdatePersoninit0Function"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'MutationupdatePersoninit0FunctionMutationupdatePersoninit0FunctionAppSyncFunction1245D23B',
        },
        constructPath:
          'data/amplifyData/Person/MutationupdatePersoninit0Function/MutationupdatePersoninit0Function.AppSyncFunction',
      },
      progress: {
        completed: 44,
        formatted: ' 44',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB |  44 | 11:05:50 PM | DELETE_IN_PROGRESS | AWS::AppSync::FunctionConfiguration | data/amplifyData/Person/MutationUpdatePersonDataResolverFn/MutationUpdatePersonDataResolverFn.AppSyncFunction (MutationUpdatePersonDataResolverFnMutationUpdatePersonDataResolverFnAppSyncFunctionA221542D)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB/e5b11440-fe24-11ef-98e6-0abc8a28bbed',
        EventId:
          'MutationUpdatePersonDataResolverFnMutationUpdatePersonDataResolverFnAppSyncFunctionA221542D-DELETE_IN_PROGRESS-2025-03-11T03:05:50.369Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB',
        LogicalResourceId:
          'MutationUpdatePersonDataResolverFnMutationUpdatePersonDataResolverFnAppSyncFunctionA221542D',
        PhysicalResourceId:
          'arn:aws:appsync:us-west-2:123456789012:apis/ezabg7fk2jecvodrblowtgbsme/functions/serryhyg4fe7djdoxekx7gkabi',
        ResourceType: 'AWS::AppSync::FunctionConfiguration',
        Timestamp: new Date('2025-03-11T03:05:50.369'),
        ResourceStatus: 'DELETE_IN_PROGRESS',
        ResourceProperties:
          '{"ResponseMappingTemplateS3Location":"s3://cdk-hnb659fds-assets-123456789012-us-west-2/f4a52b72209a9dfa197b5e7367a5c378c5bb86de6e29ddd9e48b49a3fe54b249.vtl","DataSourceName":"PersonTable","FunctionVersion":"2018-05-29","RequestMappingTemplateS3Location":"s3://cdk-hnb659fds-assets-123456789012-us-west-2/474bf0776ec2164a13191d1a0a9e057154931e4918fea5086f49850d02a5371b.vtl","ApiId":"ezabg7fk2jecvodrblowtgbsme","Name":"MutationUpdatePersonDataResolverFn"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'MutationUpdatePersonDataResolverFnMutationUpdatePersonDataResolverFnAppSyncFunctionA221542D',
        },
        constructPath:
          'data/amplifyData/Person/MutationUpdatePersonDataResolverFn/MutationUpdatePersonDataResolverFn.AppSyncFunction',
      },
      progress: {
        completed: 44,
        formatted: ' 44',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB |  44 | 11:05:50 PM | DELETE_IN_PROGRESS | AWS::AppSync::FunctionConfiguration | data/amplifyData/Person/MutationupdatePersonpreAuth0Function/MutationupdatePersonpreAuth0Function.AppSyncFunction (MutationupdatePersonpreAuth0FunctionMutationupdatePersonpreAuth0FunctionAppSyncFunction7AAE6AAD)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB/e5b11440-fe24-11ef-98e6-0abc8a28bbed',
        EventId:
          'MutationupdatePersonpreAuth0FunctionMutationupdatePersonpreAuth0FunctionAppSyncFunction7AAE6AAD-DELETE_IN_PROGRESS-2025-03-11T03:05:50.386Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB',
        LogicalResourceId:
          'MutationupdatePersonpreAuth0FunctionMutationupdatePersonpreAuth0FunctionAppSyncFunction7AAE6AAD',
        PhysicalResourceId:
          'arn:aws:appsync:us-west-2:123456789012:apis/ezabg7fk2jecvodrblowtgbsme/functions/tte6urkn75guvfbryioaqkzgaq',
        ResourceType: 'AWS::AppSync::FunctionConfiguration',
        Timestamp: new Date('2025-03-11T03:05:50.386'),
        ResourceStatus: 'DELETE_IN_PROGRESS',
        ResourceProperties:
          '{"DataSourceName":"NONE_DS","ResponseMappingTemplate":"$util.toJson({})","FunctionVersion":"2018-05-29","RequestMappingTemplateS3Location":"s3://cdk-hnb659fds-assets-123456789012-us-west-2/fface358117b1edafc4dbe09854c750ff9d1cad2ab9aed9cff18b5df478d3d5d.vtl","ApiId":"ezabg7fk2jecvodrblowtgbsme","Name":"MutationupdatePersonpreAuth0Function"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'MutationupdatePersonpreAuth0FunctionMutationupdatePersonpreAuth0FunctionAppSyncFunction7AAE6AAD',
        },
        constructPath:
          'data/amplifyData/Person/MutationupdatePersonpreAuth0Function/MutationupdatePersonpreAuth0Function.AppSyncFunction',
      },
      progress: {
        completed: 44,
        formatted: ' 44',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB |  44 | 11:05:50 PM | DELETE_IN_PROGRESS | AWS::AppSync::FunctionConfiguration | data/amplifyData/Person/MutationupdatePersonpostAuth0Function/MutationupdatePersonpostAuth0Function.AppSyncFunction (MutationupdatePersonpostAuth0FunctionMutationupdatePersonpostAuth0FunctionAppSyncFunctionB321A1F7)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB/e5b11440-fe24-11ef-98e6-0abc8a28bbed',
        EventId:
          'MutationupdatePersonpostAuth0FunctionMutationupdatePersonpostAuth0FunctionAppSyncFunctionB321A1F7-DELETE_IN_PROGRESS-2025-03-11T03:05:50.394Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB',
        LogicalResourceId:
          'MutationupdatePersonpostAuth0FunctionMutationupdatePersonpostAuth0FunctionAppSyncFunctionB321A1F7',
        PhysicalResourceId:
          'arn:aws:appsync:us-west-2:123456789012:apis/ezabg7fk2jecvodrblowtgbsme/functions/iyqtinipsfbsrlrhgb62o7llf4',
        ResourceType: 'AWS::AppSync::FunctionConfiguration',
        Timestamp: new Date('2025-03-11T03:05:50.394'),
        ResourceStatus: 'DELETE_IN_PROGRESS',
        ResourceProperties:
          '{"DataSourceName":"NONE_DS","ResponseMappingTemplate":"$util.toJson({})","FunctionVersion":"2018-05-29","RequestMappingTemplateS3Location":"s3://cdk-hnb659fds-assets-123456789012-us-west-2/c1721bcd774e27c514d3454b5be4f9bdd094c0161b57ddf053d618e3b0086a77.vtl","ApiId":"ezabg7fk2jecvodrblowtgbsme","Name":"MutationupdatePersonpostAuth0Function"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'MutationupdatePersonpostAuth0FunctionMutationupdatePersonpostAuth0FunctionAppSyncFunctionB321A1F7',
        },
        constructPath:
          'data/amplifyData/Person/MutationupdatePersonpostAuth0Function/MutationupdatePersonpostAuth0Function.AppSyncFunction',
      },
      progress: {
        completed: 44,
        formatted: ' 44',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB |  44 | 11:05:50 PM | DELETE_IN_PROGRESS | AWS::AppSync::FunctionConfiguration | data/amplifyData/Person/MutationupdatePersonauth0Function/MutationupdatePersonauth0Function.AppSyncFunction (MutationupdatePersonauth0FunctionMutationupdatePersonauth0FunctionAppSyncFunction36E326CF)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB/e5b11440-fe24-11ef-98e6-0abc8a28bbed',
        EventId:
          'MutationupdatePersonauth0FunctionMutationupdatePersonauth0FunctionAppSyncFunction36E326CF-DELETE_IN_PROGRESS-2025-03-11T03:05:50.410Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB',
        LogicalResourceId:
          'MutationupdatePersonauth0FunctionMutationupdatePersonauth0FunctionAppSyncFunction36E326CF',
        PhysicalResourceId:
          'arn:aws:appsync:us-west-2:123456789012:apis/ezabg7fk2jecvodrblowtgbsme/functions/3dherkbr6rgdrinqosb6vezy7a',
        ResourceType: 'AWS::AppSync::FunctionConfiguration',
        Timestamp: new Date('2025-03-11T03:05:50.410'),
        ResourceStatus: 'DELETE_IN_PROGRESS',
        ResourceProperties:
          '{"ResponseMappingTemplateS3Location":"s3://cdk-hnb659fds-assets-123456789012-us-west-2/245ed8ac5185462a6923b7e45a318fec4c9ba0c45d1d720abd5b20317aa3dc6a.vtl","DataSourceName":"PersonTable","FunctionVersion":"2018-05-29","RequestMappingTemplateS3Location":"s3://cdk-hnb659fds-assets-123456789012-us-west-2/1f5fed297da9c32ae3af922bf3a38ccf23b956078887d16891ec06c20c64722c.vtl","ApiId":"ezabg7fk2jecvodrblowtgbsme","Name":"MutationupdatePersonauth0Function"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'MutationupdatePersonauth0FunctionMutationupdatePersonauth0FunctionAppSyncFunction36E326CF',
        },
        constructPath:
          'data/amplifyData/Person/MutationupdatePersonauth0Function/MutationupdatePersonauth0Function.AppSyncFunction',
      },
      progress: {
        completed: 44,
        formatted: ' 44',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB |  44 | 11:05:50 PM | DELETE_IN_PROGRESS | AWS::AppSync::FunctionConfiguration | data/amplifyData/Person/SubscriptiononDeletePersonauth0Function/SubscriptiononDeletePersonauth0Function.AppSyncFunction (SubscriptiononDeletePersonauth0FunctionSubscriptiononDeletePersonauth0FunctionAppSyncFunctionABDD4455)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB/e5b11440-fe24-11ef-98e6-0abc8a28bbed',
        EventId:
          'SubscriptiononDeletePersonauth0FunctionSubscriptiononDeletePersonauth0FunctionAppSyncFunctionABDD4455-DELETE_IN_PROGRESS-2025-03-11T03:05:50.504Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB',
        LogicalResourceId:
          'SubscriptiononDeletePersonauth0FunctionSubscriptiononDeletePersonauth0FunctionAppSyncFunctionABDD4455',
        PhysicalResourceId:
          'arn:aws:appsync:us-west-2:123456789012:apis/ezabg7fk2jecvodrblowtgbsme/functions/kuqwbehgnnfqxhxwg6pd3q4i24',
        ResourceType: 'AWS::AppSync::FunctionConfiguration',
        Timestamp: new Date('2025-03-11T03:05:50.504'),
        ResourceStatus: 'DELETE_IN_PROGRESS',
        ResourceProperties:
          '{"DataSourceName":"NONE_DS","ResponseMappingTemplate":"$util.toJson({})","FunctionVersion":"2018-05-29","RequestMappingTemplateS3Location":"s3://cdk-hnb659fds-assets-123456789012-us-west-2/6f3a2a9d562ae3058cc1aed6741edbf5edcaef7b3df7b03f52478816a1c95ffb.vtl","ApiId":"ezabg7fk2jecvodrblowtgbsme","Name":"SubscriptiononDeletePersonauth0Function"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'SubscriptiononDeletePersonauth0FunctionSubscriptiononDeletePersonauth0FunctionAppSyncFunctionABDD4455',
        },
        constructPath:
          'data/amplifyData/Person/SubscriptiononDeletePersonauth0Function/SubscriptiononDeletePersonauth0Function.AppSyncFunction',
      },
      progress: {
        completed: 44,
        formatted: ' 44',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB |  44 | 11:05:50 PM | DELETE_IN_PROGRESS | AWS::AppSync::FunctionConfiguration | data/amplifyData/Person/SubscriptionOnDeletePersonDataResolverFn/SubscriptionOnDeletePersonDataResolverFn.AppSyncFunction (SubscriptionOnDeletePersonDataResolverFnSubscriptionOnDeletePersonDataResolverFnAppSyncFunction10D6A6CE)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB/e5b11440-fe24-11ef-98e6-0abc8a28bbed',
        EventId:
          'SubscriptionOnDeletePersonDataResolverFnSubscriptionOnDeletePersonDataResolverFnAppSyncFunction10D6A6CE-DELETE_IN_PROGRESS-2025-03-11T03:05:50.511Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB',
        LogicalResourceId:
          'SubscriptionOnDeletePersonDataResolverFnSubscriptionOnDeletePersonDataResolverFnAppSyncFunction10D6A6CE',
        PhysicalResourceId:
          'arn:aws:appsync:us-west-2:123456789012:apis/ezabg7fk2jecvodrblowtgbsme/functions/5dnepofrwvgj5o55dn4kyzboiu',
        ResourceType: 'AWS::AppSync::FunctionConfiguration',
        Timestamp: new Date('2025-03-11T03:05:50.511'),
        ResourceStatus: 'DELETE_IN_PROGRESS',
        ResourceProperties:
          '{"ResponseMappingTemplateS3Location":"s3://cdk-hnb659fds-assets-123456789012-us-west-2/e0cff47fb007f0bbf2a4e43ca256d6aa7ec109821769fd79fa7c5e83f0e7f9fc.vtl","DataSourceName":"NONE_DS","FunctionVersion":"2018-05-29","RequestMappingTemplateS3Location":"s3://cdk-hnb659fds-assets-123456789012-us-west-2/fe3c43ada4b9d681a5e2312663ef7a73386424d73b73e51f8e2e9d4b50f7c502.vtl","ApiId":"ezabg7fk2jecvodrblowtgbsme","Name":"SubscriptionOnDeletePersonDataResolverFn"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'SubscriptionOnDeletePersonDataResolverFnSubscriptionOnDeletePersonDataResolverFnAppSyncFunction10D6A6CE',
        },
        constructPath:
          'data/amplifyData/Person/SubscriptionOnDeletePersonDataResolverFn/SubscriptionOnDeletePersonDataResolverFn.AppSyncFunction',
      },
      progress: {
        completed: 44,
        formatted: ' 44',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB |  44 | 11:05:50 PM | DELETE_IN_PROGRESS | AWS::AppSync::FunctionConfiguration | data/amplifyData/Person/SubscriptiononDeletePersonpostAuth0Function/SubscriptiononDeletePersonpostAuth0Function.AppSyncFunction (SubscriptiononDeletePersonpostAuth0FunctionSubscriptiononDeletePersonpostAuth0FunctionAppSyncFunctionA71D2E0E)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB/e5b11440-fe24-11ef-98e6-0abc8a28bbed',
        EventId:
          'SubscriptiononDeletePersonpostAuth0FunctionSubscriptiononDeletePersonpostAuth0FunctionAppSyncFunctionA71D2E0E-DELETE_IN_PROGRESS-2025-03-11T03:05:50.517Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB',
        LogicalResourceId:
          'SubscriptiononDeletePersonpostAuth0FunctionSubscriptiononDeletePersonpostAuth0FunctionAppSyncFunctionA71D2E0E',
        PhysicalResourceId:
          'arn:aws:appsync:us-west-2:123456789012:apis/ezabg7fk2jecvodrblowtgbsme/functions/d7ymp3hiu5di3gcqhfyopzsqhm',
        ResourceType: 'AWS::AppSync::FunctionConfiguration',
        Timestamp: new Date('2025-03-11T03:05:50.517'),
        ResourceStatus: 'DELETE_IN_PROGRESS',
        ResourceProperties:
          '{"DataSourceName":"NONE_DS","ResponseMappingTemplate":"$util.toJson({})","FunctionVersion":"2018-05-29","RequestMappingTemplateS3Location":"s3://cdk-hnb659fds-assets-123456789012-us-west-2/c1721bcd774e27c514d3454b5be4f9bdd094c0161b57ddf053d618e3b0086a77.vtl","ApiId":"ezabg7fk2jecvodrblowtgbsme","Name":"SubscriptiononDeletePersonpostAuth0Function"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'SubscriptiononDeletePersonpostAuth0FunctionSubscriptiononDeletePersonpostAuth0FunctionAppSyncFunctionA71D2E0E',
        },
        constructPath:
          'data/amplifyData/Person/SubscriptiononDeletePersonpostAuth0Function/SubscriptiononDeletePersonpostAuth0Function.AppSyncFunction',
      },
      progress: {
        completed: 44,
        formatted: ' 44',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB |  44 | 11:05:50 PM | DELETE_IN_PROGRESS | AWS::AppSync::FunctionConfiguration | data/amplifyData/Person/SubscriptionOnUpdatePersonDataResolverFn/SubscriptionOnUpdatePersonDataResolverFn.AppSyncFunction (SubscriptionOnUpdatePersonDataResolverFnSubscriptionOnUpdatePersonDataResolverFnAppSyncFunction531174D3)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB/e5b11440-fe24-11ef-98e6-0abc8a28bbed',
        EventId:
          'SubscriptionOnUpdatePersonDataResolverFnSubscriptionOnUpdatePersonDataResolverFnAppSyncFunction531174D3-DELETE_IN_PROGRESS-2025-03-11T03:05:50.869Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB',
        LogicalResourceId:
          'SubscriptionOnUpdatePersonDataResolverFnSubscriptionOnUpdatePersonDataResolverFnAppSyncFunction531174D3',
        PhysicalResourceId:
          'arn:aws:appsync:us-west-2:123456789012:apis/ezabg7fk2jecvodrblowtgbsme/functions/zlyqslxpyvhcjpwcrtcrdteczm',
        ResourceType: 'AWS::AppSync::FunctionConfiguration',
        Timestamp: new Date('2025-03-11T03:05:50.869'),
        ResourceStatus: 'DELETE_IN_PROGRESS',
        ResourceProperties:
          '{"ResponseMappingTemplateS3Location":"s3://cdk-hnb659fds-assets-123456789012-us-west-2/e0cff47fb007f0bbf2a4e43ca256d6aa7ec109821769fd79fa7c5e83f0e7f9fc.vtl","DataSourceName":"NONE_DS","FunctionVersion":"2018-05-29","RequestMappingTemplateS3Location":"s3://cdk-hnb659fds-assets-123456789012-us-west-2/fe3c43ada4b9d681a5e2312663ef7a73386424d73b73e51f8e2e9d4b50f7c502.vtl","ApiId":"ezabg7fk2jecvodrblowtgbsme","Name":"SubscriptionOnUpdatePersonDataResolverFn"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'SubscriptionOnUpdatePersonDataResolverFnSubscriptionOnUpdatePersonDataResolverFnAppSyncFunction531174D3',
        },
        constructPath:
          'data/amplifyData/Person/SubscriptionOnUpdatePersonDataResolverFn/SubscriptionOnUpdatePersonDataResolverFn.AppSyncFunction',
      },
      progress: {
        completed: 44,
        formatted: ' 44',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB |  44 | 11:05:50 PM | DELETE_IN_PROGRESS | AWS::AppSync::FunctionConfiguration | data/amplifyData/Person/SubscriptiononUpdatePersonpostAuth0Function/SubscriptiononUpdatePersonpostAuth0Function.AppSyncFunction (SubscriptiononUpdatePersonpostAuth0FunctionSubscriptiononUpdatePersonpostAuth0FunctionAppSyncFunction8A075045)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB/e5b11440-fe24-11ef-98e6-0abc8a28bbed',
        EventId:
          'SubscriptiononUpdatePersonpostAuth0FunctionSubscriptiononUpdatePersonpostAuth0FunctionAppSyncFunction8A075045-DELETE_IN_PROGRESS-2025-03-11T03:05:50.875Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB',
        LogicalResourceId:
          'SubscriptiononUpdatePersonpostAuth0FunctionSubscriptiononUpdatePersonpostAuth0FunctionAppSyncFunction8A075045',
        PhysicalResourceId:
          'arn:aws:appsync:us-west-2:123456789012:apis/ezabg7fk2jecvodrblowtgbsme/functions/pmyspxat2vdmjiymvjummc7s7m',
        ResourceType: 'AWS::AppSync::FunctionConfiguration',
        Timestamp: new Date('2025-03-11T03:05:50.875'),
        ResourceStatus: 'DELETE_IN_PROGRESS',
        ResourceProperties:
          '{"DataSourceName":"NONE_DS","ResponseMappingTemplate":"$util.toJson({})","FunctionVersion":"2018-05-29","RequestMappingTemplateS3Location":"s3://cdk-hnb659fds-assets-123456789012-us-west-2/c1721bcd774e27c514d3454b5be4f9bdd094c0161b57ddf053d618e3b0086a77.vtl","ApiId":"ezabg7fk2jecvodrblowtgbsme","Name":"SubscriptiononUpdatePersonpostAuth0Function"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'SubscriptiononUpdatePersonpostAuth0FunctionSubscriptiononUpdatePersonpostAuth0FunctionAppSyncFunction8A075045',
        },
        constructPath:
          'data/amplifyData/Person/SubscriptiononUpdatePersonpostAuth0Function/SubscriptiononUpdatePersonpostAuth0Function.AppSyncFunction',
      },
      progress: {
        completed: 44,
        formatted: ' 44',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB |  44 | 11:05:50 PM | DELETE_IN_PROGRESS | AWS::AppSync::FunctionConfiguration | data/amplifyData/Person/SubscriptiononUpdatePersonauth0Function/SubscriptiononUpdatePersonauth0Function.AppSyncFunction (SubscriptiononUpdatePersonauth0FunctionSubscriptiononUpdatePersonauth0FunctionAppSyncFunction353AC226)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB/e5b11440-fe24-11ef-98e6-0abc8a28bbed',
        EventId:
          'SubscriptiononUpdatePersonauth0FunctionSubscriptiononUpdatePersonauth0FunctionAppSyncFunction353AC226-DELETE_IN_PROGRESS-2025-03-11T03:05:50.894Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB',
        LogicalResourceId:
          'SubscriptiononUpdatePersonauth0FunctionSubscriptiononUpdatePersonauth0FunctionAppSyncFunction353AC226',
        PhysicalResourceId:
          'arn:aws:appsync:us-west-2:123456789012:apis/ezabg7fk2jecvodrblowtgbsme/functions/wgp453i5nrd6hi7zr7s4zns6sm',
        ResourceType: 'AWS::AppSync::FunctionConfiguration',
        Timestamp: new Date('2025-03-11T03:05:50.894'),
        ResourceStatus: 'DELETE_IN_PROGRESS',
        ResourceProperties:
          '{"DataSourceName":"NONE_DS","ResponseMappingTemplate":"$util.toJson({})","FunctionVersion":"2018-05-29","RequestMappingTemplateS3Location":"s3://cdk-hnb659fds-assets-123456789012-us-west-2/6f3a2a9d562ae3058cc1aed6741edbf5edcaef7b3df7b03f52478816a1c95ffb.vtl","ApiId":"ezabg7fk2jecvodrblowtgbsme","Name":"SubscriptiononUpdatePersonauth0Function"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'SubscriptiononUpdatePersonauth0FunctionSubscriptiononUpdatePersonauth0FunctionAppSyncFunction353AC226',
        },
        constructPath:
          'data/amplifyData/Person/SubscriptiononUpdatePersonauth0Function/SubscriptiononUpdatePersonauth0Function.AppSyncFunction',
      },
      progress: {
        completed: 44,
        formatted: ' 44',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R |  45 | 11:05:51 PM | DELETE_COMPLETE | AWS::AppSync::FunctionConfiguration | data/amplifyData/Post/QueryGetPostDataResolverFn/QueryGetPostDataResolverFn.AppSyncFunction (QueryGetPostDataResolverFnQueryGetPostDataResolverFnAppSyncFunction06724190)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R/e5bef6f0-fe24-11ef-b7fc-06822b500091',
        EventId:
          'QueryGetPostDataResolverFnQueryGetPostDataResolverFnAppSyncFunction06724190-DELETE_COMPLETE-2025-03-11T03:05:51.042Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R',
        LogicalResourceId:
          'QueryGetPostDataResolverFnQueryGetPostDataResolverFnAppSyncFunction06724190',
        PhysicalResourceId:
          'arn:aws:appsync:us-west-2:123456789012:apis/ezabg7fk2jecvodrblowtgbsme/functions/l5x4teownbcydhkadu72ph7ela',
        ResourceType: 'AWS::AppSync::FunctionConfiguration',
        Timestamp: new Date('2025-03-11T03:05:51.042'),
        ResourceStatus: 'DELETE_COMPLETE',
        ResourceProperties:
          '{"ResponseMappingTemplateS3Location":"s3://cdk-hnb659fds-assets-123456789012-us-west-2/4c6a2d29f01c6091bd1d9afe16e5849d456c96f17c3b215938c8067399532719.vtl","DataSourceName":"PostTable","FunctionVersion":"2018-05-29","RequestMappingTemplateS3Location":"s3://cdk-hnb659fds-assets-123456789012-us-west-2/08f4d557693d96c1a4efba0f9dc91330e4b19772fd5477c156468843e3d9cb5e.vtl","ApiId":"ezabg7fk2jecvodrblowtgbsme","Name":"QueryGetPostDataResolverFn"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'QueryGetPostDataResolverFnQueryGetPostDataResolverFnAppSyncFunction06724190',
        },
        constructPath:
          'data/amplifyData/Post/QueryGetPostDataResolverFn/QueryGetPostDataResolverFn.AppSyncFunction',
      },
      progress: {
        completed: 45,
        formatted: ' 45',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R |  45 | 11:05:51 PM | DELETE_IN_PROGRESS | AWS::AppSync::FunctionConfiguration | data/amplifyData/Post/SubscriptiononCreatePostpostAuth0Function/SubscriptiononCreatePostpostAuth0Function.AppSyncFunction (SubscriptiononCreatePostpostAuth0FunctionSubscriptiononCreatePostpostAuth0FunctionAppSyncFunction3197D95D)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R/e5bef6f0-fe24-11ef-b7fc-06822b500091',
        EventId:
          'SubscriptiononCreatePostpostAuth0FunctionSubscriptiononCreatePostpostAuth0FunctionAppSyncFunction3197D95D-DELETE_IN_PROGRESS-2025-03-11T03:05:51.063Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R',
        LogicalResourceId:
          'SubscriptiononCreatePostpostAuth0FunctionSubscriptiononCreatePostpostAuth0FunctionAppSyncFunction3197D95D',
        PhysicalResourceId:
          'arn:aws:appsync:us-west-2:123456789012:apis/ezabg7fk2jecvodrblowtgbsme/functions/fvc4vbangzhkzl3uvsowmwbjga',
        ResourceType: 'AWS::AppSync::FunctionConfiguration',
        Timestamp: new Date('2025-03-11T03:05:51.063'),
        ResourceStatus: 'DELETE_IN_PROGRESS',
        ResourceProperties:
          '{"DataSourceName":"NONE_DS","ResponseMappingTemplate":"$util.toJson({})","FunctionVersion":"2018-05-29","RequestMappingTemplateS3Location":"s3://cdk-hnb659fds-assets-123456789012-us-west-2/c1721bcd774e27c514d3454b5be4f9bdd094c0161b57ddf053d618e3b0086a77.vtl","ApiId":"ezabg7fk2jecvodrblowtgbsme","Name":"SubscriptiononCreatePostpostAuth0Function"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'SubscriptiononCreatePostpostAuth0FunctionSubscriptiononCreatePostpostAuth0FunctionAppSyncFunction3197D95D',
        },
        constructPath:
          'data/amplifyData/Post/SubscriptiononCreatePostpostAuth0Function/SubscriptiononCreatePostpostAuth0Function.AppSyncFunction',
      },
      progress: {
        completed: 45,
        formatted: ' 45',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R |  45 | 11:05:51 PM | DELETE_IN_PROGRESS | AWS::AppSync::FunctionConfiguration | data/amplifyData/Post/SubscriptionOnCreatePostDataResolverFn/SubscriptionOnCreatePostDataResolverFn.AppSyncFunction (SubscriptionOnCreatePostDataResolverFnSubscriptionOnCreatePostDataResolverFnAppSyncFunctionB4572868)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R/e5bef6f0-fe24-11ef-b7fc-06822b500091',
        EventId:
          'SubscriptionOnCreatePostDataResolverFnSubscriptionOnCreatePostDataResolverFnAppSyncFunctionB4572868-DELETE_IN_PROGRESS-2025-03-11T03:05:51.076Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R',
        LogicalResourceId:
          'SubscriptionOnCreatePostDataResolverFnSubscriptionOnCreatePostDataResolverFnAppSyncFunctionB4572868',
        PhysicalResourceId:
          'arn:aws:appsync:us-west-2:123456789012:apis/ezabg7fk2jecvodrblowtgbsme/functions/w2szpeqivngldep65ixycjfztu',
        ResourceType: 'AWS::AppSync::FunctionConfiguration',
        Timestamp: new Date('2025-03-11T03:05:51.076'),
        ResourceStatus: 'DELETE_IN_PROGRESS',
        ResourceProperties:
          '{"ResponseMappingTemplateS3Location":"s3://cdk-hnb659fds-assets-123456789012-us-west-2/e0cff47fb007f0bbf2a4e43ca256d6aa7ec109821769fd79fa7c5e83f0e7f9fc.vtl","DataSourceName":"NONE_DS","FunctionVersion":"2018-05-29","RequestMappingTemplateS3Location":"s3://cdk-hnb659fds-assets-123456789012-us-west-2/fe3c43ada4b9d681a5e2312663ef7a73386424d73b73e51f8e2e9d4b50f7c502.vtl","ApiId":"ezabg7fk2jecvodrblowtgbsme","Name":"SubscriptionOnCreatePostDataResolverFn"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'SubscriptionOnCreatePostDataResolverFnSubscriptionOnCreatePostDataResolverFnAppSyncFunctionB4572868',
        },
        constructPath:
          'data/amplifyData/Post/SubscriptionOnCreatePostDataResolverFn/SubscriptionOnCreatePostDataResolverFn.AppSyncFunction',
      },
      progress: {
        completed: 45,
        formatted: ' 45',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R |  45 | 11:05:51 PM | DELETE_IN_PROGRESS | AWS::AppSync::FunctionConfiguration | data/amplifyData/Post/SubscriptiononCreatePostauth0Function/SubscriptiononCreatePostauth0Function.AppSyncFunction (SubscriptiononCreatePostauth0FunctionSubscriptiononCreatePostauth0FunctionAppSyncFunction24934FF1)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R/e5bef6f0-fe24-11ef-b7fc-06822b500091',
        EventId:
          'SubscriptiononCreatePostauth0FunctionSubscriptiononCreatePostauth0FunctionAppSyncFunction24934FF1-DELETE_IN_PROGRESS-2025-03-11T03:05:51.090Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R',
        LogicalResourceId:
          'SubscriptiononCreatePostauth0FunctionSubscriptiononCreatePostauth0FunctionAppSyncFunction24934FF1',
        PhysicalResourceId:
          'arn:aws:appsync:us-west-2:123456789012:apis/ezabg7fk2jecvodrblowtgbsme/functions/2ezpsvojyjgodfyvewghqayxlu',
        ResourceType: 'AWS::AppSync::FunctionConfiguration',
        Timestamp: new Date('2025-03-11T03:05:51.090'),
        ResourceStatus: 'DELETE_IN_PROGRESS',
        ResourceProperties:
          '{"DataSourceName":"NONE_DS","ResponseMappingTemplate":"$util.toJson({})","FunctionVersion":"2018-05-29","RequestMappingTemplateS3Location":"s3://cdk-hnb659fds-assets-123456789012-us-west-2/6f3a2a9d562ae3058cc1aed6741edbf5edcaef7b3df7b03f52478816a1c95ffb.vtl","ApiId":"ezabg7fk2jecvodrblowtgbsme","Name":"SubscriptiononCreatePostauth0Function"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'SubscriptiononCreatePostauth0FunctionSubscriptiononCreatePostauth0FunctionAppSyncFunction24934FF1',
        },
        constructPath:
          'data/amplifyData/Post/SubscriptiononCreatePostauth0Function/SubscriptiononCreatePostauth0Function.AppSyncFunction',
      },
      progress: {
        completed: 45,
        formatted: ' 45',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R |  46 | 11:05:51 PM | DELETE_COMPLETE | AWS::AppSync::FunctionConfiguration | data/amplifyData/Post/SubscriptiononUpdatePostpostAuth0Function/SubscriptiononUpdatePostpostAuth0Function.AppSyncFunction (SubscriptiononUpdatePostpostAuth0FunctionSubscriptiononUpdatePostpostAuth0FunctionAppSyncFunction3D79B6CB)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R/e5bef6f0-fe24-11ef-b7fc-06822b500091',
        EventId:
          'SubscriptiononUpdatePostpostAuth0FunctionSubscriptiononUpdatePostpostAuth0FunctionAppSyncFunction3D79B6CB-DELETE_COMPLETE-2025-03-11T03:05:51.182Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R',
        LogicalResourceId:
          'SubscriptiononUpdatePostpostAuth0FunctionSubscriptiononUpdatePostpostAuth0FunctionAppSyncFunction3D79B6CB',
        PhysicalResourceId:
          'arn:aws:appsync:us-west-2:123456789012:apis/ezabg7fk2jecvodrblowtgbsme/functions/2qwfcvfbqzbkfo54joge3g6ura',
        ResourceType: 'AWS::AppSync::FunctionConfiguration',
        Timestamp: new Date('2025-03-11T03:05:51.182'),
        ResourceStatus: 'DELETE_COMPLETE',
        ResourceProperties:
          '{"DataSourceName":"NONE_DS","ResponseMappingTemplate":"$util.toJson({})","FunctionVersion":"2018-05-29","RequestMappingTemplateS3Location":"s3://cdk-hnb659fds-assets-123456789012-us-west-2/c1721bcd774e27c514d3454b5be4f9bdd094c0161b57ddf053d618e3b0086a77.vtl","ApiId":"ezabg7fk2jecvodrblowtgbsme","Name":"SubscriptiononUpdatePostpostAuth0Function"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'SubscriptiononUpdatePostpostAuth0FunctionSubscriptiononUpdatePostpostAuth0FunctionAppSyncFunction3D79B6CB',
        },
        constructPath:
          'data/amplifyData/Post/SubscriptiononUpdatePostpostAuth0Function/SubscriptiononUpdatePostpostAuth0Function.AppSyncFunction',
      },
      progress: {
        completed: 46,
        formatted: ' 46',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB |  47 | 11:05:51 PM | DELETE_COMPLETE | AWS::AppSync::FunctionConfiguration | data/amplifyData/Person/MutationCreatePersonDataResolverFn/MutationCreatePersonDataResolverFn.AppSyncFunction (MutationCreatePersonDataResolverFnMutationCreatePersonDataResolverFnAppSyncFunctionD6255519)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB/e5b11440-fe24-11ef-98e6-0abc8a28bbed',
        EventId:
          'MutationCreatePersonDataResolverFnMutationCreatePersonDataResolverFnAppSyncFunctionD6255519-DELETE_COMPLETE-2025-03-11T03:05:51.196Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB',
        LogicalResourceId:
          'MutationCreatePersonDataResolverFnMutationCreatePersonDataResolverFnAppSyncFunctionD6255519',
        PhysicalResourceId:
          'arn:aws:appsync:us-west-2:123456789012:apis/ezabg7fk2jecvodrblowtgbsme/functions/sbejvx5gmrefhnll6svxvubhzm',
        ResourceType: 'AWS::AppSync::FunctionConfiguration',
        Timestamp: new Date('2025-03-11T03:05:51.196'),
        ResourceStatus: 'DELETE_COMPLETE',
        ResourceProperties:
          '{"ResponseMappingTemplateS3Location":"s3://cdk-hnb659fds-assets-123456789012-us-west-2/f4a52b72209a9dfa197b5e7367a5c378c5bb86de6e29ddd9e48b49a3fe54b249.vtl","DataSourceName":"PersonTable","FunctionVersion":"2018-05-29","RequestMappingTemplateS3Location":"s3://cdk-hnb659fds-assets-123456789012-us-west-2/725b7ed3971927a1e99c853643b4ca575c3d612fff9b50d3f616c4feeb79a7d7.vtl","ApiId":"ezabg7fk2jecvodrblowtgbsme","Name":"MutationCreatePersonDataResolverFn"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'MutationCreatePersonDataResolverFnMutationCreatePersonDataResolverFnAppSyncFunctionD6255519',
        },
        constructPath:
          'data/amplifyData/Person/MutationCreatePersonDataResolverFn/MutationCreatePersonDataResolverFn.AppSyncFunction',
      },
      progress: {
        completed: 47,
        formatted: ' 47',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB |  48 | 11:05:51 PM | DELETE_COMPLETE | AWS::AppSync::FunctionConfiguration | data/amplifyData/Person/SubscriptionOnCreatePersonDataResolverFn/SubscriptionOnCreatePersonDataResolverFn.AppSyncFunction (SubscriptionOnCreatePersonDataResolverFnSubscriptionOnCreatePersonDataResolverFnAppSyncFunctionCDDD5891)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB/e5b11440-fe24-11ef-98e6-0abc8a28bbed',
        EventId:
          'SubscriptionOnCreatePersonDataResolverFnSubscriptionOnCreatePersonDataResolverFnAppSyncFunctionCDDD5891-DELETE_COMPLETE-2025-03-11T03:05:51.199Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB',
        LogicalResourceId:
          'SubscriptionOnCreatePersonDataResolverFnSubscriptionOnCreatePersonDataResolverFnAppSyncFunctionCDDD5891',
        PhysicalResourceId:
          'arn:aws:appsync:us-west-2:123456789012:apis/ezabg7fk2jecvodrblowtgbsme/functions/rk2xwwynencundrx4j6we63tli',
        ResourceType: 'AWS::AppSync::FunctionConfiguration',
        Timestamp: new Date('2025-03-11T03:05:51.199'),
        ResourceStatus: 'DELETE_COMPLETE',
        ResourceProperties:
          '{"ResponseMappingTemplateS3Location":"s3://cdk-hnb659fds-assets-123456789012-us-west-2/e0cff47fb007f0bbf2a4e43ca256d6aa7ec109821769fd79fa7c5e83f0e7f9fc.vtl","DataSourceName":"NONE_DS","FunctionVersion":"2018-05-29","RequestMappingTemplateS3Location":"s3://cdk-hnb659fds-assets-123456789012-us-west-2/fe3c43ada4b9d681a5e2312663ef7a73386424d73b73e51f8e2e9d4b50f7c502.vtl","ApiId":"ezabg7fk2jecvodrblowtgbsme","Name":"SubscriptionOnCreatePersonDataResolverFn"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'SubscriptionOnCreatePersonDataResolverFnSubscriptionOnCreatePersonDataResolverFnAppSyncFunctionCDDD5891',
        },
        constructPath:
          'data/amplifyData/Person/SubscriptionOnCreatePersonDataResolverFn/SubscriptionOnCreatePersonDataResolverFn.AppSyncFunction',
      },
      progress: {
        completed: 48,
        formatted: ' 48',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB |  49 | 11:05:51 PM | DELETE_COMPLETE | AWS::AppSync::FunctionConfiguration | data/amplifyData/Person/QuerylistPeoplepreAuth0Function/QuerylistPeoplepreAuth0Function.AppSyncFunction (QuerylistPeoplepreAuth0FunctionQuerylistPeoplepreAuth0FunctionAppSyncFunction8DA9EDA1)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB/e5b11440-fe24-11ef-98e6-0abc8a28bbed',
        EventId:
          'QuerylistPeoplepreAuth0FunctionQuerylistPeoplepreAuth0FunctionAppSyncFunction8DA9EDA1-DELETE_COMPLETE-2025-03-11T03:05:51.229Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB',
        LogicalResourceId:
          'QuerylistPeoplepreAuth0FunctionQuerylistPeoplepreAuth0FunctionAppSyncFunction8DA9EDA1',
        PhysicalResourceId:
          'arn:aws:appsync:us-west-2:123456789012:apis/ezabg7fk2jecvodrblowtgbsme/functions/2mjgtot57ja4rovhifofn6n24i',
        ResourceType: 'AWS::AppSync::FunctionConfiguration',
        Timestamp: new Date('2025-03-11T03:05:51.229'),
        ResourceStatus: 'DELETE_COMPLETE',
        ResourceProperties:
          '{"DataSourceName":"NONE_DS","ResponseMappingTemplate":"$util.toJson({})","FunctionVersion":"2018-05-29","RequestMappingTemplateS3Location":"s3://cdk-hnb659fds-assets-123456789012-us-west-2/6ce8d75a422db2491407ccfc9807e5de43e86bed091909b805008adb8243b05d.vtl","ApiId":"ezabg7fk2jecvodrblowtgbsme","Name":"QuerylistPeoplepreAuth0Function"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'QuerylistPeoplepreAuth0FunctionQuerylistPeoplepreAuth0FunctionAppSyncFunction8DA9EDA1',
        },
        constructPath:
          'data/amplifyData/Person/QuerylistPeoplepreAuth0Function/QuerylistPeoplepreAuth0Function.AppSyncFunction',
      },
      progress: {
        completed: 49,
        formatted: ' 49',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB |  50 | 11:05:51 PM | DELETE_COMPLETE | AWS::AppSync::FunctionConfiguration | data/amplifyData/Person/MutationcreatePersonauth0Function/MutationcreatePersonauth0Function.AppSyncFunction (MutationcreatePersonauth0FunctionMutationcreatePersonauth0FunctionAppSyncFunctionEAFBF427)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB/e5b11440-fe24-11ef-98e6-0abc8a28bbed',
        EventId:
          'MutationcreatePersonauth0FunctionMutationcreatePersonauth0FunctionAppSyncFunctionEAFBF427-DELETE_COMPLETE-2025-03-11T03:05:51.229Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB',
        LogicalResourceId:
          'MutationcreatePersonauth0FunctionMutationcreatePersonauth0FunctionAppSyncFunctionEAFBF427',
        PhysicalResourceId:
          'arn:aws:appsync:us-west-2:123456789012:apis/ezabg7fk2jecvodrblowtgbsme/functions/mmpex5pwczgq3ha6xzzqb3hlfu',
        ResourceType: 'AWS::AppSync::FunctionConfiguration',
        Timestamp: new Date('2025-03-11T03:05:51.229'),
        ResourceStatus: 'DELETE_COMPLETE',
        ResourceProperties:
          '{"DataSourceName":"NONE_DS","ResponseMappingTemplate":"$util.toJson({})","FunctionVersion":"2018-05-29","RequestMappingTemplateS3Location":"s3://cdk-hnb659fds-assets-123456789012-us-west-2/b371d68ddfbdd11b176756ce33b2c4e79d26fcc2fd4b7c0c9e75d06efacee90e.vtl","ApiId":"ezabg7fk2jecvodrblowtgbsme","Name":"MutationcreatePersonauth0Function"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'MutationcreatePersonauth0FunctionMutationcreatePersonauth0FunctionAppSyncFunctionEAFBF427',
        },
        constructPath:
          'data/amplifyData/Person/MutationcreatePersonauth0Function/MutationcreatePersonauth0Function.AppSyncFunction',
      },
      progress: {
        completed: 50,
        formatted: ' 50',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R |  51 | 11:05:51 PM | DELETE_COMPLETE | AWS::AppSync::FunctionConfiguration | data/amplifyData/Post/QuerygetPostpostAuth0Function/QuerygetPostpostAuth0Function.AppSyncFunction (QuerygetPostpostAuth0FunctionQuerygetPostpostAuth0FunctionAppSyncFunctionC72E5C0F)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R/e5bef6f0-fe24-11ef-b7fc-06822b500091',
        EventId:
          'QuerygetPostpostAuth0FunctionQuerygetPostpostAuth0FunctionAppSyncFunctionC72E5C0F-DELETE_COMPLETE-2025-03-11T03:05:51.240Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R',
        LogicalResourceId:
          'QuerygetPostpostAuth0FunctionQuerygetPostpostAuth0FunctionAppSyncFunctionC72E5C0F',
        PhysicalResourceId:
          'arn:aws:appsync:us-west-2:123456789012:apis/ezabg7fk2jecvodrblowtgbsme/functions/cd6gzhw2hvfhbiqbalcomoptvm',
        ResourceType: 'AWS::AppSync::FunctionConfiguration',
        Timestamp: new Date('2025-03-11T03:05:51.240'),
        ResourceStatus: 'DELETE_COMPLETE',
        ResourceProperties:
          '{"DataSourceName":"NONE_DS","ResponseMappingTemplate":"$util.toJson({})","FunctionVersion":"2018-05-29","RequestMappingTemplateS3Location":"s3://cdk-hnb659fds-assets-123456789012-us-west-2/c1721bcd774e27c514d3454b5be4f9bdd094c0161b57ddf053d618e3b0086a77.vtl","ApiId":"ezabg7fk2jecvodrblowtgbsme","Name":"QuerygetPostpostAuth0Function"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'QuerygetPostpostAuth0FunctionQuerygetPostpostAuth0FunctionAppSyncFunctionC72E5C0F',
        },
        constructPath:
          'data/amplifyData/Post/QuerygetPostpostAuth0Function/QuerygetPostpostAuth0Function.AppSyncFunction',
      },
      progress: {
        completed: 51,
        formatted: ' 51',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R |  52 | 11:05:51 PM | DELETE_COMPLETE | AWS::AppSync::FunctionConfiguration | data/amplifyData/Post/QuerygetPostauth0Function/QuerygetPostauth0Function.AppSyncFunction (QuerygetPostauth0FunctionQuerygetPostauth0FunctionAppSyncFunctionB1D588DF)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R/e5bef6f0-fe24-11ef-b7fc-06822b500091',
        EventId:
          'QuerygetPostauth0FunctionQuerygetPostauth0FunctionAppSyncFunctionB1D588DF-DELETE_COMPLETE-2025-03-11T03:05:51.251Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R',
        LogicalResourceId:
          'QuerygetPostauth0FunctionQuerygetPostauth0FunctionAppSyncFunctionB1D588DF',
        PhysicalResourceId:
          'arn:aws:appsync:us-west-2:123456789012:apis/ezabg7fk2jecvodrblowtgbsme/functions/tw4hgwx3wvffhiipskyxymdndm',
        ResourceType: 'AWS::AppSync::FunctionConfiguration',
        Timestamp: new Date('2025-03-11T03:05:51.251'),
        ResourceStatus: 'DELETE_COMPLETE',
        ResourceProperties:
          '{"DataSourceName":"NONE_DS","ResponseMappingTemplate":"$util.toJson({})","FunctionVersion":"2018-05-29","RequestMappingTemplateS3Location":"s3://cdk-hnb659fds-assets-123456789012-us-west-2/88d5b7081b0dc9c39fd0bffedf56f011b2a7cf1ce5cc227f47a1e94efee8067c.vtl","ApiId":"ezabg7fk2jecvodrblowtgbsme","Name":"QuerygetPostauth0Function"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'QuerygetPostauth0FunctionQuerygetPostauth0FunctionAppSyncFunctionB1D588DF',
        },
        constructPath:
          'data/amplifyData/Post/QuerygetPostauth0Function/QuerygetPostauth0Function.AppSyncFunction',
      },
      progress: {
        completed: 52,
        formatted: ' 52',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB |  53 | 11:05:51 PM | DELETE_COMPLETE | AWS::AppSync::FunctionConfiguration | data/amplifyData/Person/QuerygetPersonpostAuth0Function/QuerygetPersonpostAuth0Function.AppSyncFunction (QuerygetPersonpostAuth0FunctionQuerygetPersonpostAuth0FunctionAppSyncFunctionF5352000)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB/e5b11440-fe24-11ef-98e6-0abc8a28bbed',
        EventId:
          'QuerygetPersonpostAuth0FunctionQuerygetPersonpostAuth0FunctionAppSyncFunctionF5352000-DELETE_COMPLETE-2025-03-11T03:05:51.252Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB',
        LogicalResourceId:
          'QuerygetPersonpostAuth0FunctionQuerygetPersonpostAuth0FunctionAppSyncFunctionF5352000',
        PhysicalResourceId:
          'arn:aws:appsync:us-west-2:123456789012:apis/ezabg7fk2jecvodrblowtgbsme/functions/mww5bpc3ijalfmgmgcbffy3br4',
        ResourceType: 'AWS::AppSync::FunctionConfiguration',
        Timestamp: new Date('2025-03-11T03:05:51.252'),
        ResourceStatus: 'DELETE_COMPLETE',
        ResourceProperties:
          '{"DataSourceName":"NONE_DS","ResponseMappingTemplate":"$util.toJson({})","FunctionVersion":"2018-05-29","RequestMappingTemplateS3Location":"s3://cdk-hnb659fds-assets-123456789012-us-west-2/c1721bcd774e27c514d3454b5be4f9bdd094c0161b57ddf053d618e3b0086a77.vtl","ApiId":"ezabg7fk2jecvodrblowtgbsme","Name":"QuerygetPersonpostAuth0Function"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'QuerygetPersonpostAuth0FunctionQuerygetPersonpostAuth0FunctionAppSyncFunctionF5352000',
        },
        constructPath:
          'data/amplifyData/Person/QuerygetPersonpostAuth0Function/QuerygetPersonpostAuth0Function.AppSyncFunction',
      },
      progress: {
        completed: 53,
        formatted: ' 53',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R |  54 | 11:05:51 PM | DELETE_COMPLETE | AWS::AppSync::FunctionConfiguration | data/amplifyData/Post/QuerylistPostsauth0Function/QuerylistPostsauth0Function.AppSyncFunction (QuerylistPostsauth0FunctionQuerylistPostsauth0FunctionAppSyncFunctionCDCF8956)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R/e5bef6f0-fe24-11ef-b7fc-06822b500091',
        EventId:
          'QuerylistPostsauth0FunctionQuerylistPostsauth0FunctionAppSyncFunctionCDCF8956-DELETE_COMPLETE-2025-03-11T03:05:51.262Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R',
        LogicalResourceId:
          'QuerylistPostsauth0FunctionQuerylistPostsauth0FunctionAppSyncFunctionCDCF8956',
        PhysicalResourceId:
          'arn:aws:appsync:us-west-2:123456789012:apis/ezabg7fk2jecvodrblowtgbsme/functions/6kxyzas33vbuvbhk3xajbz2z5y',
        ResourceType: 'AWS::AppSync::FunctionConfiguration',
        Timestamp: new Date('2025-03-11T03:05:51.262'),
        ResourceStatus: 'DELETE_COMPLETE',
        ResourceProperties:
          '{"DataSourceName":"NONE_DS","ResponseMappingTemplate":"$util.toJson({})","FunctionVersion":"2018-05-29","RequestMappingTemplateS3Location":"s3://cdk-hnb659fds-assets-123456789012-us-west-2/88d5b7081b0dc9c39fd0bffedf56f011b2a7cf1ce5cc227f47a1e94efee8067c.vtl","ApiId":"ezabg7fk2jecvodrblowtgbsme","Name":"QuerylistPostsauth0Function"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'QuerylistPostsauth0FunctionQuerylistPostsauth0FunctionAppSyncFunctionCDCF8956',
        },
        constructPath:
          'data/amplifyData/Post/QuerylistPostsauth0Function/QuerylistPostsauth0Function.AppSyncFunction',
      },
      progress: {
        completed: 54,
        formatted: ' 54',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R |  55 | 11:05:51 PM | DELETE_COMPLETE | AWS::AppSync::FunctionConfiguration | data/amplifyData/Post/SubscriptionOnUpdatePostDataResolverFn/SubscriptionOnUpdatePostDataResolverFn.AppSyncFunction (SubscriptionOnUpdatePostDataResolverFnSubscriptionOnUpdatePostDataResolverFnAppSyncFunction325AAFC9)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R/e5bef6f0-fe24-11ef-b7fc-06822b500091',
        EventId:
          'SubscriptionOnUpdatePostDataResolverFnSubscriptionOnUpdatePostDataResolverFnAppSyncFunction325AAFC9-DELETE_COMPLETE-2025-03-11T03:05:51.263Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R',
        LogicalResourceId:
          'SubscriptionOnUpdatePostDataResolverFnSubscriptionOnUpdatePostDataResolverFnAppSyncFunction325AAFC9',
        PhysicalResourceId:
          'arn:aws:appsync:us-west-2:123456789012:apis/ezabg7fk2jecvodrblowtgbsme/functions/cmbpw7wa25bczaekpahob2sml4',
        ResourceType: 'AWS::AppSync::FunctionConfiguration',
        Timestamp: new Date('2025-03-11T03:05:51.263'),
        ResourceStatus: 'DELETE_COMPLETE',
        ResourceProperties:
          '{"ResponseMappingTemplateS3Location":"s3://cdk-hnb659fds-assets-123456789012-us-west-2/e0cff47fb007f0bbf2a4e43ca256d6aa7ec109821769fd79fa7c5e83f0e7f9fc.vtl","DataSourceName":"NONE_DS","FunctionVersion":"2018-05-29","RequestMappingTemplateS3Location":"s3://cdk-hnb659fds-assets-123456789012-us-west-2/fe3c43ada4b9d681a5e2312663ef7a73386424d73b73e51f8e2e9d4b50f7c502.vtl","ApiId":"ezabg7fk2jecvodrblowtgbsme","Name":"SubscriptionOnUpdatePostDataResolverFn"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'SubscriptionOnUpdatePostDataResolverFnSubscriptionOnUpdatePostDataResolverFnAppSyncFunction325AAFC9',
        },
        constructPath:
          'data/amplifyData/Post/SubscriptionOnUpdatePostDataResolverFn/SubscriptionOnUpdatePostDataResolverFn.AppSyncFunction',
      },
      progress: {
        completed: 55,
        formatted: ' 55',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R |  56 | 11:05:51 PM | DELETE_COMPLETE | AWS::AppSync::FunctionConfiguration | data/amplifyData/Post/SubscriptiononUpdatePostauth0Function/SubscriptiononUpdatePostauth0Function.AppSyncFunction (SubscriptiononUpdatePostauth0FunctionSubscriptiononUpdatePostauth0FunctionAppSyncFunction503CE6B6)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R/e5bef6f0-fe24-11ef-b7fc-06822b500091',
        EventId:
          'SubscriptiononUpdatePostauth0FunctionSubscriptiononUpdatePostauth0FunctionAppSyncFunction503CE6B6-DELETE_COMPLETE-2025-03-11T03:05:51.276Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R',
        LogicalResourceId:
          'SubscriptiononUpdatePostauth0FunctionSubscriptiononUpdatePostauth0FunctionAppSyncFunction503CE6B6',
        PhysicalResourceId:
          'arn:aws:appsync:us-west-2:123456789012:apis/ezabg7fk2jecvodrblowtgbsme/functions/4nq46sd6azeahfci3acjcaw3tu',
        ResourceType: 'AWS::AppSync::FunctionConfiguration',
        Timestamp: new Date('2025-03-11T03:05:51.276'),
        ResourceStatus: 'DELETE_COMPLETE',
        ResourceProperties:
          '{"DataSourceName":"NONE_DS","ResponseMappingTemplate":"$util.toJson({})","FunctionVersion":"2018-05-29","RequestMappingTemplateS3Location":"s3://cdk-hnb659fds-assets-123456789012-us-west-2/6f3a2a9d562ae3058cc1aed6741edbf5edcaef7b3df7b03f52478816a1c95ffb.vtl","ApiId":"ezabg7fk2jecvodrblowtgbsme","Name":"SubscriptiononUpdatePostauth0Function"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'SubscriptiononUpdatePostauth0FunctionSubscriptiononUpdatePostauth0FunctionAppSyncFunction503CE6B6',
        },
        constructPath:
          'data/amplifyData/Post/SubscriptiononUpdatePostauth0Function/SubscriptiononUpdatePostauth0Function.AppSyncFunction',
      },
      progress: {
        completed: 56,
        formatted: ' 56',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R |  57 | 11:05:51 PM | DELETE_COMPLETE | AWS::AppSync::FunctionConfiguration | data/amplifyData/Post/MutationcreatePostinit0Function/MutationcreatePostinit0Function.AppSyncFunction (MutationcreatePostinit0FunctionMutationcreatePostinit0FunctionAppSyncFunction9E444A7F)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R/e5bef6f0-fe24-11ef-b7fc-06822b500091',
        EventId:
          'MutationcreatePostinit0FunctionMutationcreatePostinit0FunctionAppSyncFunction9E444A7F-DELETE_COMPLETE-2025-03-11T03:05:51.284Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R',
        LogicalResourceId:
          'MutationcreatePostinit0FunctionMutationcreatePostinit0FunctionAppSyncFunction9E444A7F',
        PhysicalResourceId:
          'arn:aws:appsync:us-west-2:123456789012:apis/ezabg7fk2jecvodrblowtgbsme/functions/qfnbqqjwynb3dggxi5mblscjii',
        ResourceType: 'AWS::AppSync::FunctionConfiguration',
        Timestamp: new Date('2025-03-11T03:05:51.284'),
        ResourceStatus: 'DELETE_COMPLETE',
        ResourceProperties:
          '{"DataSourceName":"NONE_DS","ResponseMappingTemplate":"$util.toJson({})","FunctionVersion":"2018-05-29","RequestMappingTemplateS3Location":"s3://cdk-hnb659fds-assets-123456789012-us-west-2/a183ddccbd956316c38ef97177b8f088ef0826f62023323f5ae6053d348ccffc.vtl","ApiId":"ezabg7fk2jecvodrblowtgbsme","Name":"MutationcreatePostinit0Function"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'MutationcreatePostinit0FunctionMutationcreatePostinit0FunctionAppSyncFunction9E444A7F',
        },
        constructPath:
          'data/amplifyData/Post/MutationcreatePostinit0Function/MutationcreatePostinit0Function.AppSyncFunction',
      },
      progress: {
        completed: 57,
        formatted: ' 57',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB |  58 | 11:05:51 PM | DELETE_COMPLETE | AWS::AppSync::FunctionConfiguration | data/amplifyData/Person/QueryGetPersonDataResolverFn/QueryGetPersonDataResolverFn.AppSyncFunction (QueryGetPersonDataResolverFnQueryGetPersonDataResolverFnAppSyncFunction9DC39353)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB/e5b11440-fe24-11ef-98e6-0abc8a28bbed',
        EventId:
          'QueryGetPersonDataResolverFnQueryGetPersonDataResolverFnAppSyncFunction9DC39353-DELETE_COMPLETE-2025-03-11T03:05:51.292Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB',
        LogicalResourceId:
          'QueryGetPersonDataResolverFnQueryGetPersonDataResolverFnAppSyncFunction9DC39353',
        PhysicalResourceId:
          'arn:aws:appsync:us-west-2:123456789012:apis/ezabg7fk2jecvodrblowtgbsme/functions/nkxgdfksvrh4ljuf6l5df2liye',
        ResourceType: 'AWS::AppSync::FunctionConfiguration',
        Timestamp: new Date('2025-03-11T03:05:51.292'),
        ResourceStatus: 'DELETE_COMPLETE',
        ResourceProperties:
          '{"ResponseMappingTemplateS3Location":"s3://cdk-hnb659fds-assets-123456789012-us-west-2/4c6a2d29f01c6091bd1d9afe16e5849d456c96f17c3b215938c8067399532719.vtl","DataSourceName":"PersonTable","FunctionVersion":"2018-05-29","RequestMappingTemplateS3Location":"s3://cdk-hnb659fds-assets-123456789012-us-west-2/08f4d557693d96c1a4efba0f9dc91330e4b19772fd5477c156468843e3d9cb5e.vtl","ApiId":"ezabg7fk2jecvodrblowtgbsme","Name":"QueryGetPersonDataResolverFn"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'QueryGetPersonDataResolverFnQueryGetPersonDataResolverFnAppSyncFunction9DC39353',
        },
        constructPath:
          'data/amplifyData/Person/QueryGetPersonDataResolverFn/QueryGetPersonDataResolverFn.AppSyncFunction',
      },
      progress: {
        completed: 58,
        formatted: ' 58',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R |  59 | 11:05:51 PM | DELETE_COMPLETE | AWS::AppSync::FunctionConfiguration | data/amplifyData/Post/QueryListPostByAuthorNameDataResolverFn/QueryListPostByAuthorNameDataResolverFn.AppSyncFunction (QueryListPostByAuthorNameDataResolverFnQueryListPostByAuthorNameDataResolverFnAppSyncFunction1850214D)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R/e5bef6f0-fe24-11ef-b7fc-06822b500091',
        EventId:
          'QueryListPostByAuthorNameDataResolverFnQueryListPostByAuthorNameDataResolverFnAppSyncFunction1850214D-DELETE_COMPLETE-2025-03-11T03:05:51.299Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R',
        LogicalResourceId:
          'QueryListPostByAuthorNameDataResolverFnQueryListPostByAuthorNameDataResolverFnAppSyncFunction1850214D',
        PhysicalResourceId:
          'arn:aws:appsync:us-west-2:123456789012:apis/ezabg7fk2jecvodrblowtgbsme/functions/vk2nxrjf2ffglez74knppfwjje',
        ResourceType: 'AWS::AppSync::FunctionConfiguration',
        Timestamp: new Date('2025-03-11T03:05:51.299'),
        ResourceStatus: 'DELETE_COMPLETE',
        ResourceProperties:
          '{"ResponseMappingTemplateS3Location":"s3://cdk-hnb659fds-assets-123456789012-us-west-2/098c998f215c333f57348ca8912f66057ae6b574fe34013033dc54362ee2372c.vtl","DataSourceName":"PostTable","FunctionVersion":"2018-05-29","RequestMappingTemplateS3Location":"s3://cdk-hnb659fds-assets-123456789012-us-west-2/c89821d3a34d8f9a69feb7faded2de554cfee32627d772bc8d842a1a145408f5.vtl","ApiId":"ezabg7fk2jecvodrblowtgbsme","Name":"QueryListPostByAuthorNameDataResolverFn"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'QueryListPostByAuthorNameDataResolverFnQueryListPostByAuthorNameDataResolverFnAppSyncFunction1850214D',
        },
        constructPath:
          'data/amplifyData/Post/QueryListPostByAuthorNameDataResolverFn/QueryListPostByAuthorNameDataResolverFn.AppSyncFunction',
      },
      progress: {
        completed: 59,
        formatted: ' 59',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB |  60 | 11:05:51 PM | DELETE_COMPLETE | AWS::AppSync::FunctionConfiguration | data/amplifyData/Person/SubscriptiononCreatePersonauth0Function/SubscriptiononCreatePersonauth0Function.AppSyncFunction (SubscriptiononCreatePersonauth0FunctionSubscriptiononCreatePersonauth0FunctionAppSyncFunctionF5035C7D)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB/e5b11440-fe24-11ef-98e6-0abc8a28bbed',
        EventId:
          'SubscriptiononCreatePersonauth0FunctionSubscriptiononCreatePersonauth0FunctionAppSyncFunctionF5035C7D-DELETE_COMPLETE-2025-03-11T03:05:51.306Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB',
        LogicalResourceId:
          'SubscriptiononCreatePersonauth0FunctionSubscriptiononCreatePersonauth0FunctionAppSyncFunctionF5035C7D',
        PhysicalResourceId:
          'arn:aws:appsync:us-west-2:123456789012:apis/ezabg7fk2jecvodrblowtgbsme/functions/3y32gczezfendjwyhg3limpemu',
        ResourceType: 'AWS::AppSync::FunctionConfiguration',
        Timestamp: new Date('2025-03-11T03:05:51.306'),
        ResourceStatus: 'DELETE_COMPLETE',
        ResourceProperties:
          '{"DataSourceName":"NONE_DS","ResponseMappingTemplate":"$util.toJson({})","FunctionVersion":"2018-05-29","RequestMappingTemplateS3Location":"s3://cdk-hnb659fds-assets-123456789012-us-west-2/6f3a2a9d562ae3058cc1aed6741edbf5edcaef7b3df7b03f52478816a1c95ffb.vtl","ApiId":"ezabg7fk2jecvodrblowtgbsme","Name":"SubscriptiononCreatePersonauth0Function"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'SubscriptiononCreatePersonauth0FunctionSubscriptiononCreatePersonauth0FunctionAppSyncFunctionF5035C7D',
        },
        constructPath:
          'data/amplifyData/Person/SubscriptiononCreatePersonauth0Function/SubscriptiononCreatePersonauth0Function.AppSyncFunction',
      },
      progress: {
        completed: 60,
        formatted: ' 60',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB |  61 | 11:05:51 PM | DELETE_COMPLETE | AWS::AppSync::FunctionConfiguration | data/amplifyData/Person/MutationcreatePersonpostAuth0Function/MutationcreatePersonpostAuth0Function.AppSyncFunction (MutationcreatePersonpostAuth0FunctionMutationcreatePersonpostAuth0FunctionAppSyncFunction04EFC40F)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB/e5b11440-fe24-11ef-98e6-0abc8a28bbed',
        EventId:
          'MutationcreatePersonpostAuth0FunctionMutationcreatePersonpostAuth0FunctionAppSyncFunction04EFC40F-DELETE_COMPLETE-2025-03-11T03:05:51.332Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB',
        LogicalResourceId:
          'MutationcreatePersonpostAuth0FunctionMutationcreatePersonpostAuth0FunctionAppSyncFunction04EFC40F',
        PhysicalResourceId:
          'arn:aws:appsync:us-west-2:123456789012:apis/ezabg7fk2jecvodrblowtgbsme/functions/kbbjrr24ifda3j7gjbnesczhfm',
        ResourceType: 'AWS::AppSync::FunctionConfiguration',
        Timestamp: new Date('2025-03-11T03:05:51.332'),
        ResourceStatus: 'DELETE_COMPLETE',
        ResourceProperties:
          '{"DataSourceName":"NONE_DS","ResponseMappingTemplate":"$util.toJson({})","FunctionVersion":"2018-05-29","RequestMappingTemplateS3Location":"s3://cdk-hnb659fds-assets-123456789012-us-west-2/c1721bcd774e27c514d3454b5be4f9bdd094c0161b57ddf053d618e3b0086a77.vtl","ApiId":"ezabg7fk2jecvodrblowtgbsme","Name":"MutationcreatePersonpostAuth0Function"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'MutationcreatePersonpostAuth0FunctionMutationcreatePersonpostAuth0FunctionAppSyncFunction04EFC40F',
        },
        constructPath:
          'data/amplifyData/Person/MutationcreatePersonpostAuth0Function/MutationcreatePersonpostAuth0Function.AppSyncFunction',
      },
      progress: {
        completed: 61,
        formatted: ' 61',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R |  62 | 11:05:51 PM | DELETE_COMPLETE | AWS::AppSync::FunctionConfiguration | data/amplifyData/Post/MutationCreatePostDataResolverFn/MutationCreatePostDataResolverFn.AppSyncFunction (MutationCreatePostDataResolverFnMutationCreatePostDataResolverFnAppSyncFunctionE45E2000)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R/e5bef6f0-fe24-11ef-b7fc-06822b500091',
        EventId:
          'MutationCreatePostDataResolverFnMutationCreatePostDataResolverFnAppSyncFunctionE45E2000-DELETE_COMPLETE-2025-03-11T03:05:51.341Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R',
        LogicalResourceId:
          'MutationCreatePostDataResolverFnMutationCreatePostDataResolverFnAppSyncFunctionE45E2000',
        PhysicalResourceId:
          'arn:aws:appsync:us-west-2:123456789012:apis/ezabg7fk2jecvodrblowtgbsme/functions/jiwbcpe745fzrn4rwsgiqn6plq',
        ResourceType: 'AWS::AppSync::FunctionConfiguration',
        Timestamp: new Date('2025-03-11T03:05:51.341'),
        ResourceStatus: 'DELETE_COMPLETE',
        ResourceProperties:
          '{"ResponseMappingTemplateS3Location":"s3://cdk-hnb659fds-assets-123456789012-us-west-2/f4a52b72209a9dfa197b5e7367a5c378c5bb86de6e29ddd9e48b49a3fe54b249.vtl","DataSourceName":"PostTable","FunctionVersion":"2018-05-29","RequestMappingTemplateS3Location":"s3://cdk-hnb659fds-assets-123456789012-us-west-2/47614d6b888488252a8a44b7911b69efcddb1eb2454ca31132d72d6444247204.vtl","ApiId":"ezabg7fk2jecvodrblowtgbsme","Name":"MutationCreatePostDataResolverFn"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'MutationCreatePostDataResolverFnMutationCreatePostDataResolverFnAppSyncFunctionE45E2000',
        },
        constructPath:
          'data/amplifyData/Post/MutationCreatePostDataResolverFn/MutationCreatePostDataResolverFn.AppSyncFunction',
      },
      progress: {
        completed: 62,
        formatted: ' 62',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB |  63 | 11:05:51 PM | DELETE_COMPLETE | AWS::AppSync::FunctionConfiguration | data/amplifyData/Person/QuerylistPeopleauth0Function/QuerylistPeopleauth0Function.AppSyncFunction (QuerylistPeopleauth0FunctionQuerylistPeopleauth0FunctionAppSyncFunction54C0D154)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB/e5b11440-fe24-11ef-98e6-0abc8a28bbed',
        EventId:
          'QuerylistPeopleauth0FunctionQuerylistPeopleauth0FunctionAppSyncFunction54C0D154-DELETE_COMPLETE-2025-03-11T03:05:51.343Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB',
        LogicalResourceId:
          'QuerylistPeopleauth0FunctionQuerylistPeopleauth0FunctionAppSyncFunction54C0D154',
        PhysicalResourceId:
          'arn:aws:appsync:us-west-2:123456789012:apis/ezabg7fk2jecvodrblowtgbsme/functions/uspzxifumjg5vdjo3c5oxxi2jm',
        ResourceType: 'AWS::AppSync::FunctionConfiguration',
        Timestamp: new Date('2025-03-11T03:05:51.343'),
        ResourceStatus: 'DELETE_COMPLETE',
        ResourceProperties:
          '{"DataSourceName":"NONE_DS","ResponseMappingTemplate":"$util.toJson({})","FunctionVersion":"2018-05-29","RequestMappingTemplateS3Location":"s3://cdk-hnb659fds-assets-123456789012-us-west-2/88d5b7081b0dc9c39fd0bffedf56f011b2a7cf1ce5cc227f47a1e94efee8067c.vtl","ApiId":"ezabg7fk2jecvodrblowtgbsme","Name":"QuerylistPeopleauth0Function"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'QuerylistPeopleauth0FunctionQuerylistPeopleauth0FunctionAppSyncFunction54C0D154',
        },
        constructPath:
          'data/amplifyData/Person/QuerylistPeopleauth0Function/QuerylistPeopleauth0Function.AppSyncFunction',
      },
      progress: {
        completed: 63,
        formatted: ' 63',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R |  64 | 11:05:51 PM | DELETE_COMPLETE | AWS::AppSync::FunctionConfiguration | data/amplifyData/Post/MutationdeletePostauth0Function/MutationdeletePostauth0Function.AppSyncFunction (MutationdeletePostauth0FunctionMutationdeletePostauth0FunctionAppSyncFunctionFBE21CB7)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R/e5bef6f0-fe24-11ef-b7fc-06822b500091',
        EventId:
          'MutationdeletePostauth0FunctionMutationdeletePostauth0FunctionAppSyncFunctionFBE21CB7-DELETE_COMPLETE-2025-03-11T03:05:51.376Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R',
        LogicalResourceId:
          'MutationdeletePostauth0FunctionMutationdeletePostauth0FunctionAppSyncFunctionFBE21CB7',
        PhysicalResourceId:
          'arn:aws:appsync:us-west-2:123456789012:apis/ezabg7fk2jecvodrblowtgbsme/functions/ssvyddouovceliw6q2m4kzzi5m',
        ResourceType: 'AWS::AppSync::FunctionConfiguration',
        Timestamp: new Date('2025-03-11T03:05:51.376'),
        ResourceStatus: 'DELETE_COMPLETE',
        ResourceProperties:
          '{"ResponseMappingTemplateS3Location":"s3://cdk-hnb659fds-assets-123456789012-us-west-2/29e4bdb03133f87f2b1acb547959ffd4cfd22804026994c5b61db33084127353.vtl","DataSourceName":"PostTable","FunctionVersion":"2018-05-29","RequestMappingTemplateS3Location":"s3://cdk-hnb659fds-assets-123456789012-us-west-2/1f5fed297da9c32ae3af922bf3a38ccf23b956078887d16891ec06c20c64722c.vtl","ApiId":"ezabg7fk2jecvodrblowtgbsme","Name":"MutationdeletePostauth0Function"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'MutationdeletePostauth0FunctionMutationdeletePostauth0FunctionAppSyncFunctionFBE21CB7',
        },
        constructPath:
          'data/amplifyData/Post/MutationdeletePostauth0Function/MutationdeletePostauth0Function.AppSyncFunction',
      },
      progress: {
        completed: 64,
        formatted: ' 64',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB |  65 | 11:05:51 PM | DELETE_COMPLETE | AWS::AppSync::FunctionConfiguration | data/amplifyData/Person/QuerygetPersonpreAuth0Function/QuerygetPersonpreAuth0Function.AppSyncFunction (QuerygetPersonpreAuth0FunctionQuerygetPersonpreAuth0FunctionAppSyncFunction3473CCE0)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB/e5b11440-fe24-11ef-98e6-0abc8a28bbed',
        EventId:
          'QuerygetPersonpreAuth0FunctionQuerygetPersonpreAuth0FunctionAppSyncFunction3473CCE0-DELETE_COMPLETE-2025-03-11T03:05:51.378Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB',
        LogicalResourceId:
          'QuerygetPersonpreAuth0FunctionQuerygetPersonpreAuth0FunctionAppSyncFunction3473CCE0',
        PhysicalResourceId:
          'arn:aws:appsync:us-west-2:123456789012:apis/ezabg7fk2jecvodrblowtgbsme/functions/fxp6umnevrgejoc6ie4evhvbuy',
        ResourceType: 'AWS::AppSync::FunctionConfiguration',
        Timestamp: new Date('2025-03-11T03:05:51.378'),
        ResourceStatus: 'DELETE_COMPLETE',
        ResourceProperties:
          '{"DataSourceName":"NONE_DS","ResponseMappingTemplate":"$util.toJson({})","FunctionVersion":"2018-05-29","RequestMappingTemplateS3Location":"s3://cdk-hnb659fds-assets-123456789012-us-west-2/6479af76f5a4d8b61b53dd3cee8e18ae192b629ad15ced7b342690a9ebbdd8c2.vtl","ApiId":"ezabg7fk2jecvodrblowtgbsme","Name":"QuerygetPersonpreAuth0Function"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'QuerygetPersonpreAuth0FunctionQuerygetPersonpreAuth0FunctionAppSyncFunction3473CCE0',
        },
        constructPath:
          'data/amplifyData/Person/QuerygetPersonpreAuth0Function/QuerygetPersonpreAuth0Function.AppSyncFunction',
      },
      progress: {
        completed: 65,
        formatted: ' 65',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R |  66 | 11:05:51 PM | DELETE_COMPLETE | AWS::AppSync::FunctionConfiguration | data/amplifyData/Post/SubscriptiononDeletePostauth0Function/SubscriptiononDeletePostauth0Function.AppSyncFunction (SubscriptiononDeletePostauth0FunctionSubscriptiononDeletePostauth0FunctionAppSyncFunction79C0574D)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R/e5bef6f0-fe24-11ef-b7fc-06822b500091',
        EventId:
          'SubscriptiononDeletePostauth0FunctionSubscriptiononDeletePostauth0FunctionAppSyncFunction79C0574D-DELETE_COMPLETE-2025-03-11T03:05:51.385Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R',
        LogicalResourceId:
          'SubscriptiononDeletePostauth0FunctionSubscriptiononDeletePostauth0FunctionAppSyncFunction79C0574D',
        PhysicalResourceId:
          'arn:aws:appsync:us-west-2:123456789012:apis/ezabg7fk2jecvodrblowtgbsme/functions/abcwe3nj6zbana67525efaysou',
        ResourceType: 'AWS::AppSync::FunctionConfiguration',
        Timestamp: new Date('2025-03-11T03:05:51.385'),
        ResourceStatus: 'DELETE_COMPLETE',
        ResourceProperties:
          '{"DataSourceName":"NONE_DS","ResponseMappingTemplate":"$util.toJson({})","FunctionVersion":"2018-05-29","RequestMappingTemplateS3Location":"s3://cdk-hnb659fds-assets-123456789012-us-west-2/6f3a2a9d562ae3058cc1aed6741edbf5edcaef7b3df7b03f52478816a1c95ffb.vtl","ApiId":"ezabg7fk2jecvodrblowtgbsme","Name":"SubscriptiononDeletePostauth0Function"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'SubscriptiononDeletePostauth0FunctionSubscriptiononDeletePostauth0FunctionAppSyncFunction79C0574D',
        },
        constructPath:
          'data/amplifyData/Post/SubscriptiononDeletePostauth0Function/SubscriptiononDeletePostauth0Function.AppSyncFunction',
      },
      progress: {
        completed: 66,
        formatted: ' 66',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R |  67 | 11:05:51 PM | DELETE_COMPLETE | AWS::AppSync::FunctionConfiguration | data/amplifyData/Post/QueryListPostsDataResolverFn/QueryListPostsDataResolverFn.AppSyncFunction (QueryListPostsDataResolverFnQueryListPostsDataResolverFnAppSyncFunction3D526AB7)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R/e5bef6f0-fe24-11ef-b7fc-06822b500091',
        EventId:
          'QueryListPostsDataResolverFnQueryListPostsDataResolverFnAppSyncFunction3D526AB7-DELETE_COMPLETE-2025-03-11T03:05:51.390Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R',
        LogicalResourceId:
          'QueryListPostsDataResolverFnQueryListPostsDataResolverFnAppSyncFunction3D526AB7',
        PhysicalResourceId:
          'arn:aws:appsync:us-west-2:123456789012:apis/ezabg7fk2jecvodrblowtgbsme/functions/clulgnswsve7rd4plicn4dtaaa',
        ResourceType: 'AWS::AppSync::FunctionConfiguration',
        Timestamp: new Date('2025-03-11T03:05:51.390'),
        ResourceStatus: 'DELETE_COMPLETE',
        ResourceProperties:
          '{"ResponseMappingTemplateS3Location":"s3://cdk-hnb659fds-assets-123456789012-us-west-2/cc01911d0269d4080ea57505dc445dfc315ef7ad85d3d9d4ea1357858bff451d.vtl","DataSourceName":"PostTable","FunctionVersion":"2018-05-29","RequestMappingTemplateS3Location":"s3://cdk-hnb659fds-assets-123456789012-us-west-2/9fcbe070ecd3023c5bf5b966fa9584757db9762eef123bad0820bd87591b2174.vtl","ApiId":"ezabg7fk2jecvodrblowtgbsme","Name":"QueryListPostsDataResolverFn"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'QueryListPostsDataResolverFnQueryListPostsDataResolverFnAppSyncFunction3D526AB7',
        },
        constructPath:
          'data/amplifyData/Post/QueryListPostsDataResolverFn/QueryListPostsDataResolverFn.AppSyncFunction',
      },
      progress: {
        completed: 67,
        formatted: ' 67',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R |  68 | 11:05:51 PM | DELETE_COMPLETE | AWS::AppSync::FunctionConfiguration | data/amplifyData/Post/MutationdeletePostpostAuth0Function/MutationdeletePostpostAuth0Function.AppSyncFunction (MutationdeletePostpostAuth0FunctionMutationdeletePostpostAuth0FunctionAppSyncFunctionFF4E884F)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R/e5bef6f0-fe24-11ef-b7fc-06822b500091',
        EventId:
          'MutationdeletePostpostAuth0FunctionMutationdeletePostpostAuth0FunctionAppSyncFunctionFF4E884F-DELETE_COMPLETE-2025-03-11T03:05:51.407Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R',
        LogicalResourceId:
          'MutationdeletePostpostAuth0FunctionMutationdeletePostpostAuth0FunctionAppSyncFunctionFF4E884F',
        PhysicalResourceId:
          'arn:aws:appsync:us-west-2:123456789012:apis/ezabg7fk2jecvodrblowtgbsme/functions/p56gezborzcgjfz3fwywfvftva',
        ResourceType: 'AWS::AppSync::FunctionConfiguration',
        Timestamp: new Date('2025-03-11T03:05:51.407'),
        ResourceStatus: 'DELETE_COMPLETE',
        ResourceProperties:
          '{"DataSourceName":"NONE_DS","ResponseMappingTemplate":"$util.toJson({})","FunctionVersion":"2018-05-29","RequestMappingTemplateS3Location":"s3://cdk-hnb659fds-assets-123456789012-us-west-2/c1721bcd774e27c514d3454b5be4f9bdd094c0161b57ddf053d618e3b0086a77.vtl","ApiId":"ezabg7fk2jecvodrblowtgbsme","Name":"MutationdeletePostpostAuth0Function"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'MutationdeletePostpostAuth0FunctionMutationdeletePostpostAuth0FunctionAppSyncFunctionFF4E884F',
        },
        constructPath:
          'data/amplifyData/Post/MutationdeletePostpostAuth0Function/MutationdeletePostpostAuth0Function.AppSyncFunction',
      },
      progress: {
        completed: 68,
        formatted: ' 68',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB |  69 | 11:05:51 PM | DELETE_COMPLETE | AWS::AppSync::FunctionConfiguration | data/amplifyData/Person/MutationupdatePersonpreAuth0Function/MutationupdatePersonpreAuth0Function.AppSyncFunction (MutationupdatePersonpreAuth0FunctionMutationupdatePersonpreAuth0FunctionAppSyncFunction7AAE6AAD)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB/e5b11440-fe24-11ef-98e6-0abc8a28bbed',
        EventId:
          'MutationupdatePersonpreAuth0FunctionMutationupdatePersonpreAuth0FunctionAppSyncFunction7AAE6AAD-DELETE_COMPLETE-2025-03-11T03:05:51.417Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB',
        LogicalResourceId:
          'MutationupdatePersonpreAuth0FunctionMutationupdatePersonpreAuth0FunctionAppSyncFunction7AAE6AAD',
        PhysicalResourceId:
          'arn:aws:appsync:us-west-2:123456789012:apis/ezabg7fk2jecvodrblowtgbsme/functions/tte6urkn75guvfbryioaqkzgaq',
        ResourceType: 'AWS::AppSync::FunctionConfiguration',
        Timestamp: new Date('2025-03-11T03:05:51.417'),
        ResourceStatus: 'DELETE_COMPLETE',
        ResourceProperties:
          '{"DataSourceName":"NONE_DS","ResponseMappingTemplate":"$util.toJson({})","FunctionVersion":"2018-05-29","RequestMappingTemplateS3Location":"s3://cdk-hnb659fds-assets-123456789012-us-west-2/fface358117b1edafc4dbe09854c750ff9d1cad2ab9aed9cff18b5df478d3d5d.vtl","ApiId":"ezabg7fk2jecvodrblowtgbsme","Name":"MutationupdatePersonpreAuth0Function"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'MutationupdatePersonpreAuth0FunctionMutationupdatePersonpreAuth0FunctionAppSyncFunction7AAE6AAD',
        },
        constructPath:
          'data/amplifyData/Person/MutationupdatePersonpreAuth0Function/MutationupdatePersonpreAuth0Function.AppSyncFunction',
      },
      progress: {
        completed: 69,
        formatted: ' 69',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R |  70 | 11:05:51 PM | DELETE_COMPLETE | AWS::AppSync::FunctionConfiguration | data/amplifyData/Post/MutationDeletePostDataResolverFn/MutationDeletePostDataResolverFn.AppSyncFunction (MutationDeletePostDataResolverFnMutationDeletePostDataResolverFnAppSyncFunction45B37C12)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R/e5bef6f0-fe24-11ef-b7fc-06822b500091',
        EventId:
          'MutationDeletePostDataResolverFnMutationDeletePostDataResolverFnAppSyncFunction45B37C12-DELETE_COMPLETE-2025-03-11T03:05:51.441Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R',
        LogicalResourceId:
          'MutationDeletePostDataResolverFnMutationDeletePostDataResolverFnAppSyncFunction45B37C12',
        PhysicalResourceId:
          'arn:aws:appsync:us-west-2:123456789012:apis/ezabg7fk2jecvodrblowtgbsme/functions/pvq3kk3khrfsbcrwzsbndmzauq',
        ResourceType: 'AWS::AppSync::FunctionConfiguration',
        Timestamp: new Date('2025-03-11T03:05:51.441'),
        ResourceStatus: 'DELETE_COMPLETE',
        ResourceProperties:
          '{"ResponseMappingTemplateS3Location":"s3://cdk-hnb659fds-assets-123456789012-us-west-2/f4a52b72209a9dfa197b5e7367a5c378c5bb86de6e29ddd9e48b49a3fe54b249.vtl","DataSourceName":"PostTable","FunctionVersion":"2018-05-29","RequestMappingTemplateS3Location":"s3://cdk-hnb659fds-assets-123456789012-us-west-2/4f7907d1209a2c9953a0c053df402c634e359546d70c7cc5c2e8e21ea734880f.vtl","ApiId":"ezabg7fk2jecvodrblowtgbsme","Name":"MutationDeletePostDataResolverFn"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'MutationDeletePostDataResolverFnMutationDeletePostDataResolverFnAppSyncFunction45B37C12',
        },
        constructPath:
          'data/amplifyData/Post/MutationDeletePostDataResolverFn/MutationDeletePostDataResolverFn.AppSyncFunction',
      },
      progress: {
        completed: 70,
        formatted: ' 70',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB |  71 | 11:05:51 PM | DELETE_COMPLETE | AWS::AppSync::FunctionConfiguration | data/amplifyData/Person/MutationUpdatePersonDataResolverFn/MutationUpdatePersonDataResolverFn.AppSyncFunction (MutationUpdatePersonDataResolverFnMutationUpdatePersonDataResolverFnAppSyncFunctionA221542D)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB/e5b11440-fe24-11ef-98e6-0abc8a28bbed',
        EventId:
          'MutationUpdatePersonDataResolverFnMutationUpdatePersonDataResolverFnAppSyncFunctionA221542D-DELETE_COMPLETE-2025-03-11T03:05:51.475Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB',
        LogicalResourceId:
          'MutationUpdatePersonDataResolverFnMutationUpdatePersonDataResolverFnAppSyncFunctionA221542D',
        PhysicalResourceId:
          'arn:aws:appsync:us-west-2:123456789012:apis/ezabg7fk2jecvodrblowtgbsme/functions/serryhyg4fe7djdoxekx7gkabi',
        ResourceType: 'AWS::AppSync::FunctionConfiguration',
        Timestamp: new Date('2025-03-11T03:05:51.475'),
        ResourceStatus: 'DELETE_COMPLETE',
        ResourceProperties:
          '{"ResponseMappingTemplateS3Location":"s3://cdk-hnb659fds-assets-123456789012-us-west-2/f4a52b72209a9dfa197b5e7367a5c378c5bb86de6e29ddd9e48b49a3fe54b249.vtl","DataSourceName":"PersonTable","FunctionVersion":"2018-05-29","RequestMappingTemplateS3Location":"s3://cdk-hnb659fds-assets-123456789012-us-west-2/474bf0776ec2164a13191d1a0a9e057154931e4918fea5086f49850d02a5371b.vtl","ApiId":"ezabg7fk2jecvodrblowtgbsme","Name":"MutationUpdatePersonDataResolverFn"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'MutationUpdatePersonDataResolverFnMutationUpdatePersonDataResolverFnAppSyncFunctionA221542D',
        },
        constructPath:
          'data/amplifyData/Person/MutationUpdatePersonDataResolverFn/MutationUpdatePersonDataResolverFn.AppSyncFunction',
      },
      progress: {
        completed: 71,
        formatted: ' 71',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R |  72 | 11:05:51 PM | DELETE_COMPLETE | AWS::AppSync::FunctionConfiguration | data/amplifyData/Post/MutationupdatePostinit0Function/MutationupdatePostinit0Function.AppSyncFunction (MutationupdatePostinit0FunctionMutationupdatePostinit0FunctionAppSyncFunctionBAC7D532)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R/e5bef6f0-fe24-11ef-b7fc-06822b500091',
        EventId:
          'MutationupdatePostinit0FunctionMutationupdatePostinit0FunctionAppSyncFunctionBAC7D532-DELETE_COMPLETE-2025-03-11T03:05:51.477Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R',
        LogicalResourceId:
          'MutationupdatePostinit0FunctionMutationupdatePostinit0FunctionAppSyncFunctionBAC7D532',
        PhysicalResourceId:
          'arn:aws:appsync:us-west-2:123456789012:apis/ezabg7fk2jecvodrblowtgbsme/functions/tocmffiltfgwrkdmfmvz64o6de',
        ResourceType: 'AWS::AppSync::FunctionConfiguration',
        Timestamp: new Date('2025-03-11T03:05:51.477'),
        ResourceStatus: 'DELETE_COMPLETE',
        ResourceProperties:
          '{"DataSourceName":"NONE_DS","ResponseMappingTemplate":"$util.toJson({})","FunctionVersion":"2018-05-29","RequestMappingTemplateS3Location":"s3://cdk-hnb659fds-assets-123456789012-us-west-2/06db846fd14e6fc371f22b12b5545ba8e2dbfeda85d8c8d586c71c282166657b.vtl","ApiId":"ezabg7fk2jecvodrblowtgbsme","Name":"MutationupdatePostinit0Function"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'MutationupdatePostinit0FunctionMutationupdatePostinit0FunctionAppSyncFunctionBAC7D532',
        },
        constructPath:
          'data/amplifyData/Post/MutationupdatePostinit0Function/MutationupdatePostinit0Function.AppSyncFunction',
      },
      progress: {
        completed: 72,
        formatted: ' 72',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB |  73 | 11:05:51 PM | DELETE_COMPLETE | AWS::AppSync::FunctionConfiguration | data/amplifyData/Person/MutationcreatePersoninit0Function/MutationcreatePersoninit0Function.AppSyncFunction (MutationcreatePersoninit0FunctionMutationcreatePersoninit0FunctionAppSyncFunctionD4A94967)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB/e5b11440-fe24-11ef-98e6-0abc8a28bbed',
        EventId:
          'MutationcreatePersoninit0FunctionMutationcreatePersoninit0FunctionAppSyncFunctionD4A94967-DELETE_COMPLETE-2025-03-11T03:05:51.490Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB',
        LogicalResourceId:
          'MutationcreatePersoninit0FunctionMutationcreatePersoninit0FunctionAppSyncFunctionD4A94967',
        PhysicalResourceId:
          'arn:aws:appsync:us-west-2:123456789012:apis/ezabg7fk2jecvodrblowtgbsme/functions/xfd65c2hkjhalpwxglpuq5sx7y',
        ResourceType: 'AWS::AppSync::FunctionConfiguration',
        Timestamp: new Date('2025-03-11T03:05:51.490'),
        ResourceStatus: 'DELETE_COMPLETE',
        ResourceProperties:
          '{"DataSourceName":"NONE_DS","ResponseMappingTemplate":"$util.toJson({})","FunctionVersion":"2018-05-29","RequestMappingTemplateS3Location":"s3://cdk-hnb659fds-assets-123456789012-us-west-2/3cf32e28e3985b88b598dacbcc9a81cbb12cab62b6507082eb20a0702d3c197e.vtl","ApiId":"ezabg7fk2jecvodrblowtgbsme","Name":"MutationcreatePersoninit0Function"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'MutationcreatePersoninit0FunctionMutationcreatePersoninit0FunctionAppSyncFunctionD4A94967',
        },
        constructPath:
          'data/amplifyData/Person/MutationcreatePersoninit0Function/MutationcreatePersoninit0Function.AppSyncFunction',
      },
      progress: {
        completed: 73,
        formatted: ' 73',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R |  74 | 11:05:51 PM | DELETE_COMPLETE | AWS::AppSync::FunctionConfiguration | data/amplifyData/Post/MutationupdatePostpostAuth0Function/MutationupdatePostpostAuth0Function.AppSyncFunction (MutationupdatePostpostAuth0FunctionMutationupdatePostpostAuth0FunctionAppSyncFunctionB977D8DD)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R/e5bef6f0-fe24-11ef-b7fc-06822b500091',
        EventId:
          'MutationupdatePostpostAuth0FunctionMutationupdatePostpostAuth0FunctionAppSyncFunctionB977D8DD-DELETE_COMPLETE-2025-03-11T03:05:51.496Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R',
        LogicalResourceId:
          'MutationupdatePostpostAuth0FunctionMutationupdatePostpostAuth0FunctionAppSyncFunctionB977D8DD',
        PhysicalResourceId:
          'arn:aws:appsync:us-west-2:123456789012:apis/ezabg7fk2jecvodrblowtgbsme/functions/pvonullxbzd5paawkz3o6sqdku',
        ResourceType: 'AWS::AppSync::FunctionConfiguration',
        Timestamp: new Date('2025-03-11T03:05:51.496'),
        ResourceStatus: 'DELETE_COMPLETE',
        ResourceProperties:
          '{"DataSourceName":"NONE_DS","ResponseMappingTemplate":"$util.toJson({})","FunctionVersion":"2018-05-29","RequestMappingTemplateS3Location":"s3://cdk-hnb659fds-assets-123456789012-us-west-2/c1721bcd774e27c514d3454b5be4f9bdd094c0161b57ddf053d618e3b0086a77.vtl","ApiId":"ezabg7fk2jecvodrblowtgbsme","Name":"MutationupdatePostpostAuth0Function"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'MutationupdatePostpostAuth0FunctionMutationupdatePostpostAuth0FunctionAppSyncFunctionB977D8DD',
        },
        constructPath:
          'data/amplifyData/Post/MutationupdatePostpostAuth0Function/MutationupdatePostpostAuth0Function.AppSyncFunction',
      },
      progress: {
        completed: 74,
        formatted: ' 74',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0e1752a889-storage0EC3F24A-FW28UHWGJFK9 |  75 | 11:05:51 PM | DELETE_COMPLETE | AWS::IAM::Role | data/Custom::S3AutoDeleteObjectsCustomResourceProvider/Role (CustomS3AutoDeleteObjectsCustomResourceProviderRole3B1BD092)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0e1752a889-storage0EC3F24A-FW28UHWGJFK9/b34eac10-fe24-11ef-884b-028f2e174171',
        EventId:
          'CustomS3AutoDeleteObjectsCustomResourceProviderRole3B1BD092-DELETE_COMPLETE-2025-03-11T03:05:51.500Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0e1752a889-storage0EC3F24A-FW28UHWGJFK9',
        LogicalResourceId:
          'CustomS3AutoDeleteObjectsCustomResourceProviderRole3B1BD092',
        PhysicalResourceId:
          'amplify-sampleprojectapp--CustomS3AutoDeleteObjects-C3hMUnpj2GY1',
        ResourceType: 'AWS::IAM::Role',
        Timestamp: new Date('2025-03-11T03:05:51.500'),
        ResourceStatus: 'DELETE_COMPLETE',
        ResourceProperties:
          '{"ManagedPolicyArns":["arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"],"AssumeRolePolicyDocument":{"Version":"2012-10-17","Statement":[{"Action":"sts:AssumeRole","Effect":"Allow","Principal":{"Service":"lambda.amazonaws.com"}}]}}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'CustomS3AutoDeleteObjectsCustomResourceProviderRole3B1BD092',
        },
        constructPath:
          'data/Custom::S3AutoDeleteObjectsCustomResourceProvider/Role',
      },
      progress: {
        completed: 75,
        formatted: ' 75',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB |  76 | 11:05:51 PM | DELETE_COMPLETE | AWS::AppSync::FunctionConfiguration | data/amplifyData/Person/SubscriptionOnDeletePersonDataResolverFn/SubscriptionOnDeletePersonDataResolverFn.AppSyncFunction (SubscriptionOnDeletePersonDataResolverFnSubscriptionOnDeletePersonDataResolverFnAppSyncFunction10D6A6CE)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB/e5b11440-fe24-11ef-98e6-0abc8a28bbed',
        EventId:
          'SubscriptionOnDeletePersonDataResolverFnSubscriptionOnDeletePersonDataResolverFnAppSyncFunction10D6A6CE-DELETE_COMPLETE-2025-03-11T03:05:51.512Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB',
        LogicalResourceId:
          'SubscriptionOnDeletePersonDataResolverFnSubscriptionOnDeletePersonDataResolverFnAppSyncFunction10D6A6CE',
        PhysicalResourceId:
          'arn:aws:appsync:us-west-2:123456789012:apis/ezabg7fk2jecvodrblowtgbsme/functions/5dnepofrwvgj5o55dn4kyzboiu',
        ResourceType: 'AWS::AppSync::FunctionConfiguration',
        Timestamp: new Date('2025-03-11T03:05:51.512'),
        ResourceStatus: 'DELETE_COMPLETE',
        ResourceProperties:
          '{"ResponseMappingTemplateS3Location":"s3://cdk-hnb659fds-assets-123456789012-us-west-2/e0cff47fb007f0bbf2a4e43ca256d6aa7ec109821769fd79fa7c5e83f0e7f9fc.vtl","DataSourceName":"NONE_DS","FunctionVersion":"2018-05-29","RequestMappingTemplateS3Location":"s3://cdk-hnb659fds-assets-123456789012-us-west-2/fe3c43ada4b9d681a5e2312663ef7a73386424d73b73e51f8e2e9d4b50f7c502.vtl","ApiId":"ezabg7fk2jecvodrblowtgbsme","Name":"SubscriptionOnDeletePersonDataResolverFn"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'SubscriptionOnDeletePersonDataResolverFnSubscriptionOnDeletePersonDataResolverFnAppSyncFunction10D6A6CE',
        },
        constructPath:
          'data/amplifyData/Person/SubscriptionOnDeletePersonDataResolverFn/SubscriptionOnDeletePersonDataResolverFn.AppSyncFunction',
      },
      progress: {
        completed: 76,
        formatted: ' 76',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB |  77 | 11:05:51 PM | DELETE_COMPLETE | AWS::AppSync::FunctionConfiguration | data/amplifyData/Person/MutationupdatePersoninit0Function/MutationupdatePersoninit0Function.AppSyncFunction (MutationupdatePersoninit0FunctionMutationupdatePersoninit0FunctionAppSyncFunction1245D23B)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB/e5b11440-fe24-11ef-98e6-0abc8a28bbed',
        EventId:
          'MutationupdatePersoninit0FunctionMutationupdatePersoninit0FunctionAppSyncFunction1245D23B-DELETE_COMPLETE-2025-03-11T03:05:51.533Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB',
        LogicalResourceId:
          'MutationupdatePersoninit0FunctionMutationupdatePersoninit0FunctionAppSyncFunction1245D23B',
        PhysicalResourceId:
          'arn:aws:appsync:us-west-2:123456789012:apis/ezabg7fk2jecvodrblowtgbsme/functions/lrz6kxtwtjfdfojnsv4nrgi2ja',
        ResourceType: 'AWS::AppSync::FunctionConfiguration',
        Timestamp: new Date('2025-03-11T03:05:51.533'),
        ResourceStatus: 'DELETE_COMPLETE',
        ResourceProperties:
          '{"DataSourceName":"NONE_DS","ResponseMappingTemplate":"$util.toJson({})","FunctionVersion":"2018-05-29","RequestMappingTemplateS3Location":"s3://cdk-hnb659fds-assets-123456789012-us-west-2/06db846fd14e6fc371f22b12b5545ba8e2dbfeda85d8c8d586c71c282166657b.vtl","ApiId":"ezabg7fk2jecvodrblowtgbsme","Name":"MutationupdatePersoninit0Function"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'MutationupdatePersoninit0FunctionMutationupdatePersoninit0FunctionAppSyncFunction1245D23B',
        },
        constructPath:
          'data/amplifyData/Person/MutationupdatePersoninit0Function/MutationupdatePersoninit0Function.AppSyncFunction',
      },
      progress: {
        completed: 77,
        formatted: ' 77',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB |  78 | 11:05:51 PM | DELETE_COMPLETE | AWS::AppSync::FunctionConfiguration | data/amplifyData/Person/QuerylistPeoplepostAuth0Function/QuerylistPeoplepostAuth0Function.AppSyncFunction (QuerylistPeoplepostAuth0FunctionQuerylistPeoplepostAuth0FunctionAppSyncFunction1786EC37)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB/e5b11440-fe24-11ef-98e6-0abc8a28bbed',
        EventId:
          'QuerylistPeoplepostAuth0FunctionQuerylistPeoplepostAuth0FunctionAppSyncFunction1786EC37-DELETE_COMPLETE-2025-03-11T03:05:51.553Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB',
        LogicalResourceId:
          'QuerylistPeoplepostAuth0FunctionQuerylistPeoplepostAuth0FunctionAppSyncFunction1786EC37',
        PhysicalResourceId:
          'arn:aws:appsync:us-west-2:123456789012:apis/ezabg7fk2jecvodrblowtgbsme/functions/vsx6d6l5mbfqzloqw3n4zt7qbm',
        ResourceType: 'AWS::AppSync::FunctionConfiguration',
        Timestamp: new Date('2025-03-11T03:05:51.553'),
        ResourceStatus: 'DELETE_COMPLETE',
        ResourceProperties:
          '{"DataSourceName":"NONE_DS","ResponseMappingTemplate":"$util.toJson({})","FunctionVersion":"2018-05-29","RequestMappingTemplateS3Location":"s3://cdk-hnb659fds-assets-123456789012-us-west-2/c1721bcd774e27c514d3454b5be4f9bdd094c0161b57ddf053d618e3b0086a77.vtl","ApiId":"ezabg7fk2jecvodrblowtgbsme","Name":"QuerylistPeoplepostAuth0Function"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'QuerylistPeoplepostAuth0FunctionQuerylistPeoplepostAuth0FunctionAppSyncFunction1786EC37',
        },
        constructPath:
          'data/amplifyData/Person/QuerylistPeoplepostAuth0Function/QuerylistPeoplepostAuth0Function.AppSyncFunction',
      },
      progress: {
        completed: 78,
        formatted: ' 78',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB |  79 | 11:05:51 PM | DELETE_COMPLETE | AWS::AppSync::FunctionConfiguration | data/amplifyData/Person/SubscriptiononDeletePersonauth0Function/SubscriptiononDeletePersonauth0Function.AppSyncFunction (SubscriptiononDeletePersonauth0FunctionSubscriptiononDeletePersonauth0FunctionAppSyncFunctionABDD4455)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB/e5b11440-fe24-11ef-98e6-0abc8a28bbed',
        EventId:
          'SubscriptiononDeletePersonauth0FunctionSubscriptiononDeletePersonauth0FunctionAppSyncFunctionABDD4455-DELETE_COMPLETE-2025-03-11T03:05:51.568Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB',
        LogicalResourceId:
          'SubscriptiononDeletePersonauth0FunctionSubscriptiononDeletePersonauth0FunctionAppSyncFunctionABDD4455',
        PhysicalResourceId:
          'arn:aws:appsync:us-west-2:123456789012:apis/ezabg7fk2jecvodrblowtgbsme/functions/kuqwbehgnnfqxhxwg6pd3q4i24',
        ResourceType: 'AWS::AppSync::FunctionConfiguration',
        Timestamp: new Date('2025-03-11T03:05:51.568'),
        ResourceStatus: 'DELETE_COMPLETE',
        ResourceProperties:
          '{"DataSourceName":"NONE_DS","ResponseMappingTemplate":"$util.toJson({})","FunctionVersion":"2018-05-29","RequestMappingTemplateS3Location":"s3://cdk-hnb659fds-assets-123456789012-us-west-2/6f3a2a9d562ae3058cc1aed6741edbf5edcaef7b3df7b03f52478816a1c95ffb.vtl","ApiId":"ezabg7fk2jecvodrblowtgbsme","Name":"SubscriptiononDeletePersonauth0Function"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'SubscriptiononDeletePersonauth0FunctionSubscriptiononDeletePersonauth0FunctionAppSyncFunctionABDD4455',
        },
        constructPath:
          'data/amplifyData/Person/SubscriptiononDeletePersonauth0Function/SubscriptiononDeletePersonauth0Function.AppSyncFunction',
      },
      progress: {
        completed: 79,
        formatted: ' 79',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R |  80 | 11:05:51 PM | DELETE_COMPLETE | AWS::AppSync::FunctionConfiguration | data/amplifyData/Post/MutationupdatePostauth0Function/MutationupdatePostauth0Function.AppSyncFunction (MutationupdatePostauth0FunctionMutationupdatePostauth0FunctionAppSyncFunction3E057835)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R/e5bef6f0-fe24-11ef-b7fc-06822b500091',
        EventId:
          'MutationupdatePostauth0FunctionMutationupdatePostauth0FunctionAppSyncFunction3E057835-DELETE_COMPLETE-2025-03-11T03:05:51.604Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R',
        LogicalResourceId:
          'MutationupdatePostauth0FunctionMutationupdatePostauth0FunctionAppSyncFunction3E057835',
        PhysicalResourceId:
          'arn:aws:appsync:us-west-2:123456789012:apis/ezabg7fk2jecvodrblowtgbsme/functions/h56cyfin3jdzrcumvncqwrt3re',
        ResourceType: 'AWS::AppSync::FunctionConfiguration',
        Timestamp: new Date('2025-03-11T03:05:51.604'),
        ResourceStatus: 'DELETE_COMPLETE',
        ResourceProperties:
          '{"ResponseMappingTemplateS3Location":"s3://cdk-hnb659fds-assets-123456789012-us-west-2/245ed8ac5185462a6923b7e45a318fec4c9ba0c45d1d720abd5b20317aa3dc6a.vtl","DataSourceName":"PostTable","FunctionVersion":"2018-05-29","RequestMappingTemplateS3Location":"s3://cdk-hnb659fds-assets-123456789012-us-west-2/1f5fed297da9c32ae3af922bf3a38ccf23b956078887d16891ec06c20c64722c.vtl","ApiId":"ezabg7fk2jecvodrblowtgbsme","Name":"MutationupdatePostauth0Function"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'MutationupdatePostauth0FunctionMutationupdatePostauth0FunctionAppSyncFunction3E057835',
        },
        constructPath:
          'data/amplifyData/Post/MutationupdatePostauth0Function/MutationupdatePostauth0Function.AppSyncFunction',
      },
      progress: {
        completed: 80,
        formatted: ' 80',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R |  81 | 11:05:51 PM | DELETE_COMPLETE | AWS::AppSync::FunctionConfiguration | data/amplifyData/Post/MutationcreatePostpostAuth0Function/MutationcreatePostpostAuth0Function.AppSyncFunction (MutationcreatePostpostAuth0FunctionMutationcreatePostpostAuth0FunctionAppSyncFunction2C708069)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R/e5bef6f0-fe24-11ef-b7fc-06822b500091',
        EventId:
          'MutationcreatePostpostAuth0FunctionMutationcreatePostpostAuth0FunctionAppSyncFunction2C708069-DELETE_COMPLETE-2025-03-11T03:05:51.621Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R',
        LogicalResourceId:
          'MutationcreatePostpostAuth0FunctionMutationcreatePostpostAuth0FunctionAppSyncFunction2C708069',
        PhysicalResourceId:
          'arn:aws:appsync:us-west-2:123456789012:apis/ezabg7fk2jecvodrblowtgbsme/functions/3qgda5e5kvhxdjvqvlvluiztjm',
        ResourceType: 'AWS::AppSync::FunctionConfiguration',
        Timestamp: new Date('2025-03-11T03:05:51.621'),
        ResourceStatus: 'DELETE_COMPLETE',
        ResourceProperties:
          '{"DataSourceName":"NONE_DS","ResponseMappingTemplate":"$util.toJson({})","FunctionVersion":"2018-05-29","RequestMappingTemplateS3Location":"s3://cdk-hnb659fds-assets-123456789012-us-west-2/c1721bcd774e27c514d3454b5be4f9bdd094c0161b57ddf053d618e3b0086a77.vtl","ApiId":"ezabg7fk2jecvodrblowtgbsme","Name":"MutationcreatePostpostAuth0Function"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'MutationcreatePostpostAuth0FunctionMutationcreatePostpostAuth0FunctionAppSyncFunction2C708069',
        },
        constructPath:
          'data/amplifyData/Post/MutationcreatePostpostAuth0Function/MutationcreatePostpostAuth0Function.AppSyncFunction',
      },
      progress: {
        completed: 81,
        formatted: ' 81',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R |  82 | 11:05:51 PM | DELETE_COMPLETE | AWS::AppSync::FunctionConfiguration | data/amplifyData/Post/QuerylistPostspostAuth0Function/QuerylistPostspostAuth0Function.AppSyncFunction (QuerylistPostspostAuth0FunctionQuerylistPostspostAuth0FunctionAppSyncFunction3585C8F4)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R/e5bef6f0-fe24-11ef-b7fc-06822b500091',
        EventId:
          'QuerylistPostspostAuth0FunctionQuerylistPostspostAuth0FunctionAppSyncFunction3585C8F4-DELETE_COMPLETE-2025-03-11T03:05:51.623Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R',
        LogicalResourceId:
          'QuerylistPostspostAuth0FunctionQuerylistPostspostAuth0FunctionAppSyncFunction3585C8F4',
        PhysicalResourceId:
          'arn:aws:appsync:us-west-2:123456789012:apis/ezabg7fk2jecvodrblowtgbsme/functions/dzerewvuincjxfwfmfgvar4xvq',
        ResourceType: 'AWS::AppSync::FunctionConfiguration',
        Timestamp: new Date('2025-03-11T03:05:51.623'),
        ResourceStatus: 'DELETE_COMPLETE',
        ResourceProperties:
          '{"DataSourceName":"NONE_DS","ResponseMappingTemplate":"$util.toJson({})","FunctionVersion":"2018-05-29","RequestMappingTemplateS3Location":"s3://cdk-hnb659fds-assets-123456789012-us-west-2/c1721bcd774e27c514d3454b5be4f9bdd094c0161b57ddf053d618e3b0086a77.vtl","ApiId":"ezabg7fk2jecvodrblowtgbsme","Name":"QuerylistPostspostAuth0Function"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'QuerylistPostspostAuth0FunctionQuerylistPostspostAuth0FunctionAppSyncFunction3585C8F4',
        },
        constructPath:
          'data/amplifyData/Post/QuerylistPostspostAuth0Function/QuerylistPostspostAuth0Function.AppSyncFunction',
      },
      progress: {
        completed: 82,
        formatted: ' 82',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R |  83 | 11:05:51 PM | DELETE_COMPLETE | AWS::AppSync::FunctionConfiguration | data/amplifyData/Post/MutationUpdatePostDataResolverFn/MutationUpdatePostDataResolverFn.AppSyncFunction (MutationUpdatePostDataResolverFnMutationUpdatePostDataResolverFnAppSyncFunctionBF7D410D)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R/e5bef6f0-fe24-11ef-b7fc-06822b500091',
        EventId:
          'MutationUpdatePostDataResolverFnMutationUpdatePostDataResolverFnAppSyncFunctionBF7D410D-DELETE_COMPLETE-2025-03-11T03:05:51.628Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R',
        LogicalResourceId:
          'MutationUpdatePostDataResolverFnMutationUpdatePostDataResolverFnAppSyncFunctionBF7D410D',
        PhysicalResourceId:
          'arn:aws:appsync:us-west-2:123456789012:apis/ezabg7fk2jecvodrblowtgbsme/functions/5mqbvtdbbrcxngsvhc3fskgcre',
        ResourceType: 'AWS::AppSync::FunctionConfiguration',
        Timestamp: new Date('2025-03-11T03:05:51.628'),
        ResourceStatus: 'DELETE_COMPLETE',
        ResourceProperties:
          '{"ResponseMappingTemplateS3Location":"s3://cdk-hnb659fds-assets-123456789012-us-west-2/f4a52b72209a9dfa197b5e7367a5c378c5bb86de6e29ddd9e48b49a3fe54b249.vtl","DataSourceName":"PostTable","FunctionVersion":"2018-05-29","RequestMappingTemplateS3Location":"s3://cdk-hnb659fds-assets-123456789012-us-west-2/474bf0776ec2164a13191d1a0a9e057154931e4918fea5086f49850d02a5371b.vtl","ApiId":"ezabg7fk2jecvodrblowtgbsme","Name":"MutationUpdatePostDataResolverFn"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'MutationUpdatePostDataResolverFnMutationUpdatePostDataResolverFnAppSyncFunctionBF7D410D',
        },
        constructPath:
          'data/amplifyData/Post/MutationUpdatePostDataResolverFn/MutationUpdatePostDataResolverFn.AppSyncFunction',
      },
      progress: {
        completed: 83,
        formatted: ' 83',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB |  84 | 11:05:51 PM | DELETE_COMPLETE | AWS::AppSync::FunctionConfiguration | data/amplifyData/Person/SubscriptiononDeletePersonpostAuth0Function/SubscriptiononDeletePersonpostAuth0Function.AppSyncFunction (SubscriptiononDeletePersonpostAuth0FunctionSubscriptiononDeletePersonpostAuth0FunctionAppSyncFunctionA71D2E0E)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB/e5b11440-fe24-11ef-98e6-0abc8a28bbed',
        EventId:
          'SubscriptiononDeletePersonpostAuth0FunctionSubscriptiononDeletePersonpostAuth0FunctionAppSyncFunctionA71D2E0E-DELETE_COMPLETE-2025-03-11T03:05:51.712Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB',
        LogicalResourceId:
          'SubscriptiononDeletePersonpostAuth0FunctionSubscriptiononDeletePersonpostAuth0FunctionAppSyncFunctionA71D2E0E',
        PhysicalResourceId:
          'arn:aws:appsync:us-west-2:123456789012:apis/ezabg7fk2jecvodrblowtgbsme/functions/d7ymp3hiu5di3gcqhfyopzsqhm',
        ResourceType: 'AWS::AppSync::FunctionConfiguration',
        Timestamp: new Date('2025-03-11T03:05:51.712'),
        ResourceStatus: 'DELETE_COMPLETE',
        ResourceProperties:
          '{"DataSourceName":"NONE_DS","ResponseMappingTemplate":"$util.toJson({})","FunctionVersion":"2018-05-29","RequestMappingTemplateS3Location":"s3://cdk-hnb659fds-assets-123456789012-us-west-2/c1721bcd774e27c514d3454b5be4f9bdd094c0161b57ddf053d618e3b0086a77.vtl","ApiId":"ezabg7fk2jecvodrblowtgbsme","Name":"SubscriptiononDeletePersonpostAuth0Function"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'SubscriptiononDeletePersonpostAuth0FunctionSubscriptiononDeletePersonpostAuth0FunctionAppSyncFunctionA71D2E0E',
        },
        constructPath:
          'data/amplifyData/Person/SubscriptiononDeletePersonpostAuth0Function/SubscriptiononDeletePersonpostAuth0Function.AppSyncFunction',
      },
      progress: {
        completed: 84,
        formatted: ' 84',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0e1752a889-storage0EC3F24A-FW28UHWGJFK9 |  85 | 11:05:51 PM | DELETE_COMPLETE | AWS::IAM::Role | storage/BucketNotificationsHandler050a0587b7544547bf325f094a3db834/Role (BucketNotificationsHandler050a0587b7544547bf325f094a3db834RoleB6FB88EC)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0e1752a889-storage0EC3F24A-FW28UHWGJFK9/b34eac10-fe24-11ef-884b-028f2e174171',
        EventId:
          'BucketNotificationsHandler050a0587b7544547bf325f094a3db834RoleB6FB88EC-DELETE_COMPLETE-2025-03-11T03:05:51.717Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0e1752a889-storage0EC3F24A-FW28UHWGJFK9',
        LogicalResourceId:
          'BucketNotificationsHandler050a0587b7544547bf325f094a3db834RoleB6FB88EC',
        PhysicalResourceId:
          'amplify-sampleprojectapp--BucketNotificationsHandle-MLaT6AFcXyTf',
        ResourceType: 'AWS::IAM::Role',
        Timestamp: new Date('2025-03-11T03:05:51.717'),
        ResourceStatus: 'DELETE_COMPLETE',
        ResourceProperties:
          '{"ManagedPolicyArns":["arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"],"AssumeRolePolicyDocument":{"Version":"2012-10-17","Statement":[{"Action":"sts:AssumeRole","Effect":"Allow","Principal":{"Service":"lambda.amazonaws.com"}}]},"Tags":[{"Value":"sandbox","Key":"amplify:deployment-type"},{"Value":"amplify","Key":"created-by"}]}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'BucketNotificationsHandler050a0587b7544547bf325f094a3db834RoleB6FB88EC',
        },
        constructPath:
          'storage/BucketNotificationsHandler050a0587b7544547bf325f094a3db834/Role',
      },
      progress: {
        completed: 85,
        formatted: ' 85',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R |  86 | 11:05:51 PM | DELETE_COMPLETE | AWS::AppSync::FunctionConfiguration | data/amplifyData/Post/SubscriptiononDeletePostpostAuth0Function/SubscriptiononDeletePostpostAuth0Function.AppSyncFunction (SubscriptiononDeletePostpostAuth0FunctionSubscriptiononDeletePostpostAuth0FunctionAppSyncFunction80B1275A)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R/e5bef6f0-fe24-11ef-b7fc-06822b500091',
        EventId:
          'SubscriptiononDeletePostpostAuth0FunctionSubscriptiononDeletePostpostAuth0FunctionAppSyncFunction80B1275A-DELETE_COMPLETE-2025-03-11T03:05:51.736Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R',
        LogicalResourceId:
          'SubscriptiononDeletePostpostAuth0FunctionSubscriptiononDeletePostpostAuth0FunctionAppSyncFunction80B1275A',
        PhysicalResourceId:
          'arn:aws:appsync:us-west-2:123456789012:apis/ezabg7fk2jecvodrblowtgbsme/functions/h5rnjjorqbh4rdgtd6jukqm6ui',
        ResourceType: 'AWS::AppSync::FunctionConfiguration',
        Timestamp: new Date('2025-03-11T03:05:51.736'),
        ResourceStatus: 'DELETE_COMPLETE',
        ResourceProperties:
          '{"DataSourceName":"NONE_DS","ResponseMappingTemplate":"$util.toJson({})","FunctionVersion":"2018-05-29","RequestMappingTemplateS3Location":"s3://cdk-hnb659fds-assets-123456789012-us-west-2/c1721bcd774e27c514d3454b5be4f9bdd094c0161b57ddf053d618e3b0086a77.vtl","ApiId":"ezabg7fk2jecvodrblowtgbsme","Name":"SubscriptiononDeletePostpostAuth0Function"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'SubscriptiononDeletePostpostAuth0FunctionSubscriptiononDeletePostpostAuth0FunctionAppSyncFunction80B1275A',
        },
        constructPath:
          'data/amplifyData/Post/SubscriptiononDeletePostpostAuth0Function/SubscriptiononDeletePostpostAuth0Function.AppSyncFunction',
      },
      progress: {
        completed: 86,
        formatted: ' 86',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB |  87 | 11:05:51 PM | DELETE_COMPLETE | AWS::AppSync::FunctionConfiguration | data/amplifyData/Person/SubscriptiononUpdatePersonauth0Function/SubscriptiononUpdatePersonauth0Function.AppSyncFunction (SubscriptiononUpdatePersonauth0FunctionSubscriptiononUpdatePersonauth0FunctionAppSyncFunction353AC226)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB/e5b11440-fe24-11ef-98e6-0abc8a28bbed',
        EventId:
          'SubscriptiononUpdatePersonauth0FunctionSubscriptiononUpdatePersonauth0FunctionAppSyncFunction353AC226-DELETE_COMPLETE-2025-03-11T03:05:51.919Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB',
        LogicalResourceId:
          'SubscriptiononUpdatePersonauth0FunctionSubscriptiononUpdatePersonauth0FunctionAppSyncFunction353AC226',
        PhysicalResourceId:
          'arn:aws:appsync:us-west-2:123456789012:apis/ezabg7fk2jecvodrblowtgbsme/functions/wgp453i5nrd6hi7zr7s4zns6sm',
        ResourceType: 'AWS::AppSync::FunctionConfiguration',
        Timestamp: new Date('2025-03-11T03:05:51.919'),
        ResourceStatus: 'DELETE_COMPLETE',
        ResourceProperties:
          '{"DataSourceName":"NONE_DS","ResponseMappingTemplate":"$util.toJson({})","FunctionVersion":"2018-05-29","RequestMappingTemplateS3Location":"s3://cdk-hnb659fds-assets-123456789012-us-west-2/6f3a2a9d562ae3058cc1aed6741edbf5edcaef7b3df7b03f52478816a1c95ffb.vtl","ApiId":"ezabg7fk2jecvodrblowtgbsme","Name":"SubscriptiononUpdatePersonauth0Function"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'SubscriptiononUpdatePersonauth0FunctionSubscriptiononUpdatePersonauth0FunctionAppSyncFunction353AC226',
        },
        constructPath:
          'data/amplifyData/Person/SubscriptiononUpdatePersonauth0Function/SubscriptiononUpdatePersonauth0Function.AppSyncFunction',
      },
      progress: {
        completed: 87,
        formatted: ' 87',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB |  88 | 11:05:51 PM | DELETE_COMPLETE | AWS::AppSync::FunctionConfiguration | data/amplifyData/Person/SubscriptionOnUpdatePersonDataResolverFn/SubscriptionOnUpdatePersonDataResolverFn.AppSyncFunction (SubscriptionOnUpdatePersonDataResolverFnSubscriptionOnUpdatePersonDataResolverFnAppSyncFunction531174D3)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB/e5b11440-fe24-11ef-98e6-0abc8a28bbed',
        EventId:
          'SubscriptionOnUpdatePersonDataResolverFnSubscriptionOnUpdatePersonDataResolverFnAppSyncFunction531174D3-DELETE_COMPLETE-2025-03-11T03:05:51.949Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB',
        LogicalResourceId:
          'SubscriptionOnUpdatePersonDataResolverFnSubscriptionOnUpdatePersonDataResolverFnAppSyncFunction531174D3',
        PhysicalResourceId:
          'arn:aws:appsync:us-west-2:123456789012:apis/ezabg7fk2jecvodrblowtgbsme/functions/zlyqslxpyvhcjpwcrtcrdteczm',
        ResourceType: 'AWS::AppSync::FunctionConfiguration',
        Timestamp: new Date('2025-03-11T03:05:51.949'),
        ResourceStatus: 'DELETE_COMPLETE',
        ResourceProperties:
          '{"ResponseMappingTemplateS3Location":"s3://cdk-hnb659fds-assets-123456789012-us-west-2/e0cff47fb007f0bbf2a4e43ca256d6aa7ec109821769fd79fa7c5e83f0e7f9fc.vtl","DataSourceName":"NONE_DS","FunctionVersion":"2018-05-29","RequestMappingTemplateS3Location":"s3://cdk-hnb659fds-assets-123456789012-us-west-2/fe3c43ada4b9d681a5e2312663ef7a73386424d73b73e51f8e2e9d4b50f7c502.vtl","ApiId":"ezabg7fk2jecvodrblowtgbsme","Name":"SubscriptionOnUpdatePersonDataResolverFn"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'SubscriptionOnUpdatePersonDataResolverFnSubscriptionOnUpdatePersonDataResolverFnAppSyncFunction531174D3',
        },
        constructPath:
          'data/amplifyData/Person/SubscriptionOnUpdatePersonDataResolverFn/SubscriptionOnUpdatePersonDataResolverFn.AppSyncFunction',
      },
      progress: {
        completed: 88,
        formatted: ' 88',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C |  89 | 11:05:51 PM | DELETE_COMPLETE | AWS::IAM::Role | data/Custom::CDKBucketDeployment8693BB64968944B69AAFB0CC9EB8756C1536MiB/ServiceRole (CustomCDKBucketDeployment8693BB64968944B69AAFB0CC9EB8756C1536MiBServiceRoleA41FC8C2)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C/b355b0f0-fe24-11ef-a0bd-020db6799971',
        EventId:
          'CustomCDKBucketDeployment8693BB64968944B69AAFB0CC9EB8756C1536MiBServiceRoleA41FC8C2-DELETE_COMPLETE-2025-03-11T03:05:51.975Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C',
        LogicalResourceId:
          'CustomCDKBucketDeployment8693BB64968944B69AAFB0CC9EB8756C1536MiBServiceRoleA41FC8C2',
        PhysicalResourceId:
          'amplify-sampleprojectapp--CustomCDKBucketDeployment-u7Dt1VwbCyC1',
        ResourceType: 'AWS::IAM::Role',
        Timestamp: new Date('2025-03-11T03:05:51.975'),
        ResourceStatus: 'DELETE_COMPLETE',
        ResourceProperties:
          '{"ManagedPolicyArns":["arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"],"AssumeRolePolicyDocument":{"Version":"2012-10-17","Statement":[{"Action":"sts:AssumeRole","Effect":"Allow","Principal":{"Service":"lambda.amazonaws.com"}}]},"Tags":[{"Value":"sandbox","Key":"amplify:deployment-type"},{"Value":"amplify","Key":"created-by"}]}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'CustomCDKBucketDeployment8693BB64968944B69AAFB0CC9EB8756C1536MiBServiceRoleA41FC8C2',
        },
        constructPath:
          'data/Custom::CDKBucketDeployment8693BB64968944B69AAFB0CC9EB8756C1536MiB/ServiceRole',
      },
      progress: {
        completed: 89,
        formatted: ' 89',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0e1752a889-storage0EC3F24A-FW28UHWGJFK9 |  90 | 11:05:52 PM | DELETE_COMPLETE | AWS::CloudFormation::Stack | amplify-sampleprojectapp-user-sandbox-0e1752a889-storage0EC3F24A-FW28UHWGJFK9',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0e1752a889-storage0EC3F24A-FW28UHWGJFK9/b34eac10-fe24-11ef-884b-028f2e174171',
        EventId: 'bd9c0ae0-fe25-11ef-9749-0ab62f97f51b',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0e1752a889-storage0EC3F24A-FW28UHWGJFK9',
        LogicalResourceId:
          'amplify-sampleprojectapp-user-sandbox-0e1752a889-storage0EC3F24A-FW28UHWGJFK9',
        PhysicalResourceId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0e1752a889-storage0EC3F24A-FW28UHWGJFK9/b34eac10-fe24-11ef-884b-028f2e174171',
        ResourceType: 'AWS::CloudFormation::Stack',
        Timestamp: new Date('2025-03-11T03:05:52.000'),
        ResourceStatus: 'DELETE_COMPLETE',
      },
      progress: {
        completed: 90,
        formatted: ' 90',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C |  89 | 11:05:52 PM | DELETE_COMPLETE | AWS::IAM::Role | data/Custom::S3AutoDeleteObjectsCustomResourceProvider/Role (CustomS3AutoDeleteObjectsCustomResourceProviderRole3B1BD092)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C/b355b0f0-fe24-11ef-a0bd-020db6799971',
        EventId:
          'CustomS3AutoDeleteObjectsCustomResourceProviderRole3B1BD092-DELETE_COMPLETE-2025-03-11T03:05:52.013Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C',
        LogicalResourceId:
          'CustomS3AutoDeleteObjectsCustomResourceProviderRole3B1BD092',
        PhysicalResourceId:
          'amplify-sampleprojectapp--CustomS3AutoDeleteObjects-UEGEyfol9r26',
        ResourceType: 'AWS::IAM::Role',
        Timestamp: new Date('2025-03-11T03:05:52.013'),
        ResourceStatus: 'DELETE_COMPLETE',
        ResourceProperties:
          '{"ManagedPolicyArns":["arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"],"AssumeRolePolicyDocument":{"Version":"2012-10-17","Statement":[{"Action":"sts:AssumeRole","Effect":"Allow","Principal":{"Service":"lambda.amazonaws.com"}}]}}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'CustomS3AutoDeleteObjectsCustomResourceProviderRole3B1BD092',
        },
        constructPath:
          'data/Custom::S3AutoDeleteObjectsCustomResourceProvider/Role',
      },
      progress: {
        completed: 89,
        formatted: ' 89',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R |  89 | 11:05:52 PM | DELETE_IN_PROGRESS | AWS::AppSync::DataSource | data/amplifyData/Post/PostDataSource (PostDataSource)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R/e5bef6f0-fe24-11ef-b7fc-06822b500091',
        EventId: 'PostDataSource-DELETE_IN_PROGRESS-2025-03-11T03:05:52.078Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R',
        LogicalResourceId: 'PostDataSource',
        PhysicalResourceId:
          'arn:aws:appsync:us-west-2:123456789012:apis/ezabg7fk2jecvodrblowtgbsme/datasources/PostTable',
        ResourceType: 'AWS::AppSync::DataSource',
        Timestamp: new Date('2025-03-11T03:05:52.078'),
        ResourceStatus: 'DELETE_IN_PROGRESS',
        ResourceProperties:
          '{"Type":"AMAZON_DYNAMODB","ServiceRoleArn":"arn:aws:iam::123456789012:role/PostIAMRolebbce9b-ezabg7fk2jecvodrblowtgbsme-NONE","ApiId":"ezabg7fk2jecvodrblowtgbsme","DynamoDBConfig":{"TableName":"Post-ezabg7fk2jecvodrblowtgbsme-NONE","AwsRegion":"us-west-2"},"Name":"PostTable"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'PostDataSource',
        },
        constructPath: 'data/amplifyData/Post/PostDataSource',
      },
      progress: {
        completed: 89,
        formatted: ' 89',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R |  90 | 11:05:52 PM | DELETE_COMPLETE | AWS::AppSync::FunctionConfiguration | data/amplifyData/Post/SubscriptionOnCreatePostDataResolverFn/SubscriptionOnCreatePostDataResolverFn.AppSyncFunction (SubscriptionOnCreatePostDataResolverFnSubscriptionOnCreatePostDataResolverFnAppSyncFunctionB4572868)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R/e5bef6f0-fe24-11ef-b7fc-06822b500091',
        EventId:
          'SubscriptionOnCreatePostDataResolverFnSubscriptionOnCreatePostDataResolverFnAppSyncFunctionB4572868-DELETE_COMPLETE-2025-03-11T03:05:52.085Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R',
        LogicalResourceId:
          'SubscriptionOnCreatePostDataResolverFnSubscriptionOnCreatePostDataResolverFnAppSyncFunctionB4572868',
        PhysicalResourceId:
          'arn:aws:appsync:us-west-2:123456789012:apis/ezabg7fk2jecvodrblowtgbsme/functions/w2szpeqivngldep65ixycjfztu',
        ResourceType: 'AWS::AppSync::FunctionConfiguration',
        Timestamp: new Date('2025-03-11T03:05:52.085'),
        ResourceStatus: 'DELETE_COMPLETE',
        ResourceProperties:
          '{"ResponseMappingTemplateS3Location":"s3://cdk-hnb659fds-assets-123456789012-us-west-2/e0cff47fb007f0bbf2a4e43ca256d6aa7ec109821769fd79fa7c5e83f0e7f9fc.vtl","DataSourceName":"NONE_DS","FunctionVersion":"2018-05-29","RequestMappingTemplateS3Location":"s3://cdk-hnb659fds-assets-123456789012-us-west-2/fe3c43ada4b9d681a5e2312663ef7a73386424d73b73e51f8e2e9d4b50f7c502.vtl","ApiId":"ezabg7fk2jecvodrblowtgbsme","Name":"SubscriptionOnCreatePostDataResolverFn"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'SubscriptionOnCreatePostDataResolverFnSubscriptionOnCreatePostDataResolverFnAppSyncFunctionB4572868',
        },
        constructPath:
          'data/amplifyData/Post/SubscriptionOnCreatePostDataResolverFn/SubscriptionOnCreatePostDataResolverFn.AppSyncFunction',
      },
      progress: {
        completed: 90,
        formatted: ' 90',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R |  91 | 11:05:52 PM | DELETE_COMPLETE | AWS::AppSync::FunctionConfiguration | data/amplifyData/Post/SubscriptiononCreatePostpostAuth0Function/SubscriptiononCreatePostpostAuth0Function.AppSyncFunction (SubscriptiononCreatePostpostAuth0FunctionSubscriptiononCreatePostpostAuth0FunctionAppSyncFunction3197D95D)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R/e5bef6f0-fe24-11ef-b7fc-06822b500091',
        EventId:
          'SubscriptiononCreatePostpostAuth0FunctionSubscriptiononCreatePostpostAuth0FunctionAppSyncFunction3197D95D-DELETE_COMPLETE-2025-03-11T03:05:52.138Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R',
        LogicalResourceId:
          'SubscriptiononCreatePostpostAuth0FunctionSubscriptiononCreatePostpostAuth0FunctionAppSyncFunction3197D95D',
        PhysicalResourceId:
          'arn:aws:appsync:us-west-2:123456789012:apis/ezabg7fk2jecvodrblowtgbsme/functions/fvc4vbangzhkzl3uvsowmwbjga',
        ResourceType: 'AWS::AppSync::FunctionConfiguration',
        Timestamp: new Date('2025-03-11T03:05:52.138'),
        ResourceStatus: 'DELETE_COMPLETE',
        ResourceProperties:
          '{"DataSourceName":"NONE_DS","ResponseMappingTemplate":"$util.toJson({})","FunctionVersion":"2018-05-29","RequestMappingTemplateS3Location":"s3://cdk-hnb659fds-assets-123456789012-us-west-2/c1721bcd774e27c514d3454b5be4f9bdd094c0161b57ddf053d618e3b0086a77.vtl","ApiId":"ezabg7fk2jecvodrblowtgbsme","Name":"SubscriptiononCreatePostpostAuth0Function"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'SubscriptiononCreatePostpostAuth0FunctionSubscriptiononCreatePostpostAuth0FunctionAppSyncFunction3197D95D',
        },
        constructPath:
          'data/amplifyData/Post/SubscriptiononCreatePostpostAuth0Function/SubscriptiononCreatePostpostAuth0Function.AppSyncFunction',
      },
      progress: {
        completed: 91,
        formatted: ' 91',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB |  92 | 11:05:52 PM | DELETE_COMPLETE | AWS::AppSync::FunctionConfiguration | data/amplifyData/Person/SubscriptiononUpdatePersonpostAuth0Function/SubscriptiononUpdatePersonpostAuth0Function.AppSyncFunction (SubscriptiononUpdatePersonpostAuth0FunctionSubscriptiononUpdatePersonpostAuth0FunctionAppSyncFunction8A075045)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB/e5b11440-fe24-11ef-98e6-0abc8a28bbed',
        EventId:
          'SubscriptiononUpdatePersonpostAuth0FunctionSubscriptiononUpdatePersonpostAuth0FunctionAppSyncFunction8A075045-DELETE_COMPLETE-2025-03-11T03:05:52.204Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB',
        LogicalResourceId:
          'SubscriptiononUpdatePersonpostAuth0FunctionSubscriptiononUpdatePersonpostAuth0FunctionAppSyncFunction8A075045',
        PhysicalResourceId:
          'arn:aws:appsync:us-west-2:123456789012:apis/ezabg7fk2jecvodrblowtgbsme/functions/pmyspxat2vdmjiymvjummc7s7m',
        ResourceType: 'AWS::AppSync::FunctionConfiguration',
        Timestamp: new Date('2025-03-11T03:05:52.204'),
        ResourceStatus: 'DELETE_COMPLETE',
        ResourceProperties:
          '{"DataSourceName":"NONE_DS","ResponseMappingTemplate":"$util.toJson({})","FunctionVersion":"2018-05-29","RequestMappingTemplateS3Location":"s3://cdk-hnb659fds-assets-123456789012-us-west-2/c1721bcd774e27c514d3454b5be4f9bdd094c0161b57ddf053d618e3b0086a77.vtl","ApiId":"ezabg7fk2jecvodrblowtgbsme","Name":"SubscriptiononUpdatePersonpostAuth0Function"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'SubscriptiononUpdatePersonpostAuth0FunctionSubscriptiononUpdatePersonpostAuth0FunctionAppSyncFunction8A075045',
        },
        constructPath:
          'data/amplifyData/Person/SubscriptiononUpdatePersonpostAuth0Function/SubscriptiononUpdatePersonpostAuth0Function.AppSyncFunction',
      },
      progress: {
        completed: 92,
        formatted: ' 92',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R |  93 | 11:05:52 PM | DELETE_COMPLETE | AWS::AppSync::FunctionConfiguration | data/amplifyData/Post/SubscriptiononCreatePostauth0Function/SubscriptiononCreatePostauth0Function.AppSyncFunction (SubscriptiononCreatePostauth0FunctionSubscriptiononCreatePostauth0FunctionAppSyncFunction24934FF1)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R/e5bef6f0-fe24-11ef-b7fc-06822b500091',
        EventId:
          'SubscriptiononCreatePostauth0FunctionSubscriptiononCreatePostauth0FunctionAppSyncFunction24934FF1-DELETE_COMPLETE-2025-03-11T03:05:52.254Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R',
        LogicalResourceId:
          'SubscriptiononCreatePostauth0FunctionSubscriptiononCreatePostauth0FunctionAppSyncFunction24934FF1',
        PhysicalResourceId:
          'arn:aws:appsync:us-west-2:123456789012:apis/ezabg7fk2jecvodrblowtgbsme/functions/2ezpsvojyjgodfyvewghqayxlu',
        ResourceType: 'AWS::AppSync::FunctionConfiguration',
        Timestamp: new Date('2025-03-11T03:05:52.254'),
        ResourceStatus: 'DELETE_COMPLETE',
        ResourceProperties:
          '{"DataSourceName":"NONE_DS","ResponseMappingTemplate":"$util.toJson({})","FunctionVersion":"2018-05-29","RequestMappingTemplateS3Location":"s3://cdk-hnb659fds-assets-123456789012-us-west-2/6f3a2a9d562ae3058cc1aed6741edbf5edcaef7b3df7b03f52478816a1c95ffb.vtl","ApiId":"ezabg7fk2jecvodrblowtgbsme","Name":"SubscriptiononCreatePostauth0Function"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'SubscriptiononCreatePostauth0FunctionSubscriptiononCreatePostauth0FunctionAppSyncFunction24934FF1',
        },
        constructPath:
          'data/amplifyData/Post/SubscriptiononCreatePostauth0Function/SubscriptiononCreatePostauth0Function.AppSyncFunction',
      },
      progress: {
        completed: 93,
        formatted: ' 93',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R |  94 | 11:05:53 PM | DELETE_COMPLETE | AWS::AppSync::DataSource | data/amplifyData/Post/PostDataSource (PostDataSource)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R/e5bef6f0-fe24-11ef-b7fc-06822b500091',
        EventId: 'PostDataSource-DELETE_COMPLETE-2025-03-11T03:05:53.276Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R',
        LogicalResourceId: 'PostDataSource',
        PhysicalResourceId:
          'arn:aws:appsync:us-west-2:123456789012:apis/ezabg7fk2jecvodrblowtgbsme/datasources/PostTable',
        ResourceType: 'AWS::AppSync::DataSource',
        Timestamp: new Date('2025-03-11T03:05:53.276'),
        ResourceStatus: 'DELETE_COMPLETE',
        ResourceProperties:
          '{"Type":"AMAZON_DYNAMODB","ServiceRoleArn":"arn:aws:iam::123456789012:role/PostIAMRolebbce9b-ezabg7fk2jecvodrblowtgbsme-NONE","ApiId":"ezabg7fk2jecvodrblowtgbsme","DynamoDBConfig":{"TableName":"Post-ezabg7fk2jecvodrblowtgbsme-NONE","AwsRegion":"us-west-2"},"Name":"PostTable"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'PostDataSource',
        },
        constructPath: 'data/amplifyData/Post/PostDataSource',
      },
      progress: {
        completed: 94,
        formatted: ' 94',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R |  95 | 11:05:53 PM | DELETE_COMPLETE | AWS::AppSync::FunctionConfiguration | data/amplifyData/Post/QuerylistPostByAuthorNamepostAuth0Function/QuerylistPostByAuthorNamepostAuth0Function.AppSyncFunction (QuerylistPostByAuthorNamepostAuth0FunctionQuerylistPostByAuthorNamepostAuth0FunctionAppSyncFunctionAF7022BA)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R/e5bef6f0-fe24-11ef-b7fc-06822b500091',
        EventId:
          'QuerylistPostByAuthorNamepostAuth0FunctionQuerylistPostByAuthorNamepostAuth0FunctionAppSyncFunctionAF7022BA-DELETE_COMPLETE-2025-03-11T03:05:53.311Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R',
        LogicalResourceId:
          'QuerylistPostByAuthorNamepostAuth0FunctionQuerylistPostByAuthorNamepostAuth0FunctionAppSyncFunctionAF7022BA',
        PhysicalResourceId:
          'arn:aws:appsync:us-west-2:123456789012:apis/ezabg7fk2jecvodrblowtgbsme/functions/iwl7wvprhja55d7jsqsaqtwtoy',
        ResourceType: 'AWS::AppSync::FunctionConfiguration',
        Timestamp: new Date('2025-03-11T03:05:53.311'),
        ResourceStatus: 'DELETE_COMPLETE',
        ResourceProperties:
          '{"DataSourceName":"NONE_DS","ResponseMappingTemplate":"$util.toJson({})","FunctionVersion":"2018-05-29","RequestMappingTemplateS3Location":"s3://cdk-hnb659fds-assets-123456789012-us-west-2/c1721bcd774e27c514d3454b5be4f9bdd094c0161b57ddf053d618e3b0086a77.vtl","ApiId":"ezabg7fk2jecvodrblowtgbsme","Name":"QuerylistPostByAuthorNamepostAuth0Function"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'QuerylistPostByAuthorNamepostAuth0FunctionQuerylistPostByAuthorNamepostAuth0FunctionAppSyncFunctionAF7022BA',
        },
        constructPath:
          'data/amplifyData/Post/QuerylistPostByAuthorNamepostAuth0Function/QuerylistPostByAuthorNamepostAuth0Function.AppSyncFunction',
      },
      progress: {
        completed: 95,
        formatted: ' 95',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB |  96 | 11:05:53 PM | DELETE_COMPLETE | AWS::AppSync::Resolver | data/amplifyData/Person/mutationDeletePersonResolver (DeletePersonResolver)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB/e5b11440-fe24-11ef-98e6-0abc8a28bbed',
        EventId:
          'DeletePersonResolver-DELETE_COMPLETE-2025-03-11T03:05:53.496Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB',
        LogicalResourceId: 'DeletePersonResolver',
        PhysicalResourceId:
          'arn:aws:appsync:us-west-2:123456789012:apis/ezabg7fk2jecvodrblowtgbsme/types/Mutation/resolvers/deletePerson',
        ResourceType: 'AWS::AppSync::Resolver',
        Timestamp: new Date('2025-03-11T03:05:53.496'),
        ResourceStatus: 'DELETE_COMPLETE',
        ResourceProperties:
          '{"TypeName":"Mutation","PipelineConfig":{"Functions":["ldrtgv7fn5dg7lhfkxrybojlfu","nf25vwky2beofdyqls3l43y4mm","4t65yjjtgrer3gyv2yvx4sjqwa","q3wd2u6gazbqxdlkvcfjqvqo2e"]},"RequestMappingTemplate":"$util.qr($ctx.stash.put(\\"typeName\\", \\"Mutation\\"))\\n$util.qr($ctx.stash.put(\\"fieldName\\", \\"deletePerson\\"))\\n$util.qr($ctx.stash.put(\\"conditions\\", []))\\n$util.qr($ctx.stash.put(\\"metadata\\", {}))\\n$util.qr($ctx.stash.metadata.put(\\"dataSourceType\\", \\"AMAZON_DYNAMODB\\"))\\n$util.qr($ctx.stash.metadata.put(\\"apiId\\", \\"ezabg7fk2jecvodrblowtgbsme\\"))\\n$util.qr($ctx.stash.put(\\"connectionAttributes\\", {}))\\n$util.qr($ctx.stash.put(\\"tableName\\", \\"Person-ezabg7fk2jecvodrblowtgbsme-NONE\\"))\\n$util.qr($ctx.stash.put(\\"authRole\\", \\"arn:aws:sts::123456789012:assumed-role/amplify-sampleprojectapp--amplifyAuthauthenticatedU-JksUKi7c8Bvh/CognitoIdentityCredentials\\"))\\n$util.qr($ctx.stash.put(\\"unauthRole\\", \\"arn:aws:sts::123456789012:assumed-role/amplify-sampleprojectapp--amplifyAuthunauthenticate-0ZSS9wsA6Aut/CognitoIdentityCredentials\\"))\\n$util.qr($ctx.stash.put(\\"identityPoolId\\", \\"us-west-2:e3abf6f7-1ae5-4254-829e-0d8c9dc05bff\\"))\\n$util.qr($ctx.stash.put(\\"adminRoles\\", []))\\n$util.toJson({})","ResponseMappingTemplate":"$util.toJson($ctx.prev.result)","Kind":"PIPELINE","ApiId":"ezabg7fk2jecvodrblowtgbsme","FieldName":"deletePerson"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'DeletePersonResolver',
        },
        constructPath: 'data/amplifyData/Person/mutationDeletePersonResolver',
      },
      progress: {
        completed: 96,
        formatted: ' 96',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0e1752a889 |  97 | 11:05:53 PM | DELETE_COMPLETE | AWS::CloudFormation::Stack | storage.NestedStack/storage.NestedStackResource (storage0EC3F24A)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0e1752a889/912e40a0-fe24-11ef-ab54-068258314c15',
        EventId: 'storage0EC3F24A-DELETE_COMPLETE-2025-03-11T03:05:53.591Z',
        StackName: 'amplify-sampleprojectapp-user-sandbox-0e1752a889',
        LogicalResourceId: 'storage0EC3F24A',
        PhysicalResourceId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0e1752a889-storage0EC3F24A-FW28UHWGJFK9/b34eac10-fe24-11ef-884b-028f2e174171',
        ResourceType: 'AWS::CloudFormation::Stack',
        Timestamp: new Date('2025-03-11T03:05:53.591'),
        ResourceStatus: 'DELETE_COMPLETE',
        ResourceProperties:
          '{"TemplateURL":"https://s3.us-west-2.amazonaws.com/cdk-hnb659fds-assets-123456789012-us-west-2/a217e7c300711883159bfa09d4a6a99f762c9d59542ae5bb802ebac85abdb443.json","Parameters":{"referencetoamplifysampleprojectappusersandbox0e1752a889functionNestedStackfunctionNestedStackResourceC6A79258Outputsamplifysampleprojectappusersandbox0e1752a889functionsayhellolambdaServiceRole6B7F66E6Ref":"amplify-sampleprojectapp--sayhellolambdaServiceRole-rTltSNgzZZ60","referencetoamplifysampleprojectappusersandbox0e1752a889functionNestedStackfunctionNestedStackResourceC6A79258Outputsamplifysampleprojectappusersandbox0e1752a889functionsayhellolambdaB2E612D0Arn":"arn:aws:lambda:us-west-2:123456789012:function:amplify-sampleprojectapp-pr-sayhellolambdaEFA46D92-FKnDZgZ20NmE"},"Tags":[{"Value":"sandbox","Key":"amplify:deployment-type"},{"Value":"amplify","Key":"created-by"}]}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'storage0EC3F24A',
        },
        constructPath: 'storage.NestedStack/storage.NestedStackResource',
      },
      progress: {
        completed: 97,
        formatted: ' 97',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R |  97 | 11:05:53 PM | DELETE_IN_PROGRESS | Custom::AmplifyDynamoDBTable | data/amplifyData/Post/PostTable/Default/Default (PostTable)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R/e5bef6f0-fe24-11ef-b7fc-06822b500091',
        EventId: 'PostTable-DELETE_IN_PROGRESS-2025-03-11T03:05:53.657Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R',
        LogicalResourceId: 'PostTable',
        PhysicalResourceId: 'Post-ezabg7fk2jecvodrblowtgbsme-NONE',
        ResourceType: 'Custom::AmplifyDynamoDBTable',
        Timestamp: new Date('2025-03-11T03:05:53.657'),
        ResourceStatus: 'DELETE_IN_PROGRESS',
        ResourceProperties:
          '{"ServiceToken":"arn:aws:lambda:us-west-2:123456789012:function:amplify-sampleprojectapp--TableManagerCustomProvid-ejRomWhpK7wD","globalSecondaryIndexes":[{"indexName":"postsByAuthorName","keySchema":[{"attributeName":"authorName","keyType":"HASH"}],"projection":{"projectionType":"ALL"}},{"indexName":"gsi-Person.authoredPosts","keySchema":[{"attributeName":"authorName","keyType":"HASH"},{"attributeName":"authorDoB","keyType":"RANGE"}],"projection":{"projectionType":"ALL"}}],"streamSpecification":{"streamViewType":"NEW_AND_OLD_IMAGES"},"billingMode":"PAY_PER_REQUEST","attributeDefinitions":[{"attributeType":"S","attributeName":"id"},{"attributeType":"S","attributeName":"authorName"},{"attributeType":"S","attributeName":"authorDoB"}],"keySchema":[{"attributeName":"id","keyType":"HASH"}],"replaceTableUponGsiUpdate":"true","allowDestructiveGraphqlSchemaUpdates":"true","tableName":"Post-ezabg7fk2jecvodrblowtgbsme-NONE","sseSpecification":{"sseEnabled":"true"}}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'PostTable',
        },
        constructPath: 'data/amplifyData/Post/PostTable/Default/Default',
      },
      progress: {
        completed: 97,
        formatted: ' 97',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R |  97 | 11:05:53 PM | DELETE_IN_PROGRESS | AWS::IAM::Role | data/amplifyData/Post/PostIAMRole (PostIAMRole83BF708F)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R/e5bef6f0-fe24-11ef-b7fc-06822b500091',
        EventId:
          'PostIAMRole83BF708F-DELETE_IN_PROGRESS-2025-03-11T03:05:53.667Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R',
        LogicalResourceId: 'PostIAMRole83BF708F',
        PhysicalResourceId: 'PostIAMRolebbce9b-ezabg7fk2jecvodrblowtgbsme-NONE',
        ResourceType: 'AWS::IAM::Role',
        Timestamp: new Date('2025-03-11T03:05:53.667'),
        ResourceStatus: 'DELETE_IN_PROGRESS',
        ResourceProperties:
          '{"RoleName":"PostIAMRolebbce9b-ezabg7fk2jecvodrblowtgbsme-NONE","Policies":[{"PolicyName":"DynamoDBAccess","PolicyDocument":{"Version":"2012-10-17","Statement":[{"Action":["dynamodb:BatchGetItem","dynamodb:BatchWriteItem","dynamodb:PutItem","dynamodb:DeleteItem","dynamodb:GetItem","dynamodb:Scan","dynamodb:Query","dynamodb:UpdateItem","dynamodb:ConditionCheckItem","dynamodb:DescribeTable","dynamodb:GetRecords","dynamodb:GetShardIterator"],"Resource":["arn:aws:dynamodb:us-west-2:123456789012:table/Post-ezabg7fk2jecvodrblowtgbsme-NONE","arn:aws:dynamodb:us-west-2:123456789012:table/Post-ezabg7fk2jecvodrblowtgbsme-NONE/*"],"Effect":"Allow"}]}}],"AssumeRolePolicyDocument":{"Version":"2012-10-17","Statement":[{"Action":"sts:AssumeRole","Effect":"Allow","Principal":{"Service":"appsync.amazonaws.com"}}]},"Tags":[{"Value":"sandbox","Key":"amplify:deployment-type"},{"Value":"amplifyData","Key":"amplify:friendly-name"},{"Value":"amplify","Key":"created-by"}]}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'PostIAMRole83BF708F',
        },
        constructPath: 'data/amplifyData/Post/PostIAMRole',
      },
      progress: {
        completed: 97,
        formatted: ' 97',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB |  97 | 11:05:53 PM | DELETE_IN_PROGRESS | AWS::AppSync::FunctionConfiguration | data/amplifyData/Person/MutationdeletePersonpostAuth0Function/MutationdeletePersonpostAuth0Function.AppSyncFunction (MutationdeletePersonpostAuth0FunctionMutationdeletePersonpostAuth0FunctionAppSyncFunction178DC157)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB/e5b11440-fe24-11ef-98e6-0abc8a28bbed',
        EventId:
          'MutationdeletePersonpostAuth0FunctionMutationdeletePersonpostAuth0FunctionAppSyncFunction178DC157-DELETE_IN_PROGRESS-2025-03-11T03:05:53.871Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB',
        LogicalResourceId:
          'MutationdeletePersonpostAuth0FunctionMutationdeletePersonpostAuth0FunctionAppSyncFunction178DC157',
        PhysicalResourceId:
          'arn:aws:appsync:us-west-2:123456789012:apis/ezabg7fk2jecvodrblowtgbsme/functions/4t65yjjtgrer3gyv2yvx4sjqwa',
        ResourceType: 'AWS::AppSync::FunctionConfiguration',
        Timestamp: new Date('2025-03-11T03:05:53.871'),
        ResourceStatus: 'DELETE_IN_PROGRESS',
        ResourceProperties:
          '{"DataSourceName":"NONE_DS","ResponseMappingTemplate":"$util.toJson({})","FunctionVersion":"2018-05-29","RequestMappingTemplateS3Location":"s3://cdk-hnb659fds-assets-123456789012-us-west-2/c1721bcd774e27c514d3454b5be4f9bdd094c0161b57ddf053d618e3b0086a77.vtl","ApiId":"ezabg7fk2jecvodrblowtgbsme","Name":"MutationdeletePersonpostAuth0Function"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'MutationdeletePersonpostAuth0FunctionMutationdeletePersonpostAuth0FunctionAppSyncFunction178DC157',
        },
        constructPath:
          'data/amplifyData/Person/MutationdeletePersonpostAuth0Function/MutationdeletePersonpostAuth0Function.AppSyncFunction',
      },
      progress: {
        completed: 97,
        formatted: ' 97',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB |  97 | 11:05:53 PM | DELETE_IN_PROGRESS | AWS::AppSync::FunctionConfiguration | data/amplifyData/Person/MutationdeletePersonauth0Function/MutationdeletePersonauth0Function.AppSyncFunction (MutationdeletePersonauth0FunctionMutationdeletePersonauth0FunctionAppSyncFunction226CC37B)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB/e5b11440-fe24-11ef-98e6-0abc8a28bbed',
        EventId:
          'MutationdeletePersonauth0FunctionMutationdeletePersonauth0FunctionAppSyncFunction226CC37B-DELETE_IN_PROGRESS-2025-03-11T03:05:53.882Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB',
        LogicalResourceId:
          'MutationdeletePersonauth0FunctionMutationdeletePersonauth0FunctionAppSyncFunction226CC37B',
        PhysicalResourceId:
          'arn:aws:appsync:us-west-2:123456789012:apis/ezabg7fk2jecvodrblowtgbsme/functions/nf25vwky2beofdyqls3l43y4mm',
        ResourceType: 'AWS::AppSync::FunctionConfiguration',
        Timestamp: new Date('2025-03-11T03:05:53.882'),
        ResourceStatus: 'DELETE_IN_PROGRESS',
        ResourceProperties:
          '{"ResponseMappingTemplateS3Location":"s3://cdk-hnb659fds-assets-123456789012-us-west-2/29e4bdb03133f87f2b1acb547959ffd4cfd22804026994c5b61db33084127353.vtl","DataSourceName":"PersonTable","FunctionVersion":"2018-05-29","RequestMappingTemplateS3Location":"s3://cdk-hnb659fds-assets-123456789012-us-west-2/1f5fed297da9c32ae3af922bf3a38ccf23b956078887d16891ec06c20c64722c.vtl","ApiId":"ezabg7fk2jecvodrblowtgbsme","Name":"MutationdeletePersonauth0Function"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'MutationdeletePersonauth0FunctionMutationdeletePersonauth0FunctionAppSyncFunction226CC37B',
        },
        constructPath:
          'data/amplifyData/Person/MutationdeletePersonauth0Function/MutationdeletePersonauth0Function.AppSyncFunction',
      },
      progress: {
        completed: 97,
        formatted: ' 97',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB |  97 | 11:05:53 PM | DELETE_IN_PROGRESS | AWS::AppSync::FunctionConfiguration | data/amplifyData/Person/MutationDeletePersonDataResolverFn/MutationDeletePersonDataResolverFn.AppSyncFunction (MutationDeletePersonDataResolverFnMutationDeletePersonDataResolverFnAppSyncFunctionB6FC28BE)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB/e5b11440-fe24-11ef-98e6-0abc8a28bbed',
        EventId:
          'MutationDeletePersonDataResolverFnMutationDeletePersonDataResolverFnAppSyncFunctionB6FC28BE-DELETE_IN_PROGRESS-2025-03-11T03:05:53.895Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB',
        LogicalResourceId:
          'MutationDeletePersonDataResolverFnMutationDeletePersonDataResolverFnAppSyncFunctionB6FC28BE',
        PhysicalResourceId:
          'arn:aws:appsync:us-west-2:123456789012:apis/ezabg7fk2jecvodrblowtgbsme/functions/q3wd2u6gazbqxdlkvcfjqvqo2e',
        ResourceType: 'AWS::AppSync::FunctionConfiguration',
        Timestamp: new Date('2025-03-11T03:05:53.895'),
        ResourceStatus: 'DELETE_IN_PROGRESS',
        ResourceProperties:
          '{"ResponseMappingTemplateS3Location":"s3://cdk-hnb659fds-assets-123456789012-us-west-2/f4a52b72209a9dfa197b5e7367a5c378c5bb86de6e29ddd9e48b49a3fe54b249.vtl","DataSourceName":"PersonTable","FunctionVersion":"2018-05-29","RequestMappingTemplateS3Location":"s3://cdk-hnb659fds-assets-123456789012-us-west-2/4f7907d1209a2c9953a0c053df402c634e359546d70c7cc5c2e8e21ea734880f.vtl","ApiId":"ezabg7fk2jecvodrblowtgbsme","Name":"MutationDeletePersonDataResolverFn"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'MutationDeletePersonDataResolverFnMutationDeletePersonDataResolverFnAppSyncFunctionB6FC28BE',
        },
        constructPath:
          'data/amplifyData/Person/MutationDeletePersonDataResolverFn/MutationDeletePersonDataResolverFn.AppSyncFunction',
      },
      progress: {
        completed: 97,
        formatted: ' 97',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB |  97 | 11:05:53 PM | DELETE_IN_PROGRESS | AWS::AppSync::FunctionConfiguration | data/amplifyData/Person/MutationdeletePersonpreAuth0Function/MutationdeletePersonpreAuth0Function.AppSyncFunction (MutationdeletePersonpreAuth0FunctionMutationdeletePersonpreAuth0FunctionAppSyncFunction4A91334D)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB/e5b11440-fe24-11ef-98e6-0abc8a28bbed',
        EventId:
          'MutationdeletePersonpreAuth0FunctionMutationdeletePersonpreAuth0FunctionAppSyncFunction4A91334D-DELETE_IN_PROGRESS-2025-03-11T03:05:53.936Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB',
        LogicalResourceId:
          'MutationdeletePersonpreAuth0FunctionMutationdeletePersonpreAuth0FunctionAppSyncFunction4A91334D',
        PhysicalResourceId:
          'arn:aws:appsync:us-west-2:123456789012:apis/ezabg7fk2jecvodrblowtgbsme/functions/ldrtgv7fn5dg7lhfkxrybojlfu',
        ResourceType: 'AWS::AppSync::FunctionConfiguration',
        Timestamp: new Date('2025-03-11T03:05:53.936'),
        ResourceStatus: 'DELETE_IN_PROGRESS',
        ResourceProperties:
          '{"DataSourceName":"NONE_DS","ResponseMappingTemplate":"$util.toJson({})","FunctionVersion":"2018-05-29","RequestMappingTemplateS3Location":"s3://cdk-hnb659fds-assets-123456789012-us-west-2/97e4049e52fffaf523b49966a1225677c0fd7c09e296e1832b5bb95086e5c3e4.vtl","ApiId":"ezabg7fk2jecvodrblowtgbsme","Name":"MutationdeletePersonpreAuth0Function"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'MutationdeletePersonpreAuth0FunctionMutationdeletePersonpreAuth0FunctionAppSyncFunction4A91334D',
        },
        constructPath:
          'data/amplifyData/Person/MutationdeletePersonpreAuth0Function/MutationdeletePersonpreAuth0Function.AppSyncFunction',
      },
      progress: {
        completed: 97,
        formatted: ' 97',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0e1752a889 |  97 | 11:05:53 PM | DELETE_IN_PROGRESS | AWS::CloudFormation::Stack | function.NestedStack/function.NestedStackResource (function1351588B)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0e1752a889/912e40a0-fe24-11ef-ab54-068258314c15',
        EventId: 'function1351588B-DELETE_IN_PROGRESS-2025-03-11T03:05:53.957Z',
        StackName: 'amplify-sampleprojectapp-user-sandbox-0e1752a889',
        LogicalResourceId: 'function1351588B',
        PhysicalResourceId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0e1752a889-function1351588B-K1KSYX88PE55/96d9ab20-fe24-11ef-ade0-0ac4f18960c3',
        ResourceType: 'AWS::CloudFormation::Stack',
        Timestamp: new Date('2025-03-11T03:05:53.957'),
        ResourceStatus: 'DELETE_IN_PROGRESS',
        ResourceProperties:
          '{"TemplateURL":"https://s3.us-west-2.amazonaws.com/cdk-hnb659fds-assets-123456789012-us-west-2/5065dd0842feb96b950d214ec1e2f9faabd3ad868f6d75d5d999b56e9327c4d6.json","Tags":[{"Value":"sandbox","Key":"amplify:deployment-type"},{"Value":"amplify","Key":"created-by"}]}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'function1351588B',
        },
        constructPath: 'function.NestedStack/function.NestedStackResource',
      },
      progress: {
        completed: 97,
        formatted: ' 97',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0e1752a889-function1351588B-K1KSYX88PE55 |  97 | 11:05:54 PM | DELETE_IN_PROGRESS | AWS::CloudFormation::Stack | amplify-sampleprojectapp-user-sandbox-0e1752a889-function1351588B-K1KSYX88PE55 User Initiated',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0e1752a889-function1351588B-K1KSYX88PE55/96d9ab20-fe24-11ef-ade0-0ac4f18960c3',
        EventId: 'befcfa70-fe25-11ef-bebd-067959341ccd',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0e1752a889-function1351588B-K1KSYX88PE55',
        LogicalResourceId:
          'amplify-sampleprojectapp-user-sandbox-0e1752a889-function1351588B-K1KSYX88PE55',
        PhysicalResourceId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0e1752a889-function1351588B-K1KSYX88PE55/96d9ab20-fe24-11ef-ade0-0ac4f18960c3',
        ResourceType: 'AWS::CloudFormation::Stack',
        Timestamp: new Date('2025-03-11T03:05:54.312'),
        ResourceStatus: 'DELETE_IN_PROGRESS',
        ResourceStatusReason: 'User Initiated',
      },
      progress: {
        completed: 97,
        formatted: ' 97',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB |  98 | 11:05:54 PM | DELETE_COMPLETE | AWS::AppSync::FunctionConfiguration | data/amplifyData/Person/SubscriptiononCreatePersonpostAuth0Function/SubscriptiononCreatePersonpostAuth0Function.AppSyncFunction (SubscriptiononCreatePersonpostAuth0FunctionSubscriptiononCreatePersonpostAuth0FunctionAppSyncFunction5919295E)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB/e5b11440-fe24-11ef-98e6-0abc8a28bbed',
        EventId:
          'SubscriptiononCreatePersonpostAuth0FunctionSubscriptiononCreatePersonpostAuth0FunctionAppSyncFunction5919295E-DELETE_COMPLETE-2025-03-11T03:05:54.873Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB',
        LogicalResourceId:
          'SubscriptiononCreatePersonpostAuth0FunctionSubscriptiononCreatePersonpostAuth0FunctionAppSyncFunction5919295E',
        PhysicalResourceId:
          'arn:aws:appsync:us-west-2:123456789012:apis/ezabg7fk2jecvodrblowtgbsme/functions/zd37h5lkzvf4lkimvnuzml3ady',
        ResourceType: 'AWS::AppSync::FunctionConfiguration',
        Timestamp: new Date('2025-03-11T03:05:54.873'),
        ResourceStatus: 'DELETE_COMPLETE',
        ResourceProperties:
          '{"DataSourceName":"NONE_DS","ResponseMappingTemplate":"$util.toJson({})","FunctionVersion":"2018-05-29","RequestMappingTemplateS3Location":"s3://cdk-hnb659fds-assets-123456789012-us-west-2/c1721bcd774e27c514d3454b5be4f9bdd094c0161b57ddf053d618e3b0086a77.vtl","ApiId":"ezabg7fk2jecvodrblowtgbsme","Name":"SubscriptiononCreatePersonpostAuth0Function"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'SubscriptiononCreatePersonpostAuth0FunctionSubscriptiononCreatePersonpostAuth0FunctionAppSyncFunction5919295E',
        },
        constructPath:
          'data/amplifyData/Person/SubscriptiononCreatePersonpostAuth0Function/SubscriptiononCreatePersonpostAuth0Function.AppSyncFunction',
      },
      progress: {
        completed: 98,
        formatted: ' 98',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB |  99 | 11:05:54 PM | DELETE_COMPLETE | AWS::AppSync::FunctionConfiguration | data/amplifyData/Person/MutationdeletePersonpostAuth0Function/MutationdeletePersonpostAuth0Function.AppSyncFunction (MutationdeletePersonpostAuth0FunctionMutationdeletePersonpostAuth0FunctionAppSyncFunction178DC157)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB/e5b11440-fe24-11ef-98e6-0abc8a28bbed',
        EventId:
          'MutationdeletePersonpostAuth0FunctionMutationdeletePersonpostAuth0FunctionAppSyncFunction178DC157-DELETE_COMPLETE-2025-03-11T03:05:54.960Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB',
        LogicalResourceId:
          'MutationdeletePersonpostAuth0FunctionMutationdeletePersonpostAuth0FunctionAppSyncFunction178DC157',
        PhysicalResourceId:
          'arn:aws:appsync:us-west-2:123456789012:apis/ezabg7fk2jecvodrblowtgbsme/functions/4t65yjjtgrer3gyv2yvx4sjqwa',
        ResourceType: 'AWS::AppSync::FunctionConfiguration',
        Timestamp: new Date('2025-03-11T03:05:54.960'),
        ResourceStatus: 'DELETE_COMPLETE',
        ResourceProperties:
          '{"DataSourceName":"NONE_DS","ResponseMappingTemplate":"$util.toJson({})","FunctionVersion":"2018-05-29","RequestMappingTemplateS3Location":"s3://cdk-hnb659fds-assets-123456789012-us-west-2/c1721bcd774e27c514d3454b5be4f9bdd094c0161b57ddf053d618e3b0086a77.vtl","ApiId":"ezabg7fk2jecvodrblowtgbsme","Name":"MutationdeletePersonpostAuth0Function"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'MutationdeletePersonpostAuth0FunctionMutationdeletePersonpostAuth0FunctionAppSyncFunction178DC157',
        },
        constructPath:
          'data/amplifyData/Person/MutationdeletePersonpostAuth0Function/MutationdeletePersonpostAuth0Function.AppSyncFunction',
      },
      progress: {
        completed: 99,
        formatted: ' 99',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB | 100 | 11:05:54 PM | DELETE_COMPLETE | AWS::AppSync::FunctionConfiguration | data/amplifyData/Person/MutationDeletePersonDataResolverFn/MutationDeletePersonDataResolverFn.AppSyncFunction (MutationDeletePersonDataResolverFnMutationDeletePersonDataResolverFnAppSyncFunctionB6FC28BE)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB/e5b11440-fe24-11ef-98e6-0abc8a28bbed',
        EventId:
          'MutationDeletePersonDataResolverFnMutationDeletePersonDataResolverFnAppSyncFunctionB6FC28BE-DELETE_COMPLETE-2025-03-11T03:05:54.960Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB',
        LogicalResourceId:
          'MutationDeletePersonDataResolverFnMutationDeletePersonDataResolverFnAppSyncFunctionB6FC28BE',
        PhysicalResourceId:
          'arn:aws:appsync:us-west-2:123456789012:apis/ezabg7fk2jecvodrblowtgbsme/functions/q3wd2u6gazbqxdlkvcfjqvqo2e',
        ResourceType: 'AWS::AppSync::FunctionConfiguration',
        Timestamp: new Date('2025-03-11T03:05:54.960'),
        ResourceStatus: 'DELETE_COMPLETE',
        ResourceProperties:
          '{"ResponseMappingTemplateS3Location":"s3://cdk-hnb659fds-assets-123456789012-us-west-2/f4a52b72209a9dfa197b5e7367a5c378c5bb86de6e29ddd9e48b49a3fe54b249.vtl","DataSourceName":"PersonTable","FunctionVersion":"2018-05-29","RequestMappingTemplateS3Location":"s3://cdk-hnb659fds-assets-123456789012-us-west-2/4f7907d1209a2c9953a0c053df402c634e359546d70c7cc5c2e8e21ea734880f.vtl","ApiId":"ezabg7fk2jecvodrblowtgbsme","Name":"MutationDeletePersonDataResolverFn"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'MutationDeletePersonDataResolverFnMutationDeletePersonDataResolverFnAppSyncFunctionB6FC28BE',
        },
        constructPath:
          'data/amplifyData/Person/MutationDeletePersonDataResolverFn/MutationDeletePersonDataResolverFn.AppSyncFunction',
      },
      progress: {
        completed: 100,
        formatted: '100',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB | 101 | 11:05:55 PM | DELETE_COMPLETE | AWS::AppSync::FunctionConfiguration | data/amplifyData/Person/MutationdeletePersonauth0Function/MutationdeletePersonauth0Function.AppSyncFunction (MutationdeletePersonauth0FunctionMutationdeletePersonauth0FunctionAppSyncFunction226CC37B)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB/e5b11440-fe24-11ef-98e6-0abc8a28bbed',
        EventId:
          'MutationdeletePersonauth0FunctionMutationdeletePersonauth0FunctionAppSyncFunction226CC37B-DELETE_COMPLETE-2025-03-11T03:05:55.014Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB',
        LogicalResourceId:
          'MutationdeletePersonauth0FunctionMutationdeletePersonauth0FunctionAppSyncFunction226CC37B',
        PhysicalResourceId:
          'arn:aws:appsync:us-west-2:123456789012:apis/ezabg7fk2jecvodrblowtgbsme/functions/nf25vwky2beofdyqls3l43y4mm',
        ResourceType: 'AWS::AppSync::FunctionConfiguration',
        Timestamp: new Date('2025-03-11T03:05:55.014'),
        ResourceStatus: 'DELETE_COMPLETE',
        ResourceProperties:
          '{"ResponseMappingTemplateS3Location":"s3://cdk-hnb659fds-assets-123456789012-us-west-2/29e4bdb03133f87f2b1acb547959ffd4cfd22804026994c5b61db33084127353.vtl","DataSourceName":"PersonTable","FunctionVersion":"2018-05-29","RequestMappingTemplateS3Location":"s3://cdk-hnb659fds-assets-123456789012-us-west-2/1f5fed297da9c32ae3af922bf3a38ccf23b956078887d16891ec06c20c64722c.vtl","ApiId":"ezabg7fk2jecvodrblowtgbsme","Name":"MutationdeletePersonauth0Function"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'MutationdeletePersonauth0FunctionMutationdeletePersonauth0FunctionAppSyncFunction226CC37B',
        },
        constructPath:
          'data/amplifyData/Person/MutationdeletePersonauth0Function/MutationdeletePersonauth0Function.AppSyncFunction',
      },
      progress: {
        completed: 101,
        formatted: '101',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB | 102 | 11:05:55 PM | DELETE_COMPLETE | AWS::AppSync::FunctionConfiguration | data/amplifyData/Person/QueryListPeopleDataResolverFn/QueryListPeopleDataResolverFn.AppSyncFunction (QueryListPeopleDataResolverFnQueryListPeopleDataResolverFnAppSyncFunction7527A154)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB/e5b11440-fe24-11ef-98e6-0abc8a28bbed',
        EventId:
          'QueryListPeopleDataResolverFnQueryListPeopleDataResolverFnAppSyncFunction7527A154-DELETE_COMPLETE-2025-03-11T03:05:55.125Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB',
        LogicalResourceId:
          'QueryListPeopleDataResolverFnQueryListPeopleDataResolverFnAppSyncFunction7527A154',
        PhysicalResourceId:
          'arn:aws:appsync:us-west-2:123456789012:apis/ezabg7fk2jecvodrblowtgbsme/functions/nbxjndnqqzconosf5uqiaqqbwe',
        ResourceType: 'AWS::AppSync::FunctionConfiguration',
        Timestamp: new Date('2025-03-11T03:05:55.125'),
        ResourceStatus: 'DELETE_COMPLETE',
        ResourceProperties:
          '{"ResponseMappingTemplateS3Location":"s3://cdk-hnb659fds-assets-123456789012-us-west-2/cc01911d0269d4080ea57505dc445dfc315ef7ad85d3d9d4ea1357858bff451d.vtl","DataSourceName":"PersonTable","FunctionVersion":"2018-05-29","RequestMappingTemplateS3Location":"s3://cdk-hnb659fds-assets-123456789012-us-west-2/9fcbe070ecd3023c5bf5b966fa9584757db9762eef123bad0820bd87591b2174.vtl","ApiId":"ezabg7fk2jecvodrblowtgbsme","Name":"QueryListPeopleDataResolverFn"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'QueryListPeopleDataResolverFnQueryListPeopleDataResolverFnAppSyncFunction7527A154',
        },
        constructPath:
          'data/amplifyData/Person/QueryListPeopleDataResolverFn/QueryListPeopleDataResolverFn.AppSyncFunction',
      },
      progress: {
        completed: 102,
        formatted: '102',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R | 103 | 11:05:55 PM | DELETE_COMPLETE | AWS::AppSync::FunctionConfiguration | data/amplifyData/Post/QuerylistPostByAuthorNameauth0Function/QuerylistPostByAuthorNameauth0Function.AppSyncFunction (QuerylistPostByAuthorNameauth0FunctionQuerylistPostByAuthorNameauth0FunctionAppSyncFunction06AD9EED)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R/e5bef6f0-fe24-11ef-b7fc-06822b500091',
        EventId:
          'QuerylistPostByAuthorNameauth0FunctionQuerylistPostByAuthorNameauth0FunctionAppSyncFunction06AD9EED-DELETE_COMPLETE-2025-03-11T03:05:55.147Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R',
        LogicalResourceId:
          'QuerylistPostByAuthorNameauth0FunctionQuerylistPostByAuthorNameauth0FunctionAppSyncFunction06AD9EED',
        PhysicalResourceId:
          'arn:aws:appsync:us-west-2:123456789012:apis/ezabg7fk2jecvodrblowtgbsme/functions/nh4b4ttgorhm3ndystgvvgue5i',
        ResourceType: 'AWS::AppSync::FunctionConfiguration',
        Timestamp: new Date('2025-03-11T03:05:55.147'),
        ResourceStatus: 'DELETE_COMPLETE',
        ResourceProperties:
          '{"DataSourceName":"NONE_DS","ResponseMappingTemplate":"$util.toJson({})","FunctionVersion":"2018-05-29","RequestMappingTemplateS3Location":"s3://cdk-hnb659fds-assets-123456789012-us-west-2/88d5b7081b0dc9c39fd0bffedf56f011b2a7cf1ce5cc227f47a1e94efee8067c.vtl","ApiId":"ezabg7fk2jecvodrblowtgbsme","Name":"QuerylistPostByAuthorNameauth0Function"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'QuerylistPostByAuthorNameauth0FunctionQuerylistPostByAuthorNameauth0FunctionAppSyncFunction06AD9EED',
        },
        constructPath:
          'data/amplifyData/Post/QuerylistPostByAuthorNameauth0Function/QuerylistPostByAuthorNameauth0Function.AppSyncFunction',
      },
      progress: {
        completed: 103,
        formatted: '103',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB | 104 | 11:05:55 PM | DELETE_COMPLETE | AWS::AppSync::FunctionConfiguration | data/amplifyData/Person/MutationdeletePersonpreAuth0Function/MutationdeletePersonpreAuth0Function.AppSyncFunction (MutationdeletePersonpreAuth0FunctionMutationdeletePersonpreAuth0FunctionAppSyncFunction4A91334D)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB/e5b11440-fe24-11ef-98e6-0abc8a28bbed',
        EventId:
          'MutationdeletePersonpreAuth0FunctionMutationdeletePersonpreAuth0FunctionAppSyncFunction4A91334D-DELETE_COMPLETE-2025-03-11T03:05:55.154Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB',
        LogicalResourceId:
          'MutationdeletePersonpreAuth0FunctionMutationdeletePersonpreAuth0FunctionAppSyncFunction4A91334D',
        PhysicalResourceId:
          'arn:aws:appsync:us-west-2:123456789012:apis/ezabg7fk2jecvodrblowtgbsme/functions/ldrtgv7fn5dg7lhfkxrybojlfu',
        ResourceType: 'AWS::AppSync::FunctionConfiguration',
        Timestamp: new Date('2025-03-11T03:05:55.154'),
        ResourceStatus: 'DELETE_COMPLETE',
        ResourceProperties:
          '{"DataSourceName":"NONE_DS","ResponseMappingTemplate":"$util.toJson({})","FunctionVersion":"2018-05-29","RequestMappingTemplateS3Location":"s3://cdk-hnb659fds-assets-123456789012-us-west-2/97e4049e52fffaf523b49966a1225677c0fd7c09e296e1832b5bb95086e5c3e4.vtl","ApiId":"ezabg7fk2jecvodrblowtgbsme","Name":"MutationdeletePersonpreAuth0Function"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'MutationdeletePersonpreAuth0FunctionMutationdeletePersonpreAuth0FunctionAppSyncFunction4A91334D',
        },
        constructPath:
          'data/amplifyData/Person/MutationdeletePersonpreAuth0Function/MutationdeletePersonpreAuth0Function.AppSyncFunction',
      },
      progress: {
        completed: 104,
        formatted: '104',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB | 105 | 11:05:55 PM | DELETE_COMPLETE | AWS::AppSync::FunctionConfiguration | data/amplifyData/Person/QuerygetPersonauth0Function/QuerygetPersonauth0Function.AppSyncFunction (QuerygetPersonauth0FunctionQuerygetPersonauth0FunctionAppSyncFunction6DF9D0C4)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB/e5b11440-fe24-11ef-98e6-0abc8a28bbed',
        EventId:
          'QuerygetPersonauth0FunctionQuerygetPersonauth0FunctionAppSyncFunction6DF9D0C4-DELETE_COMPLETE-2025-03-11T03:05:55.274Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB',
        LogicalResourceId:
          'QuerygetPersonauth0FunctionQuerygetPersonauth0FunctionAppSyncFunction6DF9D0C4',
        PhysicalResourceId:
          'arn:aws:appsync:us-west-2:123456789012:apis/ezabg7fk2jecvodrblowtgbsme/functions/j7ma7m72dzbbxlvwxnswquvp7m',
        ResourceType: 'AWS::AppSync::FunctionConfiguration',
        Timestamp: new Date('2025-03-11T03:05:55.274'),
        ResourceStatus: 'DELETE_COMPLETE',
        ResourceProperties:
          '{"DataSourceName":"NONE_DS","ResponseMappingTemplate":"$util.toJson({})","FunctionVersion":"2018-05-29","RequestMappingTemplateS3Location":"s3://cdk-hnb659fds-assets-123456789012-us-west-2/88d5b7081b0dc9c39fd0bffedf56f011b2a7cf1ce5cc227f47a1e94efee8067c.vtl","ApiId":"ezabg7fk2jecvodrblowtgbsme","Name":"QuerygetPersonauth0Function"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'QuerygetPersonauth0FunctionQuerygetPersonauth0FunctionAppSyncFunction6DF9D0C4',
        },
        constructPath:
          'data/amplifyData/Person/QuerygetPersonauth0Function/QuerygetPersonauth0Function.AppSyncFunction',
      },
      progress: {
        completed: 105,
        formatted: '105',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB | 106 | 11:05:55 PM | DELETE_COMPLETE | AWS::AppSync::FunctionConfiguration | data/amplifyData/Person/MutationcreatePersonpreAuth0Function/MutationcreatePersonpreAuth0Function.AppSyncFunction (MutationcreatePersonpreAuth0FunctionMutationcreatePersonpreAuth0FunctionAppSyncFunction335C1A9F)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB/e5b11440-fe24-11ef-98e6-0abc8a28bbed',
        EventId:
          'MutationcreatePersonpreAuth0FunctionMutationcreatePersonpreAuth0FunctionAppSyncFunction335C1A9F-DELETE_COMPLETE-2025-03-11T03:05:55.324Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB',
        LogicalResourceId:
          'MutationcreatePersonpreAuth0FunctionMutationcreatePersonpreAuth0FunctionAppSyncFunction335C1A9F',
        PhysicalResourceId:
          'arn:aws:appsync:us-west-2:123456789012:apis/ezabg7fk2jecvodrblowtgbsme/functions/noijgh2g7venfeqfik4qgptz54',
        ResourceType: 'AWS::AppSync::FunctionConfiguration',
        Timestamp: new Date('2025-03-11T03:05:55.324'),
        ResourceStatus: 'DELETE_COMPLETE',
        ResourceProperties:
          '{"DataSourceName":"NONE_DS","ResponseMappingTemplate":"$util.toJson({})","FunctionVersion":"2018-05-29","RequestMappingTemplateS3Location":"s3://cdk-hnb659fds-assets-123456789012-us-west-2/fface358117b1edafc4dbe09854c750ff9d1cad2ab9aed9cff18b5df478d3d5d.vtl","ApiId":"ezabg7fk2jecvodrblowtgbsme","Name":"MutationcreatePersonpreAuth0Function"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'MutationcreatePersonpreAuth0FunctionMutationcreatePersonpreAuth0FunctionAppSyncFunction335C1A9F',
        },
        constructPath:
          'data/amplifyData/Person/MutationcreatePersonpreAuth0Function/MutationcreatePersonpreAuth0Function.AppSyncFunction',
      },
      progress: {
        completed: 106,
        formatted: '106',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R | 107 | 11:05:55 PM | DELETE_COMPLETE | AWS::AppSync::FunctionConfiguration | data/amplifyData/Post/MutationcreatePostauth0Function/MutationcreatePostauth0Function.AppSyncFunction (MutationcreatePostauth0FunctionMutationcreatePostauth0FunctionAppSyncFunctionF347AB28)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R/e5bef6f0-fe24-11ef-b7fc-06822b500091',
        EventId:
          'MutationcreatePostauth0FunctionMutationcreatePostauth0FunctionAppSyncFunctionF347AB28-DELETE_COMPLETE-2025-03-11T03:05:55.375Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R',
        LogicalResourceId:
          'MutationcreatePostauth0FunctionMutationcreatePostauth0FunctionAppSyncFunctionF347AB28',
        PhysicalResourceId:
          'arn:aws:appsync:us-west-2:123456789012:apis/ezabg7fk2jecvodrblowtgbsme/functions/fo2zebakl5fgfe5kc447qiduti',
        ResourceType: 'AWS::AppSync::FunctionConfiguration',
        Timestamp: new Date('2025-03-11T03:05:55.375'),
        ResourceStatus: 'DELETE_COMPLETE',
        ResourceProperties:
          '{"DataSourceName":"NONE_DS","ResponseMappingTemplate":"$util.toJson({})","FunctionVersion":"2018-05-29","RequestMappingTemplateS3Location":"s3://cdk-hnb659fds-assets-123456789012-us-west-2/b371d68ddfbdd11b176756ce33b2c4e79d26fcc2fd4b7c0c9e75d06efacee90e.vtl","ApiId":"ezabg7fk2jecvodrblowtgbsme","Name":"MutationcreatePostauth0Function"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'MutationcreatePostauth0FunctionMutationcreatePostauth0FunctionAppSyncFunctionF347AB28',
        },
        constructPath:
          'data/amplifyData/Post/MutationcreatePostauth0Function/MutationcreatePostauth0Function.AppSyncFunction',
      },
      progress: {
        completed: 107,
        formatted: '107',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB | 108 | 11:05:55 PM | DELETE_COMPLETE | AWS::AppSync::FunctionConfiguration | data/amplifyData/Person/MutationupdatePersonpostAuth0Function/MutationupdatePersonpostAuth0Function.AppSyncFunction (MutationupdatePersonpostAuth0FunctionMutationupdatePersonpostAuth0FunctionAppSyncFunctionB321A1F7)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB/e5b11440-fe24-11ef-98e6-0abc8a28bbed',
        EventId:
          'MutationupdatePersonpostAuth0FunctionMutationupdatePersonpostAuth0FunctionAppSyncFunctionB321A1F7-DELETE_COMPLETE-2025-03-11T03:05:55.392Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB',
        LogicalResourceId:
          'MutationupdatePersonpostAuth0FunctionMutationupdatePersonpostAuth0FunctionAppSyncFunctionB321A1F7',
        PhysicalResourceId:
          'arn:aws:appsync:us-west-2:123456789012:apis/ezabg7fk2jecvodrblowtgbsme/functions/iyqtinipsfbsrlrhgb62o7llf4',
        ResourceType: 'AWS::AppSync::FunctionConfiguration',
        Timestamp: new Date('2025-03-11T03:05:55.392'),
        ResourceStatus: 'DELETE_COMPLETE',
        ResourceProperties:
          '{"DataSourceName":"NONE_DS","ResponseMappingTemplate":"$util.toJson({})","FunctionVersion":"2018-05-29","RequestMappingTemplateS3Location":"s3://cdk-hnb659fds-assets-123456789012-us-west-2/c1721bcd774e27c514d3454b5be4f9bdd094c0161b57ddf053d618e3b0086a77.vtl","ApiId":"ezabg7fk2jecvodrblowtgbsme","Name":"MutationupdatePersonpostAuth0Function"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'MutationupdatePersonpostAuth0FunctionMutationupdatePersonpostAuth0FunctionAppSyncFunctionB321A1F7',
        },
        constructPath:
          'data/amplifyData/Person/MutationupdatePersonpostAuth0Function/MutationupdatePersonpostAuth0Function.AppSyncFunction',
      },
      progress: {
        completed: 108,
        formatted: '108',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R | 109 | 11:05:55 PM | DELETE_COMPLETE | AWS::AppSync::FunctionConfiguration | data/amplifyData/Post/SubscriptionOnDeletePostDataResolverFn/SubscriptionOnDeletePostDataResolverFn.AppSyncFunction (SubscriptionOnDeletePostDataResolverFnSubscriptionOnDeletePostDataResolverFnAppSyncFunction9D84E829)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R/e5bef6f0-fe24-11ef-b7fc-06822b500091',
        EventId:
          'SubscriptionOnDeletePostDataResolverFnSubscriptionOnDeletePostDataResolverFnAppSyncFunction9D84E829-DELETE_COMPLETE-2025-03-11T03:05:55.392Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R',
        LogicalResourceId:
          'SubscriptionOnDeletePostDataResolverFnSubscriptionOnDeletePostDataResolverFnAppSyncFunction9D84E829',
        PhysicalResourceId:
          'arn:aws:appsync:us-west-2:123456789012:apis/ezabg7fk2jecvodrblowtgbsme/functions/27v6y4gs7fgyxdfidakwt5l2ei',
        ResourceType: 'AWS::AppSync::FunctionConfiguration',
        Timestamp: new Date('2025-03-11T03:05:55.392'),
        ResourceStatus: 'DELETE_COMPLETE',
        ResourceProperties:
          '{"ResponseMappingTemplateS3Location":"s3://cdk-hnb659fds-assets-123456789012-us-west-2/e0cff47fb007f0bbf2a4e43ca256d6aa7ec109821769fd79fa7c5e83f0e7f9fc.vtl","DataSourceName":"NONE_DS","FunctionVersion":"2018-05-29","RequestMappingTemplateS3Location":"s3://cdk-hnb659fds-assets-123456789012-us-west-2/fe3c43ada4b9d681a5e2312663ef7a73386424d73b73e51f8e2e9d4b50f7c502.vtl","ApiId":"ezabg7fk2jecvodrblowtgbsme","Name":"SubscriptionOnDeletePostDataResolverFn"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'SubscriptionOnDeletePostDataResolverFnSubscriptionOnDeletePostDataResolverFnAppSyncFunction9D84E829',
        },
        constructPath:
          'data/amplifyData/Post/SubscriptionOnDeletePostDataResolverFn/SubscriptionOnDeletePostDataResolverFn.AppSyncFunction',
      },
      progress: {
        completed: 109,
        formatted: '109',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R | 110 | 11:05:55 PM | DELETE_COMPLETE | Custom::AmplifyDynamoDBTable | data/amplifyData/Post/PostTable/Default/Default (PostTable)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R/e5bef6f0-fe24-11ef-b7fc-06822b500091',
        EventId: 'PostTable-DELETE_COMPLETE-2025-03-11T03:05:55.603Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R',
        LogicalResourceId: 'PostTable',
        PhysicalResourceId: 'Post-ezabg7fk2jecvodrblowtgbsme-NONE',
        ResourceType: 'Custom::AmplifyDynamoDBTable',
        Timestamp: new Date('2025-03-11T03:05:55.603'),
        ResourceStatus: 'DELETE_COMPLETE',
        ResourceProperties:
          '{"ServiceToken":"arn:aws:lambda:us-west-2:123456789012:function:amplify-sampleprojectapp--TableManagerCustomProvid-ejRomWhpK7wD","globalSecondaryIndexes":[{"indexName":"postsByAuthorName","keySchema":[{"attributeName":"authorName","keyType":"HASH"}],"projection":{"projectionType":"ALL"}},{"indexName":"gsi-Person.authoredPosts","keySchema":[{"attributeName":"authorName","keyType":"HASH"},{"attributeName":"authorDoB","keyType":"RANGE"}],"projection":{"projectionType":"ALL"}}],"streamSpecification":{"streamViewType":"NEW_AND_OLD_IMAGES"},"billingMode":"PAY_PER_REQUEST","attributeDefinitions":[{"attributeType":"S","attributeName":"id"},{"attributeType":"S","attributeName":"authorName"},{"attributeType":"S","attributeName":"authorDoB"}],"keySchema":[{"attributeName":"id","keyType":"HASH"}],"replaceTableUponGsiUpdate":"true","allowDestructiveGraphqlSchemaUpdates":"true","tableName":"Post-ezabg7fk2jecvodrblowtgbsme-NONE","sseSpecification":{"sseEnabled":"true"}}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'PostTable',
        },
        constructPath: 'data/amplifyData/Post/PostTable/Default/Default',
      },
      progress: {
        completed: 110,
        formatted: '110',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB | 111 | 11:05:55 PM | DELETE_COMPLETE | AWS::AppSync::FunctionConfiguration | data/amplifyData/Person/MutationupdatePersonauth0Function/MutationupdatePersonauth0Function.AppSyncFunction (MutationupdatePersonauth0FunctionMutationupdatePersonauth0FunctionAppSyncFunction36E326CF)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB/e5b11440-fe24-11ef-98e6-0abc8a28bbed',
        EventId:
          'MutationupdatePersonauth0FunctionMutationupdatePersonauth0FunctionAppSyncFunction36E326CF-DELETE_COMPLETE-2025-03-11T03:05:55.724Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB',
        LogicalResourceId:
          'MutationupdatePersonauth0FunctionMutationupdatePersonauth0FunctionAppSyncFunction36E326CF',
        PhysicalResourceId:
          'arn:aws:appsync:us-west-2:123456789012:apis/ezabg7fk2jecvodrblowtgbsme/functions/3dherkbr6rgdrinqosb6vezy7a',
        ResourceType: 'AWS::AppSync::FunctionConfiguration',
        Timestamp: new Date('2025-03-11T03:05:55.724'),
        ResourceStatus: 'DELETE_COMPLETE',
        ResourceProperties:
          '{"ResponseMappingTemplateS3Location":"s3://cdk-hnb659fds-assets-123456789012-us-west-2/245ed8ac5185462a6923b7e45a318fec4c9ba0c45d1d720abd5b20317aa3dc6a.vtl","DataSourceName":"PersonTable","FunctionVersion":"2018-05-29","RequestMappingTemplateS3Location":"s3://cdk-hnb659fds-assets-123456789012-us-west-2/1f5fed297da9c32ae3af922bf3a38ccf23b956078887d16891ec06c20c64722c.vtl","ApiId":"ezabg7fk2jecvodrblowtgbsme","Name":"MutationupdatePersonauth0Function"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'MutationupdatePersonauth0FunctionMutationupdatePersonauth0FunctionAppSyncFunction36E326CF',
        },
        constructPath:
          'data/amplifyData/Person/MutationupdatePersonauth0Function/MutationupdatePersonauth0Function.AppSyncFunction',
      },
      progress: {
        completed: 111,
        formatted: '111',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0e1752a889-function1351588B-K1KSYX88PE55 | 111 | 11:05:56 PM | DELETE_IN_PROGRESS | AWS::CDK::Metadata | auth/CDKMetadata/Default (CDKMetadata)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0e1752a889-function1351588B-K1KSYX88PE55/96d9ab20-fe24-11ef-ade0-0ac4f18960c3',
        EventId: 'CDKMetadata-DELETE_IN_PROGRESS-2025-03-11T03:05:56.085Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0e1752a889-function1351588B-K1KSYX88PE55',
        LogicalResourceId: 'CDKMetadata',
        PhysicalResourceId: '96d9ab20-fe24-11ef-ade0-0ac4f18960c3',
        ResourceType: 'AWS::CDK::Metadata',
        Timestamp: new Date('2025-03-11T03:05:56.085'),
        ResourceStatus: 'DELETE_IN_PROGRESS',
        ResourceProperties:
          '{"Analytics":"v2:deflate64:H4sIAAAAAAAA/zXNOw6DMBBF0bXQDxM+DW1ASkkBC0CDPSDzsSXGDgVi7xGgVKd692WYFhkmEe0SKz3Hi+nxqFk869aTmoF26Y6F1l5TZ53mSbC++QSrvHEWDK14NG5hqAZ7eYLkHYmwF3xfgORYBjWzL0kYnhpWg/03TmhYXNgUwz1oPY3GjidcjzjJ65slmBaYRpMYE2/BerMyNo8/CCaiyMQAAAA="}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'CDKMetadata',
        },
        constructPath: 'auth/CDKMetadata/Default',
      },
      progress: {
        completed: 111,
        formatted: '111',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0e1752a889-function1351588B-K1KSYX88PE55 | 111 | 11:05:56 PM | DELETE_IN_PROGRESS | AWS::IAM::Policy | function/say-hello-lambda/ServiceRole/DefaultPolicy (sayhellolambdaServiceRoleDefaultPolicy4256F36F)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0e1752a889-function1351588B-K1KSYX88PE55/96d9ab20-fe24-11ef-ade0-0ac4f18960c3',
        EventId:
          'sayhellolambdaServiceRoleDefaultPolicy4256F36F-DELETE_IN_PROGRESS-2025-03-11T03:05:56.138Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0e1752a889-function1351588B-K1KSYX88PE55',
        LogicalResourceId: 'sayhellolambdaServiceRoleDefaultPolicy4256F36F',
        PhysicalResourceId: 'ampli-sayhe-WAw11imqDMay',
        ResourceType: 'AWS::IAM::Policy',
        Timestamp: new Date('2025-03-11T03:05:56.138'),
        ResourceStatus: 'DELETE_IN_PROGRESS',
        ResourceProperties:
          '{"PolicyName":"sayhellolambdaServiceRoleDefaultPolicy4256F36F","PolicyDocument":{"Version":"2012-10-17","Statement":[{"Action":"ssm:GetParameters","Resource":"arn:aws:ssm:us-west-2:123456789012:parameter/amplify/resource_reference/sampleprojectapp/user-sandbox-0e1752a889/TEST_NAME_BUCKET_NAME","Effect":"Allow"}]},"Roles":["amplify-sampleprojectapp--sayhellolambdaServiceRole-rTltSNgzZZ60"]}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'sayhellolambdaServiceRoleDefaultPolicy4256F36F',
        },
        constructPath: 'function/say-hello-lambda/ServiceRole/DefaultPolicy',
      },
      progress: {
        completed: 111,
        formatted: '111',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB | 111 | 11:05:56 PM | DELETE_IN_PROGRESS | AWS::AppSync::DataSource | data/amplifyData/Person/PersonDataSource (PersonDataSource)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB/e5b11440-fe24-11ef-98e6-0abc8a28bbed',
        EventId: 'PersonDataSource-DELETE_IN_PROGRESS-2025-03-11T03:05:56.193Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB',
        LogicalResourceId: 'PersonDataSource',
        PhysicalResourceId:
          'arn:aws:appsync:us-west-2:123456789012:apis/ezabg7fk2jecvodrblowtgbsme/datasources/PersonTable',
        ResourceType: 'AWS::AppSync::DataSource',
        Timestamp: new Date('2025-03-11T03:05:56.193'),
        ResourceStatus: 'DELETE_IN_PROGRESS',
        ResourceProperties:
          '{"Type":"AMAZON_DYNAMODB","ServiceRoleArn":"arn:aws:iam::123456789012:role/PersonIAMRole2af744-ezabg7fk2jecvodrblowtgbsme-NONE","ApiId":"ezabg7fk2jecvodrblowtgbsme","DynamoDBConfig":{"TableName":"Person-ezabg7fk2jecvodrblowtgbsme-NONE","AwsRegion":"us-west-2"},"Name":"PersonTable"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'PersonDataSource',
        },
        constructPath: 'data/amplifyData/Person/PersonDataSource',
      },
      progress: {
        completed: 111,
        formatted: '111',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0e1752a889-function1351588B-K1KSYX88PE55 | 111 | 11:05:56 PM | DELETE_IN_PROGRESS | AWS::Lambda::Function | function/say-hello-lambda (sayhellolambdaEFA46D92)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0e1752a889-function1351588B-K1KSYX88PE55/96d9ab20-fe24-11ef-ade0-0ac4f18960c3',
        EventId:
          'sayhellolambdaEFA46D92-DELETE_IN_PROGRESS-2025-03-11T03:05:56.198Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0e1752a889-function1351588B-K1KSYX88PE55',
        LogicalResourceId: 'sayhellolambdaEFA46D92',
        PhysicalResourceId:
          'amplify-sampleprojectapp-pr-sayhellolambdaEFA46D92-FKnDZgZ20NmE',
        ResourceType: 'AWS::Lambda::Function',
        Timestamp: new Date('2025-03-11T03:05:56.198'),
        ResourceStatus: 'DELETE_IN_PROGRESS',
        ResourceProperties:
          '{"Role":"arn:aws:iam::123456789012:role/amplify-sampleprojectapp--sayhellolambdaServiceRole-rTltSNgzZZ60","MemorySize":"512","Runtime":"nodejs18.x","Timeout":"3","Environment":{"Variables":{"TEST_NAME_BUCKET_NAME":"<value will be resolved during runtime>","AMPLIFY_SSM_ENV_CONFIG":"{\\"/amplify/resource_reference/sampleprojectapp/user-sandbox-0e1752a889/TEST_NAME_BUCKET_NAME\\":{\\"name\\":\\"TEST_NAME_BUCKET_NAME\\"}}"}},"Handler":"index.handler","EphemeralStorage":{"Size":"512"},"Code":{"S3Bucket":"cdk-hnb659fds-assets-123456789012-us-west-2","S3Key":"aca5c01abb5bae3c9a0387478d7962aa5580a6ed97a5d12549501d7f1874b091.zip"},"Tags":[{"Value":"sandbox","Key":"amplify:deployment-type"},{"Value":"say-hello","Key":"amplify:friendly-name"},{"Value":"amplify","Key":"created-by"}],"Architectures":["x86_64"]}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'sayhellolambdaEFA46D92',
        },
        constructPath: 'function/say-hello-lambda',
      },
      progress: {
        completed: 111,
        formatted: '111',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0e1752a889-function1351588B-K1KSYX88PE55 | 110 | 11:05:57 PM | DELETE_COMPLETE | AWS::CDK::Metadata | auth/CDKMetadata/Default (CDKMetadata)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0e1752a889-function1351588B-K1KSYX88PE55/96d9ab20-fe24-11ef-ade0-0ac4f18960c3',
        EventId: 'CDKMetadata-DELETE_COMPLETE-2025-03-11T03:05:57.059Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0e1752a889-function1351588B-K1KSYX88PE55',
        LogicalResourceId: 'CDKMetadata',
        PhysicalResourceId: '96d9ab20-fe24-11ef-ade0-0ac4f18960c3',
        ResourceType: 'AWS::CDK::Metadata',
        Timestamp: new Date('2025-03-11T03:05:57.059'),
        ResourceStatus: 'DELETE_COMPLETE',
        ResourceProperties:
          '{"Analytics":"v2:deflate64:H4sIAAAAAAAA/zXNOw6DMBBF0bXQDxM+DW1ASkkBC0CDPSDzsSXGDgVi7xGgVKd692WYFhkmEe0SKz3Hi+nxqFk869aTmoF26Y6F1l5TZ53mSbC++QSrvHEWDK14NG5hqAZ7eYLkHYmwF3xfgORYBjWzL0kYnhpWg/03TmhYXNgUwz1oPY3GjidcjzjJ65slmBaYRpMYE2/BerMyNo8/CCaiyMQAAAA="}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'CDKMetadata',
        },
        constructPath: 'auth/CDKMetadata/Default',
      },
      progress: {
        completed: 110,
        formatted: '110',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0e1752a889-function1351588B-K1KSYX88PE55 | 111 | 11:05:57 PM | DELETE_COMPLETE | AWS::IAM::Policy | function/say-hello-lambda/ServiceRole/DefaultPolicy (sayhellolambdaServiceRoleDefaultPolicy4256F36F)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0e1752a889-function1351588B-K1KSYX88PE55/96d9ab20-fe24-11ef-ade0-0ac4f18960c3',
        EventId:
          'sayhellolambdaServiceRoleDefaultPolicy4256F36F-DELETE_COMPLETE-2025-03-11T03:05:57.155Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0e1752a889-function1351588B-K1KSYX88PE55',
        LogicalResourceId: 'sayhellolambdaServiceRoleDefaultPolicy4256F36F',
        PhysicalResourceId: 'ampli-sayhe-WAw11imqDMay',
        ResourceType: 'AWS::IAM::Policy',
        Timestamp: new Date('2025-03-11T03:05:57.155'),
        ResourceStatus: 'DELETE_COMPLETE',
        ResourceProperties:
          '{"PolicyName":"sayhellolambdaServiceRoleDefaultPolicy4256F36F","PolicyDocument":{"Version":"2012-10-17","Statement":[{"Action":"ssm:GetParameters","Resource":"arn:aws:ssm:us-west-2:123456789012:parameter/amplify/resource_reference/sampleprojectapp/user-sandbox-0e1752a889/TEST_NAME_BUCKET_NAME","Effect":"Allow"}]},"Roles":["amplify-sampleprojectapp--sayhellolambdaServiceRole-rTltSNgzZZ60"]}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'sayhellolambdaServiceRoleDefaultPolicy4256F36F',
        },
        constructPath: 'function/say-hello-lambda/ServiceRole/DefaultPolicy',
      },
      progress: {
        completed: 111,
        formatted: '111',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0e1752a889-function1351588B-K1KSYX88PE55 | 112 | 11:06:00 PM | DELETE_COMPLETE | AWS::Lambda::Function | function/say-hello-lambda (sayhellolambdaEFA46D92)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0e1752a889-function1351588B-K1KSYX88PE55/96d9ab20-fe24-11ef-ade0-0ac4f18960c3',
        EventId:
          'sayhellolambdaEFA46D92-DELETE_COMPLETE-2025-03-11T03:06:00.074Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0e1752a889-function1351588B-K1KSYX88PE55',
        LogicalResourceId: 'sayhellolambdaEFA46D92',
        PhysicalResourceId:
          'amplify-sampleprojectapp-pr-sayhellolambdaEFA46D92-FKnDZgZ20NmE',
        ResourceType: 'AWS::Lambda::Function',
        Timestamp: new Date('2025-03-11T03:06:00.074'),
        ResourceStatus: 'DELETE_COMPLETE',
        ResourceProperties:
          '{"Role":"arn:aws:iam::123456789012:role/amplify-sampleprojectapp--sayhellolambdaServiceRole-rTltSNgzZZ60","MemorySize":"512","Runtime":"nodejs18.x","Timeout":"3","Environment":{"Variables":{"TEST_NAME_BUCKET_NAME":"<value will be resolved during runtime>","AMPLIFY_SSM_ENV_CONFIG":"{\\"/amplify/resource_reference/sampleprojectapp/user-sandbox-0e1752a889/TEST_NAME_BUCKET_NAME\\":{\\"name\\":\\"TEST_NAME_BUCKET_NAME\\"}}"}},"Handler":"index.handler","EphemeralStorage":{"Size":"512"},"Code":{"S3Bucket":"cdk-hnb659fds-assets-123456789012-us-west-2","S3Key":"aca5c01abb5bae3c9a0387478d7962aa5580a6ed97a5d12549501d7f1874b091.zip"},"Tags":[{"Value":"sandbox","Key":"amplify:deployment-type"},{"Value":"say-hello","Key":"amplify:friendly-name"},{"Value":"amplify","Key":"created-by"}],"Architectures":["x86_64"]}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'sayhellolambdaEFA46D92',
        },
        constructPath: 'function/say-hello-lambda',
      },
      progress: {
        completed: 112,
        formatted: '112',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0e1752a889-function1351588B-K1KSYX88PE55 | 112 | 11:06:00 PM | DELETE_IN_PROGRESS | AWS::IAM::Role | function/say-hello-lambda/ServiceRole (sayhellolambdaServiceRole4BCAA6E2)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0e1752a889-function1351588B-K1KSYX88PE55/96d9ab20-fe24-11ef-ade0-0ac4f18960c3',
        EventId:
          'sayhellolambdaServiceRole4BCAA6E2-DELETE_IN_PROGRESS-2025-03-11T03:06:00.418Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0e1752a889-function1351588B-K1KSYX88PE55',
        LogicalResourceId: 'sayhellolambdaServiceRole4BCAA6E2',
        PhysicalResourceId:
          'amplify-sampleprojectapp--sayhellolambdaServiceRole-rTltSNgzZZ60',
        ResourceType: 'AWS::IAM::Role',
        Timestamp: new Date('2025-03-11T03:06:00.418'),
        ResourceStatus: 'DELETE_IN_PROGRESS',
        ResourceProperties:
          '{"ManagedPolicyArns":["arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"],"AssumeRolePolicyDocument":{"Version":"2012-10-17","Statement":[{"Action":"sts:AssumeRole","Effect":"Allow","Principal":{"Service":"lambda.amazonaws.com"}}]},"Tags":[{"Value":"sandbox","Key":"amplify:deployment-type"},{"Value":"say-hello","Key":"amplify:friendly-name"},{"Value":"amplify","Key":"created-by"}]}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'sayhellolambdaServiceRole4BCAA6E2',
        },
        constructPath: 'function/say-hello-lambda/ServiceRole',
      },
      progress: {
        completed: 112,
        formatted: '112',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I0000',
    message:
      '[sdk info] CloudFormation.DescribeStacks({"StackName":"amplify-sampleprojectapp-user-sandbox-0e1752a889"}) -> OK',
  },
  {
    code: 'CDK_TOOLKIT_I0000',
    message:
      'Stack amplify-sampleprojectapp-user-sandbox-0e1752a889 has an ongoing operation in progress and is not stable (DELETE_IN_PROGRESS)',
  },
  {
    code: 'CDK_TOOLKIT_I0000',
    message:
      '[sdk info] CloudFormation.DescribeStackEvents({"StackName":"amplify-sampleprojectapp-user-sandbox-0e1752a889"}) -> OK',
  },
  {
    code: 'CDK_TOOLKIT_I0000',
    message:
      '[sdk info] CloudFormation.DescribeStackEvents({"StackName":"arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0e1752a889-MyCustomResourcesBB610599-8G262VTBDJMK/96f8f2f0-fe24-11ef-a75d-0aa9ea96647d"}) -> OK',
  },
  {
    code: 'CDK_TOOLKIT_I0000',
    message:
      '[sdk info] CloudFormation.DescribeStackEvents({"StackName":"arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C/b355b0f0-fe24-11ef-a0bd-020db6799971"}) -> OK',
  },
  {
    code: 'CDK_TOOLKIT_I0000',
    message:
      '[sdk info] CloudFormation.DescribeStackEvents({"StackName":"arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB/e5b11440-fe24-11ef-98e6-0abc8a28bbed"}) -> OK',
  },
  {
    code: 'CDK_TOOLKIT_I0000',
    message:
      '[sdk info] CloudFormation.DescribeStacks({"StackName":"amplify-sampleprojectapp-user-sandbox-0e1752a889"}) -> OK',
  },
  {
    code: 'CDK_TOOLKIT_I0000',
    message:
      'Stack amplify-sampleprojectapp-user-sandbox-0e1752a889 has an ongoing operation in progress and is not stable (DELETE_IN_PROGRESS)',
  },
  {
    code: 'CDK_TOOLKIT_I0000',
    message:
      '[sdk info] CloudFormation.DescribeStackEvents({"StackName":"arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R/e5bef6f0-fe24-11ef-b7fc-06822b500091"}) -> OK',
  },
  {
    code: 'CDK_TOOLKIT_I0000',
    message:
      '[sdk info] CloudFormation.DescribeStackEvents({"StackName":"arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0e1752a889-function1351588B-K1KSYX88PE55/96d9ab20-fe24-11ef-ade0-0ac4f18960c3"}) -> OK',
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB | 113 | 11:05:57 PM | DELETE_COMPLETE | AWS::AppSync::DataSource | data/amplifyData/Person/PersonDataSource (PersonDataSource)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB/e5b11440-fe24-11ef-98e6-0abc8a28bbed',
        EventId: 'PersonDataSource-DELETE_COMPLETE-2025-03-11T03:05:57.666Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB',
        LogicalResourceId: 'PersonDataSource',
        PhysicalResourceId:
          'arn:aws:appsync:us-west-2:123456789012:apis/ezabg7fk2jecvodrblowtgbsme/datasources/PersonTable',
        ResourceType: 'AWS::AppSync::DataSource',
        Timestamp: new Date('2025-03-11T03:05:57.666'),
        ResourceStatus: 'DELETE_COMPLETE',
        ResourceProperties:
          '{"Type":"AMAZON_DYNAMODB","ServiceRoleArn":"arn:aws:iam::123456789012:role/PersonIAMRole2af744-ezabg7fk2jecvodrblowtgbsme-NONE","ApiId":"ezabg7fk2jecvodrblowtgbsme","DynamoDBConfig":{"TableName":"Person-ezabg7fk2jecvodrblowtgbsme-NONE","AwsRegion":"us-west-2"},"Name":"PersonTable"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'PersonDataSource',
        },
        constructPath: 'data/amplifyData/Person/PersonDataSource',
      },
      progress: {
        completed: 113,
        formatted: '113',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB | 113 | 11:05:58 PM | DELETE_IN_PROGRESS | AWS::IAM::Role | data/amplifyData/Person/PersonIAMRole (PersonIAMRole325FD7BD)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB/e5b11440-fe24-11ef-98e6-0abc8a28bbed',
        EventId:
          'PersonIAMRole325FD7BD-DELETE_IN_PROGRESS-2025-03-11T03:05:58.058Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB',
        LogicalResourceId: 'PersonIAMRole325FD7BD',
        PhysicalResourceId:
          'PersonIAMRole2af744-ezabg7fk2jecvodrblowtgbsme-NONE',
        ResourceType: 'AWS::IAM::Role',
        Timestamp: new Date('2025-03-11T03:05:58.058'),
        ResourceStatus: 'DELETE_IN_PROGRESS',
        ResourceProperties:
          '{"RoleName":"PersonIAMRole2af744-ezabg7fk2jecvodrblowtgbsme-NONE","Policies":[{"PolicyName":"DynamoDBAccess","PolicyDocument":{"Version":"2012-10-17","Statement":[{"Action":["dynamodb:BatchGetItem","dynamodb:BatchWriteItem","dynamodb:PutItem","dynamodb:DeleteItem","dynamodb:GetItem","dynamodb:Scan","dynamodb:Query","dynamodb:UpdateItem","dynamodb:ConditionCheckItem","dynamodb:DescribeTable","dynamodb:GetRecords","dynamodb:GetShardIterator"],"Resource":["arn:aws:dynamodb:us-west-2:123456789012:table/Person-ezabg7fk2jecvodrblowtgbsme-NONE","arn:aws:dynamodb:us-west-2:123456789012:table/Person-ezabg7fk2jecvodrblowtgbsme-NONE/*"],"Effect":"Allow"}]}}],"AssumeRolePolicyDocument":{"Version":"2012-10-17","Statement":[{"Action":"sts:AssumeRole","Effect":"Allow","Principal":{"Service":"appsync.amazonaws.com"}}]},"Tags":[{"Value":"sandbox","Key":"amplify:deployment-type"},{"Value":"amplifyData","Key":"amplify:friendly-name"},{"Value":"amplify","Key":"created-by"}]}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'PersonIAMRole325FD7BD',
        },
        constructPath: 'data/amplifyData/Person/PersonIAMRole',
      },
      progress: {
        completed: 113,
        formatted: '113',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB | 113 | 11:05:58 PM | DELETE_IN_PROGRESS | Custom::AmplifyDynamoDBTable | data/amplifyData/Person/PersonTable/Default/Default (PersonTable)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB/e5b11440-fe24-11ef-98e6-0abc8a28bbed',
        EventId: 'PersonTable-DELETE_IN_PROGRESS-2025-03-11T03:05:58.172Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB',
        LogicalResourceId: 'PersonTable',
        PhysicalResourceId: 'Person-ezabg7fk2jecvodrblowtgbsme-NONE',
        ResourceType: 'Custom::AmplifyDynamoDBTable',
        Timestamp: new Date('2025-03-11T03:05:58.172'),
        ResourceStatus: 'DELETE_IN_PROGRESS',
        ResourceProperties:
          '{"ServiceToken":"arn:aws:lambda:us-west-2:123456789012:function:amplify-sampleprojectapp--TableManagerCustomProvid-ejRomWhpK7wD","streamSpecification":{"streamViewType":"NEW_AND_OLD_IMAGES"},"billingMode":"PAY_PER_REQUEST","attributeDefinitions":[{"attributeType":"S","attributeName":"name"},{"attributeType":"S","attributeName":"dateOfBirth"}],"keySchema":[{"attributeName":"name","keyType":"HASH"},{"attributeName":"dateOfBirth","keyType":"RANGE"}],"replaceTableUponGsiUpdate":"true","allowDestructiveGraphqlSchemaUpdates":"true","tableName":"Person-ezabg7fk2jecvodrblowtgbsme-NONE","sseSpecification":{"sseEnabled":"true"}}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'PersonTable',
        },
        constructPath: 'data/amplifyData/Person/PersonTable/Default/Default',
      },
      progress: {
        completed: 113,
        formatted: '113',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB | 114 | 11:06:00 PM | DELETE_COMPLETE | Custom::AmplifyDynamoDBTable | data/amplifyData/Person/PersonTable/Default/Default (PersonTable)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB/e5b11440-fe24-11ef-98e6-0abc8a28bbed',
        EventId: 'PersonTable-DELETE_COMPLETE-2025-03-11T03:06:00.026Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB',
        LogicalResourceId: 'PersonTable',
        PhysicalResourceId: 'Person-ezabg7fk2jecvodrblowtgbsme-NONE',
        ResourceType: 'Custom::AmplifyDynamoDBTable',
        Timestamp: new Date('2025-03-11T03:06:00.026'),
        ResourceStatus: 'DELETE_COMPLETE',
        ResourceProperties:
          '{"ServiceToken":"arn:aws:lambda:us-west-2:123456789012:function:amplify-sampleprojectapp--TableManagerCustomProvid-ejRomWhpK7wD","streamSpecification":{"streamViewType":"NEW_AND_OLD_IMAGES"},"billingMode":"PAY_PER_REQUEST","attributeDefinitions":[{"attributeType":"S","attributeName":"name"},{"attributeType":"S","attributeName":"dateOfBirth"}],"keySchema":[{"attributeName":"name","keyType":"HASH"},{"attributeName":"dateOfBirth","keyType":"RANGE"}],"replaceTableUponGsiUpdate":"true","allowDestructiveGraphqlSchemaUpdates":"true","tableName":"Person-ezabg7fk2jecvodrblowtgbsme-NONE","sseSpecification":{"sseEnabled":"true"}}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'PersonTable',
        },
        constructPath: 'data/amplifyData/Person/PersonTable/Default/Default',
      },
      progress: {
        completed: 114,
        formatted: '114',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R | 115 | 11:06:03 PM | DELETE_COMPLETE | AWS::IAM::Role | data/amplifyData/Post/PostIAMRole (PostIAMRole83BF708F)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R/e5bef6f0-fe24-11ef-b7fc-06822b500091',
        EventId: 'PostIAMRole83BF708F-DELETE_COMPLETE-2025-03-11T03:06:03.146Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R',
        LogicalResourceId: 'PostIAMRole83BF708F',
        PhysicalResourceId: 'PostIAMRolebbce9b-ezabg7fk2jecvodrblowtgbsme-NONE',
        ResourceType: 'AWS::IAM::Role',
        Timestamp: new Date('2025-03-11T03:06:03.146'),
        ResourceStatus: 'DELETE_COMPLETE',
        ResourceProperties:
          '{"RoleName":"PostIAMRolebbce9b-ezabg7fk2jecvodrblowtgbsme-NONE","Policies":[{"PolicyName":"DynamoDBAccess","PolicyDocument":{"Version":"2012-10-17","Statement":[{"Action":["dynamodb:BatchGetItem","dynamodb:BatchWriteItem","dynamodb:PutItem","dynamodb:DeleteItem","dynamodb:GetItem","dynamodb:Scan","dynamodb:Query","dynamodb:UpdateItem","dynamodb:ConditionCheckItem","dynamodb:DescribeTable","dynamodb:GetRecords","dynamodb:GetShardIterator"],"Resource":["arn:aws:dynamodb:us-west-2:123456789012:table/Post-ezabg7fk2jecvodrblowtgbsme-NONE","arn:aws:dynamodb:us-west-2:123456789012:table/Post-ezabg7fk2jecvodrblowtgbsme-NONE/*"],"Effect":"Allow"}]}}],"AssumeRolePolicyDocument":{"Version":"2012-10-17","Statement":[{"Action":"sts:AssumeRole","Effect":"Allow","Principal":{"Service":"appsync.amazonaws.com"}}]},"Tags":[{"Value":"sandbox","Key":"amplify:deployment-type"},{"Value":"amplifyData","Key":"amplify:friendly-name"},{"Value":"amplify","Key":"created-by"}]}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'PostIAMRole83BF708F',
        },
        constructPath: 'data/amplifyData/Post/PostIAMRole',
      },
      progress: {
        completed: 115,
        formatted: '115',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R | 116 | 11:06:03 PM | DELETE_COMPLETE | AWS::CloudFormation::Stack | amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R/e5bef6f0-fe24-11ef-b7fc-06822b500091',
        EventId: 'c46d30b0-fe25-11ef-a0ac-06818fff754f',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R',
        LogicalResourceId:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R',
        PhysicalResourceId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R/e5bef6f0-fe24-11ef-b7fc-06822b500091',
        ResourceType: 'AWS::CloudFormation::Stack',
        Timestamp: new Date('2025-03-11T03:06:03.431'),
        ResourceStatus: 'DELETE_COMPLETE',
      },
      progress: {
        completed: 116,
        formatted: '116',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I0000',
    message:
      '[sdk info] CloudFormation.DescribeStackEvents({"StackName":"amplify-sampleprojectapp-user-sandbox-0e1752a889"}) -> OK',
  },
  {
    code: 'CDK_TOOLKIT_I0000',
    message:
      '[sdk info] CloudFormation.DescribeStackEvents({"StackName":"arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0e1752a889-MyCustomResourcesBB610599-8G262VTBDJMK/96f8f2f0-fe24-11ef-a75d-0aa9ea96647d"}) -> OK',
  },
  {
    code: 'CDK_TOOLKIT_I0000',
    message:
      '[sdk info] CloudFormation.DescribeStackEvents({"StackName":"arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C/b355b0f0-fe24-11ef-a0bd-020db6799971"}) -> OK',
  },
  {
    code: 'CDK_TOOLKIT_I0000',
    message:
      '[sdk info] CloudFormation.DescribeStacks({"StackName":"amplify-sampleprojectapp-user-sandbox-0e1752a889"}) -> OK',
  },
  {
    code: 'CDK_TOOLKIT_I0000',
    message:
      'Stack amplify-sampleprojectapp-user-sandbox-0e1752a889 has an ongoing operation in progress and is not stable (DELETE_IN_PROGRESS)',
  },
  {
    code: 'CDK_TOOLKIT_I0000',
    message:
      '[sdk info] CloudFormation.DescribeStackEvents({"StackName":"arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB/e5b11440-fe24-11ef-98e6-0abc8a28bbed"}) -> OK',
  },
  {
    code: 'CDK_TOOLKIT_I0000',
    message:
      '[sdk info] CloudFormation.DescribeStackEvents({"StackName":"arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0e1752a889-function1351588B-K1KSYX88PE55/96d9ab20-fe24-11ef-ade0-0ac4f18960c3"}) -> OK',
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0e1752a889-MyCustomResourcesBB610599-8G262VTBDJMK | 117 | 11:06:05 PM | DELETE_COMPLETE | AWS::SQS::Queue | MyCustomResources/CustomQueue (CustomQueue6CD3A366)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0e1752a889-MyCustomResourcesBB610599-8G262VTBDJMK/96f8f2f0-fe24-11ef-a75d-0aa9ea96647d',
        EventId: 'CustomQueue6CD3A366-DELETE_COMPLETE-2025-03-11T03:06:05.081Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0e1752a889-MyCustomResourcesBB610599-8G262VTBDJMK',
        LogicalResourceId: 'CustomQueue6CD3A366',
        PhysicalResourceId:
          'https://sqs.us-west-2.amazonaws.com/123456789012/amplify-sampleprojectapp-user-sandbox-0e175-CustomQueue6CD3A366-wzR4DVvDRmK1',
        ResourceType: 'AWS::SQS::Queue',
        Timestamp: new Date('2025-03-11T03:06:05.081'),
        ResourceStatus: 'DELETE_COMPLETE',
        ResourceProperties:
          '{"Tags":[{"Value":"sandbox","Key":"amplify:deployment-type"},{"Value":"amplify","Key":"created-by"}]}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'CustomQueue6CD3A366',
        },
        constructPath: 'MyCustomResources/CustomQueue',
      },
      progress: {
        completed: 117,
        formatted: '117',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C | 118 | 11:06:07 PM | DELETE_COMPLETE | AWS::CloudFormation::Stack | data/amplifyData/Post.NestedStack/Post.NestedStackResource (amplifyDataPostNestedStackPostNestedStackResourceB65AFCD3)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C/b355b0f0-fe24-11ef-a0bd-020db6799971',
        EventId:
          'amplifyDataPostNestedStackPostNestedStackResourceB65AFCD3-DELETE_COMPLETE-2025-03-11T03:06:07.459Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C',
        LogicalResourceId:
          'amplifyDataPostNestedStackPostNestedStackResourceB65AFCD3',
        PhysicalResourceId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataPostNestedStackPostNestedStackR-1SJIR6QK3348R/e5bef6f0-fe24-11ef-b7fc-06822b500091',
        ResourceType: 'AWS::CloudFormation::Stack',
        Timestamp: new Date('2025-03-11T03:06:07.459'),
        ResourceStatus: 'DELETE_COMPLETE',
        ResourceProperties:
          '{"TemplateURL":"https://s3.us-west-2.amazonaws.com/cdk-hnb659fds-assets-123456789012-us-west-2/209a0048df688fe6a8997016c796a69b318d368ae30d416e1656d209d881a050.json","Parameters":{"DynamoDBModelTableReadIOPS":"5","referencetoamplifysampleprojectappusersandbox0e1752a889dataamplifyDataAmplifyTableManagerNestedStackAmplifyTableManagerNestedStackResource9097D1B4Outputsamplifysampleprojectappusersandbox0e1752a889dataamplifyDataAmplifyTableManagerT93BF9650":"arn:aws:lambda:us-west-2:123456789012:function:amplify-sampleprojectapp--TableManagerCustomProvid-ejRomWhpK7wD","referencetoamplifysampleprojectappusersandbox0e1752a889authNestedStackauthNestedStackResource1C2A2D1EOutputsamplifysampleprojectappusersandbox0e1752a889authamplifyAuthIdentityPool5160F57DRef":"us-west-2:e3abf6f7-1ae5-4254-829e-0d8c9dc05bff","DynamoDBEnableServerSideEncryption":"true","referencetoamplifysampleprojectappusersandbox0e1752a889dataamplifyDataGraphQLAPIB1F14B28ApiId":"ezabg7fk2jecvodrblowtgbsme","DynamoDBEnablePointInTimeRecovery":"false","referencetoamplifysampleprojectappusersandbox0e1752a889authNestedStackauthNestedStackResource1C2A2D1EOutputsamplifysampleprojectappusersandbox0e1752a889authamplifyAuthunauthenticatedUserRoleC92E0CFERef":"amplify-sampleprojectapp--amplifyAuthunauthenticate-0ZSS9wsA6Aut","DynamoDBBillingMode":"PAY_PER_REQUEST","referencetoamplifysampleprojectappusersandbox0e1752a889dataamplifyDataGraphQLAPINONEDS97A6DFB0Name":"NONE_DS","DynamoDBModelTableWriteIOPS":"5","referencetoamplifysampleprojectappusersandbox0e1752a889authNestedStackauthNestedStackResource1C2A2D1EOutputsamplifysampleprojectappusersandbox0e1752a889authamplifyAuthauthenticatedUserRole11751600Ref":"amplify-sampleprojectapp--amplifyAuthauthenticatedU-JksUKi7c8Bvh"},"Tags":[{"Value":"sandbox","Key":"amplify:deployment-type"},{"Value":"amplifyData","Key":"amplify:friendly-name"},{"Value":"amplify","Key":"created-by"}]}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'amplifyDataPostNestedStackPostNestedStackResourceB65AFCD3',
        },
        constructPath:
          'data/amplifyData/Post.NestedStack/Post.NestedStackResource',
      },
      progress: {
        completed: 118,
        formatted: '118',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB | 119 | 11:06:07 PM | DELETE_COMPLETE | AWS::IAM::Role | data/amplifyData/Person/PersonIAMRole (PersonIAMRole325FD7BD)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB/e5b11440-fe24-11ef-98e6-0abc8a28bbed',
        EventId:
          'PersonIAMRole325FD7BD-DELETE_COMPLETE-2025-03-11T03:06:07.484Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB',
        LogicalResourceId: 'PersonIAMRole325FD7BD',
        PhysicalResourceId:
          'PersonIAMRole2af744-ezabg7fk2jecvodrblowtgbsme-NONE',
        ResourceType: 'AWS::IAM::Role',
        Timestamp: new Date('2025-03-11T03:06:07.484'),
        ResourceStatus: 'DELETE_COMPLETE',
        ResourceProperties:
          '{"RoleName":"PersonIAMRole2af744-ezabg7fk2jecvodrblowtgbsme-NONE","Policies":[{"PolicyName":"DynamoDBAccess","PolicyDocument":{"Version":"2012-10-17","Statement":[{"Action":["dynamodb:BatchGetItem","dynamodb:BatchWriteItem","dynamodb:PutItem","dynamodb:DeleteItem","dynamodb:GetItem","dynamodb:Scan","dynamodb:Query","dynamodb:UpdateItem","dynamodb:ConditionCheckItem","dynamodb:DescribeTable","dynamodb:GetRecords","dynamodb:GetShardIterator"],"Resource":["arn:aws:dynamodb:us-west-2:123456789012:table/Person-ezabg7fk2jecvodrblowtgbsme-NONE","arn:aws:dynamodb:us-west-2:123456789012:table/Person-ezabg7fk2jecvodrblowtgbsme-NONE/*"],"Effect":"Allow"}]}}],"AssumeRolePolicyDocument":{"Version":"2012-10-17","Statement":[{"Action":"sts:AssumeRole","Effect":"Allow","Principal":{"Service":"appsync.amazonaws.com"}}]},"Tags":[{"Value":"sandbox","Key":"amplify:deployment-type"},{"Value":"amplifyData","Key":"amplify:friendly-name"},{"Value":"amplify","Key":"created-by"}]}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'PersonIAMRole325FD7BD',
        },
        constructPath: 'data/amplifyData/Person/PersonIAMRole',
      },
      progress: {
        completed: 119,
        formatted: '119',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB | 120 | 11:06:07 PM | DELETE_COMPLETE | AWS::CloudFormation::Stack | amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB/e5b11440-fe24-11ef-98e6-0abc8a28bbed',
        EventId: 'c70abef0-fe25-11ef-b0bd-029f49c1c97f',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB',
        LogicalResourceId:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB',
        PhysicalResourceId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB/e5b11440-fe24-11ef-98e6-0abc8a28bbed',
        ResourceType: 'AWS::CloudFormation::Stack',
        Timestamp: new Date('2025-03-11T03:06:07.824'),
        ResourceStatus: 'DELETE_COMPLETE',
      },
      progress: {
        completed: 120,
        formatted: '120',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0e1752a889-function1351588B-K1KSYX88PE55 | 121 | 11:06:09 PM | DELETE_COMPLETE | AWS::IAM::Role | function/say-hello-lambda/ServiceRole (sayhellolambdaServiceRole4BCAA6E2)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0e1752a889-function1351588B-K1KSYX88PE55/96d9ab20-fe24-11ef-ade0-0ac4f18960c3',
        EventId:
          'sayhellolambdaServiceRole4BCAA6E2-DELETE_COMPLETE-2025-03-11T03:06:09.225Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0e1752a889-function1351588B-K1KSYX88PE55',
        LogicalResourceId: 'sayhellolambdaServiceRole4BCAA6E2',
        PhysicalResourceId:
          'amplify-sampleprojectapp--sayhellolambdaServiceRole-rTltSNgzZZ60',
        ResourceType: 'AWS::IAM::Role',
        Timestamp: new Date('2025-03-11T03:06:09.225'),
        ResourceStatus: 'DELETE_COMPLETE',
        ResourceProperties:
          '{"ManagedPolicyArns":["arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"],"AssumeRolePolicyDocument":{"Version":"2012-10-17","Statement":[{"Action":"sts:AssumeRole","Effect":"Allow","Principal":{"Service":"lambda.amazonaws.com"}}]},"Tags":[{"Value":"sandbox","Key":"amplify:deployment-type"},{"Value":"say-hello","Key":"amplify:friendly-name"},{"Value":"amplify","Key":"created-by"}]}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'sayhellolambdaServiceRole4BCAA6E2',
        },
        constructPath: 'function/say-hello-lambda/ServiceRole',
      },
      progress: {
        completed: 121,
        formatted: '121',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0e1752a889-function1351588B-K1KSYX88PE55 | 122 | 11:06:09 PM | DELETE_COMPLETE | AWS::CloudFormation::Stack | amplify-sampleprojectapp-user-sandbox-0e1752a889-function1351588B-K1KSYX88PE55',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0e1752a889-function1351588B-K1KSYX88PE55/96d9ab20-fe24-11ef-ade0-0ac4f18960c3',
        EventId: 'c8143fb0-fe25-11ef-a863-0afbc44afa35',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0e1752a889-function1351588B-K1KSYX88PE55',
        LogicalResourceId:
          'amplify-sampleprojectapp-user-sandbox-0e1752a889-function1351588B-K1KSYX88PE55',
        PhysicalResourceId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0e1752a889-function1351588B-K1KSYX88PE55/96d9ab20-fe24-11ef-ade0-0ac4f18960c3',
        ResourceType: 'AWS::CloudFormation::Stack',
        Timestamp: new Date('2025-03-11T03:06:09.563'),
        ResourceStatus: 'DELETE_COMPLETE',
      },
      progress: {
        completed: 122,
        formatted: '122',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I0000',
    message:
      '[sdk info] CloudFormation.DescribeStackEvents({"StackName":"amplify-sampleprojectapp-user-sandbox-0e1752a889"}) -> OK',
  },
  {
    code: 'CDK_TOOLKIT_I0000',
    message:
      '[sdk info] CloudFormation.DescribeStackEvents({"StackName":"arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0e1752a889-MyCustomResourcesBB610599-8G262VTBDJMK/96f8f2f0-fe24-11ef-a75d-0aa9ea96647d"}) -> OK',
  },
  {
    code: 'CDK_TOOLKIT_I0000',
    message:
      '[sdk info] CloudFormation.DescribeStacks({"StackName":"amplify-sampleprojectapp-user-sandbox-0e1752a889"}) -> OK',
  },
  {
    code: 'CDK_TOOLKIT_I0000',
    message:
      'Stack amplify-sampleprojectapp-user-sandbox-0e1752a889 has an ongoing operation in progress and is not stable (DELETE_IN_PROGRESS)',
  },
  {
    code: 'CDK_TOOLKIT_I0000',
    message:
      '[sdk info] CloudFormation.DescribeStackEvents({"StackName":"arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C/b355b0f0-fe24-11ef-a0bd-020db6799971"}) -> OK',
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0e1752a889 | 123 | 11:06:15 PM | DELETE_COMPLETE | AWS::CloudFormation::Stack | function.NestedStack/function.NestedStackResource (function1351588B)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0e1752a889/912e40a0-fe24-11ef-ab54-068258314c15',
        EventId: 'function1351588B-DELETE_COMPLETE-2025-03-11T03:06:15.716Z',
        StackName: 'amplify-sampleprojectapp-user-sandbox-0e1752a889',
        LogicalResourceId: 'function1351588B',
        PhysicalResourceId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0e1752a889-function1351588B-K1KSYX88PE55/96d9ab20-fe24-11ef-ade0-0ac4f18960c3',
        ResourceType: 'AWS::CloudFormation::Stack',
        Timestamp: new Date('2025-03-11T03:06:15.716'),
        ResourceStatus: 'DELETE_COMPLETE',
        ResourceProperties:
          '{"TemplateURL":"https://s3.us-west-2.amazonaws.com/cdk-hnb659fds-assets-123456789012-us-west-2/5065dd0842feb96b950d214ec1e2f9faabd3ad868f6d75d5d999b56e9327c4d6.json","Tags":[{"Value":"sandbox","Key":"amplify:deployment-type"},{"Value":"amplify","Key":"created-by"}]}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'function1351588B',
        },
        constructPath: 'function.NestedStack/function.NestedStackResource',
      },
      progress: {
        completed: 123,
        formatted: '123',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I0000',
    message:
      '[sdk info] CloudFormation.DescribeStackEvents({"StackName":"amplify-sampleprojectapp-user-sandbox-0e1752a889"}) -> OK',
  },
  {
    code: 'CDK_TOOLKIT_I0000',
    message:
      '[sdk info] CloudFormation.DescribeStackEvents({"StackName":"arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0e1752a889-MyCustomResourcesBB610599-8G262VTBDJMK/96f8f2f0-fe24-11ef-a75d-0aa9ea96647d"}) -> OK',
  },
  {
    code: 'CDK_TOOLKIT_I0000',
    message:
      '[sdk info] CloudFormation.DescribeStacks({"StackName":"amplify-sampleprojectapp-user-sandbox-0e1752a889"}) -> OK',
  },
  {
    code: 'CDK_TOOLKIT_I0000',
    message:
      'Stack amplify-sampleprojectapp-user-sandbox-0e1752a889 has an ongoing operation in progress and is not stable (DELETE_IN_PROGRESS)',
  },
  {
    code: 'CDK_TOOLKIT_I0000',
    message:
      '[sdk info] CloudFormation.DescribeStackEvents({"StackName":"arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C/b355b0f0-fe24-11ef-a0bd-020db6799971"}) -> OK',
  },
  {
    code: 'CDK_TOOLKIT_I0000',
    message:
      '[sdk info] CloudFormation.DescribeStackEvents({"StackName":"arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataAmplifyTableManagerNestedStackA-4JC1SUB3AUAB/b71af650-fe24-11ef-ad54-0603cfec563b"}) -> OK',
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C | 124 | 11:06:19 PM | DELETE_COMPLETE | AWS::CloudFormation::Stack | data/amplifyData/Person.NestedStack/Person.NestedStackResource (amplifyDataPersonNestedStackPersonNestedStackResource28D60818)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C/b355b0f0-fe24-11ef-a0bd-020db6799971',
        EventId:
          'amplifyDataPersonNestedStackPersonNestedStackResource28D60818-DELETE_COMPLETE-2025-03-11T03:06:19.799Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C',
        LogicalResourceId:
          'amplifyDataPersonNestedStackPersonNestedStackResource28D60818',
        PhysicalResourceId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataPersonNestedStackPersonNestedSt-1M75LKPGUZZB/e5b11440-fe24-11ef-98e6-0abc8a28bbed',
        ResourceType: 'AWS::CloudFormation::Stack',
        Timestamp: new Date('2025-03-11T03:06:19.799'),
        ResourceStatus: 'DELETE_COMPLETE',
        ResourceProperties:
          '{"TemplateURL":"https://s3.us-west-2.amazonaws.com/cdk-hnb659fds-assets-123456789012-us-west-2/f7bafc4fb5028045158fda2645f666d5744ff73a7236cbd21784e1b94aaef720.json","Parameters":{"DynamoDBModelTableReadIOPS":"5","referencetoamplifysampleprojectappusersandbox0e1752a889dataamplifyDataAmplifyTableManagerNestedStackAmplifyTableManagerNestedStackResource9097D1B4Outputsamplifysampleprojectappusersandbox0e1752a889dataamplifyDataAmplifyTableManagerT93BF9650":"arn:aws:lambda:us-west-2:123456789012:function:amplify-sampleprojectapp--TableManagerCustomProvid-ejRomWhpK7wD","referencetoamplifysampleprojectappusersandbox0e1752a889authNestedStackauthNestedStackResource1C2A2D1EOutputsamplifysampleprojectappusersandbox0e1752a889authamplifyAuthIdentityPool5160F57DRef":"us-west-2:e3abf6f7-1ae5-4254-829e-0d8c9dc05bff","DynamoDBEnableServerSideEncryption":"true","referencetoamplifysampleprojectappusersandbox0e1752a889dataamplifyDataGraphQLAPIB1F14B28ApiId":"ezabg7fk2jecvodrblowtgbsme","DynamoDBEnablePointInTimeRecovery":"false","referencetoamplifysampleprojectappusersandbox0e1752a889authNestedStackauthNestedStackResource1C2A2D1EOutputsamplifysampleprojectappusersandbox0e1752a889authamplifyAuthunauthenticatedUserRoleC92E0CFERef":"amplify-sampleprojectapp--amplifyAuthunauthenticate-0ZSS9wsA6Aut","DynamoDBBillingMode":"PAY_PER_REQUEST","referencetoamplifysampleprojectappusersandbox0e1752a889dataamplifyDataGraphQLAPINONEDS97A6DFB0Name":"NONE_DS","DynamoDBModelTableWriteIOPS":"5","referencetoamplifysampleprojectappusersandbox0e1752a889authNestedStackauthNestedStackResource1C2A2D1EOutputsamplifysampleprojectappusersandbox0e1752a889authamplifyAuthauthenticatedUserRole11751600Ref":"amplify-sampleprojectapp--amplifyAuthauthenticatedU-JksUKi7c8Bvh"},"Tags":[{"Value":"sandbox","Key":"amplify:deployment-type"},{"Value":"amplifyData","Key":"amplify:friendly-name"},{"Value":"amplify","Key":"created-by"}]}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'amplifyDataPersonNestedStackPersonNestedStackResource28D60818',
        },
        constructPath:
          'data/amplifyData/Person.NestedStack/Person.NestedStackResource',
      },
      progress: {
        completed: 124,
        formatted: '124',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0e1752a889-MyCustomResourcesBB610599-8G262VTBDJMK | 125 | 11:06:20 PM | DELETE_COMPLETE | AWS::SNS::Topic | MyCustomResources/CustomTopics (CustomTopicsAF1A51E0)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0e1752a889-MyCustomResourcesBB610599-8G262VTBDJMK/96f8f2f0-fe24-11ef-a75d-0aa9ea96647d',
        EventId:
          'CustomTopicsAF1A51E0-DELETE_COMPLETE-2025-03-11T03:06:20.083Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0e1752a889-MyCustomResourcesBB610599-8G262VTBDJMK',
        LogicalResourceId: 'CustomTopicsAF1A51E0',
        PhysicalResourceId:
          'arn:aws:sns:us-west-2:123456789012:amplify-sampleprojectapp-user-sandbox-0e1752a889-MyCustomResourcesBB610599-8G262VTBDJMK-CustomTopicsAF1A51E0-pVAttHlxIyKS',
        ResourceType: 'AWS::SNS::Topic',
        Timestamp: new Date('2025-03-11T03:06:20.083'),
        ResourceStatus: 'DELETE_COMPLETE',
        ResourceProperties:
          '{"Tags":[{"Value":"sandbox","Key":"amplify:deployment-type"},{"Value":"amplify","Key":"created-by"}]}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'CustomTopicsAF1A51E0',
        },
        constructPath: 'MyCustomResources/CustomTopics',
      },
      progress: {
        completed: 125,
        formatted: '125',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C | 125 | 11:06:20 PM | DELETE_IN_PROGRESS | AWS::AppSync::DataSource | data/amplifyData/GraphQLAPI/NONE_DS (amplifyDataGraphQLAPINONEDS684BF699)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C/b355b0f0-fe24-11ef-a0bd-020db6799971',
        EventId:
          'amplifyDataGraphQLAPINONEDS684BF699-DELETE_IN_PROGRESS-2025-03-11T03:06:20.143Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C',
        LogicalResourceId: 'amplifyDataGraphQLAPINONEDS684BF699',
        PhysicalResourceId:
          'arn:aws:appsync:us-west-2:123456789012:apis/ezabg7fk2jecvodrblowtgbsme/datasources/NONE_DS',
        ResourceType: 'AWS::AppSync::DataSource',
        Timestamp: new Date('2025-03-11T03:06:20.143'),
        ResourceStatus: 'DELETE_IN_PROGRESS',
        ResourceProperties:
          '{"Type":"NONE","Description":"None Data Source for Pipeline functions","ApiId":"ezabg7fk2jecvodrblowtgbsme","Name":"NONE_DS"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'amplifyDataGraphQLAPINONEDS684BF699',
        },
        constructPath: 'data/amplifyData/GraphQLAPI/NONE_DS',
      },
      progress: {
        completed: 125,
        formatted: '125',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C | 125 | 11:06:20 PM | DELETE_IN_PROGRESS | AWS::AppSync::GraphQLSchema | data/amplifyData/GraphQLAPI/TransformerSchema (amplifyDataGraphQLAPITransformerSchemaFF50A789)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C/b355b0f0-fe24-11ef-a0bd-020db6799971',
        EventId:
          'amplifyDataGraphQLAPITransformerSchemaFF50A789-DELETE_IN_PROGRESS-2025-03-11T03:06:20.166Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C',
        LogicalResourceId: 'amplifyDataGraphQLAPITransformerSchemaFF50A789',
        PhysicalResourceId: 'ezabg7fk2jecvodrblowtgbsmeGraphQLSchema',
        ResourceType: 'AWS::AppSync::GraphQLSchema',
        Timestamp: new Date('2025-03-11T03:06:20.166'),
        ResourceStatus: 'DELETE_IN_PROGRESS',
        ResourceProperties:
          '{"DefinitionS3Location":"s3://cdk-hnb659fds-assets-123456789012-us-west-2/e4431ba6094a85d53a88932fa10581de7e18e61c2310024b9907e52df11e26e6.graphql","ApiId":"ezabg7fk2jecvodrblowtgbsme"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'amplifyDataGraphQLAPITransformerSchemaFF50A789',
        },
        constructPath: 'data/amplifyData/GraphQLAPI/TransformerSchema',
      },
      progress: {
        completed: 125,
        formatted: '125',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C | 125 | 11:06:20 PM | DELETE_IN_PROGRESS | AWS::CloudFormation::Stack | data/amplifyData/AmplifyTableManager.NestedStack/AmplifyTableManager.NestedStackResource (amplifyDataAmplifyTableManagerNestedStackAmplifyTableManagerNestedStackResource86290833)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C/b355b0f0-fe24-11ef-a0bd-020db6799971',
        EventId:
          'amplifyDataAmplifyTableManagerNestedStackAmplifyTableManagerNestedStackResource86290833-DELETE_IN_PROGRESS-2025-03-11T03:06:20.168Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C',
        LogicalResourceId:
          'amplifyDataAmplifyTableManagerNestedStackAmplifyTableManagerNestedStackResource86290833',
        PhysicalResourceId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataAmplifyTableManagerNestedStackA-4JC1SUB3AUAB/b71af650-fe24-11ef-ad54-0603cfec563b',
        ResourceType: 'AWS::CloudFormation::Stack',
        Timestamp: new Date('2025-03-11T03:06:20.168'),
        ResourceStatus: 'DELETE_IN_PROGRESS',
        ResourceProperties:
          '{"TemplateURL":"https://s3.us-west-2.amazonaws.com/cdk-hnb659fds-assets-123456789012-us-west-2/193c5f412086be216636e53fa8e74d99c431936435b456c4b0b7252704331c51.json","Parameters":{"referencetoamplifysampleprojectappusersandbox0e1752a889dataamplifyDataGraphQLAPIB1F14B28ApiId":"ezabg7fk2jecvodrblowtgbsme"},"Tags":[{"Value":"sandbox","Key":"amplify:deployment-type"},{"Value":"amplifyData","Key":"amplify:friendly-name"},{"Value":"amplify","Key":"created-by"}]}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'amplifyDataAmplifyTableManagerNestedStackAmplifyTableManagerNestedStackResource86290833',
        },
        constructPath:
          'data/amplifyData/AmplifyTableManager.NestedStack/AmplifyTableManager.NestedStackResource',
      },
      progress: {
        completed: 125,
        formatted: '125',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0e1752a889-MyCustomResourcesBB610599-8G262VTBDJMK | 126 | 11:06:20 PM | DELETE_COMPLETE | AWS::CloudFormation::Stack | amplify-sampleprojectapp-user-sandbox-0e1752a889-MyCustomResourcesBB610599-8G262VTBDJMK',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0e1752a889-MyCustomResourcesBB610599-8G262VTBDJMK/96f8f2f0-fe24-11ef-a75d-0aa9ea96647d',
        EventId: 'ce8f2f30-fe25-11ef-a863-0afbc44afa35',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0e1752a889-MyCustomResourcesBB610599-8G262VTBDJMK',
        LogicalResourceId:
          'amplify-sampleprojectapp-user-sandbox-0e1752a889-MyCustomResourcesBB610599-8G262VTBDJMK',
        PhysicalResourceId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0e1752a889-MyCustomResourcesBB610599-8G262VTBDJMK/96f8f2f0-fe24-11ef-a75d-0aa9ea96647d',
        ResourceType: 'AWS::CloudFormation::Stack',
        Timestamp: new Date('2025-03-11T03:06:20.438'),
        ResourceStatus: 'DELETE_COMPLETE',
      },
      progress: {
        completed: 126,
        formatted: '126',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataAmplifyTableManagerNestedStackA-4JC1SUB3AUAB | 126 | 11:06:20 PM | DELETE_IN_PROGRESS | AWS::CloudFormation::Stack | amplify-sampleprojectapp-user-sandbox-0-amplifyDataAmplifyTableManagerNestedStackA-4JC1SUB3AUAB User Initiated',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataAmplifyTableManagerNestedStackA-4JC1SUB3AUAB/b71af650-fe24-11ef-ad54-0603cfec563b',
        EventId: 'cea3c8a0-fe25-11ef-9478-068147941a6d',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataAmplifyTableManagerNestedStackA-4JC1SUB3AUAB',
        LogicalResourceId:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataAmplifyTableManagerNestedStackA-4JC1SUB3AUAB',
        PhysicalResourceId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataAmplifyTableManagerNestedStackA-4JC1SUB3AUAB/b71af650-fe24-11ef-ad54-0603cfec563b',
        ResourceType: 'AWS::CloudFormation::Stack',
        Timestamp: new Date('2025-03-11T03:06:20.573'),
        ResourceStatus: 'DELETE_IN_PROGRESS',
        ResourceStatusReason: 'User Initiated',
      },
      progress: {
        completed: 126,
        formatted: '126',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C | 127 | 11:06:21 PM | DELETE_COMPLETE | AWS::AppSync::DataSource | data/amplifyData/GraphQLAPI/NONE_DS (amplifyDataGraphQLAPINONEDS684BF699)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C/b355b0f0-fe24-11ef-a0bd-020db6799971',
        EventId:
          'amplifyDataGraphQLAPINONEDS684BF699-DELETE_COMPLETE-2025-03-11T03:06:21.417Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C',
        LogicalResourceId: 'amplifyDataGraphQLAPINONEDS684BF699',
        PhysicalResourceId:
          'arn:aws:appsync:us-west-2:123456789012:apis/ezabg7fk2jecvodrblowtgbsme/datasources/NONE_DS',
        ResourceType: 'AWS::AppSync::DataSource',
        Timestamp: new Date('2025-03-11T03:06:21.417'),
        ResourceStatus: 'DELETE_COMPLETE',
        ResourceProperties:
          '{"Type":"NONE","Description":"None Data Source for Pipeline functions","ApiId":"ezabg7fk2jecvodrblowtgbsme","Name":"NONE_DS"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'amplifyDataGraphQLAPINONEDS684BF699',
        },
        constructPath: 'data/amplifyData/GraphQLAPI/NONE_DS',
      },
      progress: {
        completed: 127,
        formatted: '127',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C | 128 | 11:06:21 PM | DELETE_COMPLETE | AWS::AppSync::GraphQLSchema | data/amplifyData/GraphQLAPI/TransformerSchema (amplifyDataGraphQLAPITransformerSchemaFF50A789)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C/b355b0f0-fe24-11ef-a0bd-020db6799971',
        EventId:
          'amplifyDataGraphQLAPITransformerSchemaFF50A789-DELETE_COMPLETE-2025-03-11T03:06:21.551Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C',
        LogicalResourceId: 'amplifyDataGraphQLAPITransformerSchemaFF50A789',
        PhysicalResourceId: 'ezabg7fk2jecvodrblowtgbsmeGraphQLSchema',
        ResourceType: 'AWS::AppSync::GraphQLSchema',
        Timestamp: new Date('2025-03-11T03:06:21.551'),
        ResourceStatus: 'DELETE_COMPLETE',
        ResourceProperties:
          '{"DefinitionS3Location":"s3://cdk-hnb659fds-assets-123456789012-us-west-2/e4431ba6094a85d53a88932fa10581de7e18e61c2310024b9907e52df11e26e6.graphql","ApiId":"ezabg7fk2jecvodrblowtgbsme"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'amplifyDataGraphQLAPITransformerSchemaFF50A789',
        },
        constructPath: 'data/amplifyData/GraphQLAPI/TransformerSchema',
      },
      progress: {
        completed: 128,
        formatted: '128',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataAmplifyTableManagerNestedStackA-4JC1SUB3AUAB | 128 | 11:06:22 PM | DELETE_IN_PROGRESS | AWS::Lambda::Function | data/amplifyData/AmplifyTableManager/TableManagerCustomProvider/framework-onEvent (TableManagerCustomProviderframeworkonEvent1DFC2ECC)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataAmplifyTableManagerNestedStackA-4JC1SUB3AUAB/b71af650-fe24-11ef-ad54-0603cfec563b',
        EventId:
          'TableManagerCustomProviderframeworkonEvent1DFC2ECC-DELETE_IN_PROGRESS-2025-03-11T03:06:22.460Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataAmplifyTableManagerNestedStackA-4JC1SUB3AUAB',
        LogicalResourceId: 'TableManagerCustomProviderframeworkonEvent1DFC2ECC',
        PhysicalResourceId:
          'amplify-sampleprojectapp--TableManagerCustomProvid-ejRomWhpK7wD',
        ResourceType: 'AWS::Lambda::Function',
        Timestamp: new Date('2025-03-11T03:06:22.460'),
        ResourceStatus: 'DELETE_IN_PROGRESS',
        ResourceProperties:
          '{"Role":"arn:aws:iam::123456789012:role/amplify-sampleprojectapp--AmplifyManagedTableOnEven-ittqhqj1HUm0","Runtime":"nodejs18.x","Description":"AmplifyManagedTable - onEvent (amplify-sampleprojectapp-user-sandbox-0e1752a889/data/amplifyData/AmplifyTableManager/TableManagerCustomProvider)","Timeout":"840","Environment":{"Variables":{"WAITER_STATE_MACHINE_ARN":"arn:aws:states:us-west-2:123456789012:stateMachine:AmplifyTableWaiterStateMachine060600BC-a9dwtkeW9gTF"}},"Handler":"amplify-table-manager-handler.onEvent","Code":{"S3Bucket":"cdk-hnb659fds-assets-123456789012-us-west-2","S3Key":"ca9699b9a2845c45e80cba1111f95ae2ac773af7d87163ae9c808ec547e38e00.zip"},"Tags":[{"Value":"sandbox","Key":"amplify:deployment-type"},{"Value":"amplifyData","Key":"amplify:friendly-name"},{"Value":"amplify","Key":"created-by"}]}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'TableManagerCustomProviderframeworkonEvent1DFC2ECC',
        },
        constructPath:
          'data/amplifyData/AmplifyTableManager/TableManagerCustomProvider/framework-onEvent',
      },
      progress: {
        completed: 128,
        formatted: '128',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataAmplifyTableManagerNestedStackA-4JC1SUB3AUAB | 128 | 11:06:22 PM | DELETE_IN_PROGRESS | AWS::CDK::Metadata | auth/CDKMetadata/Default (CDKMetadata)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataAmplifyTableManagerNestedStackA-4JC1SUB3AUAB/b71af650-fe24-11ef-ad54-0603cfec563b',
        EventId: 'CDKMetadata-DELETE_IN_PROGRESS-2025-03-11T03:06:22.464Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataAmplifyTableManagerNestedStackA-4JC1SUB3AUAB',
        LogicalResourceId: 'CDKMetadata',
        PhysicalResourceId: 'b71af650-fe24-11ef-ad54-0603cfec563b',
        ResourceType: 'AWS::CDK::Metadata',
        Timestamp: new Date('2025-03-11T03:06:22.464'),
        ResourceStatus: 'DELETE_IN_PROGRESS',
        ResourceProperties:
          '{"Analytics":"v2:deflate64:H4sIAAAAAAAA/zWNywqDMBBFv8V9nPrYuK2FLkvRD5AxmUp8JOAklRLy70VtV+dczuIWkFcFZAlunEo1pbPuITyIHanWoZwEbtwFjQuExs4kbi9z8GlnLT/7PC2KGZdeIYS7N9Jpa/b29yi47JCZHMN1h+ASai8ncjUyRdEQW79KEkdtHQ7aDMfZL0RhrCIY+fIuMsgryJORtU5Xb5xeCJqTX6fR9hzPAAAA"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'CDKMetadata',
        },
        constructPath: 'auth/CDKMetadata/Default',
      },
      progress: {
        completed: 128,
        formatted: '128',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataAmplifyTableManagerNestedStackA-4JC1SUB3AUAB | 127 | 11:06:23 PM | DELETE_COMPLETE | AWS::CDK::Metadata | auth/CDKMetadata/Default (CDKMetadata)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataAmplifyTableManagerNestedStackA-4JC1SUB3AUAB/b71af650-fe24-11ef-ad54-0603cfec563b',
        EventId: 'CDKMetadata-DELETE_COMPLETE-2025-03-11T03:06:23.256Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataAmplifyTableManagerNestedStackA-4JC1SUB3AUAB',
        LogicalResourceId: 'CDKMetadata',
        PhysicalResourceId: 'b71af650-fe24-11ef-ad54-0603cfec563b',
        ResourceType: 'AWS::CDK::Metadata',
        Timestamp: new Date('2025-03-11T03:06:23.256'),
        ResourceStatus: 'DELETE_COMPLETE',
        ResourceProperties:
          '{"Analytics":"v2:deflate64:H4sIAAAAAAAA/zWNywqDMBBFv8V9nPrYuK2FLkvRD5AxmUp8JOAklRLy70VtV+dczuIWkFcFZAlunEo1pbPuITyIHanWoZwEbtwFjQuExs4kbi9z8GlnLT/7PC2KGZdeIYS7N9Jpa/b29yi47JCZHMN1h+ASai8ncjUyRdEQW79KEkdtHQ7aDMfZL0RhrCIY+fIuMsgryJORtU5Xb5xeCJqTX6fR9hzPAAAA"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'CDKMetadata',
        },
        constructPath: 'auth/CDKMetadata/Default',
      },
      progress: {
        completed: 127,
        formatted: '127',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I0000',
    message:
      '[sdk info] CloudFormation.DescribeStackEvents({"StackName":"amplify-sampleprojectapp-user-sandbox-0e1752a889"}) -> OK',
  },
  {
    code: 'CDK_TOOLKIT_I0000',
    message:
      '[sdk info] CloudFormation.DescribeStackEvents({"StackName":"arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C/b355b0f0-fe24-11ef-a0bd-020db6799971"}) -> OK',
  },
  {
    code: 'CDK_TOOLKIT_I0000',
    message:
      '[sdk info] CloudFormation.DescribeStacks({"StackName":"amplify-sampleprojectapp-user-sandbox-0e1752a889"}) -> OK',
  },
  {
    code: 'CDK_TOOLKIT_I0000',
    message:
      'Stack amplify-sampleprojectapp-user-sandbox-0e1752a889 has an ongoing operation in progress and is not stable (DELETE_IN_PROGRESS)',
  },
  {
    code: 'CDK_TOOLKIT_I0000',
    message:
      '[sdk info] CloudFormation.DescribeStackEvents({"StackName":"arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataAmplifyTableManagerNestedStackA-4JC1SUB3AUAB/b71af650-fe24-11ef-ad54-0603cfec563b"}) -> OK',
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataAmplifyTableManagerNestedStackA-4JC1SUB3AUAB | 128 | 11:06:25 PM | DELETE_COMPLETE | AWS::Lambda::Function | data/amplifyData/AmplifyTableManager/TableManagerCustomProvider/framework-onEvent (TableManagerCustomProviderframeworkonEvent1DFC2ECC)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataAmplifyTableManagerNestedStackA-4JC1SUB3AUAB/b71af650-fe24-11ef-ad54-0603cfec563b',
        EventId:
          'TableManagerCustomProviderframeworkonEvent1DFC2ECC-DELETE_COMPLETE-2025-03-11T03:06:25.963Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataAmplifyTableManagerNestedStackA-4JC1SUB3AUAB',
        LogicalResourceId: 'TableManagerCustomProviderframeworkonEvent1DFC2ECC',
        PhysicalResourceId:
          'amplify-sampleprojectapp--TableManagerCustomProvid-ejRomWhpK7wD',
        ResourceType: 'AWS::Lambda::Function',
        Timestamp: new Date('2025-03-11T03:06:25.963'),
        ResourceStatus: 'DELETE_COMPLETE',
        ResourceProperties:
          '{"Role":"arn:aws:iam::123456789012:role/amplify-sampleprojectapp--AmplifyManagedTableOnEven-ittqhqj1HUm0","Runtime":"nodejs18.x","Description":"AmplifyManagedTable - onEvent (amplify-sampleprojectapp-user-sandbox-0e1752a889/data/amplifyData/AmplifyTableManager/TableManagerCustomProvider)","Timeout":"840","Environment":{"Variables":{"WAITER_STATE_MACHINE_ARN":"arn:aws:states:us-west-2:123456789012:stateMachine:AmplifyTableWaiterStateMachine060600BC-a9dwtkeW9gTF"}},"Handler":"amplify-table-manager-handler.onEvent","Code":{"S3Bucket":"cdk-hnb659fds-assets-123456789012-us-west-2","S3Key":"ca9699b9a2845c45e80cba1111f95ae2ac773af7d87163ae9c808ec547e38e00.zip"},"Tags":[{"Value":"sandbox","Key":"amplify:deployment-type"},{"Value":"amplifyData","Key":"amplify:friendly-name"},{"Value":"amplify","Key":"created-by"}]}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'TableManagerCustomProviderframeworkonEvent1DFC2ECC',
        },
        constructPath:
          'data/amplifyData/AmplifyTableManager/TableManagerCustomProvider/framework-onEvent',
      },
      progress: {
        completed: 128,
        formatted: '128',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataAmplifyTableManagerNestedStackA-4JC1SUB3AUAB | 128 | 11:06:26 PM | DELETE_IN_PROGRESS | AWS::IAM::Policy | data/amplifyData/AmplifyTableManager/AmplifyManagedTableOnEventRole/DefaultPolicy (AmplifyManagedTableOnEventRoleDefaultPolicyF6DABCB6)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataAmplifyTableManagerNestedStackA-4JC1SUB3AUAB/b71af650-fe24-11ef-ad54-0603cfec563b',
        EventId:
          'AmplifyManagedTableOnEventRoleDefaultPolicyF6DABCB6-DELETE_IN_PROGRESS-2025-03-11T03:06:26.322Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataAmplifyTableManagerNestedStackA-4JC1SUB3AUAB',
        LogicalResourceId:
          'AmplifyManagedTableOnEventRoleDefaultPolicyF6DABCB6',
        PhysicalResourceId: 'ampli-Ampli-LBsBkXmX0JdJ',
        ResourceType: 'AWS::IAM::Policy',
        Timestamp: new Date('2025-03-11T03:06:26.322'),
        ResourceStatus: 'DELETE_IN_PROGRESS',
        ResourceProperties:
          '{"PolicyName":"AmplifyManagedTableOnEventRoleDefaultPolicyF6DABCB6","PolicyDocument":{"Version":"2012-10-17","Statement":[{"Action":"states:StartExecution","Resource":"arn:aws:states:us-west-2:123456789012:stateMachine:AmplifyTableWaiterStateMachine060600BC-a9dwtkeW9gTF","Effect":"Allow"}]},"Roles":["amplify-sampleprojectapp--AmplifyManagedTableOnEven-ittqhqj1HUm0"]}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'AmplifyManagedTableOnEventRoleDefaultPolicyF6DABCB6',
        },
        constructPath:
          'data/amplifyData/AmplifyTableManager/AmplifyManagedTableOnEventRole/DefaultPolicy',
      },
      progress: {
        completed: 128,
        formatted: '128',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataAmplifyTableManagerNestedStackA-4JC1SUB3AUAB | 129 | 11:06:27 PM | DELETE_COMPLETE | AWS::IAM::Policy | data/amplifyData/AmplifyTableManager/AmplifyManagedTableOnEventRole/DefaultPolicy (AmplifyManagedTableOnEventRoleDefaultPolicyF6DABCB6)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataAmplifyTableManagerNestedStackA-4JC1SUB3AUAB/b71af650-fe24-11ef-ad54-0603cfec563b',
        EventId:
          'AmplifyManagedTableOnEventRoleDefaultPolicyF6DABCB6-DELETE_COMPLETE-2025-03-11T03:06:27.424Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataAmplifyTableManagerNestedStackA-4JC1SUB3AUAB',
        LogicalResourceId:
          'AmplifyManagedTableOnEventRoleDefaultPolicyF6DABCB6',
        PhysicalResourceId: 'ampli-Ampli-LBsBkXmX0JdJ',
        ResourceType: 'AWS::IAM::Policy',
        Timestamp: new Date('2025-03-11T03:06:27.424'),
        ResourceStatus: 'DELETE_COMPLETE',
        ResourceProperties:
          '{"PolicyName":"AmplifyManagedTableOnEventRoleDefaultPolicyF6DABCB6","PolicyDocument":{"Version":"2012-10-17","Statement":[{"Action":"states:StartExecution","Resource":"arn:aws:states:us-west-2:123456789012:stateMachine:AmplifyTableWaiterStateMachine060600BC-a9dwtkeW9gTF","Effect":"Allow"}]},"Roles":["amplify-sampleprojectapp--AmplifyManagedTableOnEven-ittqhqj1HUm0"]}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'AmplifyManagedTableOnEventRoleDefaultPolicyF6DABCB6',
        },
        constructPath:
          'data/amplifyData/AmplifyTableManager/AmplifyManagedTableOnEventRole/DefaultPolicy',
      },
      progress: {
        completed: 129,
        formatted: '129',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataAmplifyTableManagerNestedStackA-4JC1SUB3AUAB | 129 | 11:06:27 PM | DELETE_IN_PROGRESS | AWS::IAM::Role | data/amplifyData/AmplifyTableManager/AmplifyManagedTableOnEventRole (AmplifyManagedTableOnEventRoleB4E71DEA)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataAmplifyTableManagerNestedStackA-4JC1SUB3AUAB/b71af650-fe24-11ef-ad54-0603cfec563b',
        EventId:
          'AmplifyManagedTableOnEventRoleB4E71DEA-DELETE_IN_PROGRESS-2025-03-11T03:06:27.768Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataAmplifyTableManagerNestedStackA-4JC1SUB3AUAB',
        LogicalResourceId: 'AmplifyManagedTableOnEventRoleB4E71DEA',
        PhysicalResourceId:
          'amplify-sampleprojectapp--AmplifyManagedTableOnEven-ittqhqj1HUm0',
        ResourceType: 'AWS::IAM::Role',
        Timestamp: new Date('2025-03-11T03:06:27.768'),
        ResourceStatus: 'DELETE_IN_PROGRESS',
        ResourceProperties:
          '{"ManagedPolicyArns":["arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"],"Policies":[{"PolicyName":"CreateUpdateDeleteTablesPolicy","PolicyDocument":{"Version":"2012-10-17","Statement":[{"Action":["dynamodb:CreateTable","dynamodb:UpdateTable","dynamodb:DeleteTable","dynamodb:DescribeTable","dynamodb:DescribeContinuousBackups","dynamodb:DescribeTimeToLive","dynamodb:UpdateContinuousBackups","dynamodb:UpdateTimeToLive","dynamodb:TagResource","dynamodb:UntagResource","dynamodb:ListTagsOfResource"],"Resource":"arn:aws:dynamodb:us-west-2:123456789012:table/*-ezabg7fk2jecvodrblowtgbsme-NONE","Effect":"Allow"},{"Action":"lambda:ListTags","Resource":"arn:aws:lambda:us-west-2:123456789012:function:*TableManager*","Effect":"Allow"}]}}],"AssumeRolePolicyDocument":{"Version":"2012-10-17","Statement":[{"Action":"sts:AssumeRole","Effect":"Allow","Principal":{"Service":"lambda.amazonaws.com"}}]},"Tags":[{"Value":"sandbox","Key":"amplify:deployment-type"},{"Value":"amplifyData","Key":"amplify:friendly-name"},{"Value":"amplify","Key":"created-by"}]}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'AmplifyManagedTableOnEventRoleB4E71DEA',
        },
        constructPath:
          'data/amplifyData/AmplifyTableManager/AmplifyManagedTableOnEventRole',
      },
      progress: {
        completed: 129,
        formatted: '129',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataAmplifyTableManagerNestedStackA-4JC1SUB3AUAB | 129 | 11:06:27 PM | DELETE_IN_PROGRESS | AWS::StepFunctions::StateMachine | data/amplifyData/AmplifyTableManager/AmplifyTableWaiterStateMachine (AmplifyTableWaiterStateMachine060600BC)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataAmplifyTableManagerNestedStackA-4JC1SUB3AUAB/b71af650-fe24-11ef-ad54-0603cfec563b',
        EventId:
          'AmplifyTableWaiterStateMachine060600BC-DELETE_IN_PROGRESS-2025-03-11T03:06:27.784Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataAmplifyTableManagerNestedStackA-4JC1SUB3AUAB',
        LogicalResourceId: 'AmplifyTableWaiterStateMachine060600BC',
        PhysicalResourceId:
          'arn:aws:states:us-west-2:123456789012:stateMachine:AmplifyTableWaiterStateMachine060600BC-a9dwtkeW9gTF',
        ResourceType: 'AWS::StepFunctions::StateMachine',
        Timestamp: new Date('2025-03-11T03:06:27.784'),
        ResourceStatus: 'DELETE_IN_PROGRESS',
        ResourceProperties:
          '{"DefinitionString":"{\\"StartAt\\":\\"framework-isComplete-task\\",\\"States\\":{\\"framework-isComplete-task\\":{\\"End\\":true,\\"Retry\\":[{\\"ErrorEquals\\":[\\"States.ALL\\"],\\"IntervalSeconds\\":10,\\"MaxAttempts\\":360,\\"BackoffRate\\":1}],\\"Type\\":\\"Task\\",\\"Resource\\":\\"arn:aws:lambda:us-west-2:123456789012:function:amplify-sampleprojectapp--TableManagerCustomProvid-1Xet7ZcX63fX\\"}}}","RoleArn":"arn:aws:iam::123456789012:role/amplify-sampleprojectapp--AmplifyTableWaiterStateMa-9xX5tAP2G2tg"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'AmplifyTableWaiterStateMachine060600BC',
        },
        constructPath:
          'data/amplifyData/AmplifyTableManager/AmplifyTableWaiterStateMachine',
      },
      progress: {
        completed: 129,
        formatted: '129',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I0000',
    message:
      '[sdk info] CloudFormation.DescribeStackEvents({"StackName":"amplify-sampleprojectapp-user-sandbox-0e1752a889"}) -> OK',
  },
  {
    code: 'CDK_TOOLKIT_I0000',
    message:
      '[sdk info] CloudFormation.DescribeStackEvents({"StackName":"arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C/b355b0f0-fe24-11ef-a0bd-020db6799971"}) -> OK',
  },
  {
    code: 'CDK_TOOLKIT_I0000',
    message:
      '[sdk info] CloudFormation.DescribeStacks({"StackName":"amplify-sampleprojectapp-user-sandbox-0e1752a889"}) -> OK',
  },
  {
    code: 'CDK_TOOLKIT_I0000',
    message:
      'Stack amplify-sampleprojectapp-user-sandbox-0e1752a889 has an ongoing operation in progress and is not stable (DELETE_IN_PROGRESS)',
  },
  {
    code: 'CDK_TOOLKIT_I0000',
    message:
      '[sdk info] CloudFormation.DescribeStackEvents({"StackName":"arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataAmplifyTableManagerNestedStackA-4JC1SUB3AUAB/b71af650-fe24-11ef-ad54-0603cfec563b"}) -> OK',
  },
  {
    code: 'CDK_TOOLKIT_I0000',
    message:
      '[sdk info] CloudFormation.DescribeStackEvents({"StackName":"amplify-sampleprojectapp-user-sandbox-0e1752a889"}) -> OK',
  },
  {
    code: 'CDK_TOOLKIT_I0000',
    message:
      '[sdk info] CloudFormation.DescribeStackEvents({"StackName":"arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C/b355b0f0-fe24-11ef-a0bd-020db6799971"}) -> OK',
  },
  {
    code: 'CDK_TOOLKIT_I0000',
    message:
      '[sdk info] CloudFormation.DescribeStackEvents({"StackName":"arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataAmplifyTableManagerNestedStackA-4JC1SUB3AUAB/b71af650-fe24-11ef-ad54-0603cfec563b"}) -> OK',
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0e1752a889 | 130 | 11:06:32 PM | DELETE_COMPLETE | AWS::CloudFormation::Stack | MyCustomResources.NestedStack/MyCustomResources.NestedStackResource (MyCustomResourcesBB610599)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0e1752a889/912e40a0-fe24-11ef-ab54-068258314c15',
        EventId:
          'MyCustomResourcesBB610599-DELETE_COMPLETE-2025-03-11T03:06:32.851Z',
        StackName: 'amplify-sampleprojectapp-user-sandbox-0e1752a889',
        LogicalResourceId: 'MyCustomResourcesBB610599',
        PhysicalResourceId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0e1752a889-MyCustomResourcesBB610599-8G262VTBDJMK/96f8f2f0-fe24-11ef-a75d-0aa9ea96647d',
        ResourceType: 'AWS::CloudFormation::Stack',
        Timestamp: new Date('2025-03-11T03:06:32.851'),
        ResourceStatus: 'DELETE_COMPLETE',
        ResourceProperties:
          '{"TemplateURL":"https://s3.us-west-2.amazonaws.com/cdk-hnb659fds-assets-123456789012-us-west-2/2b0cd76a5fea2795b3e3b23e2c4cb8eaf621211d2c9e2303e2868ac0be4607bc.json","Tags":[{"Value":"sandbox","Key":"amplify:deployment-type"},{"Value":"amplify","Key":"created-by"}]}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'MyCustomResourcesBB610599',
        },
        constructPath:
          'MyCustomResources.NestedStack/MyCustomResources.NestedStackResource',
      },
      progress: {
        completed: 130,
        formatted: '130',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataAmplifyTableManagerNestedStackA-4JC1SUB3AUAB | 131 | 11:06:36 PM | DELETE_COMPLETE | AWS::IAM::Role | data/amplifyData/AmplifyTableManager/AmplifyManagedTableOnEventRole (AmplifyManagedTableOnEventRoleB4E71DEA)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataAmplifyTableManagerNestedStackA-4JC1SUB3AUAB/b71af650-fe24-11ef-ad54-0603cfec563b',
        EventId:
          'AmplifyManagedTableOnEventRoleB4E71DEA-DELETE_COMPLETE-2025-03-11T03:06:36.880Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataAmplifyTableManagerNestedStackA-4JC1SUB3AUAB',
        LogicalResourceId: 'AmplifyManagedTableOnEventRoleB4E71DEA',
        PhysicalResourceId:
          'amplify-sampleprojectapp--AmplifyManagedTableOnEven-ittqhqj1HUm0',
        ResourceType: 'AWS::IAM::Role',
        Timestamp: new Date('2025-03-11T03:06:36.880'),
        ResourceStatus: 'DELETE_COMPLETE',
        ResourceProperties:
          '{"ManagedPolicyArns":["arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"],"Policies":[{"PolicyName":"CreateUpdateDeleteTablesPolicy","PolicyDocument":{"Version":"2012-10-17","Statement":[{"Action":["dynamodb:CreateTable","dynamodb:UpdateTable","dynamodb:DeleteTable","dynamodb:DescribeTable","dynamodb:DescribeContinuousBackups","dynamodb:DescribeTimeToLive","dynamodb:UpdateContinuousBackups","dynamodb:UpdateTimeToLive","dynamodb:TagResource","dynamodb:UntagResource","dynamodb:ListTagsOfResource"],"Resource":"arn:aws:dynamodb:us-west-2:123456789012:table/*-ezabg7fk2jecvodrblowtgbsme-NONE","Effect":"Allow"},{"Action":"lambda:ListTags","Resource":"arn:aws:lambda:us-west-2:123456789012:function:*TableManager*","Effect":"Allow"}]}}],"AssumeRolePolicyDocument":{"Version":"2012-10-17","Statement":[{"Action":"sts:AssumeRole","Effect":"Allow","Principal":{"Service":"lambda.amazonaws.com"}}]},"Tags":[{"Value":"sandbox","Key":"amplify:deployment-type"},{"Value":"amplifyData","Key":"amplify:friendly-name"},{"Value":"amplify","Key":"created-by"}]}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'AmplifyManagedTableOnEventRoleB4E71DEA',
        },
        constructPath:
          'data/amplifyData/AmplifyTableManager/AmplifyManagedTableOnEventRole',
      },
      progress: {
        completed: 131,
        formatted: '131',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I0000',
    message:
      '[sdk info] CloudFormation.DescribeStacks({"StackName":"amplify-sampleprojectapp-user-sandbox-0e1752a889"}) -> OK',
  },
  {
    code: 'CDK_TOOLKIT_I0000',
    message:
      'Stack amplify-sampleprojectapp-user-sandbox-0e1752a889 has an ongoing operation in progress and is not stable (DELETE_IN_PROGRESS)',
  },
  {
    code: 'CDK_TOOLKIT_I0000',
    message:
      '[sdk info] CloudFormation.DescribeStackEvents({"StackName":"amplify-sampleprojectapp-user-sandbox-0e1752a889"}) -> OK',
  },
  {
    code: 'CDK_TOOLKIT_I0000',
    message:
      '[sdk info] CloudFormation.DescribeStackEvents({"StackName":"arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C/b355b0f0-fe24-11ef-a0bd-020db6799971"}) -> OK',
  },
  {
    code: 'CDK_TOOLKIT_I0000',
    message:
      '[sdk info] CloudFormation.DescribeStackEvents({"StackName":"arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataAmplifyTableManagerNestedStackA-4JC1SUB3AUAB/b71af650-fe24-11ef-ad54-0603cfec563b"}) -> OK',
  },
  {
    code: 'CDK_TOOLKIT_I0000',
    message:
      '[sdk info] CloudFormation.DescribeStacks({"StackName":"amplify-sampleprojectapp-user-sandbox-0e1752a889"}) -> OK',
  },
  {
    code: 'CDK_TOOLKIT_I0000',
    message:
      'Stack amplify-sampleprojectapp-user-sandbox-0e1752a889 has an ongoing operation in progress and is not stable (DELETE_IN_PROGRESS)',
  },
  {
    code: 'CDK_TOOLKIT_I0000',
    message:
      '[sdk info] CloudFormation.DescribeStackEvents({"StackName":"amplify-sampleprojectapp-user-sandbox-0e1752a889"}) -> OK',
  },
  {
    code: 'CDK_TOOLKIT_I0000',
    message:
      '[sdk info] CloudFormation.DescribeStackEvents({"StackName":"arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C/b355b0f0-fe24-11ef-a0bd-020db6799971"}) -> OK',
  },
  {
    code: 'CDK_TOOLKIT_I0000',
    message:
      '[sdk info] CloudFormation.DescribeStackEvents({"StackName":"arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataAmplifyTableManagerNestedStackA-4JC1SUB3AUAB/b71af650-fe24-11ef-ad54-0603cfec563b"}) -> OK',
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataAmplifyTableManagerNestedStackA-4JC1SUB3AUAB | 132 | 11:06:44 PM | DELETE_COMPLETE | AWS::StepFunctions::StateMachine | data/amplifyData/AmplifyTableManager/AmplifyTableWaiterStateMachine (AmplifyTableWaiterStateMachine060600BC)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataAmplifyTableManagerNestedStackA-4JC1SUB3AUAB/b71af650-fe24-11ef-ad54-0603cfec563b',
        EventId:
          'AmplifyTableWaiterStateMachine060600BC-DELETE_COMPLETE-2025-03-11T03:06:44.916Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataAmplifyTableManagerNestedStackA-4JC1SUB3AUAB',
        LogicalResourceId: 'AmplifyTableWaiterStateMachine060600BC',
        PhysicalResourceId:
          'arn:aws:states:us-west-2:123456789012:stateMachine:AmplifyTableWaiterStateMachine060600BC-a9dwtkeW9gTF',
        ResourceType: 'AWS::StepFunctions::StateMachine',
        Timestamp: new Date('2025-03-11T03:06:44.916'),
        ResourceStatus: 'DELETE_COMPLETE',
        ResourceProperties:
          '{"DefinitionString":"{\\"StartAt\\":\\"framework-isComplete-task\\",\\"States\\":{\\"framework-isComplete-task\\":{\\"End\\":true,\\"Retry\\":[{\\"ErrorEquals\\":[\\"States.ALL\\"],\\"IntervalSeconds\\":10,\\"MaxAttempts\\":360,\\"BackoffRate\\":1}],\\"Type\\":\\"Task\\",\\"Resource\\":\\"arn:aws:lambda:us-west-2:123456789012:function:amplify-sampleprojectapp--TableManagerCustomProvid-1Xet7ZcX63fX\\"}}}","RoleArn":"arn:aws:iam::123456789012:role/amplify-sampleprojectapp--AmplifyTableWaiterStateMa-9xX5tAP2G2tg"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'AmplifyTableWaiterStateMachine060600BC',
        },
        constructPath:
          'data/amplifyData/AmplifyTableManager/AmplifyTableWaiterStateMachine',
      },
      progress: {
        completed: 132,
        formatted: '132',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataAmplifyTableManagerNestedStackA-4JC1SUB3AUAB | 132 | 11:06:45 PM | DELETE_IN_PROGRESS | AWS::IAM::Policy | data/amplifyData/AmplifyTableManager/AmplifyTableWaiterStateMachine/Role/DefaultPolicy (AmplifyTableWaiterStateMachineRoleDefaultPolicy89F3836A)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataAmplifyTableManagerNestedStackA-4JC1SUB3AUAB/b71af650-fe24-11ef-ad54-0603cfec563b',
        EventId:
          'AmplifyTableWaiterStateMachineRoleDefaultPolicy89F3836A-DELETE_IN_PROGRESS-2025-03-11T03:06:45.295Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataAmplifyTableManagerNestedStackA-4JC1SUB3AUAB',
        LogicalResourceId:
          'AmplifyTableWaiterStateMachineRoleDefaultPolicy89F3836A',
        PhysicalResourceId: 'ampli-Ampli-HLXzdJMLgSSv',
        ResourceType: 'AWS::IAM::Policy',
        Timestamp: new Date('2025-03-11T03:06:45.295'),
        ResourceStatus: 'DELETE_IN_PROGRESS',
        ResourceProperties:
          '{"PolicyName":"AmplifyTableWaiterStateMachineRoleDefaultPolicy89F3836A","PolicyDocument":{"Version":"2012-10-17","Statement":[{"Action":"lambda:InvokeFunction","Resource":["arn:aws:lambda:us-west-2:123456789012:function:amplify-sampleprojectapp--TableManagerCustomProvid-1Xet7ZcX63fX","arn:aws:lambda:us-west-2:123456789012:function:amplify-sampleprojectapp--TableManagerCustomProvid-1Xet7ZcX63fX:*"],"Effect":"Allow"}]},"Roles":["amplify-sampleprojectapp--AmplifyTableWaiterStateMa-9xX5tAP2G2tg"]}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'AmplifyTableWaiterStateMachineRoleDefaultPolicy89F3836A',
        },
        constructPath:
          'data/amplifyData/AmplifyTableManager/AmplifyTableWaiterStateMachine/Role/DefaultPolicy',
      },
      progress: {
        completed: 132,
        formatted: '132',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataAmplifyTableManagerNestedStackA-4JC1SUB3AUAB | 133 | 11:06:46 PM | DELETE_COMPLETE | AWS::IAM::Policy | data/amplifyData/AmplifyTableManager/AmplifyTableWaiterStateMachine/Role/DefaultPolicy (AmplifyTableWaiterStateMachineRoleDefaultPolicy89F3836A)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataAmplifyTableManagerNestedStackA-4JC1SUB3AUAB/b71af650-fe24-11ef-ad54-0603cfec563b',
        EventId:
          'AmplifyTableWaiterStateMachineRoleDefaultPolicy89F3836A-DELETE_COMPLETE-2025-03-11T03:06:46.169Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataAmplifyTableManagerNestedStackA-4JC1SUB3AUAB',
        LogicalResourceId:
          'AmplifyTableWaiterStateMachineRoleDefaultPolicy89F3836A',
        PhysicalResourceId: 'ampli-Ampli-HLXzdJMLgSSv',
        ResourceType: 'AWS::IAM::Policy',
        Timestamp: new Date('2025-03-11T03:06:46.169'),
        ResourceStatus: 'DELETE_COMPLETE',
        ResourceProperties:
          '{"PolicyName":"AmplifyTableWaiterStateMachineRoleDefaultPolicy89F3836A","PolicyDocument":{"Version":"2012-10-17","Statement":[{"Action":"lambda:InvokeFunction","Resource":["arn:aws:lambda:us-west-2:123456789012:function:amplify-sampleprojectapp--TableManagerCustomProvid-1Xet7ZcX63fX","arn:aws:lambda:us-west-2:123456789012:function:amplify-sampleprojectapp--TableManagerCustomProvid-1Xet7ZcX63fX:*"],"Effect":"Allow"}]},"Roles":["amplify-sampleprojectapp--AmplifyTableWaiterStateMa-9xX5tAP2G2tg"]}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'AmplifyTableWaiterStateMachineRoleDefaultPolicy89F3836A',
        },
        constructPath:
          'data/amplifyData/AmplifyTableManager/AmplifyTableWaiterStateMachine/Role/DefaultPolicy',
      },
      progress: {
        completed: 133,
        formatted: '133',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataAmplifyTableManagerNestedStackA-4JC1SUB3AUAB | 133 | 11:06:46 PM | DELETE_IN_PROGRESS | AWS::Lambda::Function | data/amplifyData/AmplifyTableManager/TableManagerCustomProvider/framework-isComplete (TableManagerCustomProviderframeworkisComplete2E51021B)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataAmplifyTableManagerNestedStackA-4JC1SUB3AUAB/b71af650-fe24-11ef-ad54-0603cfec563b',
        EventId:
          'TableManagerCustomProviderframeworkisComplete2E51021B-DELETE_IN_PROGRESS-2025-03-11T03:06:46.493Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataAmplifyTableManagerNestedStackA-4JC1SUB3AUAB',
        LogicalResourceId:
          'TableManagerCustomProviderframeworkisComplete2E51021B',
        PhysicalResourceId:
          'amplify-sampleprojectapp--TableManagerCustomProvid-1Xet7ZcX63fX',
        ResourceType: 'AWS::Lambda::Function',
        Timestamp: new Date('2025-03-11T03:06:46.493'),
        ResourceStatus: 'DELETE_IN_PROGRESS',
        ResourceProperties:
          '{"Role":"arn:aws:iam::123456789012:role/amplify-sampleprojectapp--AmplifyManagedTableIsComp-aKxSvonhSqF5","Runtime":"nodejs18.x","Description":"AmplifyManagedTable - isComplete (amplify-sampleprojectapp-user-sandbox-0e1752a889/data/amplifyData/AmplifyTableManager/TableManagerCustomProvider)","Timeout":"840","Handler":"amplify-table-manager-handler.isComplete","Code":{"S3Bucket":"cdk-hnb659fds-assets-123456789012-us-west-2","S3Key":"ca9699b9a2845c45e80cba1111f95ae2ac773af7d87163ae9c808ec547e38e00.zip"},"Tags":[{"Value":"sandbox","Key":"amplify:deployment-type"},{"Value":"amplifyData","Key":"amplify:friendly-name"},{"Value":"amplify","Key":"created-by"}]}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'TableManagerCustomProviderframeworkisComplete2E51021B',
        },
        constructPath:
          'data/amplifyData/AmplifyTableManager/TableManagerCustomProvider/framework-isComplete',
      },
      progress: {
        completed: 133,
        formatted: '133',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataAmplifyTableManagerNestedStackA-4JC1SUB3AUAB | 133 | 11:06:46 PM | DELETE_IN_PROGRESS | AWS::IAM::Role | data/amplifyData/AmplifyTableManager/AmplifyTableWaiterStateMachine/Role (AmplifyTableWaiterStateMachineRole470BE899)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataAmplifyTableManagerNestedStackA-4JC1SUB3AUAB/b71af650-fe24-11ef-ad54-0603cfec563b',
        EventId:
          'AmplifyTableWaiterStateMachineRole470BE899-DELETE_IN_PROGRESS-2025-03-11T03:06:46.537Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataAmplifyTableManagerNestedStackA-4JC1SUB3AUAB',
        LogicalResourceId: 'AmplifyTableWaiterStateMachineRole470BE899',
        PhysicalResourceId:
          'amplify-sampleprojectapp--AmplifyTableWaiterStateMa-9xX5tAP2G2tg',
        ResourceType: 'AWS::IAM::Role',
        Timestamp: new Date('2025-03-11T03:06:46.537'),
        ResourceStatus: 'DELETE_IN_PROGRESS',
        ResourceProperties:
          '{"AssumeRolePolicyDocument":{"Version":"2012-10-17","Statement":[{"Action":"sts:AssumeRole","Effect":"Allow","Principal":{"Service":"states.amazonaws.com"}}]},"Tags":[{"Value":"sandbox","Key":"amplify:deployment-type"},{"Value":"amplifyData","Key":"amplify:friendly-name"},{"Value":"amplify","Key":"created-by"}]}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'AmplifyTableWaiterStateMachineRole470BE899',
        },
        constructPath:
          'data/amplifyData/AmplifyTableManager/AmplifyTableWaiterStateMachine/Role',
      },
      progress: {
        completed: 133,
        formatted: '133',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I0000',
    message:
      '[sdk info] CloudFormation.DescribeStacks({"StackName":"amplify-sampleprojectapp-user-sandbox-0e1752a889"}) -> OK',
  },
  {
    code: 'CDK_TOOLKIT_I0000',
    message:
      'Stack amplify-sampleprojectapp-user-sandbox-0e1752a889 has an ongoing operation in progress and is not stable (DELETE_IN_PROGRESS)',
  },
  {
    code: 'CDK_TOOLKIT_I0000',
    message:
      '[sdk info] CloudFormation.DescribeStackEvents({"StackName":"amplify-sampleprojectapp-user-sandbox-0e1752a889"}) -> OK',
  },
  {
    code: 'CDK_TOOLKIT_I0000',
    message:
      '[sdk info] CloudFormation.DescribeStackEvents({"StackName":"arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C/b355b0f0-fe24-11ef-a0bd-020db6799971"}) -> OK',
  },
  {
    code: 'CDK_TOOLKIT_I0000',
    message:
      '[sdk info] CloudFormation.DescribeStackEvents({"StackName":"arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataAmplifyTableManagerNestedStackA-4JC1SUB3AUAB/b71af650-fe24-11ef-ad54-0603cfec563b"}) -> OK',
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataAmplifyTableManagerNestedStackA-4JC1SUB3AUAB | 134 | 11:06:50 PM | DELETE_COMPLETE | AWS::Lambda::Function | data/amplifyData/AmplifyTableManager/TableManagerCustomProvider/framework-isComplete (TableManagerCustomProviderframeworkisComplete2E51021B)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataAmplifyTableManagerNestedStackA-4JC1SUB3AUAB/b71af650-fe24-11ef-ad54-0603cfec563b',
        EventId:
          'TableManagerCustomProviderframeworkisComplete2E51021B-DELETE_COMPLETE-2025-03-11T03:06:50.066Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataAmplifyTableManagerNestedStackA-4JC1SUB3AUAB',
        LogicalResourceId:
          'TableManagerCustomProviderframeworkisComplete2E51021B',
        PhysicalResourceId:
          'amplify-sampleprojectapp--TableManagerCustomProvid-1Xet7ZcX63fX',
        ResourceType: 'AWS::Lambda::Function',
        Timestamp: new Date('2025-03-11T03:06:50.066'),
        ResourceStatus: 'DELETE_COMPLETE',
        ResourceProperties:
          '{"Role":"arn:aws:iam::123456789012:role/amplify-sampleprojectapp--AmplifyManagedTableIsComp-aKxSvonhSqF5","Runtime":"nodejs18.x","Description":"AmplifyManagedTable - isComplete (amplify-sampleprojectapp-user-sandbox-0e1752a889/data/amplifyData/AmplifyTableManager/TableManagerCustomProvider)","Timeout":"840","Handler":"amplify-table-manager-handler.isComplete","Code":{"S3Bucket":"cdk-hnb659fds-assets-123456789012-us-west-2","S3Key":"ca9699b9a2845c45e80cba1111f95ae2ac773af7d87163ae9c808ec547e38e00.zip"},"Tags":[{"Value":"sandbox","Key":"amplify:deployment-type"},{"Value":"amplifyData","Key":"amplify:friendly-name"},{"Value":"amplify","Key":"created-by"}]}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'TableManagerCustomProviderframeworkisComplete2E51021B',
        },
        constructPath:
          'data/amplifyData/AmplifyTableManager/TableManagerCustomProvider/framework-isComplete',
      },
      progress: {
        completed: 134,
        formatted: '134',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataAmplifyTableManagerNestedStackA-4JC1SUB3AUAB | 134 | 11:06:50 PM | DELETE_IN_PROGRESS | AWS::IAM::Role | data/amplifyData/AmplifyTableManager/AmplifyManagedTableIsCompleteRole (AmplifyManagedTableIsCompleteRoleF825222C)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataAmplifyTableManagerNestedStackA-4JC1SUB3AUAB/b71af650-fe24-11ef-ad54-0603cfec563b',
        EventId:
          'AmplifyManagedTableIsCompleteRoleF825222C-DELETE_IN_PROGRESS-2025-03-11T03:06:50.428Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataAmplifyTableManagerNestedStackA-4JC1SUB3AUAB',
        LogicalResourceId: 'AmplifyManagedTableIsCompleteRoleF825222C',
        PhysicalResourceId:
          'amplify-sampleprojectapp--AmplifyManagedTableIsComp-aKxSvonhSqF5',
        ResourceType: 'AWS::IAM::Role',
        Timestamp: new Date('2025-03-11T03:06:50.428'),
        ResourceStatus: 'DELETE_IN_PROGRESS',
        ResourceProperties:
          '{"ManagedPolicyArns":["arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"],"Policies":[{"PolicyName":"CreateUpdateDeleteTablesPolicy","PolicyDocument":{"Version":"2012-10-17","Statement":[{"Action":["dynamodb:CreateTable","dynamodb:UpdateTable","dynamodb:DeleteTable","dynamodb:DescribeTable","dynamodb:DescribeContinuousBackups","dynamodb:DescribeTimeToLive","dynamodb:UpdateContinuousBackups","dynamodb:UpdateTimeToLive","dynamodb:TagResource","dynamodb:UntagResource","dynamodb:ListTagsOfResource"],"Resource":"arn:aws:dynamodb:us-west-2:123456789012:table/*-ezabg7fk2jecvodrblowtgbsme-NONE","Effect":"Allow"},{"Action":"lambda:ListTags","Resource":"arn:aws:lambda:us-west-2:123456789012:function:*TableManager*","Effect":"Allow"}]}}],"AssumeRolePolicyDocument":{"Version":"2012-10-17","Statement":[{"Action":"sts:AssumeRole","Effect":"Allow","Principal":{"Service":"lambda.amazonaws.com"}}]},"Tags":[{"Value":"sandbox","Key":"amplify:deployment-type"},{"Value":"amplifyData","Key":"amplify:friendly-name"},{"Value":"amplify","Key":"created-by"}]}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'AmplifyManagedTableIsCompleteRoleF825222C',
        },
        constructPath:
          'data/amplifyData/AmplifyTableManager/AmplifyManagedTableIsCompleteRole',
      },
      progress: {
        completed: 134,
        formatted: '134',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I0000',
    message:
      '[sdk info] CloudFormation.DescribeStacks({"StackName":"amplify-sampleprojectapp-user-sandbox-0e1752a889"}) -> OK',
  },
  {
    code: 'CDK_TOOLKIT_I0000',
    message:
      'Stack amplify-sampleprojectapp-user-sandbox-0e1752a889 has an ongoing operation in progress and is not stable (DELETE_IN_PROGRESS)',
  },
  {
    code: 'CDK_TOOLKIT_I0000',
    message:
      '[sdk info] CloudFormation.DescribeStackEvents({"StackName":"amplify-sampleprojectapp-user-sandbox-0e1752a889"}) -> OK',
  },
  {
    code: 'CDK_TOOLKIT_I0000',
    message:
      '[sdk info] CloudFormation.DescribeStackEvents({"StackName":"arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C/b355b0f0-fe24-11ef-a0bd-020db6799971"}) -> OK',
  },
  {
    code: 'CDK_TOOLKIT_I0000',
    message:
      '[sdk info] CloudFormation.DescribeStackEvents({"StackName":"arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataAmplifyTableManagerNestedStackA-4JC1SUB3AUAB/b71af650-fe24-11ef-ad54-0603cfec563b"}) -> OK',
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataAmplifyTableManagerNestedStackA-4JC1SUB3AUAB | 135 | 11:06:55 PM | DELETE_COMPLETE | AWS::IAM::Role | data/amplifyData/AmplifyTableManager/AmplifyTableWaiterStateMachine/Role (AmplifyTableWaiterStateMachineRole470BE899)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataAmplifyTableManagerNestedStackA-4JC1SUB3AUAB/b71af650-fe24-11ef-ad54-0603cfec563b',
        EventId:
          'AmplifyTableWaiterStateMachineRole470BE899-DELETE_COMPLETE-2025-03-11T03:06:55.373Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataAmplifyTableManagerNestedStackA-4JC1SUB3AUAB',
        LogicalResourceId: 'AmplifyTableWaiterStateMachineRole470BE899',
        PhysicalResourceId:
          'amplify-sampleprojectapp--AmplifyTableWaiterStateMa-9xX5tAP2G2tg',
        ResourceType: 'AWS::IAM::Role',
        Timestamp: new Date('2025-03-11T03:06:55.373'),
        ResourceStatus: 'DELETE_COMPLETE',
        ResourceProperties:
          '{"AssumeRolePolicyDocument":{"Version":"2012-10-17","Statement":[{"Action":"sts:AssumeRole","Effect":"Allow","Principal":{"Service":"states.amazonaws.com"}}]},"Tags":[{"Value":"sandbox","Key":"amplify:deployment-type"},{"Value":"amplifyData","Key":"amplify:friendly-name"},{"Value":"amplify","Key":"created-by"}]}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'AmplifyTableWaiterStateMachineRole470BE899',
        },
        constructPath:
          'data/amplifyData/AmplifyTableManager/AmplifyTableWaiterStateMachine/Role',
      },
      progress: {
        completed: 135,
        formatted: '135',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I0000',
    message:
      '[sdk info] CloudFormation.DescribeStacks({"StackName":"amplify-sampleprojectapp-user-sandbox-0e1752a889"}) -> OK',
  },
  {
    code: 'CDK_TOOLKIT_I0000',
    message:
      'Stack amplify-sampleprojectapp-user-sandbox-0e1752a889 has an ongoing operation in progress and is not stable (DELETE_IN_PROGRESS)',
  },
  {
    code: 'CDK_TOOLKIT_I0000',
    message:
      '[sdk info] CloudFormation.DescribeStackEvents({"StackName":"amplify-sampleprojectapp-user-sandbox-0e1752a889"}) -> OK',
  },
  {
    code: 'CDK_TOOLKIT_I0000',
    message:
      '[sdk info] CloudFormation.DescribeStackEvents({"StackName":"arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C/b355b0f0-fe24-11ef-a0bd-020db6799971"}) -> OK',
  },
  {
    code: 'CDK_TOOLKIT_I0000',
    message:
      '[sdk info] CloudFormation.DescribeStackEvents({"StackName":"arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataAmplifyTableManagerNestedStackA-4JC1SUB3AUAB/b71af650-fe24-11ef-ad54-0603cfec563b"}) -> OK',
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataAmplifyTableManagerNestedStackA-4JC1SUB3AUAB | 136 | 11:06:59 PM | DELETE_COMPLETE | AWS::IAM::Role | data/amplifyData/AmplifyTableManager/AmplifyManagedTableIsCompleteRole (AmplifyManagedTableIsCompleteRoleF825222C)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataAmplifyTableManagerNestedStackA-4JC1SUB3AUAB/b71af650-fe24-11ef-ad54-0603cfec563b',
        EventId:
          'AmplifyManagedTableIsCompleteRoleF825222C-DELETE_COMPLETE-2025-03-11T03:06:59.545Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataAmplifyTableManagerNestedStackA-4JC1SUB3AUAB',
        LogicalResourceId: 'AmplifyManagedTableIsCompleteRoleF825222C',
        PhysicalResourceId:
          'amplify-sampleprojectapp--AmplifyManagedTableIsComp-aKxSvonhSqF5',
        ResourceType: 'AWS::IAM::Role',
        Timestamp: new Date('2025-03-11T03:06:59.545'),
        ResourceStatus: 'DELETE_COMPLETE',
        ResourceProperties:
          '{"ManagedPolicyArns":["arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"],"Policies":[{"PolicyName":"CreateUpdateDeleteTablesPolicy","PolicyDocument":{"Version":"2012-10-17","Statement":[{"Action":["dynamodb:CreateTable","dynamodb:UpdateTable","dynamodb:DeleteTable","dynamodb:DescribeTable","dynamodb:DescribeContinuousBackups","dynamodb:DescribeTimeToLive","dynamodb:UpdateContinuousBackups","dynamodb:UpdateTimeToLive","dynamodb:TagResource","dynamodb:UntagResource","dynamodb:ListTagsOfResource"],"Resource":"arn:aws:dynamodb:us-west-2:123456789012:table/*-ezabg7fk2jecvodrblowtgbsme-NONE","Effect":"Allow"},{"Action":"lambda:ListTags","Resource":"arn:aws:lambda:us-west-2:123456789012:function:*TableManager*","Effect":"Allow"}]}}],"AssumeRolePolicyDocument":{"Version":"2012-10-17","Statement":[{"Action":"sts:AssumeRole","Effect":"Allow","Principal":{"Service":"lambda.amazonaws.com"}}]},"Tags":[{"Value":"sandbox","Key":"amplify:deployment-type"},{"Value":"amplifyData","Key":"amplify:friendly-name"},{"Value":"amplify","Key":"created-by"}]}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'AmplifyManagedTableIsCompleteRoleF825222C',
        },
        constructPath:
          'data/amplifyData/AmplifyTableManager/AmplifyManagedTableIsCompleteRole',
      },
      progress: {
        completed: 136,
        formatted: '136',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0-amplifyDataAmplifyTableManagerNestedStackA-4JC1SUB3AUAB | 137 | 11:06:59 PM | DELETE_COMPLETE | AWS::CloudFormation::Stack | amplify-sampleprojectapp-user-sandbox-0-amplifyDataAmplifyTableManagerNestedStackA-4JC1SUB3AUAB',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataAmplifyTableManagerNestedStackA-4JC1SUB3AUAB/b71af650-fe24-11ef-ad54-0603cfec563b',
        EventId: 'e60950f0-fe25-11ef-aa02-062c74eb3135',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataAmplifyTableManagerNestedStackA-4JC1SUB3AUAB',
        LogicalResourceId:
          'amplify-sampleprojectapp-user-sandbox-0-amplifyDataAmplifyTableManagerNestedStackA-4JC1SUB3AUAB',
        PhysicalResourceId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataAmplifyTableManagerNestedStackA-4JC1SUB3AUAB/b71af650-fe24-11ef-ad54-0603cfec563b',
        ResourceType: 'AWS::CloudFormation::Stack',
        Timestamp: new Date('2025-03-11T03:06:59.822'),
        ResourceStatus: 'DELETE_COMPLETE',
      },
      progress: {
        completed: 137,
        formatted: '137',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I0000',
    message:
      '[sdk info] CloudFormation.DescribeStackEvents({"StackName":"amplify-sampleprojectapp-user-sandbox-0e1752a889"}) -> OK',
  },
  {
    code: 'CDK_TOOLKIT_I0000',
    message:
      '[sdk info] CloudFormation.DescribeStacks({"StackName":"amplify-sampleprojectapp-user-sandbox-0e1752a889"}) -> OK',
  },
  {
    code: 'CDK_TOOLKIT_I0000',
    message:
      'Stack amplify-sampleprojectapp-user-sandbox-0e1752a889 has an ongoing operation in progress and is not stable (DELETE_IN_PROGRESS)',
  },
  {
    code: 'CDK_TOOLKIT_I0000',
    message:
      '[sdk info] CloudFormation.DescribeStackEvents({"StackName":"arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C/b355b0f0-fe24-11ef-a0bd-020db6799971"}) -> OK',
  },
  {
    code: 'CDK_TOOLKIT_I0000',
    message:
      '[sdk info] CloudFormation.DescribeStackEvents({"StackName":"amplify-sampleprojectapp-user-sandbox-0e1752a889"}) -> OK',
  },
  {
    code: 'CDK_TOOLKIT_I0000',
    message:
      '[sdk info] CloudFormation.DescribeStackEvents({"StackName":"arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C/b355b0f0-fe24-11ef-a0bd-020db6799971"}) -> OK',
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C | 138 | 11:07:07 PM | DELETE_COMPLETE | AWS::CloudFormation::Stack | data/amplifyData/AmplifyTableManager.NestedStack/AmplifyTableManager.NestedStackResource (amplifyDataAmplifyTableManagerNestedStackAmplifyTableManagerNestedStackResource86290833)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C/b355b0f0-fe24-11ef-a0bd-020db6799971',
        EventId:
          'amplifyDataAmplifyTableManagerNestedStackAmplifyTableManagerNestedStackResource86290833-DELETE_COMPLETE-2025-03-11T03:07:07.115Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C',
        LogicalResourceId:
          'amplifyDataAmplifyTableManagerNestedStackAmplifyTableManagerNestedStackResource86290833',
        PhysicalResourceId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0-amplifyDataAmplifyTableManagerNestedStackA-4JC1SUB3AUAB/b71af650-fe24-11ef-ad54-0603cfec563b',
        ResourceType: 'AWS::CloudFormation::Stack',
        Timestamp: new Date('2025-03-11T03:07:07.115'),
        ResourceStatus: 'DELETE_COMPLETE',
        ResourceProperties:
          '{"TemplateURL":"https://s3.us-west-2.amazonaws.com/cdk-hnb659fds-assets-123456789012-us-west-2/193c5f412086be216636e53fa8e74d99c431936435b456c4b0b7252704331c51.json","Parameters":{"referencetoamplifysampleprojectappusersandbox0e1752a889dataamplifyDataGraphQLAPIB1F14B28ApiId":"ezabg7fk2jecvodrblowtgbsme"},"Tags":[{"Value":"sandbox","Key":"amplify:deployment-type"},{"Value":"amplifyData","Key":"amplify:friendly-name"},{"Value":"amplify","Key":"created-by"}]}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'amplifyDataAmplifyTableManagerNestedStackAmplifyTableManagerNestedStackResource86290833',
        },
        constructPath:
          'data/amplifyData/AmplifyTableManager.NestedStack/AmplifyTableManager.NestedStackResource',
      },
      progress: {
        completed: 138,
        formatted: '138',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C | 138 | 11:07:07 PM | DELETE_IN_PROGRESS | AWS::AppSync::GraphQLApi | data/amplifyData/GraphQLAPI (amplifyDataGraphQLAPI42A6FA33)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C/b355b0f0-fe24-11ef-a0bd-020db6799971',
        EventId:
          'amplifyDataGraphQLAPI42A6FA33-DELETE_IN_PROGRESS-2025-03-11T03:07:07.460Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C',
        LogicalResourceId: 'amplifyDataGraphQLAPI42A6FA33',
        PhysicalResourceId:
          'arn:aws:appsync:us-west-2:123456789012:apis/ezabg7fk2jecvodrblowtgbsme',
        ResourceType: 'AWS::AppSync::GraphQLApi',
        Timestamp: new Date('2025-03-11T03:07:07.460'),
        ResourceStatus: 'DELETE_IN_PROGRESS',
        ResourceProperties:
          '{"Tags":[{"Value":"sandbox","Key":"amplify:deployment-type"},{"Value":"amplifyData","Key":"amplify:friendly-name"},{"Value":"amplify","Key":"created-by"}],"AdditionalAuthenticationProviders":[{"UserPoolConfig":{"UserPoolId":"us-west-2_FcSDTLfnY","AwsRegion":"us-west-2"},"AuthenticationType":"AMAZON_COGNITO_USER_POOLS"}],"AuthenticationType":"AWS_IAM","Name":"amplifyData"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'amplifyDataGraphQLAPI42A6FA33',
        },
        constructPath: 'data/amplifyData/GraphQLAPI',
      },
      progress: {
        completed: 138,
        formatted: '138',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C | 139 | 11:07:08 PM | DELETE_COMPLETE | AWS::AppSync::GraphQLApi | data/amplifyData/GraphQLAPI (amplifyDataGraphQLAPI42A6FA33)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C/b355b0f0-fe24-11ef-a0bd-020db6799971',
        EventId:
          'amplifyDataGraphQLAPI42A6FA33-DELETE_COMPLETE-2025-03-11T03:07:08.691Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C',
        LogicalResourceId: 'amplifyDataGraphQLAPI42A6FA33',
        PhysicalResourceId:
          'arn:aws:appsync:us-west-2:123456789012:apis/ezabg7fk2jecvodrblowtgbsme',
        ResourceType: 'AWS::AppSync::GraphQLApi',
        Timestamp: new Date('2025-03-11T03:07:08.691'),
        ResourceStatus: 'DELETE_COMPLETE',
        ResourceProperties:
          '{"Tags":[{"Value":"sandbox","Key":"amplify:deployment-type"},{"Value":"amplifyData","Key":"amplify:friendly-name"},{"Value":"amplify","Key":"created-by"}],"AdditionalAuthenticationProviders":[{"UserPoolConfig":{"UserPoolId":"us-west-2_FcSDTLfnY","AwsRegion":"us-west-2"},"AuthenticationType":"AMAZON_COGNITO_USER_POOLS"}],"AuthenticationType":"AWS_IAM","Name":"amplifyData"}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'amplifyDataGraphQLAPI42A6FA33',
        },
        constructPath: 'data/amplifyData/GraphQLAPI',
      },
      progress: {
        completed: 139,
        formatted: '139',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C | 140 | 11:07:08 PM | DELETE_COMPLETE | AWS::CloudFormation::Stack | amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C/b355b0f0-fe24-11ef-a0bd-020db6799971',
        EventId: 'eb7e4220-fe25-11ef-958c-0a5d4a85a079',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C',
        LogicalResourceId:
          'amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C',
        PhysicalResourceId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C/b355b0f0-fe24-11ef-a0bd-020db6799971',
        ResourceType: 'AWS::CloudFormation::Stack',
        Timestamp: new Date('2025-03-11T03:07:08.978'),
        ResourceStatus: 'DELETE_COMPLETE',
      },
      progress: {
        completed: 140,
        formatted: '140',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I0000',
    message:
      '[sdk info] CloudFormation.DescribeStacks({"StackName":"amplify-sampleprojectapp-user-sandbox-0e1752a889"}) -> OK',
  },
  {
    code: 'CDK_TOOLKIT_I0000',
    message:
      'Stack amplify-sampleprojectapp-user-sandbox-0e1752a889 has an ongoing operation in progress and is not stable (DELETE_IN_PROGRESS)',
  },
  {
    code: 'CDK_TOOLKIT_I0000',
    message:
      '[sdk info] CloudFormation.DescribeStackEvents({"StackName":"amplify-sampleprojectapp-user-sandbox-0e1752a889"}) -> OK',
  },
  {
    code: 'CDK_TOOLKIT_I0000',
    message:
      '[sdk info] CloudFormation.DescribeStackEvents({"StackName":"amplify-sampleprojectapp-user-sandbox-0e1752a889"}) -> OK',
  },
  {
    code: 'CDK_TOOLKIT_I0000',
    message:
      '[sdk info] CloudFormation.DescribeStacks({"StackName":"amplify-sampleprojectapp-user-sandbox-0e1752a889"}) -> OK',
  },
  {
    code: 'CDK_TOOLKIT_I0000',
    message:
      'Stack amplify-sampleprojectapp-user-sandbox-0e1752a889 has an ongoing operation in progress and is not stable (DELETE_IN_PROGRESS)',
  },
  {
    code: 'CDK_TOOLKIT_I0000',
    message:
      '[sdk info] CloudFormation.DescribeStackEvents({"StackName":"amplify-sampleprojectapp-user-sandbox-0e1752a889"}) -> OK',
  },
  {
    code: 'CDK_TOOLKIT_I0000',
    message:
      '[sdk info] CloudFormation.DescribeStackEvents({"StackName":"amplify-sampleprojectapp-user-sandbox-0e1752a889"}) -> OK',
  },
  {
    code: 'CDK_TOOLKIT_I0000',
    message:
      '[sdk info] CloudFormation.DescribeStacks({"StackName":"amplify-sampleprojectapp-user-sandbox-0e1752a889"}) -> OK',
  },
  {
    code: 'CDK_TOOLKIT_I0000',
    message:
      'Stack amplify-sampleprojectapp-user-sandbox-0e1752a889 has an ongoing operation in progress and is not stable (DELETE_IN_PROGRESS)',
  },
  {
    code: 'CDK_TOOLKIT_I0000',
    message:
      '[sdk info] CloudFormation.DescribeStackEvents({"StackName":"amplify-sampleprojectapp-user-sandbox-0e1752a889"}) -> OK',
  },
  {
    code: 'CDK_TOOLKIT_I0000',
    message:
      '[sdk info] CloudFormation.DescribeStackEvents({"StackName":"amplify-sampleprojectapp-user-sandbox-0e1752a889"}) -> OK',
  },
  {
    code: 'CDK_TOOLKIT_I0000',
    message:
      '[sdk info] CloudFormation.DescribeStacks({"StackName":"amplify-sampleprojectapp-user-sandbox-0e1752a889"}) -> OK',
  },
  {
    code: 'CDK_TOOLKIT_I0000',
    message:
      'Stack amplify-sampleprojectapp-user-sandbox-0e1752a889 has an ongoing operation in progress and is not stable (DELETE_IN_PROGRESS)',
  },
  {
    code: 'CDK_TOOLKIT_I0000',
    message:
      '[sdk info] CloudFormation.DescribeStackEvents({"StackName":"arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0e1752a889-auth179371D7-188ZLCAI0NBE0/96e14c40-fe24-11ef-9749-0ab62f97f51b"}) -> OK',
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0e1752a889 | 141 | 11:07:25 PM | DELETE_COMPLETE | AWS::CloudFormation::Stack | data.NestedStack/data.NestedStackResource (data7552DF31)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0e1752a889/912e40a0-fe24-11ef-ab54-068258314c15',
        EventId: 'data7552DF31-DELETE_COMPLETE-2025-03-11T03:07:25.196Z',
        StackName: 'amplify-sampleprojectapp-user-sandbox-0e1752a889',
        LogicalResourceId: 'data7552DF31',
        PhysicalResourceId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0e1752a889-data7552DF31-193SML7AJWI3C/b355b0f0-fe24-11ef-a0bd-020db6799971',
        ResourceType: 'AWS::CloudFormation::Stack',
        Timestamp: new Date('2025-03-11T03:07:25.196'),
        ResourceStatus: 'DELETE_COMPLETE',
        ResourceProperties:
          '{"TemplateURL":"https://s3.us-west-2.amazonaws.com/cdk-hnb659fds-assets-123456789012-us-west-2/76f3f913f2bffd4d3b833199e6d331903453796a752c920c60d3aa8456e8a975.json","Parameters":{"referencetoamplifysampleprojectappusersandbox0e1752a889authNestedStackauthNestedStackResource1C2A2D1EOutputsamplifysampleprojectappusersandbox0e1752a889authamplifyAuthIdentityPool5160F57DRef":"us-west-2:e3abf6f7-1ae5-4254-829e-0d8c9dc05bff","referencetoamplifysampleprojectappusersandbox0e1752a889authNestedStackauthNestedStackResource1C2A2D1EOutputsamplifysampleprojectappusersandbox0e1752a889authamplifyAuthUserPool0A15674BRef":"us-west-2_FcSDTLfnY","referencetoamplifysampleprojectappusersandbox0e1752a889authNestedStackauthNestedStackResource1C2A2D1EOutputsamplifysampleprojectappusersandbox0e1752a889authamplifyAuthunauthenticatedUserRoleC92E0CFERef":"amplify-sampleprojectapp--amplifyAuthunauthenticate-0ZSS9wsA6Aut","referencetoamplifysampleprojectappusersandbox0e1752a889authNestedStackauthNestedStackResource1C2A2D1EOutputsamplifysampleprojectappusersandbox0e1752a889authamplifyAuthauthenticatedUserRole11751600Ref":"amplify-sampleprojectapp--amplifyAuthauthenticatedU-JksUKi7c8Bvh"},"Tags":[{"Value":"sandbox","Key":"amplify:deployment-type"},{"Value":"amplify","Key":"created-by"}]}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'data7552DF31',
        },
        constructPath: 'data.NestedStack/data.NestedStackResource',
      },
      progress: {
        completed: 141,
        formatted: '141',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0e1752a889 | 141 | 11:07:25 PM | DELETE_IN_PROGRESS | AWS::CloudFormation::Stack | auth.NestedStack/auth.NestedStackResource (auth179371D7)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0e1752a889/912e40a0-fe24-11ef-ab54-068258314c15',
        EventId: 'auth179371D7-DELETE_IN_PROGRESS-2025-03-11T03:07:25.518Z',
        StackName: 'amplify-sampleprojectapp-user-sandbox-0e1752a889',
        LogicalResourceId: 'auth179371D7',
        PhysicalResourceId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0e1752a889-auth179371D7-188ZLCAI0NBE0/96e14c40-fe24-11ef-9749-0ab62f97f51b',
        ResourceType: 'AWS::CloudFormation::Stack',
        Timestamp: new Date('2025-03-11T03:07:25.518'),
        ResourceStatus: 'DELETE_IN_PROGRESS',
        ResourceProperties:
          '{"TemplateURL":"https://s3.us-west-2.amazonaws.com/cdk-hnb659fds-assets-123456789012-us-west-2/53b8945b363f121c80e07e812f42fa6e33a8f3fdbc9b75d4b3374959bb62f47d.json","Tags":[{"Value":"sandbox","Key":"amplify:deployment-type"},{"Value":"amplify","Key":"created-by"}]}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'auth179371D7',
        },
        constructPath: 'auth.NestedStack/auth.NestedStackResource',
      },
      progress: {
        completed: 141,
        formatted: '141',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0e1752a889-auth179371D7-188ZLCAI0NBE0 | 141 | 11:07:25 PM | DELETE_IN_PROGRESS | AWS::CloudFormation::Stack | amplify-sampleprojectapp-user-sandbox-0e1752a889-auth179371D7-188ZLCAI0NBE0 User Initiated',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0e1752a889-auth179371D7-188ZLCAI0NBE0/96e14c40-fe24-11ef-9749-0ab62f97f51b',
        EventId: 'f58f29a0-fe25-11ef-b839-022a690d42c3',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0e1752a889-auth179371D7-188ZLCAI0NBE0',
        LogicalResourceId:
          'amplify-sampleprojectapp-user-sandbox-0e1752a889-auth179371D7-188ZLCAI0NBE0',
        PhysicalResourceId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0e1752a889-auth179371D7-188ZLCAI0NBE0/96e14c40-fe24-11ef-9749-0ab62f97f51b',
        ResourceType: 'AWS::CloudFormation::Stack',
        Timestamp: new Date('2025-03-11T03:07:25.870'),
        ResourceStatus: 'DELETE_IN_PROGRESS',
        ResourceStatusReason: 'User Initiated',
      },
      progress: {
        completed: 141,
        formatted: '141',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0e1752a889-auth179371D7-188ZLCAI0NBE0 | 141 | 11:07:27 PM | DELETE_IN_PROGRESS | AWS::CDK::Metadata | auth/CDKMetadata/Default (CDKMetadata)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0e1752a889-auth179371D7-188ZLCAI0NBE0/96e14c40-fe24-11ef-9749-0ab62f97f51b',
        EventId: 'CDKMetadata-DELETE_IN_PROGRESS-2025-03-11T03:07:27.651Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0e1752a889-auth179371D7-188ZLCAI0NBE0',
        LogicalResourceId: 'CDKMetadata',
        PhysicalResourceId: '96e14c40-fe24-11ef-9749-0ab62f97f51b',
        ResourceType: 'AWS::CDK::Metadata',
        Timestamp: new Date('2025-03-11T03:07:27.651'),
        ResourceStatus: 'DELETE_IN_PROGRESS',
        ResourceProperties:
          '{"Analytics":"v2:deflate64:H4sIAAAAAAAA/02LwQ6CMBBEv4V7WYETV8PJizEYz6a2qy6UbUIXiWn674YYlNPMvJmpoKwrKDI9h9zYPnd0g3jEIGjPok2v9Byu0fgHk3iIl4DjyXunmjv//GoaR8iyrf7kYJGF5L2et7n1Dvci2jwHZEmK9ABxgctw0ZRUi8FPo8Gk2FuELuxeVQFlDWXWBaJ8nFhoQGi/+gFim9/a1wAAAA=="}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'CDKMetadata',
        },
        constructPath: 'auth/CDKMetadata/Default',
      },
      progress: {
        completed: 141,
        formatted: '141',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0e1752a889-auth179371D7-188ZLCAI0NBE0 | 141 | 11:07:27 PM | DELETE_IN_PROGRESS | AWS::Cognito::IdentityPoolRoleAttachment | auth/amplifyAuth/IdentityPoolRoleAttachment (amplifyAuthIdentityPoolRoleAttachment045F17C8)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0e1752a889-auth179371D7-188ZLCAI0NBE0/96e14c40-fe24-11ef-9749-0ab62f97f51b',
        EventId:
          'amplifyAuthIdentityPoolRoleAttachment045F17C8-DELETE_IN_PROGRESS-2025-03-11T03:07:27.730Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0e1752a889-auth179371D7-188ZLCAI0NBE0',
        LogicalResourceId: 'amplifyAuthIdentityPoolRoleAttachment045F17C8',
        PhysicalResourceId: 'us-west-2:e3abf6f7-1ae5-4254-829e-0d8c9dc05bff',
        ResourceType: 'AWS::Cognito::IdentityPoolRoleAttachment',
        Timestamp: new Date('2025-03-11T03:07:27.730'),
        ResourceStatus: 'DELETE_IN_PROGRESS',
        ResourceProperties:
          '{"RoleMappings":{"UserPoolWebClientRoleMapping":{"Type":"Token","AmbiguousRoleResolution":"AuthenticatedRole","IdentityProvider":"cognito-idp.us-west-2.amazonaws.com/us-west-2_FcSDTLfnY:7dp3nrsgnfb4b3og7vqbjiom5n"}},"IdentityPoolId":"us-west-2:e3abf6f7-1ae5-4254-829e-0d8c9dc05bff","Roles":{"authenticated":"arn:aws:iam::123456789012:role/amplify-sampleprojectapp--amplifyAuthauthenticatedU-JksUKi7c8Bvh","unauthenticated":"arn:aws:iam::123456789012:role/amplify-sampleprojectapp--amplifyAuthunauthenticate-0ZSS9wsA6Aut"}}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'amplifyAuthIdentityPoolRoleAttachment045F17C8',
        },
        constructPath: 'auth/amplifyAuth/IdentityPoolRoleAttachment',
      },
      progress: {
        completed: 141,
        formatted: '141',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I0000',
    message:
      '[sdk info] CloudFormation.DescribeStackEvents({"StackName":"amplify-sampleprojectapp-user-sandbox-0e1752a889"}) -> OK',
  },
  {
    code: 'CDK_TOOLKIT_I0000',
    message:
      '[sdk info] CloudFormation.DescribeStackEvents({"StackName":"arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0e1752a889-auth179371D7-188ZLCAI0NBE0/96e14c40-fe24-11ef-9749-0ab62f97f51b"}) -> OK',
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0e1752a889-auth179371D7-188ZLCAI0NBE0 | 140 | 11:07:28 PM | DELETE_COMPLETE | AWS::CDK::Metadata | auth/CDKMetadata/Default (CDKMetadata)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0e1752a889-auth179371D7-188ZLCAI0NBE0/96e14c40-fe24-11ef-9749-0ab62f97f51b',
        EventId: 'CDKMetadata-DELETE_COMPLETE-2025-03-11T03:07:28.533Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0e1752a889-auth179371D7-188ZLCAI0NBE0',
        LogicalResourceId: 'CDKMetadata',
        PhysicalResourceId: '96e14c40-fe24-11ef-9749-0ab62f97f51b',
        ResourceType: 'AWS::CDK::Metadata',
        Timestamp: new Date('2025-03-11T03:07:28.533'),
        ResourceStatus: 'DELETE_COMPLETE',
        ResourceProperties:
          '{"Analytics":"v2:deflate64:H4sIAAAAAAAA/02LwQ6CMBBEv4V7WYETV8PJizEYz6a2qy6UbUIXiWn674YYlNPMvJmpoKwrKDI9h9zYPnd0g3jEIGjPok2v9Byu0fgHk3iIl4DjyXunmjv//GoaR8iyrf7kYJGF5L2et7n1Dvci2jwHZEmK9ABxgctw0ZRUi8FPo8Gk2FuELuxeVQFlDWXWBaJ8nFhoQGi/+gFim9/a1wAAAA=="}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'CDKMetadata',
        },
        constructPath: 'auth/CDKMetadata/Default',
      },
      progress: {
        completed: 140,
        formatted: '140',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0e1752a889-auth179371D7-188ZLCAI0NBE0 | 141 | 11:07:28 PM | DELETE_COMPLETE | AWS::Cognito::IdentityPoolRoleAttachment | auth/amplifyAuth/IdentityPoolRoleAttachment (amplifyAuthIdentityPoolRoleAttachment045F17C8)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0e1752a889-auth179371D7-188ZLCAI0NBE0/96e14c40-fe24-11ef-9749-0ab62f97f51b',
        EventId:
          'amplifyAuthIdentityPoolRoleAttachment045F17C8-DELETE_COMPLETE-2025-03-11T03:07:28.681Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0e1752a889-auth179371D7-188ZLCAI0NBE0',
        LogicalResourceId: 'amplifyAuthIdentityPoolRoleAttachment045F17C8',
        PhysicalResourceId: 'us-west-2:e3abf6f7-1ae5-4254-829e-0d8c9dc05bff',
        ResourceType: 'AWS::Cognito::IdentityPoolRoleAttachment',
        Timestamp: new Date('2025-03-11T03:07:28.681'),
        ResourceStatus: 'DELETE_COMPLETE',
        ResourceProperties:
          '{"RoleMappings":{"UserPoolWebClientRoleMapping":{"Type":"Token","AmbiguousRoleResolution":"AuthenticatedRole","IdentityProvider":"cognito-idp.us-west-2.amazonaws.com/us-west-2_FcSDTLfnY:7dp3nrsgnfb4b3og7vqbjiom5n"}},"IdentityPoolId":"us-west-2:e3abf6f7-1ae5-4254-829e-0d8c9dc05bff","Roles":{"authenticated":"arn:aws:iam::123456789012:role/amplify-sampleprojectapp--amplifyAuthauthenticatedU-JksUKi7c8Bvh","unauthenticated":"arn:aws:iam::123456789012:role/amplify-sampleprojectapp--amplifyAuthunauthenticate-0ZSS9wsA6Aut"}}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'amplifyAuthIdentityPoolRoleAttachment045F17C8',
        },
        constructPath: 'auth/amplifyAuth/IdentityPoolRoleAttachment',
      },
      progress: {
        completed: 141,
        formatted: '141',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0e1752a889-auth179371D7-188ZLCAI0NBE0 | 141 | 11:07:29 PM | DELETE_IN_PROGRESS | AWS::IAM::Role | auth/amplifyAuth/authenticatedUserRole (amplifyAuthauthenticatedUserRoleD8DA3689)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0e1752a889-auth179371D7-188ZLCAI0NBE0/96e14c40-fe24-11ef-9749-0ab62f97f51b',
        EventId:
          'amplifyAuthauthenticatedUserRoleD8DA3689-DELETE_IN_PROGRESS-2025-03-11T03:07:29.185Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0e1752a889-auth179371D7-188ZLCAI0NBE0',
        LogicalResourceId: 'amplifyAuthauthenticatedUserRoleD8DA3689',
        PhysicalResourceId:
          'amplify-sampleprojectapp--amplifyAuthauthenticatedU-JksUKi7c8Bvh',
        ResourceType: 'AWS::IAM::Role',
        Timestamp: new Date('2025-03-11T03:07:29.185'),
        ResourceStatus: 'DELETE_IN_PROGRESS',
        ResourceProperties:
          '{"AssumeRolePolicyDocument":{"Version":"2012-10-17","Statement":[{"Condition":{"StringEquals":{"cognito-identity.amazonaws.com:aud":"us-west-2:e3abf6f7-1ae5-4254-829e-0d8c9dc05bff"},"ForAnyValue:StringLike":{"cognito-identity.amazonaws.com:amr":"authenticated"}},"Action":"sts:AssumeRoleWithWebIdentity","Effect":"Allow","Principal":{"Federated":"cognito-identity.amazonaws.com"}}]},"Tags":[{"Value":"sandbox","Key":"amplify:deployment-type"},{"Value":"amplifyAuth","Key":"amplify:friendly-name"},{"Value":"amplify","Key":"created-by"}]}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'amplifyAuthauthenticatedUserRoleD8DA3689',
        },
        constructPath: 'auth/amplifyAuth/authenticatedUserRole',
      },
      progress: {
        completed: 141,
        formatted: '141',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0e1752a889-auth179371D7-188ZLCAI0NBE0 | 141 | 11:07:29 PM | DELETE_IN_PROGRESS | AWS::IAM::Role | auth/amplifyAuth/unauthenticatedUserRole (amplifyAuthunauthenticatedUserRole2B524D9E)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0e1752a889-auth179371D7-188ZLCAI0NBE0/96e14c40-fe24-11ef-9749-0ab62f97f51b',
        EventId:
          'amplifyAuthunauthenticatedUserRole2B524D9E-DELETE_IN_PROGRESS-2025-03-11T03:07:29.187Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0e1752a889-auth179371D7-188ZLCAI0NBE0',
        LogicalResourceId: 'amplifyAuthunauthenticatedUserRole2B524D9E',
        PhysicalResourceId:
          'amplify-sampleprojectapp--amplifyAuthunauthenticate-0ZSS9wsA6Aut',
        ResourceType: 'AWS::IAM::Role',
        Timestamp: new Date('2025-03-11T03:07:29.187'),
        ResourceStatus: 'DELETE_IN_PROGRESS',
        ResourceProperties:
          '{"AssumeRolePolicyDocument":{"Version":"2012-10-17","Statement":[{"Condition":{"StringEquals":{"cognito-identity.amazonaws.com:aud":"us-west-2:e3abf6f7-1ae5-4254-829e-0d8c9dc05bff"},"ForAnyValue:StringLike":{"cognito-identity.amazonaws.com:amr":"unauthenticated"}},"Action":"sts:AssumeRoleWithWebIdentity","Effect":"Allow","Principal":{"Federated":"cognito-identity.amazonaws.com"}}]},"Tags":[{"Value":"sandbox","Key":"amplify:deployment-type"},{"Value":"amplifyAuth","Key":"amplify:friendly-name"},{"Value":"amplify","Key":"created-by"}]}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'amplifyAuthunauthenticatedUserRole2B524D9E',
        },
        constructPath: 'auth/amplifyAuth/unauthenticatedUserRole',
      },
      progress: {
        completed: 141,
        formatted: '141',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I0000',
    message:
      '[sdk info] CloudFormation.DescribeStacks({"StackName":"amplify-sampleprojectapp-user-sandbox-0e1752a889"}) -> OK',
  },
  {
    code: 'CDK_TOOLKIT_I0000',
    message:
      'Stack amplify-sampleprojectapp-user-sandbox-0e1752a889 has an ongoing operation in progress and is not stable (DELETE_IN_PROGRESS)',
  },
  {
    code: 'CDK_TOOLKIT_I0000',
    message:
      '[sdk info] CloudFormation.DescribeStackEvents({"StackName":"amplify-sampleprojectapp-user-sandbox-0e1752a889"}) -> OK',
  },
  {
    code: 'CDK_TOOLKIT_I0000',
    message:
      '[sdk info] CloudFormation.DescribeStackEvents({"StackName":"arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0e1752a889-auth179371D7-188ZLCAI0NBE0/96e14c40-fe24-11ef-9749-0ab62f97f51b"}) -> OK',
  },
  {
    code: 'CDK_TOOLKIT_I0000',
    message:
      '[sdk info] CloudFormation.DescribeStackEvents({"StackName":"amplify-sampleprojectapp-user-sandbox-0e1752a889"}) -> OK',
  },
  {
    code: 'CDK_TOOLKIT_I0000',
    message:
      '[sdk info] CloudFormation.DescribeStackEvents({"StackName":"arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0e1752a889-auth179371D7-188ZLCAI0NBE0/96e14c40-fe24-11ef-9749-0ab62f97f51b"}) -> OK',
  },
  {
    code: 'CDK_TOOLKIT_I0000',
    message:
      '[sdk info] CloudFormation.DescribeStacks({"StackName":"amplify-sampleprojectapp-user-sandbox-0e1752a889"}) -> OK',
  },
  {
    code: 'CDK_TOOLKIT_I0000',
    message:
      'Stack amplify-sampleprojectapp-user-sandbox-0e1752a889 has an ongoing operation in progress and is not stable (DELETE_IN_PROGRESS)',
  },
  {
    code: 'CDK_TOOLKIT_I0000',
    message:
      '[sdk info] CloudFormation.DescribeStackEvents({"StackName":"amplify-sampleprojectapp-user-sandbox-0e1752a889"}) -> OK',
  },
  {
    code: 'CDK_TOOLKIT_I0000',
    message:
      '[sdk info] CloudFormation.DescribeStackEvents({"StackName":"arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0e1752a889-auth179371D7-188ZLCAI0NBE0/96e14c40-fe24-11ef-9749-0ab62f97f51b"}) -> OK',
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0e1752a889-auth179371D7-188ZLCAI0NBE0 | 142 | 11:07:37 PM | DELETE_COMPLETE | AWS::IAM::Role | auth/amplifyAuth/unauthenticatedUserRole (amplifyAuthunauthenticatedUserRole2B524D9E)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0e1752a889-auth179371D7-188ZLCAI0NBE0/96e14c40-fe24-11ef-9749-0ab62f97f51b',
        EventId:
          'amplifyAuthunauthenticatedUserRole2B524D9E-DELETE_COMPLETE-2025-03-11T03:07:37.986Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0e1752a889-auth179371D7-188ZLCAI0NBE0',
        LogicalResourceId: 'amplifyAuthunauthenticatedUserRole2B524D9E',
        PhysicalResourceId:
          'amplify-sampleprojectapp--amplifyAuthunauthenticate-0ZSS9wsA6Aut',
        ResourceType: 'AWS::IAM::Role',
        Timestamp: new Date('2025-03-11T03:07:37.986'),
        ResourceStatus: 'DELETE_COMPLETE',
        ResourceProperties:
          '{"AssumeRolePolicyDocument":{"Version":"2012-10-17","Statement":[{"Condition":{"StringEquals":{"cognito-identity.amazonaws.com:aud":"us-west-2:e3abf6f7-1ae5-4254-829e-0d8c9dc05bff"},"ForAnyValue:StringLike":{"cognito-identity.amazonaws.com:amr":"unauthenticated"}},"Action":"sts:AssumeRoleWithWebIdentity","Effect":"Allow","Principal":{"Federated":"cognito-identity.amazonaws.com"}}]},"Tags":[{"Value":"sandbox","Key":"amplify:deployment-type"},{"Value":"amplifyAuth","Key":"amplify:friendly-name"},{"Value":"amplify","Key":"created-by"}]}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'amplifyAuthunauthenticatedUserRole2B524D9E',
        },
        constructPath: 'auth/amplifyAuth/unauthenticatedUserRole',
      },
      progress: {
        completed: 142,
        formatted: '142',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0e1752a889-auth179371D7-188ZLCAI0NBE0 | 143 | 11:07:39 PM | DELETE_COMPLETE | AWS::IAM::Role | auth/amplifyAuth/authenticatedUserRole (amplifyAuthauthenticatedUserRoleD8DA3689)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0e1752a889-auth179371D7-188ZLCAI0NBE0/96e14c40-fe24-11ef-9749-0ab62f97f51b',
        EventId:
          'amplifyAuthauthenticatedUserRoleD8DA3689-DELETE_COMPLETE-2025-03-11T03:07:39.424Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0e1752a889-auth179371D7-188ZLCAI0NBE0',
        LogicalResourceId: 'amplifyAuthauthenticatedUserRoleD8DA3689',
        PhysicalResourceId:
          'amplify-sampleprojectapp--amplifyAuthauthenticatedU-JksUKi7c8Bvh',
        ResourceType: 'AWS::IAM::Role',
        Timestamp: new Date('2025-03-11T03:07:39.424'),
        ResourceStatus: 'DELETE_COMPLETE',
        ResourceProperties:
          '{"AssumeRolePolicyDocument":{"Version":"2012-10-17","Statement":[{"Condition":{"StringEquals":{"cognito-identity.amazonaws.com:aud":"us-west-2:e3abf6f7-1ae5-4254-829e-0d8c9dc05bff"},"ForAnyValue:StringLike":{"cognito-identity.amazonaws.com:amr":"authenticated"}},"Action":"sts:AssumeRoleWithWebIdentity","Effect":"Allow","Principal":{"Federated":"cognito-identity.amazonaws.com"}}]},"Tags":[{"Value":"sandbox","Key":"amplify:deployment-type"},{"Value":"amplifyAuth","Key":"amplify:friendly-name"},{"Value":"amplify","Key":"created-by"}]}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'amplifyAuthauthenticatedUserRoleD8DA3689',
        },
        constructPath: 'auth/amplifyAuth/authenticatedUserRole',
      },
      progress: {
        completed: 143,
        formatted: '143',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0e1752a889-auth179371D7-188ZLCAI0NBE0 | 143 | 11:07:39 PM | DELETE_IN_PROGRESS | AWS::Cognito::IdentityPool | auth/amplifyAuth/IdentityPool (amplifyAuthIdentityPool3FDE84CC)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0e1752a889-auth179371D7-188ZLCAI0NBE0/96e14c40-fe24-11ef-9749-0ab62f97f51b',
        EventId:
          'amplifyAuthIdentityPool3FDE84CC-DELETE_IN_PROGRESS-2025-03-11T03:07:39.765Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0e1752a889-auth179371D7-188ZLCAI0NBE0',
        LogicalResourceId: 'amplifyAuthIdentityPool3FDE84CC',
        PhysicalResourceId: 'us-west-2:e3abf6f7-1ae5-4254-829e-0d8c9dc05bff',
        ResourceType: 'AWS::Cognito::IdentityPool',
        Timestamp: new Date('2025-03-11T03:07:39.765'),
        ResourceStatus: 'DELETE_IN_PROGRESS',
        ResourceProperties:
          '{"CognitoIdentityProviders":[{"ProviderName":"cognito-idp.us-west-2.amazonaws.com/us-west-2_FcSDTLfnY","ClientId":"7dp3nrsgnfb4b3og7vqbjiom5n"}],"AllowUnauthenticatedIdentities":"true","SupportedLoginProviders":{},"IdentityPoolTags":[{"Value":"sandbox","Key":"amplify:deployment-type"},{"Value":"amplifyAuth","Key":"amplify:friendly-name"},{"Value":"amplify","Key":"created-by"}]}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'amplifyAuthIdentityPool3FDE84CC',
        },
        constructPath: 'auth/amplifyAuth/IdentityPool',
      },
      progress: {
        completed: 143,
        formatted: '143',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0e1752a889-auth179371D7-188ZLCAI0NBE0 | 144 | 11:07:40 PM | DELETE_COMPLETE | AWS::Cognito::IdentityPool | auth/amplifyAuth/IdentityPool (amplifyAuthIdentityPool3FDE84CC)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0e1752a889-auth179371D7-188ZLCAI0NBE0/96e14c40-fe24-11ef-9749-0ab62f97f51b',
        EventId:
          'amplifyAuthIdentityPool3FDE84CC-DELETE_COMPLETE-2025-03-11T03:07:40.828Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0e1752a889-auth179371D7-188ZLCAI0NBE0',
        LogicalResourceId: 'amplifyAuthIdentityPool3FDE84CC',
        PhysicalResourceId: 'us-west-2:e3abf6f7-1ae5-4254-829e-0d8c9dc05bff',
        ResourceType: 'AWS::Cognito::IdentityPool',
        Timestamp: new Date('2025-03-11T03:07:40.828'),
        ResourceStatus: 'DELETE_COMPLETE',
        ResourceProperties:
          '{"CognitoIdentityProviders":[{"ProviderName":"cognito-idp.us-west-2.amazonaws.com/us-west-2_FcSDTLfnY","ClientId":"7dp3nrsgnfb4b3og7vqbjiom5n"}],"AllowUnauthenticatedIdentities":"true","SupportedLoginProviders":{},"IdentityPoolTags":[{"Value":"sandbox","Key":"amplify:deployment-type"},{"Value":"amplifyAuth","Key":"amplify:friendly-name"},{"Value":"amplify","Key":"created-by"}]}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'amplifyAuthIdentityPool3FDE84CC',
        },
        constructPath: 'auth/amplifyAuth/IdentityPool',
      },
      progress: {
        completed: 144,
        formatted: '144',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I0000',
    message:
      '[sdk info] CloudFormation.DescribeStackEvents({"StackName":"amplify-sampleprojectapp-user-sandbox-0e1752a889"}) -> OK',
  },
  {
    code: 'CDK_TOOLKIT_I0000',
    message:
      '[sdk info] CloudFormation.DescribeStacks({"StackName":"amplify-sampleprojectapp-user-sandbox-0e1752a889"}) -> OK',
  },
  {
    code: 'CDK_TOOLKIT_I0000',
    message:
      'Stack amplify-sampleprojectapp-user-sandbox-0e1752a889 has an ongoing operation in progress and is not stable (DELETE_IN_PROGRESS)',
  },
  {
    code: 'CDK_TOOLKIT_I0000',
    message:
      '[sdk info] CloudFormation.DescribeStackEvents({"StackName":"arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0e1752a889-auth179371D7-188ZLCAI0NBE0/96e14c40-fe24-11ef-9749-0ab62f97f51b"}) -> OK',
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0e1752a889-auth179371D7-188ZLCAI0NBE0 | 144 | 11:07:41 PM | DELETE_IN_PROGRESS | AWS::Cognito::UserPoolClient | auth/amplifyAuth/UserPoolAppClient (amplifyAuthUserPoolAppClient2626C6F8)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0e1752a889-auth179371D7-188ZLCAI0NBE0/96e14c40-fe24-11ef-9749-0ab62f97f51b',
        EventId:
          'amplifyAuthUserPoolAppClient2626C6F8-DELETE_IN_PROGRESS-2025-03-11T03:07:41.117Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0e1752a889-auth179371D7-188ZLCAI0NBE0',
        LogicalResourceId: 'amplifyAuthUserPoolAppClient2626C6F8',
        PhysicalResourceId: '7dp3nrsgnfb4b3og7vqbjiom5n',
        ResourceType: 'AWS::Cognito::UserPoolClient',
        Timestamp: new Date('2025-03-11T03:07:41.117'),
        ResourceStatus: 'DELETE_IN_PROGRESS',
        ResourceProperties:
          '{"CallbackURLs":["https://example.com"],"AllowedOAuthFlows":["code"],"UserPoolId":"us-west-2_FcSDTLfnY","ExplicitAuthFlows":["ALLOW_CUSTOM_AUTH","ALLOW_USER_SRP_AUTH","ALLOW_REFRESH_TOKEN_AUTH"],"AllowedOAuthScopes":["profile","phone","email","openid","aws.cognito.signin.user.admin"],"AllowedOAuthFlowsUserPoolClient":"true","PreventUserExistenceErrors":"ENABLED","SupportedIdentityProviders":["COGNITO"]}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'amplifyAuthUserPoolAppClient2626C6F8',
        },
        constructPath: 'auth/amplifyAuth/UserPoolAppClient',
      },
      progress: {
        completed: 144,
        formatted: '144',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0e1752a889-auth179371D7-188ZLCAI0NBE0 | 145 | 11:07:41 PM | DELETE_COMPLETE | AWS::Cognito::UserPoolClient | auth/amplifyAuth/UserPoolAppClient (amplifyAuthUserPoolAppClient2626C6F8)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0e1752a889-auth179371D7-188ZLCAI0NBE0/96e14c40-fe24-11ef-9749-0ab62f97f51b',
        EventId:
          'amplifyAuthUserPoolAppClient2626C6F8-DELETE_COMPLETE-2025-03-11T03:07:41.986Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0e1752a889-auth179371D7-188ZLCAI0NBE0',
        LogicalResourceId: 'amplifyAuthUserPoolAppClient2626C6F8',
        PhysicalResourceId: '7dp3nrsgnfb4b3og7vqbjiom5n',
        ResourceType: 'AWS::Cognito::UserPoolClient',
        Timestamp: new Date('2025-03-11T03:07:41.986'),
        ResourceStatus: 'DELETE_COMPLETE',
        ResourceProperties:
          '{"CallbackURLs":["https://example.com"],"AllowedOAuthFlows":["code"],"UserPoolId":"us-west-2_FcSDTLfnY","ExplicitAuthFlows":["ALLOW_CUSTOM_AUTH","ALLOW_USER_SRP_AUTH","ALLOW_REFRESH_TOKEN_AUTH"],"AllowedOAuthScopes":["profile","phone","email","openid","aws.cognito.signin.user.admin"],"AllowedOAuthFlowsUserPoolClient":"true","PreventUserExistenceErrors":"ENABLED","SupportedIdentityProviders":["COGNITO"]}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'amplifyAuthUserPoolAppClient2626C6F8',
        },
        constructPath: 'auth/amplifyAuth/UserPoolAppClient',
      },
      progress: {
        completed: 145,
        formatted: '145',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0e1752a889-auth179371D7-188ZLCAI0NBE0 | 145 | 11:07:42 PM | DELETE_IN_PROGRESS | AWS::Cognito::UserPool | auth/amplifyAuth/UserPool (amplifyAuthUserPool4BA7F805)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0e1752a889-auth179371D7-188ZLCAI0NBE0/96e14c40-fe24-11ef-9749-0ab62f97f51b',
        EventId:
          'amplifyAuthUserPool4BA7F805-DELETE_IN_PROGRESS-2025-03-11T03:07:42.315Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0e1752a889-auth179371D7-188ZLCAI0NBE0',
        LogicalResourceId: 'amplifyAuthUserPool4BA7F805',
        PhysicalResourceId: 'us-west-2_FcSDTLfnY',
        ResourceType: 'AWS::Cognito::UserPool',
        Timestamp: new Date('2025-03-11T03:07:42.315'),
        ResourceStatus: 'DELETE_IN_PROGRESS',
        ResourceProperties:
          '{"UserPoolTags":{"amplify:deployment-type":"sandbox","amplify:friendly-name":"amplifyAuth","created-by":"amplify"},"Policies":{"PasswordPolicy":{"RequireNumbers":"true","MinimumLength":"8","RequireUppercase":"true","RequireLowercase":"true","RequireSymbols":"true"}},"VerificationMessageTemplate":{"EmailMessage":"The verification code to your new account is {####}","SmsMessage":"The verification code to your new account is {####}","EmailSubject":"Verify your new account","DefaultEmailOption":"CONFIRM_WITH_CODE"},"Schema":[{"Mutable":"true","Required":"true","Name":"email"}],"AdminCreateUserConfig":{"AllowAdminCreateUserOnly":"false"},"UsernameConfiguration":{"CaseSensitive":"false"},"SmsVerificationMessage":"The verification code to your new account is {####}","UserAttributeUpdateSettings":{"AttributesRequireVerificationBeforeUpdate":["email"]},"EmailVerificationSubject":"Verify your new account","AutoVerifiedAttributes":["email"],"EmailVerificationMessage":"The verification code to your new account is {####}","UsernameAttributes":["email"],"AccountRecoverySetting":{"RecoveryMechanisms":[{"Priority":"1","Name":"verified_email"}]}}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'amplifyAuthUserPool4BA7F805',
        },
        constructPath: 'auth/amplifyAuth/UserPool',
      },
      progress: {
        completed: 145,
        formatted: '145',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0e1752a889-auth179371D7-188ZLCAI0NBE0 | 146 | 11:07:43 PM | DELETE_COMPLETE | AWS::Cognito::UserPool | auth/amplifyAuth/UserPool (amplifyAuthUserPool4BA7F805)',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0e1752a889-auth179371D7-188ZLCAI0NBE0/96e14c40-fe24-11ef-9749-0ab62f97f51b',
        EventId:
          'amplifyAuthUserPool4BA7F805-DELETE_COMPLETE-2025-03-11T03:07:43.340Z',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0e1752a889-auth179371D7-188ZLCAI0NBE0',
        LogicalResourceId: 'amplifyAuthUserPool4BA7F805',
        PhysicalResourceId: 'us-west-2_FcSDTLfnY',
        ResourceType: 'AWS::Cognito::UserPool',
        Timestamp: new Date('2025-03-11T03:07:43.340'),
        ResourceStatus: 'DELETE_COMPLETE',
        ResourceProperties:
          '{"UserPoolTags":{"amplify:deployment-type":"sandbox","amplify:friendly-name":"amplifyAuth","created-by":"amplify"},"Policies":{"PasswordPolicy":{"RequireNumbers":"true","MinimumLength":"8","RequireUppercase":"true","RequireLowercase":"true","RequireSymbols":"true"}},"VerificationMessageTemplate":{"EmailMessage":"The verification code to your new account is {####}","SmsMessage":"The verification code to your new account is {####}","EmailSubject":"Verify your new account","DefaultEmailOption":"CONFIRM_WITH_CODE"},"Schema":[{"Mutable":"true","Required":"true","Name":"email"}],"AdminCreateUserConfig":{"AllowAdminCreateUserOnly":"false"},"UsernameConfiguration":{"CaseSensitive":"false"},"SmsVerificationMessage":"The verification code to your new account is {####}","UserAttributeUpdateSettings":{"AttributesRequireVerificationBeforeUpdate":["email"]},"EmailVerificationSubject":"Verify your new account","AutoVerifiedAttributes":["email"],"EmailVerificationMessage":"The verification code to your new account is {####}","UsernameAttributes":["email"],"AccountRecoverySetting":{"RecoveryMechanisms":[{"Priority":"1","Name":"verified_email"}]}}',
      },
      metadata: {
        entry: {
          type: 'aws:cdk:logicalId',
          data: 'amplifyAuthUserPool4BA7F805',
        },
        constructPath: 'auth/amplifyAuth/UserPool',
      },
      progress: {
        completed: 146,
        formatted: '146',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I5502',
    message:
      'amplify-sampleprojectapp-user-sandbox-0e1752a889-auth179371D7-188ZLCAI0NBE0 | 147 | 11:07:43 PM | DELETE_COMPLETE | AWS::CloudFormation::Stack | amplify-sampleprojectapp-user-sandbox-0e1752a889-auth179371D7-188ZLCAI0NBE0',
    data: {
      deployment: 'a47cdb68-4e94-431e-941e-3f21ae3b5742',
      event: {
        StackId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0e1752a889-auth179371D7-188ZLCAI0NBE0/96e14c40-fe24-11ef-9749-0ab62f97f51b',
        EventId: '002594d0-fe26-11ef-b9f0-0ad97bf374d9',
        StackName:
          'amplify-sampleprojectapp-user-sandbox-0e1752a889-auth179371D7-188ZLCAI0NBE0',
        LogicalResourceId:
          'amplify-sampleprojectapp-user-sandbox-0e1752a889-auth179371D7-188ZLCAI0NBE0',
        PhysicalResourceId:
          'arn:aws:cloudformation:us-west-2:123456789012:stack/amplify-sampleprojectapp-user-sandbox-0e1752a889-auth179371D7-188ZLCAI0NBE0/96e14c40-fe24-11ef-9749-0ab62f97f51b',
        ResourceType: 'AWS::CloudFormation::Stack',
        Timestamp: new Date('2025-03-11T03:07:43.631'),
        ResourceStatus: 'DELETE_COMPLETE',
      },
      progress: {
        completed: 147,
        formatted: '147',
      },
    },
  },
  {
    code: 'CDK_TOOLKIT_I0000',
    message:
      '[sdk info] CloudFormation.DescribeStackEvents({"StackName":"amplify-sampleprojectapp-user-sandbox-0e1752a889"}) -> OK',
  },
  {
    code: 'CDK_TOOLKIT_I0000',
    message:
      '[sdk error] CloudFormation.DescribeStacks({"StackName":"amplify-sampleprojectapp-user-sandbox-0e1752a889"}) -> ValidationError: Stack with id amplify-sampleprojectapp-user-sandbox-0e1752a889 does not exist',
  },
  {
    code: 'CDK_TOOLKIT_I0000',
    message:
      'Stack amplify-sampleprojectapp-user-sandbox-0e1752a889 does not exist',
  },
  {
    code: 'CDK_TOOLKIT_I0000',
    message:
      '[sdk error] CloudFormation.DescribeStackEvents({"StackName":"amplify-sampleprojectapp-user-sandbox-0e1752a889"}) -> ValidationError: Stack [amplify-sampleprojectapp-user-sandbox-0e1752a889] does not exist',
  },
  {
    code: 'CDK_TOOLKIT_I0000',
    message:
      '[sdk error] CloudFormation.DescribeStackEvents({"StackName":"amplify-sampleprojectapp-user-sandbox-0e1752a889"}) -> ValidationError: Stack [amplify-sampleprojectapp-user-sandbox-0e1752a889] does not exist',
  },
  {
    code: 'CDK_TOOLKIT_I5503',
    message: 'Completed amplify-sampleprojectapp-user-sandbox-0e1752a889',
  },
  {
    code: 'CDK_TOOLKIT_I0000',
    message: '  amplify-sampleprojectapp-user-sandbox-0e1752a889: destroyed',
  },
  {
    code: 'CDK_TOOLKIT_I7000',
    message: '  Destroy time: 141.76s',
  },
];
