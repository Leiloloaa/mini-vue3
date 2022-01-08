import { isArray, isObject, isString } from "../shared/index"
import { ShapeFlags } from "../shared/shapeFlags"

export const Fragment = Symbol('Fragment');
export const Text = Symbol('Text');

export function createVNode(type, props?, children?) {
  const vnode = {
    type,
    props,
    children,
    key: props && props.key,
    shapeFlag: getShapeFlag(type),
    el: null
  }

  // children
  if (isString(children)) {
    // vnode.shapeFlag =   vnode.shapeFlag | ShapeFlags.TEXT_CHILDREN
    // | 两位都为 0 才为 0
    // 0100 | 0100 = 0100
    vnode.shapeFlag |= ShapeFlags.TEXT_CHILDREN
  } else if (isArray(children)) {
    vnode.shapeFlag |= ShapeFlags.ARRAY_CHILDREN
  }

  // 组件类型 + children 是 object 就有 slot
  if (vnode.shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
    if (isObject(children)) {
      vnode.shapeFlag |= ShapeFlags.SLOT_CHILDREN
    }
  }

  return vnode
}

function getShapeFlag(type: any) {
  // string -> div -> element
  return isString(type) ? ShapeFlags.ELEMENT : ShapeFlags.STATEFUL_COMPONENT
}

export function createTextVNode(text: string) {
  return createVNode(Text, {}, text)
}