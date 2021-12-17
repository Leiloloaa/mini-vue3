// 因为 render 函数被包裹了 所以 调用 createApp 的时候传入 render
// import { render } from "./renderer"
import { createVNode } from "./vnode"

// 为了让用户又能直接使用 createApp 所以 前往 renderer 导出一个 createApp
export const createAppAPI = (render) => {
  return function createApp(rootComponent) {
    return {
      mount(rootContainer) {
        // 转换成 vdom
        // component -> vnode
        // 所有的逻辑操作 都会基于 vnode 做处理
        const vnode = createVNode(rootComponent)
        // !! bug render 是将虚拟 dom 渲染到 rootComponent 中
        render(vnode, rootContainer)
      }
    }
  }
};


