import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";

export async function readJsonFromS3(bucketName: string, key: string): Promise<any> {
  // Initialize the S3 client
  const s3Client = new S3Client({
    region: process.env.AWS_REGION // Get region from environment variable
  });

  try {
    // Create the command to get the object
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
    });

    // Get the object from S3
    const response = await s3Client.send(command);

    // Convert the stream to string
    if (response.Body) {
      const stringData = await response.Body.transformToString();
      
      // Parse the string data to JSON
      const jsonData = JSON.parse(stringData);
      return jsonData;
    }
    
    throw new Error('No data received from S3');

  } catch (error) {
    if (error instanceof Error) {
      console.error('Error reading file from S3:', error.message);
    }
    throw error;
  }
}