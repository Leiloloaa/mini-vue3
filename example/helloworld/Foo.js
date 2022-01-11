import { h } from '../../lib/mini-vue3.esm.js';

export const Foo = {
    setup(props) {
        // 父组件向子组件传入了 props
        // 在 render 中可以通过 this.count 使用
        // 只可以使用 不可以修改
    },
    render() {
        // h(标签名，属性，内容)
        return h('div', {}, 'foo:' + this.count);
    }
};