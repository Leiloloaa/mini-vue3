import { track, trigger } from "./effect"

export function reactive(raw) {
  return new Proxy(raw, {
    get(target, key) {
      const res = Reflect.get(target, key)
      // Proxy 要和 Reflect 配合使用
      // Reflect.get 中 receiver 参数，保留了对正确引用 this（即 admin）的引用，该引用将 Reflect.get 中正确的对象使用传递给 get
      // 不管 Proxy 怎么修改默认行为，你总可以在 Reflect 上获取默认行为
      track(target, key)
      return res
    },
    set(target, key, value) {
      // set 操作是会放回 true or false
      // set() 方法应当返回一个布尔值。
      // 返回 true 代表属性设置成功。
      // 在严格模式下，如果 set() 方法返回 false，那么会抛出一个 TypeError 异常。
      const res = Reflect.set(target, key, value)
      console.log(target, key, value);
      trigger(target, key)
      return res
    }
  })
}