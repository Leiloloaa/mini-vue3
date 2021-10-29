import { isFunction } from '../../shared/index';
import { createVNode } from './../vnode';

export function renderSlots(slots, name, props) {
  const slot = slots[name]
  if (slot) {
    if (isFunction(slot)) {
      return createVNode('div', {}, slot(props))
    }
  }
}