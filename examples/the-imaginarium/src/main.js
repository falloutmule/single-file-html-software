/* global console, document, window */
import './model/registerBlockfolkAssets.js';
import { ImaginariumApp } from './app/ImaginariumApp.js';

const root = document.getElementById('app');
const app = new ImaginariumApp(root);

app.mount().catch((error) => {
  console.error('[The Imaginarium] boot failed', error);
  root.dataset.boot = 'failed';
  root.innerHTML = `<main class="fatal"><h1>The Imaginarium could not start</h1><p>Your pictures stay private on this device. Please close this page and try again.</p></main>`;
});

window.Imaginarium = {
  version: '0.1.0',
  app,
  diagnostics: () => app.diagnostics()
};
