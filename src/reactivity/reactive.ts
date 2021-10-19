import { mutableHandlers, readonlyHandlers } from "./baseHandler"

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

export function isReadonly(value) {
  // !! 感叹号 可以去除 undefined 的情况
  return !!value[ReactiveFlags.IS_READONLY]
}

export function isReactive(value) {
  return !!value[ReactiveFlags.IS_REACTIVE]
}

// 抽离 new proxy 生成createReactiveObject
// target = raw ；baseHandles 类别
function createReactiveObject(target, baseHandles) {
  return new Proxy(target, baseHandles)
}