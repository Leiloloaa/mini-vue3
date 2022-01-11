import {
    h,
    ref,
    getCurrentInstance,
    nextTick
} from '../../lib/mini-vue3.esm.js';

export default {
    name: 'App',
    setup() {
        const count = ref(1);
        const instance = getCurrentInstance();

        function onClick() {
            // 做视图更新的时候 只需要渲染一次 就能达到这个效果
            // 当同步任务都执行完之后，再执行微任务
            for (let i = 0; i < 100; i++) {
                console.log('update');
                count.value = i;
            }

            debugger;
            console.log(instance);

            // nextTick 解决了什么问题
            // 比如 有一个 for 循环 咱们只需要更新最后一次
            // 如何实现？
            // 将更新函数变成 微任务 就可以等待同步任务完成后 再执行
            // 而 nextTick 的作用把这个回调函数推入 微任务调用栈
            // 往前想一下 effect 中 有一个 scheduler 函数
            // 我们可以使用 scheduler 函数实现
            nextTick(() => {
                console.log(instance);
            });

            // await nextTick()
            // console.log(instance)
        }

        return {
            onClick,
            count
        };
    },
    render() {
        const button = h('button', { onClick: this.onClick }, 'update');
        const p = h('p', {}, 'count:' + this.count);

        return h('div', {}, [button, p]);
    }
};