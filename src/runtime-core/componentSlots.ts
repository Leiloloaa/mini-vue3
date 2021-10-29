import { isArray } from './../shared/index';
import { ShapeFlags } from "../shared/shapeFlags"

export function initSlots(instance, children) {
  // array
  // instance.slots = Array.isArray(children) ? children : [children]

  // object
  // const slots = {}
  // for (const key in children) {
  //   const value = children[key];
  //   slots[key] = Array.isArray(value) ? value : [value]
  // }
  // instance.slots = slots


  // const slots = {}
  // for (const key in children) {
  //   const value = children[key];
  //   slots[key] = (props) => normalizeSlotValue(value(props))
  // }
  // instance.slots = slots

  // 优化 并不是所有的 children 都有 slots
  // 通过 位运算 来处理
  const { vnode } = instance
  if (vnode.shapeFlag & ShapeFlags.SLOT_CHILDREN) {
    normalizeObjectSlots(children, instance.slots)
  }
}

function normalizeObjectSlots(children, slots) {
  for (const key in children) {
    const value = children[key];
    // slots[key] = Array.isArray(value) ? value : [value]   
    // slots[key] = normalizeSlotValue(value)
    // 修改 当 是一个 函数的时候 直接调用
    slots[key] = (props) => normalizeSlotValue(value(props))
  }
}

function normalizeSlotValue(value) {
  return isArray(value) ? value : [value]
}