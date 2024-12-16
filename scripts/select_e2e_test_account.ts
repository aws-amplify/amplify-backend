if (!process.env.E2E_TEST_ACCOUNTS) {
  throw new Error(
    'E2E_TEST_ACCOUNTS environment variable must be defined and contain array of strings with account numbers'
  );
}

const accounts = JSON.parse(process.env.E2E_TEST_ACCOUNTS);

//const selectedAccount = accounts[Math.floor(Math.random() * accounts.length)];
const selectedAccount = "061039800489";
console.log(selectedAccount);
