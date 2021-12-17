import { createRenderer } from "..";
import { isOn } from "../shared";

function createElement(type) {
  return document.createElement(type)
}

function patchProp(el, key, val) {
  if (isOn(key)) {
    const event = key.slice(2).toLowerCase()
    el.addEventListener(event, val);
  } else {
    el.setAttribute(key, val)
  }
}

function insert(el, parent) {
  parent.append(el)
}

// 调用 renderer.ts 中的 createRenderer
const renderer: any = createRenderer({
  createElement,
  patchProp,
  insert
})

// 这样用户就可以正常的使用 createApp 了
export function createApp(...args) {
  return renderer.createApp(...args)
}

// 并且让 runtime-core 作为 runtime-dom 的子级
export * from '../runtime-core';