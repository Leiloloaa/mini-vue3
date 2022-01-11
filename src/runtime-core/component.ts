import { isObject } from './../shared/index';
import { shallowReadonly } from "../reactivity/reactive"
import { emit } from "./componentEmit"
import { initProps } from "./componentProps"
import { PublicInstanceProxyHandlers } from "./componentPublicInstance"
import { initSlots } from "./componentSlots"
import { proxyRefs } from '../reactivity';

export function createComponentInstance(vnode, parent) {
  const component = {
    vnode,
    type: vnode.type,
    next: null, // 表示下一个要更新的 vnode
    props: {},
    slots: {},
    setupState: {},
    provides: parent ? parent.provides : {}, // 获取 parent 的 provides 作为当前组件的初始化值 这样就可以继承 parent.provides 的属性了
    parent,
    isMount: false,
    subTree: {}, // 更新了 要挂载老的树
    emit: () => { }
  }
  // bind 的第一个参数 如果是 undefined 或者 null  那么 this 就是指向 windows
  // 这样做的目的是 实现了 emit 的第一个参数 为 component 实例 这是预置入
  component.emit = emit.bind(null, component) as any
  return component
}

export function setupComponent(instance) {
  initSlots(instance, instance.vnode.children)
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
    setCurrentInstance(instance)
    // 返回一个 function 或者是 Object
    // 如果是 function 则认为是 render 函数
    // 如果是 Object 则注入到当前组件的上下文中
    const setupResult = setup(shallowReadonly(instance.proxy), { emit: instance.emit })
    setCurrentInstance(null)

    handleSetupResult(instance, setupResult)
  }
}

function handleSetupResult(instance, setupResult: any) {
  // TODO function

  if (isObject(setupResult)) {
    instance.setupState = proxyRefs(setupResult)
  }

  finishComponentSetup(instance)
}

function finishComponentSetup(instance: any) {
  const Component = instance.type
  instance.render = Component.render
}

let currentInstance = null
export function getCurrentInstance() {
  // 需要返回实例
  return currentInstance
}

// 赋值时 封装函数的好处
// 我们可以清晰的知道 谁调用了 方便调试
export function setCurrentInstance(instance) {
  currentInstance = instance;
}
