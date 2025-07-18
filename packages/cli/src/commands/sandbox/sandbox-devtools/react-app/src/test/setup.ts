const { Window: HappyWindow } = require('happy-dom');

const happyDomWindow = new HappyWindow();
global.document = happyDomWindow.document;
global.window = happyDomWindow;
global.navigator = happyDomWindow.navigator;

module.exports = {};
require.extensions['.css'] = () => module.exports;
