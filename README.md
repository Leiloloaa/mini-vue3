# my-miniVue

> 实现Vue3核心逻辑

## 初步实现 effect 中的 track 和 trigger

```ts
// effect.spec.ts
it('effect', () => {
    // reactive 核心
    // get 收集依赖
    // set 触发依赖
    const user = reactive({
      age: 10
    })

    let nextAge
    effect(() => {
      nextAge = user.age + 1
    })
    expect(nextAge).toBe(11)

    // update
    user.age++
    expect(nextAge).toBe(12)
});

// effect.ts
let activeEffect
export class ActiveEffect {
  private _fn: any
  constructor(fn) {
    this._fn = fn
  }
  run() {
    activeEffect = this
    this._fn()
  }
}

const targetsMap = new Map()
export function track(target, key) {
  // 收集依赖
  // reactive 传入的是一个对象 {}
  // 收集关系： targetsMap 收集所有依赖 然后 每一个 {} 作为一个 depsMap
  // 再把 {} 里面的每一个变量作为 dep(set 结构) 的 key 存放所有的 fn
  let depsMap = targetsMap.get(target)
  // 不存在的时候 要先初始化
  if (!depsMap) {
    depsMap = new Map()
    targetsMap.set(target, depsMap)
  }
  let dep = depsMap.get(key)
  if (!dep) {
    dep = new Set()
    depsMap.set(key, dep)
  }

  // 要存入的是一个 fn
  // 所以要利用一个全局变量
  dep.add(activeEffect)
}

export function trigger(target, key) {
  // 触发依赖
  let depsMap = targetsMap.get(target)
  let dep = depsMap.get(key)
  for (const effect of dep) {
    effect.run()
  }
}

export function effect(fn) {
  const _effect = new ActiveEffect(fn)
  _effect.run()
}
```


## 实现 effect 中的返回的 runner、scheduler、stop 和 onStop 功能

**具体作用**：还是未知，随着深入，要联想到为什么要这么做，有什么好处？

### runner

**目的**：effect 中的 fn 返回变量或者函数

```ts
class ReactiveEffect {
   run() {
    activeEffect = this
    return this._fn()
  }
}

export function effect(fn) {
  // ReactiveEffect 构造函数（一定要用 new 关键字实现）
  const _effect = new ReactiveEffect(fn)

  _effect.run()

  // 要考虑 this 的问题 所以要使用 bind
  const runner: any = _effect.run.bind(_effect)
  // 保存
  runner.effect = _effect

  return runner
}
```

### scheduler

scheduler 的实现逻辑

1、当响应式对象第一次发生改变的时候，会执行 fn，scheduler 不会执行
2、第二次发生改变的时候，会执行性 scheduler，赋值 run 方法
3、调用 run 方法的时候，才会执行 fn

一开始不会被调用 scheduler 函数
因为 effect 中一开始是执行的是 run 方法
只有当 trigger 触发更新依赖的时候，有 scheduler 才执行

```ts
class ReactiveEffect {
  private _fn: any
  deps = []
  scheduler: Function | undefined
  constructor(fn, scheduler?: Function) {
    this._fn = fn
    // 这样实例就会有 scheduler 函数
    this.scheduler = scheduler
  }
}

type effectOptions = {
  scheduler?: Function;
  onStop?: Function;
};

// 先在 effect 中传入实例中
export function effect(fn, options: effectOptions = {}) {
  // ReactiveEffect 构造函数（一定要用 new 关键字实现）
  const _effect = new ReactiveEffect(fn, options.scheduler)
  // 考虑到后面还会有很多 options
  // 使用 Object.assign() 方法自动合并
  // _effect.onStop = options.onStop
  // Object.assign(_effect, options);
  // extend 扩展 更有可读性
  extend(_effect, options)
  _effect.run()

  const runner: any = _effect.run.bind(_effect)
  // 保存
  runner.effect = _effect

  return runner
}
```

### stop 和 onStop

使用 stop 之前，要先复习收集依赖的过程，因为 stop 是要通过 effect 去删除 deps。更新是不让它更新 fn

