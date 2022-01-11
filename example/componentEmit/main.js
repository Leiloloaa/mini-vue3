// vue3 用法
import { createApp } from '../../lib/mini-vue3.esm.js';
import { App } from './App.js';

// mount 是接受一个 string
// 目前的代码是接受一个容器
// TODO 如果将 string -> 一个容器

const rootContainer = document.querySelector('#app');
createApp(App).mount(rootContainer);