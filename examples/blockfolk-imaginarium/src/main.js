/* global console, document, window */
import './model/registerWorldAsset.js';
import { BlockFolkImaginariumApp } from './app/ImaginariumApp.js';

const root = document.getElementById('app');
const app = new BlockFolkImaginariumApp(root);

app.mount().catch((error) => {
  console.error('[BlockFolk Imaginarium] boot failed', error);
  root.dataset.boot = 'failed';
  root.innerHTML = `<main class="fatal"><h1>BlockFolk Imaginarium could not start</h1><p>Your pictures stay private on this device. Please close this page and try again.</p></main>`;
});

window.BlockFolkImaginarium = {
  version: '0.1.0',
  app,
  diagnostics: () => app.diagnostics()
};
