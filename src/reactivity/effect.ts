import { extend } from "../shared"

let activeEffect
let shouldTrack = false; // 是否应该收集

export class ReactiveEffect {
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
    // 如果 active 为 false 
    // 那么 就已经 stop 了
    // 否则就应该收集 activeEffect
    // 如果是 stop 状态 就只执行 不赋值给 activeEffect
    if (!this.active) {
      return this._fn()
    }
    shouldTrack = true
    activeEffect = this
    // 执行 fn 的时候，就会 get 操作 就会收集
    const r = this._fn()

    // todo 为什么要重置？
    // 第一次收集完后，就不用再收集了
    // 重置
    shouldTrack = false
    activeEffect = undefined
    return r
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

function cleanupEffect(effect) {
  effect.deps.forEach((dep: any) => {
    dep.delete(effect)
  });

  // 把 effect.deps 清空
  effect.deps.length = 0;
}

const targetsMap = new Map()
export function track(target, key) {
  // 是否收集  shouldTrack 为 true 和 activeEffect 有值的时候要收集 否则就 return 出去
  if (!isTracking()) return;
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

  // 如果是单纯的获取 就不会有 activeEffect
  // 因为 activeEffect 是在 effect.run 执行的时候 才会存在
  if (!activeEffect) return
  // if (!shouldTrack) return

  // 如果 dep 存在 就不会收集
  // if (dep.has(activeEffect)) return

  // 要存入的是一个 fn
  // 所以要利用一个全局变量
  // dep.add(activeEffect)

  // 如何通过当前的 effect 去找到 deps？
  // 反向收集 deps
  // activeEffect.deps.push(dep)
  trackEffects(dep)
}

export function trackEffects(dep) {
  // 如果 dep 存在 就不会收集
  if (dep.has(activeEffect)) return

  // 要存入的是一个 fn
  // 所以要利用一个全局变量
  dep.add(activeEffect)

  // 如何通过当前的 effect 去找到 deps？
  // 反向收集 deps
  activeEffect.deps.push(dep)
}


export function isTracking() {
  return shouldTrack && activeEffect !== undefined;
}

export function trigger(target, key) {
  // 触发依赖
  let depsMap = targetsMap.get(target)
  let dep = depsMap.get(key)
  triggerEffects(dep)
}

export function triggerEffects(dep) {
  for (const effect of dep) {
    if (effect.scheduler) {
      effect.scheduler()
    } else {
      effect.run()
    }
  }
}

type effectOptions = {
  scheduler?: Function;
  onStop?: Function;
};

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

export function stop(runner) {
  // stop 的意义 是找要到这个实例 然后删除
  runner.effect.stop()
}

