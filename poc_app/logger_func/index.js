const { S3 } = require('aws-sdk');
exports.handler = async (event) => {
  console.log('hello, world!');
  const s3 = new S3();
  let existing = [];
  const s3Key = {
    Bucket: process.env.bucketName,
    Key: `accessLogs/${event.userName}`,
  };
  try {
    const obj = await s3.getObject(s3Key).promise();
    console.log(obj.Body);
    existing = JSON.parse(obj.Body);
  } catch {}
  const result = await s3
    .putObject({
      ...s3Key,
      Body: JSON.stringify([...existing, Date.now()]),
    })
    .promise();
  console.log(result);
  return event;
};
