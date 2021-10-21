import { isObject, hasChanged } from './../shared/index';
import { isTracking, trackEffects, triggerEffects } from "./effect";
import { reactive } from './reactive';

class RefImpl {
  private _value: any
  dep
  private _rawValue: any;
  public __v_isRef = true
  constructor(value) {
    // 保留转换前的值
    this._rawValue = value
    this._value = convert(value)
    this.dep = new Set()
  }

  get value() {
    // 收集依赖
    trackRefValue(this)
    return this._value
  }

  set value(newValue) {
    if (hasChanged(newValue, this._rawValue)) {
      this._rawValue = newValue
      this._value = convert(newValue)
      // 触发依赖
      triggerEffects(this.dep)
    }
  }
}

function convert(value) {
  return isObject(value) ? reactive(value) : value
}

function trackRefValue(ref) {
  if (isTracking()) {
    trackEffects(ref.dep);
  }
}

export function ref(value) {
  return new RefImpl(value)
}

export function isRef(ref) {
  return !!ref.__v_isRef
}

// isRef 的语法糖
export function unRef(ref) {
  return isRef(ref) ? ref.value : ref
}

// 代理对象的属性 是 ref
// proxyRefs 是帮我们在 template 中做了 ref 的拆箱处理
// 不用加上 .value 内部使用了 unRef 语法糖
export function proxyRefs(objectWithRefs) {
  return new Proxy(objectWithRefs, {
    get(target, key) {
      // 如果是 ref 类型 就返回 .value 值 否则返回本身
      return unRef(Reflect.get(target, key))
    },
    set(target, key, value) {
      // 这个属性是 ref 并且新值不是 ref
      if (isRef(target[key]) && !isRef(value)) {
        return (target[key].value = value)
      } else {
        return Reflect.set(target, key, value)
      }
    }
  })
}