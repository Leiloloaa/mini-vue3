import { createRenderer } from "..";
import { isOn } from "../shared";

function createElement(type) {
  return document.createElement(type)
}

function patchProp(el, key, prevVal, nextVal) {
  if (isOn(key)) {
    const event = key.slice(2).toLowerCase()
    el.addEventListener(event, nextVal);
  } else {
    if (nextVal === undefined || nextVal === null) {
      el.removeAttribute(key);
    } else {
      el.setAttribute(key, nextVal)
    }
  }
}

function insert(child, parent, anchor) {
  // insertBefore 是把指定的元素添加到指定的位置
  // 如果没有传入 anchor 那就相当于 append(child)
  parent.insertBefore(child, anchor || null)
}

function remove(child) {
  // 拿到父级节点 然后删除子节点
  // 调用原生 dom 删除节点
  const parent = child.parentNode
  if (parent) {
    parent.removeChild(child);
  }
}

function setElementText(el, text) {
  el.textContent = text
}


// 调用 renderer.ts 中的 createRenderer
const renderer: any = createRenderer({
  createElement,
  patchProp,
  insert,
  remove,
  setElementText
})

// 这样用户就可以正常的使用 createApp 了
export function createApp(...args) {
  return renderer.createApp(...args)
}

// 并且让 runtime-core 作为 runtime-dom 的子级
export * from '../runtime-core';