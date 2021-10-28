import { shallowReadonly } from "../reactivity/reactive"
import { initProps } from "./componentProps"
import { PublicInstanceProxyHandlers } from "./componentPublicInstance"

export function createComponentInstance(vnode) {
  const component = {
    vnode,
    type: vnode.type,
    props: {},
    setupState: {}
  }
  return component
}

export function setupComponent(instance) {
  // todo 
  // initSlots()
  initProps(instance, instance.vnode.props)
  // console.log(instance);

  // 初始化一个有状态的 component
  // 有状态的组件 和 函数组件
  setupStatefulComponent(instance)
}

function setupStatefulComponent(instance) {
  // 调用 setup 然后 拿到返回值
  // type 就是 app 对象
  const Component = instance.type

  // ctx
  instance.proxy = new Proxy({
    _: instance
  }, PublicInstanceProxyHandlers)

  // 解构 setup
  const { setup } = Component

  if (setup) {
    // 返回一个 function 或者是 Object
    // 如果是 function 则认为是 render 函数
    // 如果是 Object 则注入到当前组件的上下文中
    const setupResult = setup(shallowReadonly(instance.proxy))

    handleSetupResult(instance, setupResult)
  }
}

function handleSetupResult(instance, setupResult: any) {
  // TODO function

  if (typeof setupResult === "object") {
    instance.setupState = setupResult
  }

  finishComponentSetup(instance)
}

function finishComponentSetup(instance: any) {
  const Component = instance.type
  instance.render = Component.render
}

