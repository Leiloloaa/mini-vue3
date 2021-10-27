import { isArray, isString } from "../shared/index"
import { ShapeFlags } from "../shared/shapeFlags"

export function createVNode(type, props?, children?) {
  const vnode = {
    type,
    props,
    children,
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

  return vnode
}

function getShapeFlag(type: any) {
  // string -> div -> element
  return isString(type) ? ShapeFlags.ELEMENT : ShapeFlags.STATEFUL_COMPONENT
}
