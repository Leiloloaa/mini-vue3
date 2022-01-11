import { h } from '../../lib/mini-vue3.esm.js';

export const Foo = {
    setup(props, { emit }) {
        // props
        // 父组件向子组件传入了 props
        // 在 render 中可以通过 this.count 使用
        // 只可以使用 不可以修改
        // emit
        // 子组件通过 emit 调用父组件中的方法
        // emit 是 setup 函数的 第二个 参数
        const emitAdd = () => {
            emit('add', 1, 2, 3);
            emit('add-foo');
        };
        return { emitAdd };
    },
    render() {
        // h(标签名，属性，内容)
        return h('button', { onClick: this.emitAdd }, 'emitAdd');
    }
};