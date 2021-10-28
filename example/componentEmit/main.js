import { createApp } from '../../lib/my-miniVue.esm.js';
import { App } from './App.js';

const rootContainer = document.querySelector('#app');
createApp(App).mount(rootContainer);