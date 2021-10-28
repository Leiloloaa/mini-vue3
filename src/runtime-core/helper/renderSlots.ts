import { createVNode } from "../vnode";

export function renderSlots(slots, name, props) {

  const slot = slots[name]

  if (slot) {
    if (typeof slot === 'function') {
      // 直接调用
      return createVNode("div", {}, slot(props))
    }
  }
}