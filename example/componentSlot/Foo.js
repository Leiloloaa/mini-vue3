import { h, renderSlots } from '../../lib/mini-vue3.esm.js';

export const Foo = {
    setup() {},
    render() {
        // 实现 3 中插槽方式
        // 1、普通插槽
        //    单个标签
        //    数组形式
        // const foo = h('div', {}, 'Foo')
        // return h('div', {}, [foo, renderSlots(this.$slots)]);
        // 2、具名插槽
        // const foo = h('div', {}, 'Foo')
        // return h('div', {}, [renderSlots(this.$slots, 'header'), foo, renderSlots(this.$slots, 'footer')]);
        // 3、作用域插槽
        // 父组件能够使用子组件中的数据
        const foo = h('div', {}, 'Foo');
        const age = 18;
        return h('div', {}, [
            renderSlots(this.$slots, 'header', { age }),
            foo,
            renderSlots(this.$slots, 'footer')
        ]);
        // h(标签名，属性，内容)
    }
};