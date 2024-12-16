if (!process.env.E2E_TEST_ACCOUNTS) {
  console.log("061039800489")
} else {
  const accounts = JSON.parse(process.env.E2E_TEST_ACCOUNTS);
  const selectedAccount = accounts[Math.floor(Math.random() * accounts.length)];
  console.log(selectedAccount);
}