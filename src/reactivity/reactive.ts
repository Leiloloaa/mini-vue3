import { isObject } from './../shared/index';
import { mutableHandlers, readonlyHandlers, shallowReadonlyHandlers } from "./baseHandler"

// 创建了 3 个 WeakMap
export const reactiveMap = new WeakMap();
export const readonlyMap = new WeakMap();
export const shallowReadonlyMap = new WeakMap();

export const enum ReactiveFlags {
  IS_REACTIVE = "__v_isReactive",
  IS_READONLY = "__v_isReadonly",
  RAW = "__v_raw",
}

export function reactive(target) {
  return createReactiveObject(target, reactiveMap, mutableHandlers);
}

export function readonly(target) {
  return createReactiveObject(target, readonlyMap, readonlyHandlers);
}

export function shallowReadonly(target) {
  return createReactiveObject(
    target,
    shallowReadonlyMap,
    shallowReadonlyHandlers
  );
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
function createReactiveObject(target, proxyMap, baseHandles) {
  // proxyMap 的目的是为确定是否存在过

  // 如果命中的话就直接返回就好了
  // 使用缓存做的优化点
  const existingProxy = proxyMap.get(target);
  if (existingProxy) {
    return existingProxy;
  }

  if (!isObject(target)) {
    console.log('必须是一个对象')
    return target
  }

  const proxy = new Proxy(target, baseHandles)

  // 并且把创建好的保存起来
  proxyMap.set(target, proxy)

  return proxy
}

export function toRaw(value) {
  // 如果 value 是proxy 的话 ,那么直接返回就可以了
  // 因为会触发 createGetter 内的逻辑
  // 如果 value 是普通对象的话，
  // 我们就应该返回普通对象
  // 只要不是 proxy ，只要是得到的 undefined 的话，那么就一定是普通对象
  // TODO 这里和源码里面实现的不一样，不确定后面会不会有问题
  if (!value[ReactiveFlags.RAW]) {
    return value;
  }

  return value[ReactiveFlags.RAW];
}