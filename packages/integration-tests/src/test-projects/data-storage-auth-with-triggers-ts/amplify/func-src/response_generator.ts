
/**
 * Function to test building a lambda that has an import and loads auto-resolved env vars
 */
export const getResponse = () => {
  return {
    testSecret: process.env.TEST_SECRET,
    testSharedSecret: process.env.TEST_SHARED_SECRET,
  }
}
