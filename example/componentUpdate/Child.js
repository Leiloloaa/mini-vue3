import { h } from '../../lib/mini-vue3.esm.js';
export default {
    name: 'Child',
    setup(props, { emit }) {},
    render(proxy) {
        return h('div', {}, [
            // 为能直接使用 $props 就要修改 componentPublicInstance 文件
            h('div', {}, 'child - props - msg: ' + this.$props.msg)
        ]);
    }
};