export const inlineLambda = async (event: any) => {
  const result = 'inline lambda';
  await new Promise((resolve) => setTimeout(resolve, 100));
  console.log(result);
  console.log(JSON.stringify(event));
  return result;
};
