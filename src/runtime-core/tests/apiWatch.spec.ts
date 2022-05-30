import { reactive } from "../../reactivity/reactive";
import { ref } from "../../reactivity/ref";
import { watch, watchEffect } from "../apiWatch";

// watch 是用来监控数据 接受三个参数 属性、cb、{}
// 实现 watch 步骤
// 1、收集相关的依赖
// 2、相关变量发生改变的时候，触发更新

describe("api: watch", () => {
  it('effect', async () => {
    const state = reactive({ count: 0 })
    let dummy
    watchEffect(() => {
      dummy = state.count
    })

    expect(dummy).toBe(0)

    state.count++

    expect(dummy).toBe(1)
  })

  it("reactive", async () => {
    const state = reactive({ count: 0 });
    const dummy = ref(0);
    watch(
      () => state.count,
      (newValue, oldValue) => {
        console.log('oldValue',oldValue);
        dummy.value = state.count;
      },
      {
        // 回调函数会在 watch 创建的时候执行一次
        immediate: true,
        // 除了可以使用 immediate 之外，还可以使用 flush 指定调度函数的执行时间
        // flush: "pre",
      }
    );

    expect(dummy.value).toBe(0);

    state.count++;

    // expect(dummy.value).toBe(1);
  });
});
