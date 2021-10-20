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






## 总结一些判断函数

- isReactive
- isReadonly
- isProxy
- isRef
- unRef

## isReactive

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