import { h, getCurrentInstance } from '../../lib/mini-vue3.esm.js';
import { Foo } from './Foo.js';

export const App = {
    name: 'App',
    render() {
        return h('div', {}, [h('p', {}, 'currentInstance demo'), h(Foo)]);
    },

    setup() {
        // getCurrentInstance 是获取当前组件对象实例
        // 在 setup 中使用
        // 实现步骤
        // 先找到 setup 调用的地方 保存实例
        // 最后 清空 即可 因为每个组件的 实例都是不同的
        const instance = getCurrentInstance();
        console.log('App:', instance);
    }
};