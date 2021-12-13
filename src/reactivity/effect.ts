import { extend } from "../shared"

let activeEffect
let shouldTrack = false
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
    // 会收集依赖
    // shouldTrack 来区分

    // 如果是 stop 的状态
    // 就不收集
    if (!this.active) {
      return this._fn()
    }

    // 否则收集
    shouldTrack = true
    activeEffect = this

    const result = this._fn()

    // reset 因为是全局变量
    // 处理完要还原
    shouldTrack = false
    activeEffect = null
    return result
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
  effect.deps.length = 0
}

const targetsMap = new Map()
export function track(target, key) {
  // 是否收集  shouldTrack 为 true 和 activeEffect 有值的时候要收集 否则就 return 出去
  if (!isTracking()) return

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
  // if (!activeEffect) return

  // 应该收集依赖
  // !! 思考 什么时候被赋值呢？
  // 触发 set 执行 fn 然后再触发 get 
  // 所以在 run 方法中
  // if (!shouldTrack) return

  // if (dep.has(activeEffect)) return

  // // 要存入的是一个 fn
  // // 所以要利用一个全局变量
  // dep.add(activeEffect)

  // // 如何通过当前的 effect 去找到 deps？
  // // 反向收集 deps
  // activeEffect.deps.push(dep)

  trackEffects(dep)
}

// 抽离 track 与 ref 公用
export function trackEffects(dep) {
  if (dep.has(activeEffect)) return

  // 要存入的是一个 fn
  // 所以要利用一个全局变量
  dep.add(activeEffect)

  // 如何通过当前的 effect 去找到 deps？
  // 反向收集 deps
  activeEffect.deps.push(dep)
}

export function isTracking() {
  return shouldTrack && activeEffect !== undefined
}

export function trigger(target, type, key) {
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

