import { Fragment } from './../vnode';
import { createVNode } from "../vnode";

export function renderSlots(slots, name, props) {

  const slot = slots[name]

  if (slot) {
    if (typeof slot === 'function') {
      // 直接调用
      // 实际上这种写法会多了一个 div
      // 我们通过一个 Fragment 来判断，然后直接 遍历 children
      return createVNode(Fragment, {}, slot(props))
    }
  }
}