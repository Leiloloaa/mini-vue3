import { isObject } from "./../shared/index";
import {
  mutableHandlers,
  readonlyHandlers,
  shallowReadonlyHandlers,
} from "./baseHandlers";

export const reactiveMap = new WeakMap();
export const readonlyMap = new WeakMap();
export const shallowReadonlyMap = new WeakMap();

export const enum ReactiveFlags {
  IS_REACTIVE = "__v_isReactive",
  IS_READONLY = "__v_isReadonly",
  RAW = "__v_raw",
}

export function reactive(target) {
  // 如果试图去观察一个只读的代理对象，会直接返回只读版本
  // 这种情况对于的是 readonly 变量 再用 reactive 代理
  if (isReadonly(target)){
    return target;
  }
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
  // 触发 get 操作 就可以判断 value.xxx 就会触发
  // value["is_reactive"] get 就可以获取到 is_reactive
  // 如果传过来的不是 proxy 值，所以就不会去调用 get 方法
  // 也没挂载 ReactiveFlags.IS_REACTIVE 属性 所以是 undefined
  // 使用 !! 转换成 boolean 值就可以了
  return !!value[ReactiveFlags.IS_REACTIVE];
}

export function isReadonly(value) {
  return !!value[ReactiveFlags.IS_READONLY];
}

export function isProxy(value) {
  return isReactive(value) || isReadonly(value);
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

function createReactiveObject(target, proxyMap, baseHandlers) {
  if (!isObject(target)) {
    console.log("不是一个对象");
  }
  // 核心就是 proxy
  // 目的是可以侦听到用户 get 或者 set 的动作

  // 如果命中的话就直接返回就好了 不需要每次都重新创建
  // 使用缓存做的优化点
  const existingProxy = proxyMap.get(target);
  if (existingProxy) {
    return existingProxy;
  }
  const proxy = new Proxy(target, baseHandlers);
  // 把创建好的 proxy 给存起来
  proxyMap.set(target, proxy);
  return proxy;
}
