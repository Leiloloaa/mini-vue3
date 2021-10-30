import { isFunction } from '../../shared/index';
import { createVNode, Fragment } from './../vnode';

export function renderSlots(slots, name, props) {
  const slot = slots[name]
  if (slot) {
    if (isFunction(slot)) {
      // 我们为了渲染 插槽中的 元素 主动在外层添加了一个 div -> component
      // 修改 直接变成 element -> mountChildren
      // Symbol 常量 Fragment
      return createVNode(Fragment, {}, slot(props))
    }
  }
}