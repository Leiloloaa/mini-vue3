import { h, ref } from '../../lib/my-miniVue.esm.js';

export const App = {
    name: 'App',

    setup() {
        const count = ref(0);

        const onClick = () => {
            console.log('点击了');
            count.value++;
        };

        return {
            count,
            onClick
        };
    },
    render() {
        return h(
            'div', {
                id: 'root'
            }, [
                h('div', {}, 'count:' + this.count), // 依赖收集
                h(
                    'button', {
                        onClick: this.onClick
                    },
                    'click'
                )
            ]
        );
    }
};