import { h, createTextVNode } from '../../lib/my-miniVue.esm.js';
import { Foo } from './Foo.js';

export const App = {
    name: 'App',
    render() {
        const app = h('div', {}, 'App');
        // const foo = h(Foo, {}, [h('p', {}, '123'), h('p', {}, '456')]);
        // 换成单个值后 又不能渲染了 在 renderSlots 函数中修改
        // return Array.isArray(slots) ? createVNode("div", {}, slots) : slots
        // 最终的办法是在初始化的时候 将 children 转换成数组
        // !! 普通使用
        // const foo = h(Foo, {}, h('p', {}, '123'));
        // return h('div', {}, [app, foo]);

        // !! 具名插槽
        // object key
        // const foo = h(
        //     Foo, {}, {
        //         header: h('p', {}, '123'),
        //         footer: h('p', {}, '456')
        //     }
        // );

        // !! 作用域插槽
        // 这个 age 是 Foo 组件内部的插槽
        const foo = h(
            Foo, {}, {
                // 解构 age 因为 传进来的是个 对象
                header: ({ age }) => [
                    h('p', {}, '123，年龄' + age),
                    createTextVNode('你好啊！')
                ],
                footer: () => h('p', {}, '456')
            }
        );
        return h('div', {}, [app, foo]);
    },
    setup() {
        return {};
    }
};