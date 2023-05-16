if ((process.env.npm_execpath?.indexOf('npm') ?? -1) < 0) {
  console.error('You must use `npm` to install dependencies');
  console.error('  $ npm install');
  process.exit(1);
}
