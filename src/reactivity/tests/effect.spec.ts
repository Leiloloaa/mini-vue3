import { effect, stop } from "../effect";
import { reactive } from "../reactive";

describe('effect', () => {
  it('happy path', () => {
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

  it('runner', () => {
    // effect(fn) -> function(runner) -> fn - return
    let foo = 10;
    const runner = effect(() => {
      foo++;
      return 'foo'
    })

    expect(foo).toBe(11);
    const r = runner();
    expect(foo).toBe(12);
    expect(r).toBe('foo')
  });

  it('scheduler', () => {
    // scheduler 的实现逻辑
    // 1、当响应式对象第一次发生改变的时候，会执行 fn，scheduler 不会执行
    // 2、第二次发生改变的时候，会执行性 scheduler，赋值 run 方法
    // 3、调用 run 方法的时候，才会执行 fn
    let dummy
    let run: any
    const scheduler = jest.fn(() => {
      run = runner
    })
    const obj = reactive({ foo: 1 })
    const runner = effect(
      () => {
        dummy = obj.foo
      },
      { scheduler }
    )
    // 一开始不会被调用 scheduler 函数
    // 因为 effect 中一开始是执行的是 run 方法
    // 只有当 trigger 触发更新依赖的时候，有 scheduler 才执行
    expect(scheduler).not.toHaveBeenCalled()
    expect(dummy).toBe(1)
    // should be called on first trigger
    obj.foo++
    expect(scheduler).toHaveBeenCalledTimes(1)
    // should not run yet
    expect(dummy).toBe(1)
    // manually run
    run()
    // should have run
    expect(dummy).toBe(2)
  })

  it('stop', () => {
    let dummy
    const obj = reactive({ prop: 1 })
    const runner = effect(() => {
      dummy = obj.prop
    })
    obj.prop = 2
    expect(dummy).toBe(2)
    stop(runner)
    // obj.prop = 3
    // obj.prop = obj.prop + 1
    // 先触发 get 操作 再触发 set 操作
    // get 操作 会重新收集依赖
    obj.prop++
    expect(dummy).toBe(2)

    // stopped effect should still be manually callable
    runner()
    expect(dummy).toBe(3)
  })

  it('events: onStop', () => {
    // stop 之后 onStop 会被执行
    // 允许用户做一些额外的处理
    const obj = reactive({ foo: 1 });
    const onStop = jest.fn();
    let dummy;
    const runner = effect(() => {
      dummy = obj.foo;
    }, {
      onStop
    });

    stop(runner);
    expect(onStop).toHaveBeenCalled();
  })
});