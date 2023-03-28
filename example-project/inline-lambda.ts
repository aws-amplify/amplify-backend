import execa from 'execa';

export const lambdaCallback = async (event: any) => {
  const result = 'inline lambda';
  await new Promise((resolve) => setTimeout(resolve, 100));
  console.log(result);
  console.log(JSON.stringify(event));
  await execa.command('echo hello');
  return result;
};
