import { track, trigger } from "./effect"
import { mutableHandlers, readonlyHandles, shallowReadonlyHandles } from './baseHandlers';

export const enum ReactiveFlags {
  IS_REACTIVE = "__v_isReactive",
  IS_READONLY = "__v_isReadonly"
};

export function reactive(raw) {
  return createActiveObject(raw, mutableHandlers)
}

export function readonly(raw) {
  return createActiveObject(raw, readonlyHandles)
}

export function shallowReadonly(raw) {
  return createActiveObject(raw, shallowReadonlyHandles)
}

export function isReactive(value) {
  // 触发 get 操作 就可以判断 value.xxx 就会触发
  // value["is_reactive"] get 就可以获取到 is_reactive
  // 如果传过来的不是 proxy 值，所以就不会去调用 get 方法
  // 也没挂载 ReactiveFlags.IS_REACTIVE 属性 所以是 undefined
  // 使用 !! 转换成 boolean 值就可以了
  return !!value[ReactiveFlags.IS_REACTIVE]
}

export function isReadonly(value) {
  return !!value[ReactiveFlags.IS_READONLY]
}

export function isProxy(value) {
  return isReactive(value) || isReadonly(value)
}

function createActiveObject(raw, baseHandlers) {
  return new Proxy(raw, baseHandlers)
}
