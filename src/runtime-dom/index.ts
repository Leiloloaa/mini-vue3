import { isOn } from './../shared/index';
import { createRenderer } from '../runtime-core';

function createElement(type) {
  return document.createElement(type)
}

function patchProp(el, key, val) {
  if (isOn(key)) {
    const event = key.slice(2).toLocaleLowerCase()
    el.addEventListener(event, val)
  } else {
    el.setAttribute(key, val)
  }
}

function insert(el, parent) {
  parent.append(el)
}

const renderer: any = createRenderer({
  createElement,
  patchProp,
  insert
})

export function createApp(...args) {
  return renderer.createApp(...args)
}

export * from '../runtime-core';