```ts
export function stop(runner) {
  // stop 的意义 是找要到这个实例 然后删除
  runner.effect.stop()
}

// 首先在 effect 内部 保存 runner 函数保存实例
export function effect(fn, options: effectOptions = {}) {
  // ReactiveEffect 构造函数（一定要用 new 关键字实现）
  const _effect = new ReactiveEffect(fn, options.scheduler)
  // 考虑到后面还会有很多 options
  // 使用 Object.assign() 方法自动合并
  // _effect.onStop = options.onStop
  // Object.assign(_effect, options);
  // extend 扩展 更有可读性
  extend(_effect, options)
  _effect.run()

  const runner: any = _effect.run.bind(_effect)
  // 保存
  runner.effect = _effect

  return runner
}

// 在构造函数中实现 stop 方法
class ReactiveEffect {
  private _fn: any
  deps = []
  scheduler: Function | undefined
  active = true
  onStop?: () => void
  constructor(fn, scheduler?: Function) {
    this._fn = fn
    this.scheduler = scheduler
  }
  run() {
    activeEffect = this
    return this._fn()
  }
  stop() {
    // 性能问题
    // 第一次调用 就已经清空了
    if (this.active) {
      cleanupEffect(this)
      if (this.onStop) {
        this.onStop()
      }
      this.active = false
    }
  }
}

// 为什么需要 cleanupEffect 方法
// 单测的步骤
// 编写单测
// 实现单测
// 优化代码
function cleanupEffect(effect) {
  effect.deps.forEach((dep: any) => {
    dep.delete(effect)
  });
}
```







## isReactive、isReadonly、isProxy、isRef、unRef

- isReactive
- isReadonly
- isProxy
- isRef
- unRef

### isReactive

> 判断是否是 isReactive 响应式对象

```js
export function isReactive(value) {
  // !! 感叹号 可以去除 undefined 的情况
  return !!value[ReactiveFlags.IS_REACTIVE]
}
```

- 只需要调用 value 的 get 方法，如果是响应式变量，那么返回一个 true；
- 如果不是 响应式变量，那么 value 身上就没有 ReactiveFlags.IS_REACTIVE 这个属性，就会使 undefined
  - 使用 !! 双感叹号转换

### isReadonly

> 判断是否是 readonly 只读属性

```js
export function isReadonly(value) {
  return !!value[ReactiveFlags.IS_READONLY]
}
```

原理同上，在 get 中返回 true

### isProxy

> 语法糖，内部还是靠前面两个实现的

```js
export function isProxy(value) {
  return isReactive(value) || isReadonly(value)
}
```

### isRef

> 判断是否是 ref 响应式变量

```js
// 创建这个 实例 的时候，__v_isRef 为 true
class RefImpl {
  public __v_isRef = true
}

// 判断这个实例上 挂载的 __v_isRef 属性
export function isRef(ref) {
  return !!ref.__v_isRef
}
```

### unRef

> 语法糖

```js
export function unRef(ref) {
  return isRef(ref) ? ref.value : ref
}
```

如果是 ref 类型，那么就返回 value 值，否则返回本身

## 实现 ref、proxyRefs、computed

### ref

**为什么要 .value?**

ref 一般声明的是变量 get 的时候 要调用 get value 方法 拿值

**为什么 reactive 定义的 不要**

reactive 声明的是对象 对象的 get 方法 参数是 target 和 key，target[key] 就是值

**实现**

都是 返回一个 class 类，然后再在这个类中添加属性

```ts
export function ref(value) {
  return new RefImpl(value)
}

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
```

### proxyRefs

**具体的作用**

在 template 中，自动拆箱，不用使用 .value 来获取值。内部的 get 方法是使用了 unRef 语法糖，如果是 ref 类型那么返回 .value 值，否则返回本身。

```ts
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
```

### computed

computed 是计算属性，接收一个函数。具有懒加载属性，只有当依赖的响应式值发生改变的时候，才会触发更新。get value 中是通过实例的 dirty 属性来判断的。

```ts
class ComputedRefImpl {
  private _getter: any
  private _dirty: any = true
  private _value: any
  private _effect: ReactiveEffect
  constructor(getter) {
    this._getter = getter
    this._effect = new ReactiveEffect(getter, () => {
      if (!this._dirty) {
        this._dirty = true
      }
    })
  }

  get value() {
    // 要有个值来开关
    // 如果依赖的响应式发生了修改 那么这个值就得修改
    // this._dirty 就要为 true
    if (this._dirty) {
      this._value = this._effect.run()
      this._dirty = false
    }
    return this._value
  }
}

export function computed(getter) {
  return new ComputedRefImpl(getter)
}
```