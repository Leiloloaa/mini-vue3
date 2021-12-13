import { hasChanged, isObject } from "../shared";
import { createDep } from "./dep";
import { isTracking, trackEffects, triggerEffects } from "./effect";
import { reactive } from "./reactive";

// 1 true '1'
// get set
// 而 proxy -》只能监听对象
// 我们包裹一个 对象 

// Impl 表示一个接口的缩写
class RefImpl {
  private _value: any
  public dep
  private _rawValue: any
  __v_isRef = true
  constructor(value) {
    // 存储一个新值 用于后面的对比
    this._rawValue = value
    // value -> reactive
    // 看看 value 是不是 对象
    this._value = convert(value)

    this.dep = createDep()
  }

  // 属性访问器模式
  get value() {
    // 确保调用过 run 方法 不然 dep 就是 undefined
    // if (isTracking()) {
    //   trackEffects(this.dep)
    // }
    trackRefValue(this)
    return this._value
  }

  set value(newValue) {
    // 一定是先修改了 value
    // newValue -> this._value 相同不修改
    // if (Object.is(newValue, this._value)) return
    // hasChanged
    // 改变才运行
    // 对比的时候 object
    // 有可能 this.value 是 porxy 那么他们就不会相等
    if (hasChanged(newValue, this._rawValue)) {
      this._rawValue = newValue
      this._value = convert(newValue)
      triggerEffects(this.dep)
    }
  }
}

function convert(value) {
  return isObject(value) ? reactive(value) : value
}

function trackRefValue(ref) {
  if (isTracking()) {
    trackEffects(ref.dep)
  }
}

export function ref(value) {
  return new RefImpl(value)
}

export function isRef(ref) {
  return !!ref.__v_isRef
}

// 语法糖 如果是 ref 就放回 .value 否则返回本身
export function unRef(ref) {
  return isRef(ref) ? ref.value : ref
}

export function proxyRefs(objectWithRefs) {
  return new Proxy(objectWithRefs, {
    get(target, key) {
      // get 如果获取到的是 age 是个 ref 那么就返回 .value
      // 如果不是 ref 就直接返回本身
      return unRef(Reflect.get(target, key))
    },
    set(target, key, value) {
      // value 是新值
      // 如果目标是 ref 且替换的值不是 ref
      if (isRef(target[key]) && !isRef(value)) {
        return target[key].value = value
      } else {
        return Reflect.set(target, key, value)
      }
    }
  })
}