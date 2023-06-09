/**
 *
 */
type StackIdentifier =
  | {
      projectName: string;
      environmentName: string;
    }
  | {
      stackName: string;
    };

// /**
//  *
//  */
// export const generateClientConfig = async (
//   awsCredentialIdentity: AwsCredentialIdentity,
//   stackIdentifier: StackIdentifier
// ) => {
//   const ssmClient = new SSMClient({ credentials: awsCredentialIdentity });
//   // const response = await ssmClient.send(
//   //   new GetParameterCommand({
//   //     Name: `/amplify/${this.projectName}/${this.environmentName}/outputStackName`,
//   //   })
//   // );
// };
