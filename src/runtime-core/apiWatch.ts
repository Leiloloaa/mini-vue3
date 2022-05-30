import { isFunction, isObject, NOOP } from "../shared";
import { effect, ReactiveEffect } from "../reactivity/effect";
import { isReactive, isRef } from "../reactivity";
import { isArray } from "../shared/index";

export type WatchEffect = () => void;

export interface WatchOptions {
  immediate?: boolean;
  deep?: boolean;
  flush?: "pre" | "post" | "sync";
}

export function watchEffect(effect: WatchEffect, options?: WatchOptions) {
  return doWatch(effect, null, (options = {}));
}

export function watch(source, cb, options: WatchOptions = {}) {
  return doWatch(source as any, cb, options);
}

function doWatch(source, cb, { immediate, deep, flush }: WatchOptions) {
  // source 可以是对象的值 或者 是函数 等
  // 定义 getter 函数
  let getter: () => any;
  if (isRef(source)) {
    getter = () => source.value;
  } else if (isReactive(source)) {
    // 如果是 reactive 类型
    getter = () => source;
    // 深度监听为 true
    // 所以是对象的时候 都可以不用指定 deep
    deep = true;
  } else if (isArray(source)) {
    getter = () =>
      source.map((s) => {
        if (isRef(s)) {
          return s.value;
        } else if (isReactive(s)) {
          return traverse(s);
        } else if (isFunction(s)) {
          return s;
        }
      });
  } else if (isFunction(source)) {
    getter = source;
  } else {
    getter = NOOP;
  }

  if (cb && deep) {
    // 如果有回调函数并且深度监听为 true，那么就通过 traverse 函数进行深度递归监听
    const baseGetter = getter;
    getter = () => traverse(baseGetter());
  }

  // 定义旧值和新值
  let oldValue;

  // 提取 scheduler 调度函数为一个独立的 job 函数
  const job = () => {
    if (cb) {
      // 如果有回调函数
      // 执行effect.run获取新值
      const newValue = effect.run();
      if (deep) {
        // 执行回调函数
        // 第一次执行的时候，旧值是undefined，这是符合预期的
        cb(newValue, oldValue);
        // 把新值赋值给旧值
        oldValue = newValue;
      }
    } else {
      // 没有回调函数则是 watchEffect
      effect.run();
    }
    // newValue = effect.run();
    // // 当数据变化时，调用回调函数 cb
    // cb(newValue, oldValue);
    // oldValue = newValue;
  };

  let scheduler;
  if (flush === "post") {
    scheduler = () => {
      const p = Promise.resolve();
      p.then(job);
    };
  } else {
    // 如果是 'pre' 或者是 'sync'
    scheduler = () => {
      job();
    };
  }
  const effect = new ReactiveEffect(getter, scheduler);

  // traverse 递归地读取 source
  // const effectFn = effect(() => getter(), {
  //   // 除了可以使用 immediate 之外，还可以使用 flush 指定调度函数的执行时间
  //   scheduler: () => {
  //     // 在调度函数中判断 flush 是否为 post
  //     // 如果是 将其放到微任务队列中执行（执行栈底）
  //     if (flush === "post") {
  //       const p = Promise.resolve();
  //       p.then(job);
  //     } else {
  //       // 如果是 'pre' 或者是 'sync'
  //       job();
  //     }
  //   },
  // });

  // options.immediate 为 true 回调函数会在 watch 创建的时候执行一次
  // if (immediate) {
  //   job();
  // } else {
  //   oldValue = effectFn();
  // }
  
  // initial run
  if (cb) {
    if (immediate) {
      job();
    } else {
      oldValue = effect.run();
    }
  } else {
    oldValue = effect.run();
  }
}

function traverse(value, seen = new Set()) {
  // 如果要读取的数据是原始值，或者已经被读取过了，那么就什么都别做
  if (!isObject || value === null || seen.has(value)) return;
  // 将数据添加到 seen 中，代表遍历读取过了，避免循环引用引起的死循环
  seen.add(value);
  // 暂时不考虑数组等其他结构
  // 假设 value 就是一个对象，使用 forin 读取对象的每一个值，并递归的调用 traverse 进行处理
  for (const k in value) {
    traverse(value[k], seen);
  }
  return value;
}
