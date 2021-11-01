import { isObject } from './../shared/index';
import { shallowReadonly } from "../reactivity/reactive"
import { emit } from "./componentEmit"
import { initProps } from "./componentProps"
import { PublicInstanceProxyHandles } from "./componentPublicInstance"
import { initSlots } from './componentSlots';

export function createComponentInstance(vnode) {
  const component = {
    vnode,
    type: vnode.type,
    setupState: {},
    props: {},
    slots: {},
    emit: () => { }
  }

  // TODO 为什么？？？
  component.emit = emit.bind(null, component) as any
  return component
}

export function setupComponent(instance) {
  initProps(instance, instance.vnode.props)
  // 把虚拟节点的 slots 赋值给 component
  initSlots(instance, instance.vnode.children)

  setupStatefulComponent(instance)
}

function setupStatefulComponent(instance) {
  const Component = instance.type
  instance.proxy = new Proxy({ _: instance }, PublicInstanceProxyHandles)
  const { setup } = Component

  if (setup) {
    setCurrentInstance(instance)
    const setupResult = setup(shallowReadonly(instance.props), { emit: instance.emit })
    setCurrentInstance(null)
    handleSetupResult(instance, setupResult)
  }
}

function handleSetupResult(instance: any, setupResult: any) {
  // TODO function
  if (isObject(setupResult)) {
    instance.setupState = setupResult
  }

  finishComponentSetup(instance)
}

function finishComponentSetup(instance: any) {
  const Component = instance.type
  instance.render = Component.render
}

let currentInstance = null
export function getCurrentInstance() {
  return currentInstance
}

function setCurrentInstance(value) {
  currentInstance = value
}