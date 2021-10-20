import { mutableHandlers, readonlyHandlers, shallowReadonlyHandlers } from "./baseHandler"

export const enum ReactiveFlags {
  IS_REACTIVE = "__v_isReactive",
  IS_READONLY = "__v_isReadonly",
}

export function reactive(raw) {
  return createReactiveObject(raw, mutableHandlers)
}

export function readonly(raw) {
  return createReactiveObject(raw, readonlyHandlers)
}

export function shallowReadonly(raw) {
  return createReactiveObject(raw, shallowReadonlyHandlers)
}

export function isReactive(value) {
  // !! 感叹号 可以去除 undefined 的情况
  return !!value[ReactiveFlags.IS_REACTIVE]
}

export function isReadonly(value) {
  return !!value[ReactiveFlags.IS_READONLY]
}

export function isProxy(value) {
  return isReactive(value) || isReadonly(value)
}

// 抽离 new proxy 生成createReactiveObject
// target = raw ；baseHandles 类别
function createReactiveObject(target, baseHandles) {
  return new Proxy(target, baseHandles)
}