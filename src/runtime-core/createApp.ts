import { render } from "./renderer"
import { createVNode } from "./vnode"

export function createApp(rootComponent) {
  return {
    mount(rootContainer) {
      // 转换成 vdom
      // component -> vnode
      // 所有的逻辑操作 都会基于 vnode 做处理
      const vnode = createVNode(rootComponent)
      render(vnode, rootComponent)
    }
  }
}

