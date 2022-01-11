import { h, renderSlots, createTextVNode } from '../../lib/mini-vue3.esm.js';
import { Foo } from './Foo.js';

export const App = {
    render() {
        const app = h('div', {}, 'App');
        // 如果是数组
        // h 函数必须渲染的是 虚拟节点 此时是一个数组
        // 我们需要一个帮助函数帮我们转换
        // const foo = h(Foo, {}, [h('p', {}, 'header'), h('p', {}, 'footer')])
        // 第三个参数 变成 对象 -> key 转换为一个 具名插槽
        // const foo = h(Foo, {}, {
        //     header: h('p', {}, 'header'),
        //     footer: h('p', {}, 'footer')
        // });
        // return h(
        //     'div', {}, [app, foo]
        // );
        const foo = h(
            Foo, {}, {
                header: ({ age }) => [
                    h('p', {}, 'header' + age),
                    createTextVNode('你好啊')
                ],
                footer: () => h('p', {}, 'footer')
            }
        );
        return h('div', {}, [app, foo]);
    },
    setup() {
        return {
            msg: 'mini-vue'
        };
    }
};