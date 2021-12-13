import { extend, isObject } from "../shared"
import { track, trigger } from "./effect"
import { reactive, ReactiveFlags, reactiveMap, readonly, readonlyMap, shallowReadonlyMap } from "./reactive"

// 缓存 首次创建即可
const get = createGetter()
const set = createSetter()
const readonlyGet = createGetter(true)
const shallowReadonlyGet = createGetter(true, true)

// 1、reactive 和 readonly 逻辑相似 抽离代码
// 2、使用高阶函数 来区分是否要 track
function createGetter(isReadonly = false, shallow = false) {
  return function get(target, key, receiver) {
    const isExistInReactiveMap = () =>
      key === ReactiveFlags.RAW && receiver === reactiveMap.get(target);

    const isExistInReadonlyMap = () =>
      key === ReactiveFlags.RAW && receiver === readonlyMap.get(target);

    const isExistInShallowReadonlyMap = () =>
      key === ReactiveFlags.RAW && receiver === shallowReadonlyMap.get(target);

    if (key === ReactiveFlags.IS_REACTIVE) {
      return !isReadonly
    } else if (key === ReactiveFlags.IS_READONLY) {
      return isReadonly
    } else if (
      isExistInReactiveMap() ||
      isExistInReadonlyMap() ||
      isExistInShallowReadonlyMap()
    ) {
      return target;
    }

    const res = Reflect.get(target, key)
    // Proxy 要和 Reflect 配合使用
    // Reflect.get 中 receiver 参数，保留了对正确引用 this（即 admin）的引用，该引用将 Reflect.get 中正确的对象使用传递给 get
    // 不管 Proxy 怎么修改默认行为，你总可以在 Reflect 上获取默认行为

    // 如果为 true 就直接返回
    if (shallow) {
      return res
    }

    // 如果 res 是 Object
    if (isObject(res)) {
      return isReadonly ? readonly(res) : reactive(res)
    }

    if (!isReadonly) {
      track(target, key)
    }
    return res
  }
}

function createSetter() {
  return function set(target, key, value, receiver) {
    // set 操作是会放回 true or false
    // set() 方法应当返回一个布尔值。
    // 返回 true 代表属性设置成功。
    // 在严格模式下，如果 set() 方法返回 false，那么会抛出一个 TypeError 异常。
    const res = Reflect.set(target, key, value, receiver)
    trigger(target, "get", key)
    return res
  }
}

export const mutableHandlers = {
  get,
  set
};

export const readonlyHandlers = {
  get: readonlyGet,
  set(target, key) {
    console.warn(`key:${key}`)
    return true
  }
};

export const shallowReadonlyHandlers = extend({}, readonlyHandlers, { get: shallowReadonlyGet });