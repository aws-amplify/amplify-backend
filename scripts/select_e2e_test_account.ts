// Expected input is JSON array with account numbers.
// Strip node and script name. Join rest back in case it contains white spaces.
const input = process.argv.slice(2).join('');

const accounts = JSON.parse(input);

const selectedAccount = accounts[Math.floor(Math.random() * accounts.length)];

console.log(selectedAccount);
