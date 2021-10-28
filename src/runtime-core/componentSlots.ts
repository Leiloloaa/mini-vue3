import { ShapeFlags } from "../shared/shapeFlag";

export function initSlots(instance, children) {
  // 优化 并不是所有的 children 都有 slots
  // 通过 位运算 来处理
  const { vnode } = instance
  if (vnode.shapeFlag & ShapeFlags.SLOT_CHILDREN) {
    normalizeObjectSlots(children, instance.slots)
  }
  // children is array
  // instance.slots = Array.isArray(children) ? children : [children]

  // children is object
  // const slots = {}
  // for (const key in children) {
  //   const value = children[key];
  // slots[key] = Array.isArray(value) ? value : [value]   
  //   slots[key] = normalizeSlotValue(value)
  // }

  // instance.slots = slots
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
  return Array.isArray(value) ? value : [value]
}

