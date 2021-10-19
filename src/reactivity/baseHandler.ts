import { track, trigger } from "./effect";
import { ReactiveFlags } from "./reactive";

const get = createGetter(); // 全局缓存 get
const set = createSetter(); // 全局缓存 set
const readonlyGet = createGetter(true);

// 高阶函数，返回一个 return
export function createGetter(isReadonly = false) {
  return function get(target, key) {
    if (key === ReactiveFlags.IS_READONLY) {
      return isReadonly;
    } else if (key === ReactiveFlags.IS_REACTIVE) {
      return !isReadonly;
    }

    const res = Reflect.get(target, key);

    if (!isReadonly) {
      track(target, key)
    }
    return res;
  }
}

export function createSetter() {
  return function set(target, key, value) {
    const res = Reflect.set(target, key, value);

    trigger(target, key);
    return res;
  }
}

export const mutableHandlers = {
  get,
  set
};

export const readonlyHandlers = {
  get: readonlyGet,
  set(target, key) {
    console.warn(
      `key :"${String(key)}" set 失败，因为 target 是 readonly 类型`,
      target
    );

    return true;
  }
}