import { render } from "./renderer"
import { createVNode } from "./vnode"

// 创建组件实例
export function createApp(rootComponent) {
  return {
    // mount 是起到 挂载的作用
    mount(rootContainer) {
      // 创建虚拟 dom
      const vnode = createVNode(rootComponent)
      // 然后再通过 render 函数渲染
      render(vnode, rootContainer)
    }
  }
}