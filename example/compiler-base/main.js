/*
 * @Author: Stone
 * @Date: 2022-04-28 10:16:36
 * @LastEditors: Stone
 * @LastEditTime: 2022-04-28 10:16:50
 */
import { createApp } from "../../lib/mini-vue3.esm.js";
import { App } from "./App.js";

const rootContainer = document.querySelector("#app");
createApp(App).mount(rootContainer);