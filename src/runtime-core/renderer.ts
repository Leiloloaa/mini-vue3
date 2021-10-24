import { createComponentInstance, setupComponent } from "./component"

export function render(vnode, rootComponent) {
  // 只需要调用 patch 方法
  // 方便后续的递归处理
  patch(vnode, rootComponent)
}

function patch(vnode: any, rootComponent: any) {
  // 去处理组件
  // 判断什么类型
  processComponent(vnode, rootComponent)
}

function processComponent(vnode: any, rootComponent: any) {
  // 挂载组件
  mountComponent(vnode, rootComponent)
}

function mountComponent(vnode, rootComponent) {
  // 创建组件实例
  // 这个实例上面有很多属性
  const instance = createComponentInstance(vnode)

  // 初始化
  setupComponent(instance)

  // 调用 render 函数
  setupRenderEffect(instance, rootComponent)
}

function setupRenderEffect(instance, rootComponent) {
  // 虚拟节点树
  const subTree = instance.render()

  // vnode -> patch
  // vnode -> element -> mountElement

  patch(subTree, rootComponent)
}

